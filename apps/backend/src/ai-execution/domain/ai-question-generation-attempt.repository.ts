import type {
  AiAdapterResult,
  BegunAiAttempt,
  ResolvedQuestionGenerationAiAttemptRequest,
  StoredAiAttempt,
} from "./ai-attempt.types.js";
import type { AiSemanticRejection } from "./ai-attempt.envelope.js";

export const AI_QUESTION_GENERATION_ATTEMPT_REPOSITORY = Symbol(
  "AI_QUESTION_GENERATION_ATTEMPT_REPOSITORY",
);

export interface AiQuestionGenerationAttemptRepository {
  begin(
    request: ResolvedQuestionGenerationAiAttemptRequest,
    ambiguityTimeoutMs: number,
  ): Promise<BegunAiAttempt>;
  finish(
    attemptId: string,
    result: AiAdapterResult,
    latencyMs: number,
  ): Promise<StoredAiAttempt>;
  rejectSemantics(
    attemptId: string,
    rejection: AiSemanticRejection,
  ): Promise<StoredAiAttempt>;
}
