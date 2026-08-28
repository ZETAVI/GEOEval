import type { AiAttemptOutcome, StoredAiAttempt } from "./ai-attempt.types.js";
import { readNormalizedAttemptOutput } from "./ai-attempt.envelope.js";

export function toTerminalAiOutcome(
  attempt: StoredAiAttempt,
): AiAttemptOutcome | undefined {
  if (attempt.status === "SUCCEEDED" && attempt.responseEnvelope) {
    const output = readNormalizedAttemptOutput(attempt.responseEnvelope);
    if (!output) return undefined;
    return {
      kind: "SUCCEEDED",
      attemptId: attempt.id,
      output,
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
