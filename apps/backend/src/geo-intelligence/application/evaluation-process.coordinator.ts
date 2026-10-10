import { Inject, Injectable, Optional } from "@nestjs/common";
import { ExecutionCenterSamplingCoordinator } from "./execution-center-sampling.coordinator.js";
import { z } from "zod";

import { AiExecutionService } from "../../ai-execution/application/ai-execution.service.js";
import {
  EVALUATION_PROCESS_REPOSITORY,
  type EvaluationProcessRepository,
} from "../domain/evaluation-process.repository.js";
import {
  parseAcceptedEvidence,
  type AcceptedInterpretation,
  type BrowserSamplingBatchContext,
} from "../domain/evaluation-process.types.js";
import {
  EVALUATION_PROCESS_COMPLETED,
  type EvaluationProcessResult,
} from "../domain/evaluation-process.result.js";
import {
  SAMPLE_PARSER_CONTRACT_VERSION,
  SampleParserSemanticError,
} from "../domain/sample-parser.contract.js";
import {
  SAMPLE_PARSER_MODEL_CONTRACT_VERSION,
  parseAndProjectSampleParserModelOutput,
} from "../domain/sample-parser-model.contract.js";
import { evaluationBrandTextContext } from "../domain/evaluation-brand-snapshot.js";
import { buildSampleParserTask } from "../sample-parser.policy.js";
import { buildSampleAcquisitionRequest } from "../sample-acquisition.policy.js";
import { EvaluationSynthesisCoordinator } from "./evaluation-synthesis.coordinator.js";
import {
  BROWSER_SAMPLING_GATEWAY,
  BrowserSamplingTransportError,
  type BrowserSamplingBatchState,
  type BrowserSamplingGateway,
  normalizeBrowserSamplingFailureCode,
} from "../domain/browser-sampling.gateway.js";
import {
  BROWSER_SAMPLING_CONFIG,
  type BrowserSamplingConfig,
} from "../infrastructure/browser-sampling.config.js";

const MAX_ACQUISITION_ATTEMPTS = 2;

const INTERPRETATION_ROUTES = [
  {
    routePolicyId: "evaluation.interpretation.deepseek@1",
    requestedModel: "deepseek-v4-flash-0731",
  },
  {
    routePolicyId: "evaluation.interpretation.deepseek@1",
    requestedModel: "deepseek-v4-flash-0731",
  },
] as const;

const runStartedSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
});

const acquisitionWorkSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
  sampleId: z.string().uuid(),
  attemptNumber: z.number().int().min(1).max(MAX_ACQUISITION_ATTEMPTS),
  executionChannel: z.enum(["API", "WEB"]).optional(),
});

const interpretationWorkSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
  sampleId: z.string().uuid(),
  attemptNumber: z.number().int().min(1).max(INTERPRETATION_ROUTES.length),
});

const readinessSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
});

@Injectable()
export class EvaluationProcessCoordinator {
  constructor(
    @Inject(EVALUATION_PROCESS_REPOSITORY)
    private readonly repository: EvaluationProcessRepository,
    @Inject(AiExecutionService)
    private readonly aiExecution: AiExecutionService,
    @Inject(EvaluationSynthesisCoordinator)
    private readonly synthesis: EvaluationSynthesisCoordinator,
    @Inject(BROWSER_SAMPLING_CONFIG)
    private readonly samplingConfig: BrowserSamplingConfig,
    @Inject(BROWSER_SAMPLING_GATEWAY)
    private readonly browserSampling: BrowserSamplingGateway,
    @Optional()
    @Inject(ExecutionCenterSamplingCoordinator)
    private readonly executionSampling?: ExecutionCenterSamplingCoordinator,
  ) {}

