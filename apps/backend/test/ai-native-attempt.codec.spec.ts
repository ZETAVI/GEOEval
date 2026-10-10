import { describe, expect, it, vi } from "vitest";

import type { RawNativeProviderResponse } from "../src/ai-execution/domain/ai-native-attempt.codec.js";
import type {
  ResolvedAiAttemptRequest,
  StructuredOutputAttemptInput,
} from "../src/ai-execution/domain/ai-attempt.types.js";
import { ModelStudioProviderAdapter } from "../src/ai-execution/infrastructure/providers/model-studio-provider.adapter.js";
import { ProviderHttpTransport } from "../src/ai-execution/infrastructure/providers/provider-http.transport.js";
import type { ProviderRouteDefinition } from "../src/ai-execution/infrastructure/providers/provider-route.js";
import { RealAiNativeAttemptCodec } from "../src/ai-execution/infrastructure/providers/real-ai-native-attempt.codec.js";
import { REAL_AI_ROUTES } from "../src/ai-execution/infrastructure/providers/real-route.catalog.js";
import { TokenHubProviderAdapter } from "../src/ai-execution/infrastructure/providers/tokenhub-provider.adapter.js";

const codec = new RealAiNativeAttemptCodec();
const parserRoutes = REAL_AI_ROUTES.filter(
  (route) => route.purpose === "EVALUATION_INTERPRETATION",
);
const selectedRoute = parserRoutes.find(
  (route) => route.routePolicyId === "evaluation.interpretation.deepseek@1",
)!;

