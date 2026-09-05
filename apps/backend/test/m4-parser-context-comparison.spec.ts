import { describe, expect, it } from "vitest";

import { buildM4ParserComparison } from "../src/ai-execution/controlled-validation/m4-parser-comparison.js";
import {
  buildM4ContextVariants,
  presentM4StructuredRequest,
} from "../src/ai-execution/controlled-validation/m4-parser-context-comparison.js";

const source = buildM4ParserComparison().cases[0]!.request.input;
if (source.taskKind !== "STRUCTURED_OUTPUT") throw new Error("Parser required");

describe("M4 input ablation and diagnostic presentation", () => {
  it("changes context fields only, preserving identity, answer, Prompt and Schema", () => {
    const before = structuredClone(source);
    const { full, minimal } = buildM4ContextVariants(source);
    expect(minimal.systemInstruction).toBe(full.systemInstruction);
    expect(minimal.outputContract).toEqual(full.outputContract);
    expect(Object.keys(minimal.userContext)).toEqual([
      "companyName",
      "questionKind",
      "question",
      "originalAnswer",
    ]);
    for (const key of Object.keys(minimal.userContext))
      expect(minimal.userContext[key]).toBe(full.userContext[key]);
    expect(full.userContext).toEqual(before.userContext);
    expect(source).toEqual(before);
  });

  it("does not turn incomplete identity or unsupported scope into a valid experiment", () => {
    expect(() =>
      buildM4ContextVariants({
        ...source,
        userContext: { ...source.userContext, companyName: undefined },
      }),
    ).toThrow();
    expect(() =>
      buildM4ContextVariants({
        ...source,
        userContext: { ...source.userContext, questionKind: "BRAND_DIRECTED" },
      }),
    ).toThrow();
  });

  it("puts only actual messages in input and request controls in metadata without mutating wire data", () => {
    const request = envelope();
    const before = structuredClone(request);
    const result = presentM4StructuredRequest(request, "local-diagnostic");
    expect(result.input).toEqual(request.body.messages);
    expect(result.metadata.requestSettings).toEqual({
      response_format: request.body.response_format,
    });
    expect(result.metadata).toMatchObject({
      messageHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      reasoning_effort: "low",
    });
    expect(JSON.stringify(result.input)).not.toContain("contentHash");
    expect(result).not.toHaveProperty("headers");
    expect(result).not.toHaveProperty("task");
    expect(request).toEqual(before);
  });

  it("omits messages and schema content unless diagnostic mode is explicit", () => {
    const result = presentM4StructuredRequest(envelope());
    expect(result.input).toBeUndefined();
    expect(result.metadata.requestSettings).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("originalAnswer");
  });

  it("masks protected keys inside serialized messages and never copies envelope extras", () => {
    const request = envelope();
    request.body.messages[1]!.content = JSON.stringify({
      originalAnswer: "公开回答",
      apiKey: "fixture-secret",
      reasoningContent: "hidden reasoning",
    });
    const result = presentM4StructuredRequest(
      {
        ...request,
        headers: { Authorization: "Bearer fixture-secret" },
        rawResponse: "private envelope",
      },
      "local-diagnostic",
    );
    expect(JSON.parse(result.input![1]!.content)).toEqual({
      originalAnswer: "公开回答",
      apiKey: "[redacted]",
      reasoningContent: "[redacted]",
    });
    expect(JSON.stringify(result)).not.toContain("fixture-secret");
    expect(JSON.stringify(result)).not.toContain("private envelope");
  });

  it("rejects unsupported bodies rather than guessing the request", () => {
    expect(() =>
      presentM4StructuredRequest(
        { body: { input: "Responses body" } },
        "local-diagnostic",
      ),
    ).toThrow();
  });
});

function envelope() {
  return {
    method: "POST",
    url: "https://fixture.invalid/chat/completions",
    body: {
      model: "qwen3.8-flash",
      messages: [
        { role: "system", content: "记录原文" },
        {
          role: "user",
          content: JSON.stringify({
            companyName: "测试品牌",
            originalAnswer: "公开回答",
          }),
        },
      ],
      enable_thinking: true,
      reasoning_effort: "low",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fixture",
          strict: true,
          schema: {
            type: "object",
            properties: { result: { type: "string" } },
          },
        },
      },
    },
  };
}
