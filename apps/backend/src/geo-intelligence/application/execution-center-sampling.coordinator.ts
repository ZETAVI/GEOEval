import { Logger } from "@nestjs/common";
import { AiExecutionService } from "../../ai-execution/application/ai-execution.service.js";
import type { ExecutionCenterReceiptRepository } from "../../ai-execution/domain/execution-center-receipt.repository.js";
import type { ExecutionCenterWebGateway } from "../../ai-execution/infrastructure/execution-center-browser-sampling.gateway.js";
import { ExecutionCenterClientError } from "../../ai-execution/infrastructure/execution-center.client.js";
import type { EvaluationProcessRepository } from "../domain/evaluation-process.repository.js";
import { buildSampleAcquisitionRequest } from "../sample-acquisition.policy.js";
import { EVALUATION_PROCESS_COMPLETED } from "../domain/evaluation-process.result.js";
import {
  parseAcceptedEvidence,
  type ExecutionSamplingBatchContext,
  type ExecutionSamplingItem,
  type EvaluationSampleWorkContext,
} from "../domain/evaluation-process.types.js";

type SamplingWork = {
  runId: string;
  cycleId: string;
  sampleId: string;
  attemptNumber: number;
  executionChannel?: "API" | "WEB" | undefined;
};

/** GEO owns acceptance and policy; the center owns only physical execution. */
export class ExecutionCenterSamplingCoordinator {
  private readonly logger = new Logger(ExecutionCenterSamplingCoordinator.name);
  constructor(
    private readonly repository: EvaluationProcessRepository,
    private readonly aiExecution: AiExecutionService,
    private readonly web: ExecutionCenterWebGateway,
    private readonly notifications: ExecutionCenterReceiptRepository,
    private readonly config: {
      centerRef: string;
      accountAlias: string;
      acquisitionEnabled?: boolean;
    },
  ) {}

  async acquire(work: SamplingWork) {
    const context = await this.repository.getSampleContext(
      work.sampleId,
      work.runId,
      work.cycleId,
    );
    if (!context || context.status !== "PENDING" || !context.samplingWindow)
      return EVALUATION_PROCESS_COMPLETED;
    if (
      context.samplingWindow.closedAt ||
      Date.now() >= context.samplingWindow.deadlineAt.getTime()
    ) {
      await this.deadline(work);
      return EVALUATION_PROCESS_COMPLETED;
    }
    if (work.executionChannel === "WEB") {
      const batch = await this.repository.getOrCreateExecutionSamplingBatch({
        ...work,
        ...this.config,
      });
      if (batch && batch.samples[0]?.sampleId === work.sampleId)
        await this.refreshBatch(batch);
      return EVALUATION_PROCESS_COMPLETED;
    }
    const priorReceipt = await this.notifications.findByRequest({
      cycleId: context.cycleId,
      sampleId: context.sampleId,
      purpose: "EVALUATION_ACQUISITION",
      attemptNumber: work.attemptNumber,
      executionChannel: "API",
    });
    if (this.config.acquisitionEnabled === false && !priorReceipt)
      return EVALUATION_PROCESS_COMPLETED;
    const outcome = await this.aiExecution.execute(
      buildSampleAcquisitionRequest(
        context,
        work.attemptNumber,
        context.samplingWindow.deadlineAt.getTime(),
      ),
    );
    // The receipt/attempt reconciler resumes the same immutable request. Never hold a queue slot.
    if (outcome.kind === "REMOTE_PENDING") return EVALUATION_PROCESS_COMPLETED;
    if (outcome.kind === "DEFERRED") {
      const receipt = await this.notifications.findByRequest({
        cycleId: context.cycleId,
        sampleId: context.sampleId,
        purpose: "EVALUATION_ACQUISITION",
        attemptNumber: work.attemptNumber,
        executionChannel: "API",
      });
      return receipt ? EVALUATION_PROCESS_COMPLETED : outcome;
    }
    if (outcome.kind === "SUCCEEDED") {
      await this.repository.acceptEvidence({
        context,
        attemptId: outcome.attemptId,
        evidence: parseAcceptedEvidence(outcome.output),
      });
    }
    // An API failure is not a sampling failure while Web can still finish. Deadline is the final gate.
    return EVALUATION_PROCESS_COMPLETED;
  }

  async fallback(work: { runId: string; cycleId: string }) {
    await this.repository.scheduleSamplingFallback({
      ...work,
      reason: "FALLBACK_DUE",
    });
    return EVALUATION_PROCESS_COMPLETED;
  }

