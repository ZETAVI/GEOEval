import type {
  AiAdapterResult,
  AiExecutionPurpose,
  ResolvedAiAttemptRequest,
  ResolvedAiRoute,
} from "../../domain/ai-attempt.types.js";
import type { RealProviderConnection } from "../ai-execution.config.js";
import {
  normalizeProviderResponse,
  providerEvidence,
} from "./provider-normalization.js";
import {
  ProviderHttpTransport,
  ProviderTransportError,
} from "./provider-http.transport.js";

export type RealRoutePurpose = AiExecutionPurpose | "OVERALL_SYNTHESIS";

export type ProviderRouteDefinition = ResolvedAiRoute & {
  routePolicyId: string;
  purpose: RealRoutePurpose;
  structuredReasoningEffort?: "low" | "medium" | "xhigh" | undefined;
};

export interface ProviderRouteAdapter {
  readonly providerKey: string;
  execute(
    request: ResolvedAiAttemptRequest,
    definition: ProviderRouteDefinition,
  ): Promise<AiAdapterResult>;
}

export async function executeProviderJsonRequest(input: {
  request: ResolvedAiAttemptRequest;
  definition: ProviderRouteDefinition;
  connection: RealProviderConnection;
  transport: ProviderHttpTransport;
  path: string;
  body: Record<string, unknown>;
}): Promise<AiAdapterResult> {
  const url = `${input.connection.baseUrl}${input.path}`;
  const sanitizedRequest = {
    method: "POST",
    url,
    body: input.body,
  };
  try {
    const response = await input.transport.send({
      url,
      method: "POST",
      apiKey: input.connection.apiKey,
      body: input.body,
    });
    const normalized = normalizeProviderResponse(
      response.body,
      response.headers,
    );
    const evidence = providerEvidence({
      providerKey: input.definition.providerKey,
      serviceClass: input.definition.serviceClass,
      protocol: input.definition.protocol,
      sanitizedRequest,
      responseHeaders: response.headers,
      rawResponse: response.body,
      normalized,
    });
    if (!response.ok) {
      const failure = classifyHttpFailure(response.status);
      return {
        kind: "FAILED",
        ...failure,
        ...(normalized.usage ? { usage: normalized.usage } : {}),
        evidence: {
          ...evidence,
          failure: {
            kind: failure.failureClass,
            httpStatus: response.status,
          },
        },
      };
    }
    if (!normalized.returnedModel) {
      return invalidProviderOutput(evidence, normalized.usage);
    }
    if (normalized.returnedModel !== input.definition.requestedModel) {
      return {
        kind: "FAILED",
        failureClass: "MODEL_IDENTITY_MISMATCH",
        retryable: false,
        ...(normalized.usage ? { usage: normalized.usage } : {}),
        evidence: {
          ...evidence,
          failure: { kind: "MODEL_IDENTITY_MISMATCH" },
        },
      };
    }
    if (!normalized.outputText) {
      return invalidProviderOutput(evidence, normalized.usage);
    }
    const output = normalizedOutput(
      input.request,
      normalized.outputText,
      normalized,
    );
    if (!output) return invalidProviderOutput(evidence, normalized.usage);
    return {
      kind: "SUCCEEDED",
      output,
      ...(normalized.usage ? { usage: normalized.usage } : {}),
      evidence,
    };
  } catch (error) {
    if (!(error instanceof ProviderTransportError)) throw error;
    return {
      kind: "FAILED",
      failureClass: error.failureClass,
      retryable: error.retryable,
      evidence: {
        providerKey: input.definition.providerKey,
        serviceClass: input.definition.serviceClass,
        protocol: input.definition.protocol,
        sanitizedRequest,
        failure: { kind: error.failureClass },
      },
    };
  }
}

function normalizedOutput(
  request: ResolvedAiAttemptRequest,
  outputText: string,
  normalized: ReturnType<typeof normalizeProviderResponse>,
): Record<string, unknown> | undefined {
  if (request.purpose === "EVALUATION_ACQUISITION") {
    return {
      kind: "ACQUISITION",
      answerContent: outputText,
      answerFormat: "MARKDOWN",
      sourceMetadata: normalized.sourceMetadata,
      searchObservation: normalized.searchObservation,
      returnedModel: normalized.returnedModel,
    };
  }
  try {
    const value = JSON.parse(outputText) as unknown;
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function invalidProviderOutput(
  evidence: ReturnType<typeof providerEvidence>,
  usage?: Record<string, unknown>,
): AiAdapterResult {
  return {
    kind: "FAILED",
    failureClass: "PROVIDER_RESPONSE_INVALID",
    retryable: true,
    ...(usage ? { usage } : {}),
    evidence: {
      ...evidence,
      failure: { kind: "PROVIDER_RESPONSE_INVALID" },
    },
  };
}

function classifyHttpFailure(status: number): {
  failureClass: string;
  retryable: boolean;
} {
  if (status === 400) {
    return { failureClass: "INVALID_REQUEST", retryable: false };
  }
  if (status === 401) {
    return { failureClass: "AUTHENTICATION_FAILED", retryable: false };
  }
  if (status === 403) {
    return { failureClass: "ENTITLEMENT_OR_POLICY", retryable: false };
  }
  if (status === 404) {
    return { failureClass: "MODEL_OR_ENDPOINT_NOT_FOUND", retryable: false };
  }
  if (status === 408 || status === 504) {
    return { failureClass: "TIMEOUT", retryable: true };
  }
  if (status === 409 || status === 429 || status >= 500) {
    return {
      failureClass:
        status === 429 ? "RATE_LIMIT_OR_QUOTA" : "PROVIDER_UNAVAILABLE",
      retryable: true,
    };
  }
  return { failureClass: "PROVIDER_ERROR", retryable: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
