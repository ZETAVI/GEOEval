import type {
  AiAdapterResult,
  AiProviderEvidence,
} from "./ai-attempt.types.js";

export const AI_ATTEMPT_ENVELOPE_VERSION = "ai-attempt-envelope@1";

export function buildAttemptEnvelope(
  result: AiAdapterResult,
): Record<string, unknown> {
  return {
    schemaVersion: AI_ATTEMPT_ENVELOPE_VERSION,
    ...(result.kind === "SUCCEEDED" ? { normalizedOutput: result.output } : {}),
    ...(result.evidence ? { providerEvidence: result.evidence } : {}),
  };
}

export function readNormalizedAttemptOutput(
  envelope: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (envelope.schemaVersion !== AI_ATTEMPT_ENVELOPE_VERSION) {
    return envelope;
  }
  const output = envelope.normalizedOutput;
  return isRecord(output) ? output : undefined;
}

export function readProviderAttemptEvidence(
  envelope: Record<string, unknown>,
): AiProviderEvidence | undefined {
  if (envelope.schemaVersion !== AI_ATTEMPT_ENVELOPE_VERSION) return undefined;
  const evidence = envelope.providerEvidence;
  return isRecord(evidence) ? (evidence as AiProviderEvidence) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
