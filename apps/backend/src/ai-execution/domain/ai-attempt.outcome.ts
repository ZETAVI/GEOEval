import type { AiAttemptOutcome, StoredAiAttempt } from "./ai-attempt.types.js";

export function toTerminalAiOutcome(
  attempt: StoredAiAttempt,
): AiAttemptOutcome | undefined {
  if (attempt.status === "SUCCEEDED" && attempt.responseEnvelope) {
    return {
      kind: "SUCCEEDED",
      attemptId: attempt.id,
      output: attempt.responseEnvelope,
    };
  }
  if (attempt.status === "FAILED" && attempt.failureClass) {
    return {
      kind: "FAILED",
      attemptId: attempt.id,
      failureClass: attempt.failureClass,
      retryable: attempt.retryable === true,
    };
  }
  return undefined;
}