  async process(event: {
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<EvaluationProcessResult> {
    switch (event.eventType) {
      case "evaluation.run.started": {
        const payload = runStartedSchema.parse(event.payload);
        await this.repository.initializeRun(
          payload.runId,
          payload.cycleId,
          this.samplingConfig.mode === "execution-center"
            ? this.samplingConfig
            : this.samplingConfig.mode === "browser-control-plane"
              ? {
                  mode: "browser-control-plane",
                  accountAlias: this.samplingConfig.accountId,
                }
              : { mode: "ai-provider" },
        );
        return EVALUATION_PROCESS_COMPLETED;
      }
      case "evaluation.sample.acquire.requested": {
        return this.acquire(acquisitionWorkSchema.parse(event.payload));
      }
      case "evaluation.browser.result.received": {
        const payload = z
          .object({
            centerRef: z.string().min(1),
            cursor: z.number().int().nonnegative(),
          })
          .parse(event.payload);
        if (!this.executionSampling)
          throw new Error("Execution sampling is unavailable");
        return this.executionSampling.processNotification(payload);
      }
      case "evaluation.sampling.fallback.requested": {
        if (!this.executionSampling)
          throw new Error("Execution sampling is unavailable");
        return this.executionSampling.fallback(
          runStartedSchema.parse(event.payload),
        );
      }
      case "evaluation.sampling.deadline.requested": {
        if (!this.executionSampling)
          throw new Error("Execution sampling is unavailable");
        return this.executionSampling.deadline(
          runStartedSchema.parse(event.payload),
        );
      }
      case "evaluation.sample.interpret.requested": {
        return this.interpret(interpretationWorkSchema.parse(event.payload));
      }
      case "evaluation.run.readiness.requested": {
        const payload = readinessSchema.parse(event.payload);
        await this.repository.evaluateReadiness(payload.runId, payload.cycleId);
        return EVALUATION_PROCESS_COMPLETED;
      }
      case "evaluation.run.synthesize.requested": {
        return this.synthesis.process(event.payload);
      }
      default:
        throw new Error(`Unsupported evaluation event ${event.eventType}`);
    }
  }

  async reconcile(limit = 100): Promise<number> {
    const sampleRecovered = await this.repository.reconcile(limit);
    const synthesisRecovered = await this.synthesis.reconcile(limit);
    return sampleRecovered + synthesisRecovered;
  }

  private async acquire(payload: z.infer<typeof acquisitionWorkSchema>) {
    const context = await this.repository.getSampleContext(
      payload.sampleId,
      payload.runId,
      payload.cycleId,
    );
    if (!context || context.status !== "PENDING") {
      return EVALUATION_PROCESS_COMPLETED;
    }
    if (context.samplingWindow) {
      if (!this.executionSampling)
        throw new Error("Execution sampling is unavailable");
      return this.executionSampling.acquire(payload);
    }
    if (this.samplingConfig.mode === "browser-control-plane") {
      return this.acquireFromBrowser(payload, this.samplingConfig);
    }
    const outcome = await this.aiExecution.execute(
      buildSampleAcquisitionRequest(context, payload.attemptNumber),
    );
    if (outcome.kind === "DEFERRED") return outcome;
    if (outcome.kind === "REMOTE_PENDING") return EVALUATION_PROCESS_COMPLETED;
    if (outcome.kind === "FAILED") {
      await this.handleFailure({
        context,
        purpose: "EVALUATION_ACQUISITION",
        attemptId: outcome.attemptId,
        attemptNumber: payload.attemptNumber,
        failureClass: outcome.failureClass,
        retryable: outcome.retryable,
      });
      return EVALUATION_PROCESS_COMPLETED;
    }
    const evidence = parseAcceptedEvidence(outcome.output);
    await this.repository.acceptEvidence({
      context,
      attemptId: outcome.attemptId,
      evidence,
    });
    return EVALUATION_PROCESS_COMPLETED;
  }

  private async acquireFromBrowser(
    payload: z.infer<typeof acquisitionWorkSchema>,
    config: Extract<BrowserSamplingConfig, { mode: "browser-control-plane" }>,
  ): Promise<EvaluationProcessResult> {
    const batch = await this.repository.getOrCreateBrowserSamplingBatch({
      sampleId: payload.sampleId,
      runId: payload.runId,
      cycleId: payload.cycleId,
      accountAlias: config.accountId,
    });
    if (!batch || batch.status === "COMPLETED") {
      return EVALUATION_PROCESS_COMPLETED;
    }
    if (batch.samples[0]?.sampleId !== payload.sampleId) {
      return EVALUATION_PROCESS_COMPLETED;
    }
    if (!batch.externalTaskId) {
      let submitted;
      try {
        submitted = await this.browserSampling.submitBatch({
          platform: browserPlatformKey(batch.platformKey),
          accountId: batch.accountAlias,
          prompts: batch.samples.map((sample) => sample.query),
          idempotencyKey: batch.idempotencyKey,
          collectionDeadlineMs: config.collectionDeadlineMs,
        });
      } catch (error) {
        if (!(error instanceof BrowserSamplingTransportError)) throw error;
        if (!browserBatchExpired(batch, config.maximumWaitMs)) {
          return deferredBrowserPoll(config.pollIntervalMs);
        }
        const counts = await this.acceptBrowserBatch(
          batch,
          expiredBrowserBatch("NETWORK"),
        );
        await this.repository.completeBrowserSamplingBatch({
          batchId: batch.batchId,
          ...counts,
        });
        return EVALUATION_PROCESS_COMPLETED;
      }
      await this.repository.markBrowserSamplingBatchSubmitted(
        batch.batchId,
        submitted.externalTaskId,
      );
      return deferredBrowserPoll(config.pollIntervalMs);
    }
    let state: BrowserSamplingBatchState;
    try {
      state = await this.browserSampling.readBatch(batch.externalTaskId);
    } catch (error) {
      if (!(error instanceof BrowserSamplingTransportError)) throw error;
      if (!browserBatchExpired(batch, config.maximumWaitMs)) {
        return deferredBrowserPoll(config.pollIntervalMs);
      }
      state = expiredBrowserBatch("NETWORK");
    }
    if (state.kind === "RUNNING") {
      if (!browserBatchExpired(batch, config.maximumWaitMs)) {
        return deferredBrowserPoll(config.pollIntervalMs);
      }
      state = expiredBrowserBatch("TIMEOUT");
    }
    const counts = await this.acceptBrowserBatch(batch, state);
    await this.repository.completeBrowserSamplingBatch({
      batchId: batch.batchId,
      ...counts,
    });
    return EVALUATION_PROCESS_COMPLETED;
  }

  private async acceptBrowserBatch(
    batch: NonNullable<
      Awaited<
        ReturnType<
          EvaluationProcessRepository["getOrCreateBrowserSamplingBatch"]
        >
      >
    >,
    state: Extract<BrowserSamplingBatchState, { kind: "TERMINAL" }>,
  ): Promise<{
    acquiredCount: number;
    failedCount: number;
    lateCount: number;
  }> {
    const indexed = new Map<number, (typeof state.items)[number]>();
    const duplicates = new Set<number>();
    for (const item of state.items) {
      if (indexed.has(item.index)) duplicates.add(item.index);
      indexed.set(item.index, item);
    }
    let acquiredCount = 0;
    let failedCount = 0;
    let lateCount = 0;
    for (const [index, sample] of batch.samples.entries()) {
      const context = await this.repository.getSampleContext(
        sample.sampleId,
        batch.runId,
        batch.cycleId,
      );
      if (!context || context.status !== "PENDING") {
        const item = indexed.get(index);
        if (item && item.completionStatus !== "FAILED") {
          acquiredCount += 1;
          if (item?.completionStatus === "CAPTURED_LATE") lateCount += 1;
        } else {
          failedCount += 1;
        }
        continue;
      }
      const item = duplicates.has(index) ? undefined : indexed.get(index);
      const isEcho =
        item !== undefined &&
        item.completionStatus !== "FAILED" &&
        item.answer.trim() === sample.query.trim();
      if (item && item.completionStatus !== "FAILED" && !isEcho) {
        const output = {
          kind: "ACQUISITION" as const,
          answerContent: item.answer,
          answerFormat: "MARKDOWN" as const,
          sourceMetadata: [
            {
              rawEvidenceRef: `browser-sampler-task:${batch.externalTaskId}:item:${index}`,
              completionStatus: item.completionStatus,
              collectionSlaMet: item.collectionSlaMet,
              capturedAtMs: item.capturedAtMs,
              timings: item.timings,
              resetReady: item.resetReady,
              assistantRoleVerified: item.assistantRoleVerified,
              nonEchoVerified: item.nonEchoVerified,
            },
          ],
          searchObservation: "UNKNOWN" as const,
          returnedModel: `consumer-web:${batch.platformKey}`,
        };
        const outcome = await this.aiExecution.recordExternal(
          browserAttemptRequest(batch, sample, index),
          {
            kind: "SUCCEEDED",
            output,
            evidence: {
              providerKey: "browser-sampler-control-plane",
              serviceClass: "consumer-web",
              protocol: "http-json",
              returnedModel: output.returnedModel,
              searchObservation: "UNKNOWN",
              sourceMetadata: output.sourceMetadata,
            },
          },
          item.capturedAtMs ?? state.collectionElapsedMs ?? 0,
        );
        if (outcome.kind !== "SUCCEEDED") {
          throw new Error("Captured browser item did not persist as success");
        }
        await this.repository.acceptEvidence({
          context,
          attemptId: outcome.attemptId,
          evidence: output,
        });
        acquiredCount += 1;
        if (item.completionStatus === "CAPTURED_LATE") lateCount += 1;
        continue;
      }
      const failureCode = isEcho
        ? "ANSWER_ECHOED_QUERY"
        : item?.completionStatus === "FAILED"
          ? item.failureCode
          : normalizeBrowserSamplingFailureCode(state.failureCode);
      const outcome = await this.aiExecution.recordExternal(
        browserAttemptRequest(batch, sample, index),
        {
          kind: "FAILED",
          failureClass: failureCode,
          retryable: false,
          evidence: {
            providerKey: "browser-sampler-control-plane",
            serviceClass: "consumer-web",
            protocol: "http-json",
            failure: {
              kind: failureCode,
              capturedAtMs: item?.capturedAtMs ?? null,
              timings: item?.timings ?? null,
              resetReady: item?.resetReady === true,
            },
          },
        },
        item?.capturedAtMs ?? state.collectionElapsedMs ?? 0,
      );
      if (outcome.kind !== "FAILED") {
        throw new Error("Failed browser item did not persist as failure");
      }
      await this.handleFailure({
        context,
        purpose: "EVALUATION_ACQUISITION",
        attemptId: outcome.attemptId,
        attemptNumber: 1,
        failureClass: outcome.failureClass,
        retryable: false,
        reason: `Browser sampling failed with ${outcome.failureClass}`,
      });
      failedCount += 1;
    }
    return { acquiredCount, failedCount, lateCount };
  }

  private async interpret(payload: z.infer<typeof interpretationWorkSchema>) {
    const context = await this.repository.getSampleContext(
      payload.sampleId,
      payload.runId,
      payload.cycleId,
    );
    if (
      !context ||
      context.status !== "EVIDENCE_ACCEPTED" ||
      !context.evidence
    ) {
      return EVALUATION_PROCESS_COMPLETED;
    }
    const brand = evaluationBrandTextContext(context.brandSnapshot);
    const parserTask = buildSampleParserTask({
      companyName: brand.companyName,
      primaryIndustry: brand.primaryIndustry,
      secondaryIndustry: brand.secondaryIndustry,
      region: [brand.province, brand.city, brand.terminalRegion]
        .filter(Boolean)
        .join(""),
      characteristicOne: brand.characteristicOne,
      characteristicTwo: brand.characteristicTwo,
      questionKind: context.questionKind,
      question: context.query,
      originalAnswer:
        context.evidence.readingText ?? context.evidence.answerContent,
    });
    const route = INTERPRETATION_ROUTES[payload.attemptNumber - 1]!;
    const outcome = await this.aiExecution.execute({
      runId: context.runId,
      cycleId: context.cycleId,
      sampleId: context.sampleId,
      purpose: "EVALUATION_INTERPRETATION",
      attemptNumber: payload.attemptNumber,
      routePolicyId: route.routePolicyId,
      requestedModel: route.requestedModel,
      correlationId: context.correlationId,
      input: parserTask,
    });
    if (outcome.kind === "DEFERRED") return outcome;
    if (outcome.kind === "REMOTE_PENDING") return EVALUATION_PROCESS_COMPLETED;
    if (outcome.kind === "FAILED") {
      await this.handleFailure({
        context,
        purpose: "EVALUATION_INTERPRETATION",
        attemptId: outcome.attemptId,
        attemptNumber: payload.attemptNumber,
        failureClass: outcome.failureClass,
        retryable: outcome.retryable,
      });
      return EVALUATION_PROCESS_COMPLETED;
    }
    let output;
    try {
      output = parseAndProjectSampleParserModelOutput(outcome.output, {
        questionKind: context.questionKind,
        companyName: context.companyName,
        originalAnswer:
          context.evidence.readingText ?? context.evidence.answerContent,
      });
    } catch (error) {
      if (
        !(error instanceof z.ZodError) &&
        !(error instanceof SampleParserSemanticError)
      ) {
        throw error;
      }
      await this.aiExecution.rejectSemantics(outcome.attemptId, {
        failureClass: "SEMANTIC_CONTRACT_REJECTED",
        modelContractVersion: SAMPLE_PARSER_MODEL_CONTRACT_VERSION,
        domainContractVersion: SAMPLE_PARSER_CONTRACT_VERSION,
      });
      await this.handleFailure({
        context,
        purpose: "EVALUATION_INTERPRETATION",
        attemptId: outcome.attemptId,
        attemptNumber: payload.attemptNumber,
        failureClass: "SEMANTIC_CONTRACT_REJECTED",
        retryable: true,
        reason: "Parser output failed the accepted semantic contract",
      });
      return EVALUATION_PROCESS_COMPLETED;
    }
    const interpretation: AcceptedInterpretation = {
      mentioned: output.mentioned,
      position: output.position,
      semanticContractVersion: SAMPLE_PARSER_CONTRACT_VERSION,
      semanticPayload: output.semantic,
    };
    await this.repository.acceptInterpretation({
      context,
      attemptId: outcome.attemptId,
      interpretation,
    });
    return EVALUATION_PROCESS_COMPLETED;
  }

  private async handleFailure(input: {
    context: Awaited<
      ReturnType<EvaluationProcessRepository["getSampleContext"]>
    > & {};
    purpose: "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION";
    attemptId: string;
    attemptNumber: number;
    failureClass: string;
    retryable: boolean;
    reason?: string;
  }): Promise<void> {
    const failure = {
      runId: input.context.runId,
      cycleId: input.context.cycleId,
      sampleId: input.context.sampleId,
      purpose: input.purpose,
      attemptId: input.attemptId,
      attemptNumber: input.attemptNumber,
      failureClass: input.failureClass,
      reason: input.reason ?? "Deterministic purpose policy exhausted",
      correlationId: input.context.correlationId,
    };
    const maximumAttempts =
      input.purpose === "EVALUATION_ACQUISITION"
        ? MAX_ACQUISITION_ATTEMPTS
        : INTERPRETATION_ROUTES.length;
    if (input.retryable && input.attemptNumber < maximumAttempts) {
      await this.repository.scheduleRetry(failure);
      return;
    }
    await this.repository.exhaustStage(failure);
  }
}

function browserAttemptRequest(
  batch: BrowserSamplingBatchContext,
  sample: BrowserSamplingBatchContext["samples"][number],
  resultIndex: number,
) {
  return {
    runId: batch.runId,
    cycleId: batch.cycleId,
    sampleId: sample.sampleId,
    purpose: "EVALUATION_ACQUISITION" as const,
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
      questionId: sample.questionId,
      externalTaskId:
        batch.externalTaskId ?? `idempotency:${batch.idempotencyKey}`,
      resultIndex,
    },
  };
}

function browserPlatformKey(platformKey: string): string {
  return (
    (
      {
        ernie: "wenxin",
        hunyuan: "yuanbao",
      } as Record<string, string>
    )[platformKey] ?? platformKey
  );
}

function deferredBrowserPoll(pollIntervalMs: number): EvaluationProcessResult {
  return {
    kind: "DEFERRED",
    resumeAt: new Date(Date.now() + pollIntervalMs),
  };
}

function browserBatchExpired(
  batch: BrowserSamplingBatchContext,
  maximumWaitMs: number,
): boolean {
  return (
    Date.now() - (batch.submittedAt ?? batch.createdAt).getTime() >=
    maximumWaitMs
  );
}

function expiredBrowserBatch(
  failureCode: "NETWORK" | "TIMEOUT",
): Extract<BrowserSamplingBatchState, { kind: "TERMINAL" }> {
  return {
    kind: "TERMINAL",
    status: "FAILED",
    items: [],
    collectionElapsedMs: null,
    failureCode,
    failureMessage: null,
  };
}
