import { createHash } from "node:crypto";
import type { AiAttemptAdapter } from "../domain/ai-attempt.adapter.js";
import type { AiAttemptRepository } from "../domain/ai-attempt.repository.js";
import type { AiNativeAttemptCodec } from "../domain/ai-native-attempt.codec.js";
import { toTerminalAiOutcome } from "../domain/ai-attempt.outcome.js";
import type {
  SampleAiAttemptRequest,
  SampleAiExecutionOutcome,
  StoredAiAttempt,
} from "../domain/ai-attempt.types.js";
import type {
  ExecutionCenterReceiptRepository,
  ExecutionCenterStoredRequest,
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
    if (request.purpose !== "EVALUATION_INTERPRETATION") return undefined;
    const prior = await this.attempts.find?.(request);
    if (prior && prior.executionTransport !== "EXECUTION_CENTER")
      return undefined;
    if (!prior && !this.config?.enabled) return undefined;
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
      const deadlineAt = begun.attempt.startedAt.getTime() + this.timeoutMs;
      const callerRequestRef = "geo:parser:" + begun.attempt.id;
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
          purpose: "evaluation.interpretation",
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
        idempotencyKey: "geo-parser/" + begun.attempt.id,
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
    const item = receipt.snapshot.items[0]!;
    if (item.state !== "RESULT_AVAILABLE" || !isRecord(item.result)) {
      const unknown =
        item.state === "OUTCOME_UNKNOWN" || item.error?.outcomeUnknown === true;
      return this.failure(
        begun.attempt,
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
      return this.failure(begun.attempt, "REMOTE_RESPONSE_INVALID", false);
    }
    const prepared = this.codec.prepare(resolved);
    const api = receipt.request.api;
    if (!isRecord(api) || canonical(api.body) !== canonical(prepared.body)) {
      return this.failure(begun.attempt, "REMOTE_REQUEST_DRIFT", false);
    }
    const result = this.codec.consume(resolved, prepared, {
      httpStatus: raw.httpStatus,
      safeHeaders: raw.safeHeaders as Record<string, string>,
      rawBody: raw.rawBody,
      bodyEncoding: raw.bodyEncoding as "utf8" | "base64",
    });
    const stored = await this.attempts.finish(
      begun.attempt.id,
      result,
      Math.max(0, this.now() - begun.attempt.startedAt.getTime()),
    );
    const outcome = toTerminalAiOutcome(stored);
    if (!outcome)
      throw new Error("Delegated Parser terminal result was not persisted");
    return outcome;
  }

  async reconcile(signal?: AbortSignal): Promise<number> {
    if (!this.client || !this.config) return 0;
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
        if (receipt.centerRef !== this.config.centerRef) continue;
        try {
          const snapshot = receipt.taskId
            ? await this.client.read(receipt.taskId)
            : await this.client.submit(receipt.idempotencyKey, receipt.request);
          const stored = await this.receipts.recordSnapshot(
            receipt.id,
            snapshot,
          );
          if (stored.state === "READY") recovered++;
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
