import { createHash } from "node:crypto";

import { startObservation, type LangfuseGeneration } from "@langfuse/tracing";

import type {
  AiAttemptTelemetry,
  AiAttemptTelemetryHandle,
} from "../domain/ai-attempt.telemetry.js";
import type {
  AiAdapterResult,
  ResolvedAiAttemptRequest,
} from "../domain/ai-attempt.types.js";
import type { AiTelemetryContentMode } from "./ai-execution.config.js";
import { maskTelemetryData } from "./ai-telemetry.mask.js";

const observationVersion = "geoeval.ai-attempt.telemetry@1";
const inputProjectionVersion = "geoeval.ai-attempt.input@1";
const outputProjectionVersion = "geoeval.ai-attempt.output@1";

export class LangfuseAiAttemptTelemetry implements AiAttemptTelemetry {
  constructor(
    private readonly contentMode: AiTelemetryContentMode = "metadata-only",
  ) {}

  start(request: ResolvedAiAttemptRequest): AiAttemptTelemetryHandle {
    const input =
      this.contentMode === "local-diagnostic"
        ? diagnosticInputProjection(request)
        : undefined;
    const observation = startObservation(
      observationName(request.purpose),
      {
        model: request.requestedModel,
        version: observationVersion,
        ...(input === undefined ? {} : { input }),
        metadata: {
          correlationId: request.correlationId,
          ...(request.purpose === "EVALUATION_QUESTION_GENERATION"
            ? {
                preparationId: request.preparationId,
                sequence: request.sequence,
              }
            : { runId: request.runId, cycleId: request.cycleId }),
          ...("sampleId" in request ? { sampleId: request.sampleId } : {}),
          purpose: request.purpose,
          routePolicyId: request.routePolicyId,
          providerKey: request.providerKey,
          serviceClass: request.serviceClass,
          protocol: request.protocol,
          attemptNumber: request.attemptNumber,
          contentMode: this.contentMode,
        },
      },
      { asType: "generation" },
    );
    return {
      finish: (result, latencyMs) =>
        finishObservation(observation, result, latencyMs, this.contentMode),
    };
  }
}

function finishObservation(
  observation: LangfuseGeneration,
  result: AiAdapterResult,
  latencyMs: number,
  contentMode: AiTelemetryContentMode,
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
    ...(contentMode === "local-diagnostic"
      ? { output: diagnosticOutputProjection(result) }
      : {}),
  });
  observation.end();
}

export function diagnosticInputProjection(
  request: ResolvedAiAttemptRequest,
): unknown {
  if (request.input.taskKind === "BROWSER_EVALUATION_ACQUISITION") {
    return maskTelemetryData(
      {
        schemaVersion: inputProjectionVersion,
        purpose: request.purpose,
        task: {
          taskKind: request.input.taskKind,
          platformKey: request.input.platformKey,
          questionId: request.input.questionId,
          externalTaskId: request.input.externalTaskId,
          resultIndex: request.input.resultIndex,
        },
      },
      "local-diagnostic",
    );
  }
  const prompt = {
    systemInstruction: request.input.systemInstruction,
    contentHash: createHash("sha256")
      .update(request.input.systemInstruction)
      .digest("hex"),
  };
  const projection =
    request.input.taskKind === "EVALUATION_ACQUISITION"
      ? {
          schemaVersion: inputProjectionVersion,
          purpose: request.purpose,
          prompt,
          task: {
            taskKind: request.input.taskKind,
            companyName: request.input.companyName,
            query: request.input.query,
            questionOrdinal: request.input.questionOrdinal,
            platformLabel: request.input.platformLabel,
            location: {
              province: request.input.province,
              city: request.input.city,
            },
          },
        }
      : {
          schemaVersion: inputProjectionVersion,
          purpose: request.purpose,
          prompt,
          task: {
            taskKind: request.input.taskKind,
            userContext: request.input.userContext,
            outputContract: {
              version: request.input.outputContract.version,
              enforcement:
                request.input.outputContract.enforcement ?? "JSON_SCHEMA",
              ...(request.input.outputContract.enforcement === "JSON_OBJECT"
                ? {}
                : { jsonSchema: request.input.outputContract.jsonSchema }),
            },
          },
        };
  return maskTelemetryData(projection, "local-diagnostic");
}

export function diagnosticOutputProjection(result: AiAdapterResult): unknown {
  const projection =
    result.kind === "SUCCEEDED"
      ? {
          schemaVersion: outputProjectionVersion,
          status: result.kind,
          normalizedOutput: result.output,
        }
      : {
          schemaVersion: outputProjectionVersion,
          status: result.kind,
          failure: {
            failureClass: result.failureClass,
            retryable: result.retryable,
          },
        };
  return maskTelemetryData(projection, "local-diagnostic");
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
    case "BRAND_NAME_RESOLUTION":
      return "ai.evaluation.brand-name-resolution";
    case "REPORT_COMPOSITION":
      return "ai.evaluation.report-composition";
    case "EVALUATION_QUESTION_GENERATION":
      return "ai.evaluation.question-generation";
  }
}
