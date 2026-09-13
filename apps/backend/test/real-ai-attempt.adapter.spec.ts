import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  AcquisitionAttemptInput,
  AiAttemptRequest,
  StructuredOutputAttemptInput,
} from "../src/ai-execution/domain/ai-attempt.types.js";
import type { RealAiExecutionConfig } from "../src/ai-execution/infrastructure/ai-execution.config.js";
import { RealAiAttemptAdapter } from "../src/ai-execution/infrastructure/providers/real-ai-attempt.adapter.js";
import { REAL_AI_ROUTES } from "../src/ai-execution/infrastructure/providers/real-route.catalog.js";
import { EVALUATION_PLATFORM_POLICY } from "../src/geo-intelligence/evaluation-policy.js";

describe("real AI attempt adapters", () => {
  let fixture: ProviderFixtureServer;
  let adapter: RealAiAttemptAdapter;

  beforeEach(async () => {
    fixture = await ProviderFixtureServer.start();
    adapter = new RealAiAttemptAdapter(fixture.config());
  });

  afterEach(async () => {
    await fixture.close();
  });

  it("keeps frozen evaluation models aligned with the technical route allowlist", () => {
    const acquisitionRoutes = new Map(
      REAL_AI_ROUTES.filter(
        (route) => route.purpose === "EVALUATION_ACQUISITION",
      ).map((route) => [route.routePolicyId, route.requestedModel]),
    );
    expect(
      EVALUATION_PLATFORM_POLICY.map(({ routePolicyId, model }) => ({
        routePolicyId,
        model,
      })),
    ).toEqual(
      EVALUATION_PLATFORM_POLICY.map(({ routePolicyId }) => ({
        routePolicyId,
        model: acquisitionRoutes.get(routePolicyId),
      })),
    );
    expect(acquisitionRoutes.size).toBe(5);
  });

  it("maps all five sampling routes without losing answer, search, sources, usage, or provenance", async () => {
    for (const route of samplingRoutes) {
      const request = acquisitionRequest(route);
      const resolved = { ...request, ...adapter.resolve(request) };
      const result = await adapter.execute(resolved);
      expect(result).toMatchObject({
        kind: "SUCCEEDED",
        output: {
          kind: "ACQUISITION",
          answerContent: `answer:${route.routePolicyId}`,
          answerFormat: "MARKDOWN",
          searchObservation: "TRIGGERED",
          returnedModel: route.model,
        },
        usage: { input_tokens: 10, output_tokens: 5 },
        evidence: {
          providerKey: route.providerKey,
          returnedModel: route.model,
          searchObservation: "TRIGGERED",
        },
      });
      if (result.kind !== "SUCCEEDED") throw new Error("route failed");
      expect(result.output.sourceMetadata).toHaveLength(1);
    }
    expect(fixture.requests).toHaveLength(5);
    for (const observed of fixture.requests) {
      expect(JSON.stringify(observed.body)).toContain("客观、真实");
      expect(observed.authorization).toBe("Bearer fixture-key");
    }
  });

  it("uses the selected DeepSeek settings and preserves legacy structured routes", async () => {
    const routes = [
      {
        routePolicyId: "evaluation.interpretation.deepseek@1",
        model: "deepseek-v4-flash-0731",
      },
      {
        routePolicyId: "evaluation.interpretation.qwen-primary@2",
        model: "qwen3.8-flash",
      },
      {
        routePolicyId: "evaluation.interpretation.hy3-fallback@1",
        model: "hy3",
      },
      {
        routePolicyId: "evaluation.overall-synthesis.qwen-primary@1",
        model: "qwen3.8-flash",
        purpose: "OVERALL_SYNTHESIS" as const,
      },
      {
        routePolicyId: "evaluation.overall-synthesis.hy3-fallback@1",
        model: "hy3",
        purpose: "OVERALL_SYNTHESIS" as const,
      },
      {
        routePolicyId: "evaluation.brand-name-resolution.deepseek@1",
        model: "deepseek-v4-flash-0731",
        purpose: "BRAND_NAME_RESOLUTION" as const,
        enforcement: "JSON_OBJECT" as const,
      },
      {
        routePolicyId: "evaluation.report-composition.deepseek@1",
        model: "deepseek-v4-flash-0731",
        purpose: "REPORT_COMPOSITION" as const,
        enforcement: "JSON_OBJECT" as const,
      },
    ];
    for (const route of routes) {
      const request = structuredRequest(route);
      const result = await adapter.execute({
        ...request,
        ...adapter.resolve(request),
      });
      expect(result).toMatchObject({
        kind: "SUCCEEDED",
        output: { accepted: true, route: route.routePolicyId },
      });
    }
    const structured = fixture.requests.slice(-routes.length);
    for (const request of structured.filter((observed) =>
      observed.path.startsWith("/tokenhub"),
    )) {
      expect(request.body).toMatchObject({
        text: {
          format: {
            type: "json_schema",
            schema: { type: "object", additionalProperties: false },
          },
        },
      });
      expect(JSON.stringify(request.body)).not.toContain("web_search");
    }
    const modelStudioRequests = structured.filter((observed) =>
      observed.path.startsWith("/model-studio"),
    );
    const legacyThinking = modelStudioRequests.filter(
      (request) => request.body.enable_thinking === true,
    );
    expect(
      legacyThinking.map((request) => request.body.reasoning_effort),
    ).toEqual(["low", "medium"]);
    const selectedDeepSeek = modelStudioRequests.filter(
      (request) => request.body.model === "deepseek-v4-flash-0731",
    );
    expect(selectedDeepSeek).toHaveLength(3);
    for (const request of selectedDeepSeek) {
      expect(request.body).toMatchObject({
        enable_thinking: false,
        temperature: 0.6,
        max_tokens: 8192,
      });
    }
    expect(
      selectedDeepSeek.map(
        (request) => requiredResponseFormat(request.body).type,
      ),
    ).toEqual(["json_schema", "json_object", "json_object"]);
    for (const request of legacyThinking) {
      expect(request.path).toBe("/model-studio/chat/completions");
      expect(request.body).toMatchObject({
        enable_thinking: true,
        response_format: {
          type: "json_schema",
          json_schema: {
            strict: true,
            schema: { type: "object", additionalProperties: false },
          },
        },
      });
      expect(JSON.stringify(request.body)).not.toContain("web_search");
    }
  });

  it("classifies provider failures and rejects route or model drift", async () => {
    fixture.nextStatus = 429;
    const request = acquisitionRequest(samplingRoutes[0]!);
    const result = await adapter.execute({
      ...request,
      ...adapter.resolve(request),
    });
    expect(result).toMatchObject({
      kind: "FAILED",
      failureClass: "RATE_LIMIT_OR_QUOTA",
      retryable: true,
      evidence: { failure: { httpStatus: 429 } },
    });
    expect(() =>
      adapter.resolve({ ...request, requestedModel: "unexpected-model" }),
    ).toThrow("rejects model");
    expect(() =>
      adapter.resolve({ ...request, routePolicyId: "evaluation.unknown" }),
    ).toThrow("Unsupported real AI route");
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
    "maps HTTP %i to %s with retryable=%s",
    async (status, failureClass, retryable) => {
      fixture.nextStatus = status;
      const request = acquisitionRequest(samplingRoutes[0]!);
      const result = await adapter.execute({
        ...request,
        ...adapter.resolve(request),
      });
      expect(result).toMatchObject({
        kind: "FAILED",
        failureClass,
        retryable,
      });
    },
  );

  it("rejects a different returned model instead of silently relabeling it", async () => {
    fixture.returnedModelOverride = "different-model";
    const request = acquisitionRequest(samplingRoutes[0]!);
    const result = await adapter.execute({
      ...request,
      ...adapter.resolve(request),
    });
    expect(result).toMatchObject({
      kind: "FAILED",
      failureClass: "MODEL_IDENTITY_MISMATCH",
      retryable: false,
    });
  });

  it("uses UNKNOWN instead of guessing when a successful provider omits search evidence", async () => {
    fixture.omitSearchEvidence = true;
    const request = acquisitionRequest(samplingRoutes[0]!);
    const result = await adapter.execute({
      ...request,
      ...adapter.resolve(request),
    });
    expect(result).toMatchObject({
      kind: "SUCCEEDED",
      output: { searchObservation: "UNKNOWN", sourceMetadata: [] },
    });
  });

  it("uses NOT_TRIGGERED only when the provider returns an explicit zero search count", async () => {
    fixture.omitSearchEvidence = true;
    fixture.explicitNoSearch = true;
    fixture.includeReasoningText = true;
    const request = acquisitionRequest(samplingRoutes[0]!);
    const result = await adapter.execute({
      ...request,
      ...adapter.resolve(request),
    });
    expect(result).toMatchObject({
      kind: "SUCCEEDED",
      output: { searchObservation: "NOT_TRIGGERED" },
      evidence: {
        searchObservation: "NOT_TRIGGERED",
        reasoningEvidenceKind: "TEXT",
      },
    });
  });

  it("treats one absolute timeout as one retryable transport attempt", async () => {
    fixture.delayMs = 80;
    const timedAdapter = new RealAiAttemptAdapter({
      ...fixture.config(),
      requestTimeoutMs: 20,
    });
    const request = acquisitionRequest(samplingRoutes[0]!);
    const result = await timedAdapter.execute({
      ...request,
      ...timedAdapter.resolve(request),
    });
    expect(result).toMatchObject({
      kind: "FAILED",
      failureClass: "TIMEOUT",
      retryable: true,
      evidence: { failure: { kind: "TIMEOUT" } },
    });
    expect(fixture.requests).toHaveLength(1);
  });

  it("rejects structurally invalid successful output for a later purpose retry", async () => {
    fixture.invalidStructuredOutput = true;
    const request = structuredRequest({
      routePolicyId: "evaluation.interpretation.qwen-primary@2",
      model: "qwen3.8-flash",
    });
    const result = await adapter.execute({
      ...request,
      ...adapter.resolve(request),
    });
    expect(result).toMatchObject({
      kind: "FAILED",
      failureClass: "PROVIDER_RESPONSE_INVALID",
      retryable: true,
    });
  });
});

const samplingRoutes = [
  {
    routePolicyId: "evaluation.deepseek",
    model: "deepseek-v4-flash",
    providerKey: "tencent-tokenhub",
  },
  {
    routePolicyId: "evaluation.hunyuan",
    model: "hy3",
    providerKey: "tencent-tokenhub",
  },
  {
    routePolicyId: "evaluation.doubao",
    model: "doubao-seed-2-0-lite-260428",
    providerKey: "volcengine-ark",
  },
  {
    routePolicyId: "evaluation.qwen",
    model: "qwen3.7-flash",
    providerKey: "alibaba-model-studio",
  },
  {
    routePolicyId: "evaluation.ernie",
    model: "ernie-4.5-turbo-128k",
    providerKey: "baidu-qianfan",
  },
] as const;

function acquisitionRequest(route: (typeof samplingRoutes)[number]) {
  return {
    runId: "00000000-0000-4000-8000-000000000001",
    cycleId: "00000000-0000-4000-8000-000000000002",
    sampleId: "00000000-0000-4000-8000-000000000003",
    purpose: "EVALUATION_ACQUISITION",
    attemptNumber: 1,
    routePolicyId: route.routePolicyId,
    requestedModel: route.model,
    correlationId: "00000000-0000-4000-8000-000000000004",
    input: {
      taskKind: "EVALUATION_ACQUISITION",
      systemInstruction: "请保持客观、真实。",
      companyName: "星河咖啡实验店",
      query: `query:${route.routePolicyId}`,
      questionOrdinal: 1,
      platformLabel: route.routePolicyId,
      province: "广东省",
      city: "广州市",
    } satisfies AcquisitionAttemptInput,
  } as const satisfies AiAttemptRequest;
}

function structuredRequest(route: {
  routePolicyId: string;
  model: string;
  purpose?:
    "OVERALL_SYNTHESIS" | "BRAND_NAME_RESOLUTION" | "REPORT_COMPOSITION";
  enforcement?: "JSON_SCHEMA" | "JSON_OBJECT";
}) {
  const input = {
    taskKind: "STRUCTURED_OUTPUT",
    systemInstruction: "只输出符合结构的 JSON。",
    userContext: { route: route.routePolicyId },
    outputContract: {
      version: "fixture@1",
      jsonSchema: { type: "object", additionalProperties: false },
      ...(route.enforcement ? { enforcement: route.enforcement } : {}),
    },
  } satisfies StructuredOutputAttemptInput;
  const base = {
    runId: "00000000-0000-4000-8000-000000000001",
    cycleId: "00000000-0000-4000-8000-000000000002",
    purpose: route.purpose ?? ("EVALUATION_INTERPRETATION" as const),
    attemptNumber: 1,
    routePolicyId: route.routePolicyId,
    requestedModel: route.model,
    correlationId: "00000000-0000-4000-8000-000000000004",
    input,
  };
  return route.purpose
    ? (base satisfies AiAttemptRequest)
    : ({
        ...base,
        sampleId: "00000000-0000-4000-8000-000000000003",
      } satisfies AiAttemptRequest);
}

function requiredResponseFormat(body: Record<string, unknown>) {
  const value = body.response_format;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Fixture request has no response_format");
  }
  return value as { type?: unknown };
}