describe("native Parser preparation and consumption", () => {
  it("never performs physical calls while preparing or consuming an answer", () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("codec must not call Provider"));
    try {
      const request = parserRequest(selectedRoute);
      const prepared = codec.prepare(request);
      expect(codec.consume(request, prepared, rawResponse())).toMatchObject({
        kind: "SUCCEEDED",
      });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });

  it("prepares the selected Parser's exact native settings without credentials or a call", () => {
    const request = parserRequest(selectedRoute);
    const prepared = codec.prepare(request);
    expect(prepared).toEqual({
      providerKey: "alibaba-model-studio",
      serviceClass: "workspace-pay-as-you-go",
      protocol: "chat-completions",
      requestedModel: "deepseek-v4-flash-0731",
      method: "POST",
      path: "/chat/completions",
      body: {
        model: "deepseek-v4-flash-0731",
        messages: [
          { role: "system", content: request.input.systemInstruction },
          { role: "user", content: JSON.stringify(request.input.userContext) },
        ],
        enable_thinking: false,
        temperature: 0.6,
        max_tokens: 8192,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "sample-parser_1",
            strict: true,
            schema: request.input.outputContract.jsonSchema,
          },
        },
      },
    });
    expect(Object.keys(prepared).sort()).toEqual([
      "body",
      "method",
      "path",
      "protocol",
      "providerKey",
      "requestedModel",
      "serviceClass",
    ]);
    expect(JSON.stringify(prepared)).not.toContain("web_search");
    expect(JSON.stringify(prepared)).not.toContain("apiKey");
    expect(JSON.stringify(prepared)).not.toContain("baseUrl");
  });

  it.each(parserRoutes)(
    "preserves direct-call preparation and normalization for $routePolicyId",
    async (route) => {
      const request = parserRequest(route);
      const prepared = codec.prepare(request);
      const body = successfulBody(route);
      const responseHeaders = { "x-request-id": "fixture-request" };
      const transport = new ProviderHttpTransport(1_000);
      const send = vi.spyOn(transport, "send").mockResolvedValue({
        status: 200,
        ok: true,
        headers: responseHeaders,
        body,
      });
      const connection = {
        baseUrl: "https://provider.fixture.invalid",
        apiKey: "fixture-only-key",
      };
      const adapter =
        route.providerKey === "alibaba-model-studio"
          ? new ModelStudioProviderAdapter(connection, transport)
          : new TokenHubProviderAdapter(connection, transport);
      const direct = await adapter.execute(request, route);
      expect(send).toHaveBeenCalledExactlyOnceWith({
        url: connection.baseUrl + prepared.path,
        method: prepared.method,
        apiKey: connection.apiKey,
        body: prepared.body,
      });
      const restored = JSON.parse(JSON.stringify(prepared));
      const consumed = codec.consume(request, restored, {
        httpStatus: 200,
        safeHeaders: responseHeaders,
        bodyEncoding: "utf8",
        rawBody: JSON.stringify(body),
      });
      expect(consumed).toEqual({
        ...direct,
        evidence: {
          ...direct.evidence,
          sanitizedRequest: {
            method: prepared.method,
            path: prepared.path,
            body: prepared.body,
          },
        },
      });
      expect(send).toHaveBeenCalledTimes(1);
      expect(consumed).toMatchObject({
        kind: "SUCCEEDED",
        output: { accepted: true, detail: "完整回答，原样消费。" },
        usage: {
          prompt_tokens: 37,
          completion_tokens: 11,
          completion_tokens_details: { reasoning_tokens: 3 },
        },
        evidence: {
          returnedModel: route.requestedModel,
          requestId: "native-response",
          finishReason: route.protocol === "responses" ? "completed" : "stop",
          reasoningEvidenceKind: "TOKEN_COUNT",
          sourceMetadata: [
            {
              type: "url_citation",
              url: "https://source.fixture.invalid/a",
              title: "平台返回信源",
            },
          ],
        },
      });
    },
  );

  it("retains native JSON_OBJECT enforcement instead of silently strengthening it", () => {
    const request = parserRequest(selectedRoute);
    request.input.outputContract.enforcement = "JSON_OBJECT";
    expect(codec.prepare(request).body.response_format).toEqual({
      type: "json_object",
    });
  });

  it.each(["EVALUATION_ACQUISITION", "OVERALL_SYNTHESIS"] as const)(
    "clearly rejects unsupported purpose %s",
    (purpose) => {
      const request = {
        ...parserRequest(selectedRoute),
        purpose,
      } as ResolvedAiAttemptRequest;
      expect(() => codec.prepare(request)).toThrow(
        "supports EVALUATION_INTERPRETATION only",
      );
    },
  );

  it("rejects an unknown Parser route", () => {
    const request = parserRequest(selectedRoute);
    expect(() =>
      codec.prepare({
        ...request,
        routePolicyId: "evaluation.interpretation.unknown",
      }),
    ).toThrow("Unsupported native Parser route");
  });

  it.each([
    "providerKey",
    "serviceClass",
    "protocol",
    "requestedModel",
  ] as const)("rejects resolved %s drift", (field) => {
    const request = parserRequest(selectedRoute);
    expect(() => codec.prepare({ ...request, [field]: "changed" })).toThrow(
      `rejects ${field} drift`,
    );
  });

  it("rejects a prepared body or route that no longer matches its durable request", () => {
    const request = parserRequest(selectedRoute);
    const prepared = codec.prepare(request);
    prepared.body.model = "a-different-model";
    expect(() => codec.consume(request, prepared, rawResponse())).toThrow(
      "does not match the Parser attempt",
    );
  });

  it.each([
    [400, "INVALID_REQUEST", false],
    [401, "AUTHENTICATION_FAILED", false],
    [403, "ENTITLEMENT_OR_POLICY", false],
    [404, "MODEL_OR_ENDPOINT_NOT_FOUND", false],
    [408, "TIMEOUT", true],
    [409, "PROVIDER_UNAVAILABLE", true],
    [429, "RATE_LIMIT_OR_QUOTA", true],
    [500, "PROVIDER_UNAVAILABLE", true],
  ])(
    "retains native HTTP %i classification as %s",
    (httpStatus, failureClass, retryable) => {
      const request = parserRequest(selectedRoute);
      const result = codec.consume(
        request,
        codec.prepare(request),
        rawResponse({
          httpStatus,
          rawBody: JSON.stringify({
            error: { message: "fixture failure" },
            usage: { prompt_tokens: 2, completion_tokens: 0 },
          }),
        }),
      );
      expect(result).toMatchObject({
        kind: "FAILED",
        failureClass,
        retryable,
        usage: { prompt_tokens: 2, completion_tokens: 0 },
        evidence: { failure: { kind: failureClass, httpStatus } },
      });
    },
  );

  it("does not accept a provider's different model or fabricate identity", () => {
    const request = parserRequest(selectedRoute);
    const body = { ...successfulBody(selectedRoute), model: "different-model" };
    expect(
      codec.consume(
        request,
        codec.prepare(request),
        rawResponse({
          rawBody: JSON.stringify(body),
        }),
      ),
    ).toMatchObject({
      kind: "FAILED",
      failureClass: "MODEL_IDENTITY_MISMATCH",
      retryable: false,
      evidence: { returnedModel: "different-model" },
    });
  });

  it.each([
    "",
    "not JSON",
    "{}",
    "[]",
    JSON.stringify({
      model: selectedRoute.requestedModel,
      choices: [{ message: { content: "not structured JSON" } }],
    }),
    JSON.stringify({
      model: selectedRoute.requestedModel,
      choices: [{ message: { content: "[]" } }],
    }),
  ])("keeps malformed/empty native output invalid: %s", (rawBody) => {
    const request = parserRequest(selectedRoute);
    expect(
      codec.consume(
        request,
        codec.prepare(request),
        rawResponse({
          rawBody,
        }),
      ),
    ).toMatchObject({
      kind: "FAILED",
      failureClass: "PROVIDER_RESPONSE_INVALID",
      retryable: true,
    });
  });

  it("decodes reversible base64 before using the same Provider semantics", () => {
    const request = parserRequest(selectedRoute);
    const prepared = codec.prepare(request);
    const rawBody = JSON.stringify(successfulBody(selectedRoute));
    const plain = codec.consume(request, prepared, rawResponse({ rawBody }));
    const binary = codec.consume(
      request,
      prepared,
      rawResponse({
        bodyEncoding: "base64",
        rawBody: Buffer.from(rawBody).toString("base64"),
      }),
    );
    expect(binary).toEqual(plain);
  });

  it.each(["/w==", "not valid base64"])(
    "does not decode invalid UTF8/base64 as a successful Provider response",
    (rawBody) => {
      const request = parserRequest(selectedRoute);
      expect(
        codec.consume(
          request,
          codec.prepare(request),
          rawResponse({
            bodyEncoding: "base64",
            rawBody,
          }),
        ),
      ).toMatchObject({
        kind: "FAILED",
        failureClass: "PROVIDER_RESPONSE_INVALID",
      });
    },
  );
});

