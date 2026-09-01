import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SafeAiAttemptTelemetry,
  type AiAttemptTelemetry,
} from "../src/ai-execution/domain/ai-attempt.telemetry.js";
import type { ResolvedAiAttemptRequest } from "../src/ai-execution/domain/ai-attempt.types.js";
import { maskTelemetryData } from "../src/ai-execution/infrastructure/ai-telemetry.runtime.js";

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
