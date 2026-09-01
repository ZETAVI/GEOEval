import type {
  AiAdapterResult,
  BegunAiAttempt,
  ResolvedSynthesisAiAttemptRequest,
  StoredAiAttempt,
} from "./ai-attempt.types.js";
import type { AiSemanticRejection } from "./ai-attempt.envelope.js";

export const AI_SYNTHESIS_ATTEMPT_REPOSITORY = Symbol(
  "AI_SYNTHESIS_ATTEMPT_REPOSITORY",
);

export interface AiSynthesisAttemptRepository {
  begin(
    request: ResolvedSynthesisAiAttemptRequest,
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