function parserRequest(route: ProviderRouteDefinition) {
  const input: StructuredOutputAttemptInput = {
    taskKind: "STRUCTURED_OUTPUT",
    systemInstruction: "仅解析原始回答，输出约定结构。",
    userContext: {
      originalAnswer: "回答中含中文、表格与来源。",
      question: "原始问题",
    },
    outputContract: {
      version: "sample-parser@1",
      jsonSchema: { type: "object", additionalProperties: false },
    },
  } satisfies StructuredOutputAttemptInput;
  return {
    runId: "00000000-0000-4000-8000-000000000001",
    cycleId: "00000000-0000-4000-8000-000000000002",
    sampleId: "00000000-0000-4000-8000-000000000003",
    purpose: "EVALUATION_INTERPRETATION",
    attemptNumber: 1,
    routePolicyId: route.routePolicyId,
    requestedModel: route.requestedModel,
    providerKey: route.providerKey,
    serviceClass: route.serviceClass,
    protocol: route.protocol,
    correlationId: "00000000-0000-4000-8000-000000000004",
    input,
  } satisfies ResolvedAiAttemptRequest;
}

function successfulBody(route: ProviderRouteDefinition) {
  const text = JSON.stringify({
    accepted: true,
    detail: "完整回答，原样消费。",
  });
  return {
    id: "native-response",
    model: route.requestedModel,
    ...(route.protocol === "responses"
      ? { status: "completed", output_text: text }
      : { choices: [{ finish_reason: "stop", message: { content: text } }] }),
    annotations: [
      {
        type: "url_citation",
        url: "https://source.fixture.invalid/a",
        title: "平台返回信源",
      },
    ],
    usage: {
      prompt_tokens: 37,
      completion_tokens: 11,
      completion_tokens_details: { reasoning_tokens: 3 },
    },
  };
}

function rawResponse(
  overrides: Partial<RawNativeProviderResponse> = {},
): RawNativeProviderResponse {
  return {
    httpStatus: 200,
    safeHeaders: { "x-request-id": "fixture-request" },
    bodyEncoding: "utf8",
    rawBody: JSON.stringify(successfulBody(selectedRoute)),
    ...overrides,
  };
}
