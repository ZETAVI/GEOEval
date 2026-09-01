import { createServer } from "node:http";

import { describe, expect, it } from "vitest";

import type { ResolvedAiAttemptRequest } from "../src/ai-execution/domain/ai-attempt.types.js";
import { AiTelemetryRuntime } from "../src/ai-execution/infrastructure/ai-telemetry.runtime.js";
import { LangfuseAiAttemptTelemetry } from "../src/ai-execution/infrastructure/langfuse-ai-attempt.telemetry.js";

describe("Langfuse telemetry runtime", () => {
  it("exports one masked technical generation and shuts down without owning business state", async () => {
    const requests: Array<{
      url: string;
      contentType?: string;
      bytes: number;
    }> = [];
    const server = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      requests.push({
        url: request.url ?? "",
        ...(request.headers["content-type"]
          ? { contentType: request.headers["content-type"] }
          : {}),
        bytes: Buffer.concat(chunks).length,
      });
      response.statusCode = 200;
      response.setHeader("Content-Type", "application/json");
      response.end("{}");
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("telemetry fixture server has no TCP address");
    }
    const runtime = new AiTelemetryRuntime({
      mode: "langfuse",
      publicKey: "public-fixture",
      secretKey: "secret-fixture",
      baseUrl: `http://127.0.0.1:${address.port}`,
      environment: "test",
    });
    try {
      runtime.onApplicationBootstrap();
      const handle = new LangfuseAiAttemptTelemetry().start(request);
      handle.finish(
        {
          kind: "SUCCEEDED",
          output: { answerContent: "must-not-be-exported" },
          usage: { input_tokens: 12, output_tokens: 7 },
          evidence: {
            providerKey: "tencent-tokenhub",
            serviceClass: "platform",
            protocol: "chat-completions",
            returnedModel: "deepseek-v4-flash",
            searchObservation: "TRIGGERED",
            reasoningEvidenceKind: "TEXT",
            rawResponse: { answer: "must-not-be-exported" },
          },
        },
        42,
      );
      await runtime.onModuleDestroy();
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: "/api/public/otel/v1/traces",
    });
    expect(requests[0]!.bytes).toBeGreaterThan(0);
  });
});

const request = {
  runId: "00000000-0000-4000-8000-000000000001",
  cycleId: "00000000-0000-4000-8000-000000000002",
  sampleId: "00000000-0000-4000-8000-000000000003",
  purpose: "EVALUATION_ACQUISITION",
  attemptNumber: 1,
  routePolicyId: "evaluation.deepseek",
  providerKey: "tencent-tokenhub",
  serviceClass: "platform",
  protocol: "chat-completions",
  requestedModel: "deepseek-v4-flash",
  correlationId: "00000000-0000-4000-8000-000000000004",
  input: {
    taskKind: "EVALUATION_ACQUISITION",
    systemInstruction: "must-not-be-exported",
    companyName: "must-not-be-exported",
    query: "must-not-be-exported",
    questionOrdinal: 1,
    platformLabel: "DeepSeek",
    province: "广东省",
    city: "广州市",
  },
} as const satisfies ResolvedAiAttemptRequest;
