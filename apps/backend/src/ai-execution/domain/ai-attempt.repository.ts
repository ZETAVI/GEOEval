import type {
  AiAdapterResult,
  SampleAiAttemptRequest,
  StoredAiAttempt,
} from "./ai-attempt.types.js";

export const AI_ATTEMPT_REPOSITORY = Symbol("AI_ATTEMPT_REPOSITORY");

export interface AiAttemptRepository {
  begin(request: SampleAiAttemptRequest): Promise<StoredAiAttempt>;
  finish(
    attemptId: string,
    result: AiAdapterResult,
    latencyMs: number,
  ): Promise<StoredAiAttempt>;
}