type ObservedRequest = {
  path: string;
  authorization: string | undefined;
  body: Record<string, unknown>;
};

class ProviderFixtureServer {
  readonly requests: ObservedRequest[] = [];
  nextStatus = 200;
  omitSearchEvidence = false;
  delayMs = 0;
  invalidStructuredOutput = false;
  returnedModelOverride: string | undefined;
  explicitNoSearch = false;
  includeReasoningText = false;

  private constructor(
    private readonly server: ReturnType<typeof createServer>,
    private readonly baseUrl: string,
  ) {}

  static async start(): Promise<ProviderFixtureServer> {
    let fixture: ProviderFixtureServer;
    const server = createServer((request, response) =>
      fixture.handle(request, response),
    );
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("fixture server has no TCP address");
    }
    fixture = new ProviderFixtureServer(
      server,
      `http://127.0.0.1:${address.port}`,
    );
    return fixture;
  }

  config(): RealAiExecutionConfig {
    return {
      mode: "real",
      requestTimeoutMs: 2_000,
      ambiguityTimeoutMs: 3_000,
      telemetry: { mode: "disabled" },
      tokenHub: { baseUrl: `${this.baseUrl}/tokenhub`, apiKey: "fixture-key" },
      ark: { baseUrl: `${this.baseUrl}/ark`, apiKey: "fixture-key" },
      modelStudio: {
        baseUrl: `${this.baseUrl}/model-studio`,
        apiKey: "fixture-key",
      },
      qianfan: { baseUrl: `${this.baseUrl}/qianfan`, apiKey: "fixture-key" },
    };
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) =>
      this.server.close((error) => (error ? reject(error) : resolve())),
    );
  }

  private async handle(request: IncomingMessage, response: ServerResponse) {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
      string,
      unknown
    >;
    this.requests.push({
      path: request.url ?? "",
      authorization: request.headers.authorization,
      body,
    });
    if (this.delayMs > 0) {
      const delay = this.delayMs;
      this.delayMs = 0;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const model = this.returnedModelOverride ?? String(body.model);
    this.returnedModelOverride = undefined;
    const routePolicyId = routeForRequest(request.url ?? "", body);
    const structured = isStructured(body);
    const outputText = structured
      ? this.invalidStructuredOutput
        ? "not-json"
        : JSON.stringify({ accepted: true, route: routePolicyId })
      : `answer:${routePolicyId}`;
    this.invalidStructuredOutput = false;
    const search = this.omitSearchEvidence
      ? {}
      : {
          search_results: [
            {
              type: "source",
              url: "https://example.invalid/source",
              title: "fixture source",
            },
          ],
        };
    response.statusCode = this.nextStatus;
    this.nextStatus = 200;
    response.setHeader("Content-Type", "application/json");
    response.setHeader("x-request-id", `request-${this.requests.length}`);
    response.end(
      JSON.stringify(
        request.url?.endsWith("/chat/completions")
          ? {
              id: `response-${this.requests.length}`,
              model,
              choices: [
                {
                  finish_reason: "stop",
                  message: { content: outputText, ...search },
                },
              ],
              ...(this.includeReasoningText
                ? { reasoning_content: "fixture reasoning" }
                : {}),
              usage: this.omitSearchEvidence
                ? {
                    input_tokens: 10,
                    output_tokens: 5,
                    ...(this.explicitNoSearch
                      ? { tool_usage: { web_search_call: 0 } }
                      : {}),
                  }
                : {
                    input_tokens: 10,
                    output_tokens: 5,
                    tool_usage: { web_search_call: 1 },
                  },
            }
          : {
              id: `response-${this.requests.length}`,
              model,
              output: [
                ...(!this.omitSearchEvidence && !structured
                  ? [
                      {
                        type: "web_search_call",
                        action: {
                          sources: [
                            {
                              type: "url",
                              url: "https://example.invalid/source",
                              title: "fixture source",
                            },
                          ],
                        },
                      },
                    ]
                  : []),
                {
                  type: "message",
                  content: [{ type: "output_text", text: outputText }],
                },
              ],
              usage: { input_tokens: 10, output_tokens: 5 },
            },
      ),
    );
    this.explicitNoSearch = false;
    this.includeReasoningText = false;
  }
}

function isStructured(body: Record<string, unknown>): boolean {
  return "text" in body || "response_format" in body;
}

function routeForRequest(path: string, body: Record<string, unknown>): string {
  const model = String(body.model);
  if (isStructured(body)) {
    const input =
      "input" in body
        ? body.input
        : (body.messages as Array<{ role: string; content: string }>).find(
            (message) => message.role === "user",
          )?.content;
    const context = JSON.parse(String(input)) as { route: string };
    return context.route;
  }
  if (model === "deepseek-v4-flash" && path.startsWith("/tokenhub")) {
    return "evaluation.deepseek";
  }
  if (model === "hy3") return "evaluation.hunyuan";
  if (model.startsWith("doubao")) return "evaluation.doubao";
  if (model.startsWith("qwen")) return "evaluation.qwen";
  return "evaluation.ernie";
}
