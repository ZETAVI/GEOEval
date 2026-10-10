import type {
  AiAdapterResult,
  BegunAiAttempt,
  ResolvedSampleAiAttemptRequest,
  StoredAiAttempt,
} from "./ai-attempt.types.js";
import type { AiSemanticRejection } from "./ai-attempt.envelope.js";

export const AI_ATTEMPT_REPOSITORY = Symbol("AI_ATTEMPT_REPOSITORY");

export interface AiAttemptRepository {
  begin(
    request: ResolvedSampleAiAttemptRequest,
    ambiguityTimeoutMs: number,
    executionTransport?: "DIRECT" | "EXECUTION_CENTER",
  ): Promise<BegunAiAttempt>;
  find?(
    request: Pick<
      ResolvedSampleAiAttemptRequest,
      "cycleId" | "sampleId" | "purpose" | "attemptNumber"
    >,
  ): Promise<StoredAiAttempt | null>;
  finish(
    attemptId: string,
    result: AiAdapterResult,
    latencyMs: number,
  ): Promise<StoredAiAttempt>;
  recordExternal(
    request: ResolvedSampleAiAttemptRequest,
    result: AiAdapterResult,
    latencyMs: number,
  ): Promise<StoredAiAttempt>;
  rejectSemantics(
    attemptId: string,
    rejection: AiSemanticRejection,
  ): Promise<StoredAiAttempt>;
}
