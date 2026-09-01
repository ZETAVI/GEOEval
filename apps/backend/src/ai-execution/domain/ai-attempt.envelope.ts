import type {
  AiAdapterResult,
  AiProviderEvidence,
} from "./ai-attempt.types.js";

export const AI_ATTEMPT_ENVELOPE_VERSION = "ai-attempt-envelope@1";

export type AiSemanticRejection = {
  failureClass: "SEMANTIC_CONTRACT_REJECTED";
  modelContractVersion: string;
  domainContractVersion: string;
};

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

export function appendSemanticRejection(
  envelope: Record<string, unknown>,
  rejection: AiSemanticRejection,
): Record<string, unknown> {
  if (envelope.schemaVersion !== AI_ATTEMPT_ENVELOPE_VERSION) {
    throw new Error("Semantic rejection requires a versioned attempt envelope");
  }
  return {
    ...envelope,
    semanticDisposition: {
      kind: "REJECTED",
      ...rejection,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
