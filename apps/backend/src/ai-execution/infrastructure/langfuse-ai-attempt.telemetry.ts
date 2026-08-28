import { startObservation, type LangfuseGeneration } from "@langfuse/tracing";

import type {
  AiAttemptTelemetry,
  AiAttemptTelemetryHandle,
} from "../domain/ai-attempt.telemetry.js";
import type {
  AiAdapterResult,
  ResolvedAiAttemptRequest,
} from "../domain/ai-attempt.types.js";

export class LangfuseAiAttemptTelemetry implements AiAttemptTelemetry {
  start(request: ResolvedAiAttemptRequest): AiAttemptTelemetryHandle {
    const observation = startObservation(
      observationName(request.purpose),
      {
        model: request.requestedModel,
        metadata: {
          correlationId: request.correlationId,
          runId: request.runId,
          cycleId: request.cycleId,
          ...("sampleId" in request ? { sampleId: request.sampleId } : {}),
          purpose: request.purpose,
          routePolicyId: request.routePolicyId,
          providerKey: request.providerKey,
          serviceClass: request.serviceClass,
          protocol: request.protocol,
          attemptNumber: request.attemptNumber,
        },
      },
      { asType: "generation" },
    );
    return {
      finish: (result, latencyMs) =>
        finishObservation(observation, result, latencyMs),
    };
  }
}

function finishObservation(
  observation: LangfuseGeneration,
  result: AiAdapterResult,
  latencyMs: number,
) {
  const usage = usageDetails(result.usage);
  observation.update({
    ...(result.evidence?.returnedModel
      ? { model: result.evidence.returnedModel }
      : {}),
    level: result.kind === "SUCCEEDED" ? "DEFAULT" : "ERROR",
    statusMessage:
      result.kind === "SUCCEEDED" ? "SUCCEEDED" : result.failureClass,
    metadata: {
      status: result.kind,
      latencyMs,
      ...(result.kind === "FAILED"
        ? {
            failureClass: result.failureClass,
            retryable: result.retryable,
          }
        : {}),
      ...(result.evidence?.searchObservation
        ? { searchObservation: result.evidence.searchObservation }
        : {}),
      ...(result.evidence?.reasoningEvidenceKind
        ? { reasoningEvidenceKind: result.evidence.reasoningEvidenceKind }
        : {}),
    },
    ...(usage ? { usageDetails: usage } : {}),
  });
  observation.end();
}

function usageDetails(
  usage: Record<string, unknown> | undefined,
): Record<string, number> | undefined {
  if (!usage) return undefined;
  const input = firstNumber(usage, ["input_tokens", "prompt_tokens", "input"]);
  const output = firstNumber(usage, [
    "output_tokens",
    "completion_tokens",
    "output",
  ]);
  if (input === undefined && output === undefined) return undefined;
  return {
    ...(input !== undefined ? { input } : {}),
    ...(output !== undefined ? { output } : {}),
  };
}

function firstNumber(
  value: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function observationName(purpose: ResolvedAiAttemptRequest["purpose"]) {
  switch (purpose) {
    case "EVALUATION_ACQUISITION":
      return "ai.evaluation.acquisition";
    case "EVALUATION_INTERPRETATION":
      return "ai.evaluation.interpretation";
    case "OVERALL_SYNTHESIS":
      return "ai.evaluation.overall-synthesis";
  }
}
