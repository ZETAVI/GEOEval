import { isDeepStrictEqual } from "node:util";

import type {
  AiNativeAttemptCodec,
  PreparedNativeRequest,
  RawNativeProviderResponse,
} from "../../domain/ai-native-attempt.codec.js";
import type {
  AiAdapterResult,
  ResolvedAiAttemptRequest,
} from "../../domain/ai-attempt.types.js";
import { createModelStudioStructuredBody } from "./model-studio-provider.adapter.js";
import { createTokenHubStructuredBody } from "./tokenhub-provider.adapter.js";
import { consumeProviderJsonResponse } from "./provider-route.js";
import { REAL_AI_ROUTES } from "./real-route.catalog.js";

/** Parser-only native codec; no connection, credential, transport or retry owner. */
export class RealAiNativeAttemptCodec implements AiNativeAttemptCodec {
  prepare(request: ResolvedAiAttemptRequest): PreparedNativeRequest {
    const { definition, input } = requiredParserRoute(request);
    const route = {
      providerKey: definition.providerKey,
      serviceClass: definition.serviceClass,
      protocol: definition.protocol,
      requestedModel: definition.requestedModel,
      method: "POST" as const,
    };
    if (
      definition.providerKey === "alibaba-model-studio" &&
      definition.protocol === "chat-completions"
    ) {
      return {
        ...route,
        path: "/chat/completions",
        body: createModelStudioStructuredBody(definition, input),
      };
    }
    if (
      definition.providerKey === "tencent-tokenhub" &&
      definition.protocol === "responses"
    ) {
      return {
        ...route,
        path: "/responses",
        body: createTokenHubStructuredBody(definition, input),
      };
    }
    throw new Error(`Unsupported native Parser route ${request.routePolicyId}`);
  }

  consume(
    request: ResolvedAiAttemptRequest,
    prepared: PreparedNativeRequest,
    response: RawNativeProviderResponse,
  ): AiAdapterResult {
    const { definition } = requiredParserRoute(request);
    if (!isDeepStrictEqual(prepared, this.prepare(request))) {
      throw new Error(
        "Prepared native request does not match the Parser attempt",
      );
    }
    const body = parseRawBody(response);
    return consumeProviderJsonResponse({
      request,
      definition,
      sanitizedRequest: {
        method: prepared.method,
        path: prepared.path,
        body: prepared.body,
      },
      response: {
        status: response.httpStatus,
        ok: response.httpStatus >= 200 && response.httpStatus < 300,
        headers: response.safeHeaders,
        body,
      },
    });
  }
}

function requiredParserRoute(request: ResolvedAiAttemptRequest) {
  if (
    request.purpose !== "EVALUATION_INTERPRETATION" ||
    request.input.taskKind !== "STRUCTURED_OUTPUT"
  ) {
    throw new Error("Native codec supports EVALUATION_INTERPRETATION only");
  }
  const definition = REAL_AI_ROUTES.find(
    (route) => route.routePolicyId === request.routePolicyId,
  );
  if (!definition || definition.purpose !== request.purpose) {
    throw new Error(`Unsupported native Parser route ${request.routePolicyId}`);
  }
  for (const field of [
    "providerKey",
    "serviceClass",
    "protocol",
    "requestedModel",
  ] as const) {
    if (request[field] !== definition[field]) {
      throw new Error(`Native Parser route rejects ${field} drift`);
    }
  }
  return { definition, input: request.input };
}

function parseRawBody(response: RawNativeProviderResponse): unknown {
  let text = response.rawBody;
  if (response.bodyEncoding === "base64") {
    const bytes = Buffer.from(response.rawBody, "base64");
    if (bytes.toString("base64") !== response.rawBody) return response.rawBody;
    try {
      text = new TextDecoder("utf-8", {
        fatal: true,
        ignoreBOM: true,
      }).decode(bytes);
    } catch {
      return response.rawBody;
    }
  }
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