  async deadline(work: { runId: string; cycleId: string }) {
    await this.repository.closeSamplingAtDeadline(work);
    return EVALUATION_PROCESS_COMPLETED;
  }

  async processNotification(input: { centerRef: string; cursor: number }) {
    if (input.centerRef !== this.config.centerRef)
      return EVALUATION_PROCESS_COMPLETED;
    const notification = await this.notifications.readNotification(
      input.centerRef,
      input.cursor,
    );
    if (!notification || notification.snapshot?.channel !== "web")
      return EVALUATION_PROCESS_COMPLETED;
    const match = /^geo:web:([0-9a-f-]{36})$/i.exec(
      notification.event.callerRequestRef,
    );
    if (!match) return EVALUATION_PROCESS_COMPLETED;
    const batch = await this.repository.recordExecutionSamplingSnapshot({
      batchId: match[1]!,
      snapshot: notification.snapshot,
    });
    if (batch) {
      const item = batch.items.find(
        (candidate) => candidate.itemId === notification.event.itemId,
      );
      if (item) await this.acceptItem(batch, item);
    }
    return EVALUATION_PROCESS_COMPLETED;
  }

  /** Independent of SSE: a failed terminal GET cannot starve unrelated Web results. */
  async reconcileWeb(limit = 100, signal?: AbortSignal): Promise<number> {
    const pageSize = Math.max(1, Math.min(100, Math.trunc(limit)));
    let afterId: string | undefined;
    let recovered = 0;
    for (;;) {
      if (signal?.aborted) return recovered;
      const batches = await this.repository.listExecutionSamplingBatches({
        limit: pageSize,
        ...(afterId ? { afterId } : {}),
      });
      for (let start = 0; start < batches.length; start += 5) {
        await Promise.allSettled(
          batches.slice(start, start + 5).map(async (batch) => {
            if (signal?.aborted || batch.centerRef !== this.config.centerRef)
              return;
            try {
              await this.refreshBatch(batch, signal);
              recovered += 1;
            } catch {
              // Only owned identifiers and a fixed code; never upstream bodies, prompts or tokens.
              this.logger.warn({
                code: "SAMPLING_WEB_RESULT_RECONCILIATION_FAILED",
                batchId: batch.batchId,
              });
            }
          }),
        );
      }
      if (batches.length < pageSize) return recovered;
      afterId = batches.at(-1)!.batchId;
    }
  }

  private async refreshBatch(
    batch: ExecutionSamplingBatchContext,
    signal?: AbortSignal,
  ) {
    if (signal?.aborted) return;
    // Recover an already captured item even when the center is temporarily unreachable.
    await Promise.all(batch.items.map((item) => this.acceptItem(batch, item)));
    if (Date.now() >= batch.deadlineAt.getTime() && !batch.externalTaskId) {
      await this.deadline(batch);
      return;
    }
    try {
      const snapshot = batch.externalTaskId
        ? await this.web.readBatch(batch.externalTaskId)
        : await this.web.submitBatch({
            idempotencyKey: batch.idempotencyKey,
            request: batch.request,
          });
      if (signal?.aborted) return;
      const saved = await this.repository.recordExecutionSamplingSnapshot({
        batchId: batch.batchId,
        snapshot,
      });
      if (saved)
        await Promise.all(
          saved.items.map((item) => this.acceptItem(saved, item)),
        );
    } catch (error) {
      // Lost ACK is reconciled using the SAME persisted request/key, never another physical submission.
      if (!(error instanceof ExecutionCenterClientError)) throw error;
      if (
        !batch.externalTaskId &&
        !error.outcomeUnknown &&
        (error.httpStatus === 400 ||
          error.httpStatus === 401 ||
          error.httpStatus === 403 ||
          error.code === "CHANNEL_UNAVAILABLE" ||
          error.code === "INVALID_REQUEST")
      ) {
        await Promise.all(
          batch.samples.map((sample) =>
            this.repository.scheduleSamplingFallback({
              ...batch,
              sampleId: sample.sampleId,
              reason: "WEB_UNAVAILABLE",
            }),
          ),
        );
      }
    }
  }

