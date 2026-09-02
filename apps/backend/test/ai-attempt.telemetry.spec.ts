import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SafeAiAttemptTelemetry,
  type AiAttemptTelemetry,
} from "../src/ai-execution/domain/ai-attempt.telemetry.js";
import type { ResolvedAiAttemptRequest } from "../src/ai-execution/domain/ai-attempt.types.js";
import { maskTelemetryData } from "../src/ai-execution/infrastructure/ai-telemetry.runtime.js";
import {
  diagnosticInputProjection,
  diagnosticOutputProjection,
} from "../src/ai-execution/infrastructure/langfuse-ai-attempt.telemetry.js";

describe("AI attempt telemetry isolation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("turns start and finish exporter failures into warnings instead of business failures", () => {
    vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const startFailure = new SafeAiAttemptTelemetry({
      start: () => {
        throw new Error("start unavailable");
      },
    });
    expect(() => startFailure.start(request).finish(success, 25)).not.toThrow();

    const finishFailure = new SafeAiAttemptTelemetry({
      start: () => ({
        finish: () => {
          throw new Error("finish unavailable");
        },
      }),
    } satisfies AiAttemptTelemetry);
    expect(() =>
      finishFailure.start(request).finish(success, 25),
    ).not.toThrow();
    expect(process.stderr.write).toHaveBeenCalledTimes(2);
  });

  it("redacts prompt, answer, raw, credential, and secret fields before export", () => {
    expect(
      maskTelemetryData({
        routePolicyId: "evaluation.deepseek",
        nested: {
          prompt: "private prompt",
          answerContent: "private answer",
          rawResponse: { token: "private response" },
          apiKey: "secret key",
          retained: "technical status",
        },
      }),
    ).toEqual({
      routePolicyId: "evaluation.deepseek",
      nested: {
        prompt: "[redacted]",
        answerContent: "[redacted]",
        rawResponse: "[redacted]",
        apiKey: "[redacted]",
        retained: "technical status",
      },
    });
  });

  it("preserves only allowed local diagnostic content after serialized masking", () => {
    const serialized = JSON.stringify({
      prompt: { systemInstruction: "controlled prompt" },
      normalizedOutput: {
        answerContent: "controlled answer",
        apiKey: "secret-key",
        rawResponse: { answer: "raw-provider-answer" },
        reasoningContent: "private chain of thought",
      },
      Authorization: "Bearer private-token",
    });

    expect(
      JSON.parse(maskTelemetryData(serialized, "local-diagnostic") as string),
    ).toEqual({
      prompt: { systemInstruction: "controlled prompt" },
      normalizedOutput: {
        answerContent: "controlled answer",
        apiKey: "[redacted]",
        rawResponse: "[redacted]",
        reasoningContent: "[redacted]",
      },
      Authorization: "[redacted]",
    });
    expect(
      maskTelemetryData(
        "Authorization: Bearer inline-private-token",
        "local-diagnostic",
      ),
    ).toBe("Authorization=[redacted] [redacted]");

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(maskTelemetryData(cyclic, "local-diagnostic")).toBe("[redacted]");
  });

  it("builds versioned local input and normalized success/failure projections", () => {
    expect(diagnosticInputProjection(request)).toMatchObject({
      schemaVersion: "geoeval.ai-attempt.input@1",
      purpose: "EVALUATION_ACQUISITION",
      prompt: {
        systemInstruction: "private",
        contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      task: {
        taskKind: "EVALUATION_ACQUISITION",
        companyName: "private",
        query: "private",
        location: { province: "广东省", city: "广州市" },
      },
    });
    expect(diagnosticOutputProjection(success)).toEqual({
      schemaVersion: "geoeval.ai-attempt.output@1",
      status: "SUCCEEDED",
      normalizedOutput: { kind: "ACQUISITION" },
    });
    expect(
      diagnosticOutputProjection({
        kind: "FAILED",
        failureClass: "PROVIDER_TIMEOUT",
        retryable: true,
        evidence: {
          providerKey: "fixture",
          serviceClass: "fixture",
          protocol: "fixture",
          rawResponse: "must-not-enter-projection",
        },
      }),
    ).toEqual({
      schemaVersion: "geoeval.ai-attempt.output@1",
      status: "FAILED",
      failure: {
        failureClass: "PROVIDER_TIMEOUT",
        retryable: true,
      },
    });

    expect(diagnosticInputProjection(structuredRequest)).toEqual({
      schemaVersion: "geoeval.ai-attempt.input@1",
      purpose: "OVERALL_SYNTHESIS",
      prompt: {
        systemInstruction: "controlled synthesis instruction",
        contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      task: {
        taskKind: "STRUCTURED_OUTPUT",
        userContext: {
          brand: "controlled fictional brand",
          apiKey: "[redacted]",
          rawResponse: "[redacted]",
        },
        outputContract: {
          version: "overall-synthesis-model@1",
          jsonSchema: {
            type: "object",
            properties: { summary: { type: "string" } },
          },
        },
      },
    });
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
    systemInstruction: "private",
    companyName: "private",
    query: "private",
    questionOrdinal: 1,
    platformLabel: "DeepSeek",
    province: "广东省",
    city: "广州市",
  },
} as const satisfies ResolvedAiAttemptRequest;

const success = {
  kind: "SUCCEEDED",
  output: { kind: "ACQUISITION" },
} as const;

const structuredRequest = {
  runId: "00000000-0000-4000-8000-000000000011",
  cycleId: "00000000-0000-4000-8000-000000000012",
  purpose: "OVERALL_SYNTHESIS",
  attemptNumber: 1,
  routePolicyId: "overall.qwen",
  providerKey: "model-studio",
  serviceClass: "model",
  protocol: "responses",
  requestedModel: "qwen3.8-flash",
  correlationId: "00000000-0000-4000-8000-000000000014",
  input: {
    taskKind: "STRUCTURED_OUTPUT",
    systemInstruction: "controlled synthesis instruction",
    userContext: {
      brand: "controlled fictional brand",
      apiKey: "must-always-be-redacted",
      rawResponse: "must-never-enter-projection",
    },
    outputContract: {
      version: "overall-synthesis-model@1",
      jsonSchema: {
        type: "object",
        properties: { summary: { type: "string" } },
      },
    },
  },
} as const satisfies ResolvedAiAttemptRequest;
