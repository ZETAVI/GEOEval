import type {
  AiAdapterResult,
  BegunAiAttempt,
  ResolvedSampleAiAttemptRequest,
  StoredAiAttempt,
} from "./ai-attempt.types.js";

export const AI_ATTEMPT_REPOSITORY = Symbol("AI_ATTEMPT_REPOSITORY");

export interface AiAttemptRepository {
  begin(
    request: ResolvedSampleAiAttemptRequest,
    ambiguityTimeoutMs: number,
  ): Promise<BegunAiAttempt>;
  finish(
    attemptId: string,
    result: AiAdapterResult,
    latencyMs: number,
  ): Promise<StoredAiAttempt>;
}