  private async acceptItem(
    batch: ExecutionSamplingBatchContext,
    item: ExecutionSamplingItem,
  ) {
    if (item.processedAt || item.state !== "READY" || !item.snapshot) return;
    const context = await this.repository.getSampleContext(
      item.sampleId,
      batch.runId,
      batch.cycleId,
    );
    const sample = batch.samples.find(
      (candidate) => candidate.sampleId === item.sampleId,
    );
    if (!sample)
      throw new Error("Execution sampling item has no immutable sample");
    const result = record(item.snapshot.result);
    const completion = record(result?.completion);
    const answer = typeof result?.answer === "string" ? result.answer : "";
    // GEO-observed batch-to-result latency, not an invented platform generation duration.
    const latencyMs = Math.max(0, Date.now() - batch.createdAt.getTime());
    if (
      item.snapshot.state !== "RESULT_AVAILABLE" ||
      result?.kind !== "web" ||
      result.assistantRole !== true ||
      result.nonEchoVerified !== true ||
      completion?.status !== "COMPLETE" ||
      !answer.trim() ||
      answer.trim() === sample.query.trim()
    ) {
      const failureClass =
        typeof record(item.snapshot.error)?.code === "string"
          ? String(record(item.snapshot.error)!.code)
          : "WEB_CAPTURE_UNCONFIRMED";
      await this.aiExecution.recordExternal(
        webAttempt(batch, item),
        {
          kind: "FAILED",
          failureClass,
          retryable: false,
          evidence: { ...webEvidence, failure: { kind: failureClass } },
        },
        latencyMs,
      );
      if (context?.status === "PENDING")
        await this.repository.scheduleSamplingFallback({
          ...batch,
          sampleId: item.sampleId,
          reason: "WEB_UNAVAILABLE",
        });
      await this.repository.markExecutionSamplingItemProcessed(item.id);
      return;
    }
    const content = record(result.content);
    const sources = Array.isArray(content?.sources)
      ? content.sources
      : Array.isArray(result.sources)
        ? result.sources
        : [];
    const output = {
      kind: "ACQUISITION" as const,
      answerContent: answer,
      answerFormat: "MARKDOWN" as const,
      sourceMetadata: sources.filter(
        (source): source is Record<string, unknown> => record(source) !== null,
      ),
      searchObservation: "UNKNOWN" as const,
      returnedModel: `consumer-web:${batch.platformKey}`,
      content,
      readingText:
        typeof result.readingText === "string" && result.readingText.trim()
          ? result.readingText
          : null,
      images: Array.isArray(result.images)
        ? result.images.filter(
            (image): image is Record<string, unknown> => record(image) !== null,
          )
        : null,
    };
    const outcome = await this.aiExecution.recordExternal(
      webAttempt(batch, item),
      {
        kind: "SUCCEEDED",
        output,
        evidence: {
          ...webEvidence,
          returnedModel: output.returnedModel,
          searchObservation: "UNKNOWN",
          sourceMetadata: output.sourceMetadata,
        },
      },
      latencyMs,
    );
    if (outcome.kind === "SUCCEEDED" && context?.status === "PENDING")
      await this.repository.acceptEvidence({
        context,
        attemptId: outcome.attemptId,
        evidence: parseAcceptedEvidence(output),
      });
    await this.repository.markExecutionSamplingItemProcessed(item.id);
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
const webEvidence = {
  providerKey: "browser-sampler-control-plane",
  serviceClass: "consumer-web",
  protocol: "http-json",
};

function webAttempt(
  batch: ExecutionSamplingBatchContext,
  context: Pick<EvaluationSampleWorkContext, "sampleId">,
) {
  return {
    runId: batch.runId,
    cycleId: batch.cycleId,
    sampleId: context.sampleId,
    purpose: "EVALUATION_ACQUISITION" as const,
    executionChannel: "WEB" as const,
    executionTransport: "EXECUTION_CENTER" as const,
    deadlineAt: batch.deadlineAt.getTime(),
    attemptNumber: 1,
    routePolicyId: "evaluation.acquisition.browser-control-plane@1",
    providerKey: "browser-sampler-control-plane",
    serviceClass: "consumer-web",
    protocol: "http-json",
    requestedModel: `consumer-web:${batch.platformKey}`,
    correlationId: batch.correlationId,
    input: {
      taskKind: "BROWSER_EVALUATION_ACQUISITION" as const,
      platformKey: batch.platformKey,
      questionId: batch.samples.find((s) => s.sampleId === context.sampleId)!
        .questionId,
      externalTaskId:
        batch.externalTaskId ?? `idempotency:${batch.idempotencyKey}`,
      resultIndex: batch.samples.findIndex(
        (s) => s.sampleId === context.sampleId,
      ),
    },
  };
}
