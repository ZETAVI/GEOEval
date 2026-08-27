import type {
  AiAdapterResult,
  AiAttemptRequest,
  StoredAiAttempt,
} from "./ai-attempt.types.js";

export const AI_ATTEMPT_REPOSITORY = Symbol("AI_ATTEMPT_REPOSITORY");

export interface AiAttemptRepository {
  begin(request: AiAttemptRequest): Promise<StoredAiAttempt>;
  finish(
    attemptId: string,
    result: AiAdapterResult,
    latencyMs: number,
  ): Promise<StoredAiAttempt>;
}
