import type {
  AiAdapterResult,
  StoredAiAttempt,
  SynthesisAiAttemptRequest,
} from "./ai-attempt.types.js";

export const AI_SYNTHESIS_ATTEMPT_REPOSITORY = Symbol(
  "AI_SYNTHESIS_ATTEMPT_REPOSITORY",
);

export interface AiSynthesisAttemptRepository {
  begin(request: SynthesisAiAttemptRequest): Promise<StoredAiAttempt>;
  finish(
    attemptId: string,
    result: AiAdapterResult,
    latencyMs: number,
  ): Promise<StoredAiAttempt>;
}
