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
import {
  createModelStudioStructuredBody,
  createModelStudioAcquisitionBody,
} from "./model-studio-provider.adapter.js";
import {
  createTokenHubStructuredBody,
  createTokenHubAcquisitionBody,
} from "./tokenhub-provider.adapter.js";
import { createArkAcquisitionBody } from "./ark-provider.adapter.js";
import { createQianfanAcquisitionBody } from "./qianfan-provider.adapter.js";
import { consumeProviderJsonResponse } from "./provider-route.js";
import { REAL_AI_ROUTES } from "./real-route.catalog.js";

/** Provider semantics only; no connection, credential, transport or retry owner. */
export class RealAiNativeAttemptCodec implements AiNativeAttemptCodec {
  prepare(request: ResolvedAiAttemptRequest): PreparedNativeRequest {
    const { definition } = requiredNativeRoute(request);
    const input = request.input;
    const route = {
      providerKey: definition.providerKey,
      serviceClass: definition.serviceClass,
      protocol: definition.protocol,
      requestedModel: definition.requestedModel,
      method: "POST" as const,
    };
    if (input.taskKind === "EVALUATION_ACQUISITION") {
      const path =
        definition.protocol === "chat-completions"
          ? ("/chat/completions" as const)
          : ("/responses" as const);
      const body =
        definition.providerKey === "tencent-tokenhub"
          ? createTokenHubAcquisitionBody(definition, input)
          : definition.providerKey === "volcengine-ark"
            ? createArkAcquisitionBody(definition, input)
            : definition.providerKey === "baidu-qianfan"
              ? createQianfanAcquisitionBody(definition, input)
              : createModelStudioAcquisitionBody(definition, input);
      return { ...route, path, body };
    }
    if (input.taskKind !== "STRUCTURED_OUTPUT")
      throw new Error("Native acquisition input is invalid");
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
    const { definition } = requiredNativeRoute(request);
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

function requiredNativeRoute(request: ResolvedAiAttemptRequest) {
  if (!(
    (request.purpose === "EVALUATION_INTERPRETATION" &&
      request.input.taskKind === "STRUCTURED_OUTPUT") ||
    (request.purpose === "EVALUATION_ACQUISITION" &&
      request.input.taskKind === "EVALUATION_ACQUISITION")
  )) {
    throw new Error("Native codec supports Parser and native Acquisition only");
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
