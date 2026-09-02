import { createServer } from "node:http";

import { describe, expect, it } from "vitest";

import type { ResolvedAiAttemptRequest } from "../src/ai-execution/domain/ai-attempt.types.js";
import { AiTelemetryRuntime } from "../src/ai-execution/infrastructure/ai-telemetry.runtime.js";
import { LangfuseAiAttemptTelemetry } from "../src/ai-execution/infrastructure/langfuse-ai-attempt.telemetry.js";

describe("Langfuse telemetry runtime", () => {
  it("exports controlled local content, keeps metadata-only empty, and isolates exporter failure", async () => {
    const requests: Array<{
      url: string;
      contentType?: string;
      body: Buffer;
    }> = [];
    const server = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      requests.push({
        url: request.url ?? "",
        ...(request.headers["content-type"]
          ? { contentType: request.headers["content-type"] }
          : {}),
        body,
      });
      response.statusCode = 400;
      response.setHeader("Content-Type", "application/json");
      response.end('{"error":"fixture rejected export"}');
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
      contentMode: "local-diagnostic",
      release: "issue-44-test-revision",
    });
    try {
      runtime.onApplicationBootstrap();
      const metadataOnly = new LangfuseAiAttemptTelemetry(
        "metadata-only",
      ).start(request);
      metadataOnly.finish(
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
      const diagnostic = new LangfuseAiAttemptTelemetry(
        "local-diagnostic",
      ).start({
        ...request,
        input: {
          ...request.input,
          systemInstruction: "controlled local prompt",
          companyName: "controlled fictional brand",
          query: "controlled local task",
        },
      });
      diagnostic.finish(
        {
          kind: "SUCCEEDED",
          output: {
            answerContent: "controlled normalized answer",
            apiKey: "must-always-be-redacted",
            rawResponse: "raw-provider-envelope",
            reasoningContent: "private-reasoning-chain",
          },
          usage: { input_tokens: 15, output_tokens: 9 },
        },
        48,
      );
      await runtime.onModuleDestroy();
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0]).toMatchObject({
      url: "/api/public/otel/v1/traces",
    });
    const exported = Buffer.concat(requests.map(({ body }) => body)).toString(
      "utf8",
    );
    expect(exported).toContain("geoeval.ai-attempt.input@1");
    expect(exported).toContain("issue-44-test-revision");
    expect(exported).toContain("controlled local prompt");
    expect(exported).toContain("controlled normalized answer");
    expect(exported).not.toContain("must-not-be-exported");
    expect(exported).not.toContain("must-always-be-redacted");
    expect(exported).not.toContain("raw-provider-envelope");
    expect(exported).not.toContain("private-reasoning-chain");
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
