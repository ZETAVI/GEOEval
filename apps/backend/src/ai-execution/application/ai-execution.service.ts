import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  EXECUTION_CENTER_PARSER,
  type DelegatedParserExecutionService,
} from "./delegated-parser-execution.service.js";

import {
  AI_ATTEMPT_ADAPTER,
  AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS,
  type AiAttemptAdapter,
} from "../domain/ai-attempt.adapter.js";
import {
  AI_ATTEMPT_TELEMETRY,
  type AiAttemptTelemetry,
  NoopAiAttemptTelemetry,
} from "../domain/ai-attempt.telemetry.js";
import {
  AI_ATTEMPT_REPOSITORY,
  type AiAttemptRepository,
} from "../domain/ai-attempt.repository.js";
import { toTerminalAiOutcome } from "../domain/ai-attempt.outcome.js";
import type { AiSemanticRejection } from "../domain/ai-attempt.envelope.js";
import type {
  AiAdapterResult,
  AiAttemptOutcome,
  ResolvedSampleAiAttemptRequest,
  SampleAiExecutionOutcome,
  SampleAiAttemptRequest,
} from "../domain/ai-attempt.types.js";

@Injectable()
export class AiExecutionService {
  constructor(
    @Inject(AI_ATTEMPT_REPOSITORY)
    private readonly repository: AiAttemptRepository,
    @Inject(AI_ATTEMPT_ADAPTER)
    private readonly adapter: AiAttemptAdapter,
    @Inject(AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS)
    private readonly ambiguityTimeoutMs = 210_000,
    @Inject(AI_ATTEMPT_TELEMETRY)
    private readonly telemetry: AiAttemptTelemetry = new NoopAiAttemptTelemetry(),
    @Optional()
    @Inject(EXECUTION_CENTER_PARSER)
    private readonly remoteParser?: DelegatedParserExecutionService,
  ) {}

  async execute(
    request: SampleAiAttemptRequest,
  ): Promise<SampleAiExecutionOutcome> {
    const delegated = await this.remoteParser?.execute(request);
    if (delegated) return delegated;
    const route = this.adapter.resolve(request);
    const resolvedRequest = { ...request, ...route };
    const begun = await this.repository.begin(
      resolvedRequest,
      this.ambiguityTimeoutMs,
    );
    if (begun.kind === "DEFERRED") {
      return { kind: "DEFERRED", resumeAt: begun.resumeAt };
    }
    const completed = toTerminalAiOutcome(begun.attempt);
    if (completed) return completed;
    if (begun.kind !== "ACQUIRED") {
      throw new Error("AI attempt terminal state is unreadable");
    }

    const telemetry = this.telemetry.start(resolvedRequest);
    const startedAt = performance.now();
    const result = await this.adapter.execute(resolvedRequest);
    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));
    const stored = await this.repository.finish(
      begun.attempt.id,
      result,
      latencyMs,
    );
    telemetry.finish(result, latencyMs);
    const outcome = toTerminalAiOutcome(stored);
    if (!outcome) throw new Error("AI attempt did not reach a terminal state");
    return outcome;
  }

  async rejectSemantics(
    attemptId: string,
    rejection: AiSemanticRejection,
  ): Promise<void> {
    const attempt = await this.repository.rejectSemantics(attemptId, rejection);
    if (
      attempt.status !== "FAILED" ||
      attempt.failureClass !== rejection.failureClass
    ) {
      throw new Error("AI attempt semantic rejection was not persisted");
    }
  }

  async recordExternal(
    request: ResolvedSampleAiAttemptRequest,
    result: AiAdapterResult,
    latencyMs: number,
  ): Promise<Exclude<AiAttemptOutcome, { kind: "DEFERRED" }>> {
    const stored = await this.repository.recordExternal(
      request,
      result,
      latencyMs,
    );
    const outcome = toTerminalAiOutcome(stored);
    if (!outcome || outcome.kind === "DEFERRED") {
      throw new Error("External AI attempt did not reach a terminal state");
    }
    return outcome;
  }
}
