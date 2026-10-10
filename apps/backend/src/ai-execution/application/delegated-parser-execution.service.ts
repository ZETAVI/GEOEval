import { createHash } from "node:crypto";
import type { AiAttemptAdapter } from "../domain/ai-attempt.adapter.js";
import type { AiAttemptRepository } from "../domain/ai-attempt.repository.js";
import type { AiNativeAttemptCodec } from "../domain/ai-native-attempt.codec.js";
import { toTerminalAiOutcome } from "../domain/ai-attempt.outcome.js";
import type {
  SampleAiAttemptRequest,
  SampleAiExecutionOutcome,
  StoredAiAttempt,
  ResolvedSampleAiAttemptRequest,
} from "../domain/ai-attempt.types.js";
import type {
  ExecutionCenterReceiptRepository,
  ExecutionCenterStoredRequest,
  ExecutionCenterReceipt,
} from "../domain/execution-center-receipt.repository.js";
import {
  ExecutionCenterClient,
  ExecutionCenterClientError,
} from "../infrastructure/execution-center.client.js";
import type { ParserExecutionCenterConfig } from "../infrastructure/execution-center.config.js";

export const EXECUTION_CENTER_PARSER = Symbol("EXECUTION_CENTER_PARSER");
export class DelegatedParserExecutionService {
  constructor(
    private readonly attempts: AiAttemptRepository,
    private readonly receipts: ExecutionCenterReceiptRepository,
    private readonly adapter: AiAttemptAdapter,
    private readonly codec: AiNativeAttemptCodec,
    private readonly client: ExecutionCenterClient | null,
    private readonly config: ParserExecutionCenterConfig | undefined,
    private readonly timeoutMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async execute(
    request: SampleAiAttemptRequest,
  ): Promise<SampleAiExecutionOutcome | undefined> {
    const parser = request.purpose === "EVALUATION_INTERPRETATION";
    if (!parser && request.input.taskKind !== "EVALUATION_ACQUISITION")
      return undefined;
    if (request.executionChannel === "WEB") return undefined;
    const prior = await this.attempts.find?.(request);
    if (prior && prior.executionTransport !== "EXECUTION_CENTER")
      return undefined;
    if (
      !prior &&
      !(parser ? this.config?.enabled : this.config?.acquisitionEnabled)
    )
      return undefined;
    const resolved = { ...request, ...this.adapter.resolve(request) };
    const begun = prior
      ? {
          kind: "DEFERRED" as const,
          attempt: prior,
          resumeAt: new Date(this.now() + 1000),
        }
      : await this.attempts.begin(
          resolved,
          this.timeoutMs + 30_000,
          "EXECUTION_CENTER",
        );
    const terminal = toTerminalAiOutcome(begun.attempt);
    if (terminal) return terminal;
    if (begun.attempt.executionTransport !== "EXECUTION_CENTER")
      return undefined;
    let receipt = await this.receipts.findByAttempt(begun.attempt.id);
    if ((!this.client || !this.config) && receipt?.state !== "READY")
      return this.failure(begun.attempt, "REMOTE_TRANSPORT_UNAVAILABLE", false);
    if (!receipt) {
      const prepared = this.codec.prepare(resolved);
      const endpoint =
        this.config!.endpoints[prepared.providerKey + ":" + prepared.protocol];
      if (!endpoint)
        return this.failure(
          begun.attempt,
          "REMOTE_ENDPOINT_UNAVAILABLE",
          false,
        );
      const ownDeadline = begun.attempt.startedAt.getTime() + this.timeoutMs;
      const acquisitionDeadline =
        begun.attempt.executionDeadlineAt?.getTime() ?? request.deadlineAt;
      const deadlineAt =
        !parser && acquisitionDeadline !== undefined
          ? Math.min(ownDeadline, acquisitionDeadline)
          : ownDeadline;
      if (!Number.isSafeInteger(deadlineAt) || deadlineAt <= this.now())
        return this.failure(begun.attempt, "REMOTE_DEADLINE_EXCEEDED", false);
      const callerRequestRef =
        (parser ? "geo:parser:" : "geo:acquisition:") + begun.attempt.id;
      const input: ExecutionCenterStoredRequest = {
        contractVersion: "execution.v1",
        callerRequestRef,
        channel: "api",
        deadlineAt,
        items: [{ itemId: request.sampleId }],
        api: {
          ...endpoint,
          bodyEncoding: "json",
          body: prepared.body,
          headers: { "Content-Type": "application/json" },
        },
        metadata: {
          purpose: parser
            ? "evaluation.interpretation"
            : "evaluation.acquisition",
          attemptId: begun.attempt.id,
          correlationId: request.correlationId,
          runId: request.runId,
          cycleId: request.cycleId,
          sampleId: request.sampleId,
        },
      };
      receipt = await this.receipts.reserve({
        attemptId: begun.attempt.id,
        centerRef: this.config!.centerRef,
        callerRequestRef,
        idempotencyKey:
          (parser ? "geo-parser/" : "geo-acquisition/") + begun.attempt.id,
        requestFingerprint: fingerprint(input),
        request: input,
        deadlineAt: new Date(deadlineAt),
      });
    }
    if (this.config && receipt.centerRef !== this.config.centerRef)
      return this.failure(begun.attempt, "REMOTE_CONFIGURATION_DRIFT", false);
    if (receipt.state !== "READY" && !receipt.taskId) {
      try {
        const snapshot = await this.client!.submit(
          receipt.idempotencyKey,
          receipt.request,
        );
        receipt = await this.receipts.recordSnapshot(receipt.id, snapshot);
      } catch (error) {
        receipt =
          (await this.receipts.findByAttempt(begun.attempt.id)) ?? receipt;
        if (receipt.state !== "READY" && !receipt.taskId) {
          if (
            error instanceof ExecutionCenterClientError &&
            !error.outcomeUnknown
          ) {
            return this.failure(
              begun.attempt,
              "EXECUTION_CENTER_REJECTED",
              false,
            );
          }
          if (this.now() >= receipt.deadlineAt.getTime())
            return this.failure(begun.attempt, "REMOTE_OUTCOME_UNKNOWN", false);
          return { kind: "DEFERRED", resumeAt: new Date(this.now() + 1000) };
        }
      }
    }
    if (receipt.state !== "READY" || !receipt.snapshot) {
      return { kind: "REMOTE_PENDING", attemptId: begun.attempt.id };
    }
    return this.consumeReceipt(receipt, begun.attempt, resolved);
  }

  /** Finish technical Acquisition facts even after Web won or the report advanced. No physical call. */
  async consumeReadyAcquisition(
    receipt: ExecutionCenterReceipt,
  ): Promise<SampleAiExecutionOutcome | undefined> {
    if (
      receipt.business.purpose !== "EVALUATION_ACQUISITION" ||
      receipt.state !== "READY" ||
      !receipt.snapshot
    )
      return undefined;
    const attempt = await this.attempts.find?.({
      cycleId: receipt.business.cycleId,
      sampleId: receipt.business.sampleId,
      purpose: "EVALUATION_ACQUISITION",
      attemptNumber: receipt.business.attemptNumber,
      executionChannel: "API",
    });
    if (
      !attempt ||
      attempt.id !== receipt.attemptId ||
      attempt.executionTransport !== "EXECUTION_CENTER"
    )
      throw new Error("REMOTE_ATTEMPT_IDENTITY_MISMATCH");
    const terminal = toTerminalAiOutcome(attempt);
    if (terminal) return terminal;
    const source = receipt.originalAttempt;
    if (
      !source ||
      source.request.purpose !== "EVALUATION_ACQUISITION" ||
      source.request.input.taskKind !== "EVALUATION_ACQUISITION"
    )
      return this.failure(
        attempt,
        "REMOTE_ORIGINAL_REQUEST_UNAVAILABLE",
        false,
      );
    const resolved = {
      ...source.request,
      ...this.adapter.resolve(source.request),
    };
    if (resolved.providerKey !== source.providerKey)
      return this.failure(attempt, "REMOTE_REQUEST_DRIFT", false);
    return this.consumeReceipt(receipt, attempt, resolved);
  }

  private async consumeReceipt(
    receipt: ExecutionCenterReceipt,
    attempt: StoredAiAttempt,
    resolved: ResolvedSampleAiAttemptRequest,
  ): Promise<SampleAiExecutionOutcome> {
    const item = receipt.snapshot!.items[0]!;
    if (item.state !== "RESULT_AVAILABLE" || !isRecord(item.result)) {
      const unknown =
        item.state === "OUTCOME_UNKNOWN" || item.error?.outcomeUnknown === true;
      return this.failure(
        attempt,
        unknown ? "REMOTE_OUTCOME_UNKNOWN" : "REMOTE_EXECUTION_FAILED",
        false,
      );
    }
    const raw = item.result;
    if (
      raw.kind !== "api" ||
      raw.transportStatus !== "RESPONSE_RECEIVED" ||
      typeof raw.httpStatus !== "number" ||
      !isRecord(raw.safeHeaders) ||
      typeof raw.rawBody !== "string" ||
      !["utf8", "base64"].includes(String(raw.bodyEncoding))
    ) {
      return this.failure(attempt, "REMOTE_RESPONSE_INVALID", false);
    }
    const prepared = this.codec.prepare(resolved);
    const api = receipt.request.api;
    if (!isRecord(api) || canonical(api.body) !== canonical(prepared.body)) {
      return this.failure(attempt, "REMOTE_REQUEST_DRIFT", false);
    }
    const result = this.codec.consume(resolved, prepared, {
      httpStatus: raw.httpStatus,
      safeHeaders: raw.safeHeaders as Record<string, string>,
      rawBody: raw.rawBody,
      bodyEncoding: raw.bodyEncoding as "utf8" | "base64",
    });
    const stored = await this.attempts.finish(
      attempt.id,
      result,
      Math.max(0, this.now() - attempt.startedAt.getTime()),
    );
    const outcome = toTerminalAiOutcome(stored);
    if (!outcome)
      throw new Error("Delegated Parser terminal result was not persisted");
    return outcome;
  }

  async reconcile(signal?: AbortSignal): Promise<number> {
    let recovered = 0;
    let afterId: string | undefined;
    do {
      const candidates = await this.receipts.listReconciliationCandidates({
        limit: 100,
        ...(afterId ? { afterId } : {}),
      });
      if (!candidates.length) break;
      for (const receipt of candidates) {
        if (signal?.aborted) return recovered;
        try {
          if (receipt.state === "READY") {
            if (await this.consumeReadyAcquisition(receipt)) recovered++;
            continue;
          }
          if (
            !this.client ||
            !this.config ||
            receipt.centerRef !== this.config.centerRef
          )
            continue;
          const snapshot = receipt.taskId
            ? await this.client.read(receipt.taskId)
            : await this.client.submit(receipt.idempotencyKey, receipt.request);
          const stored = await this.receipts.recordSnapshot(
            receipt.id,
            snapshot,
          );
          if (stored.state === "READY") {
            await this.consumeReadyAcquisition(stored);
            recovered++;
          }
        } catch {
          // Identity/key remain durable. Notification replay or a later reconciliation resumes them.
        }
      }
      afterId = candidates.at(-1)!.id;
    } while (true);
    return recovered;
  }

  private async failure(
    attempt: StoredAiAttempt,
    failureClass: string,
    retryable: boolean,
  ): Promise<SampleAiExecutionOutcome> {
    const stored = await this.attempts.finish(
      attempt.id,
      { kind: "FAILED", failureClass, retryable },
      Math.max(0, this.now() - attempt.startedAt.getTime()),
    );
    const outcome = toTerminalAiOutcome(stored);
    if (!outcome) throw new Error("Delegated Parser failure was not persisted");
    return outcome;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (isRecord(value))
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
function fingerprint(input: ExecutionCenterStoredRequest): string {
  const { metadata: _metadata, trace: _trace, ...semantic } = input;
  return createHash("sha256").update(canonical(semantic)).digest("hex");
}
