import { describe, expect, it } from "vitest";
import {
  buildM4ParserComparison,
  executeM4ParserComparison,
  m4ParserComparisonPlan,
} from "../src/ai-execution/controlled-validation/m4-parser-comparison.js";
import type { AiAttemptAdapter } from "../src/ai-execution/domain/ai-attempt.adapter.js";

describe("M4 Parser experimental boundary", () => {
  it("pairs four fixtures while changing only the instruction", () => {
    const batch = buildM4ParserComparison();
    expect(batch.cases.map((item) => item.fixtureId)).toEqual([
      "P01-P0",
      "P01-P1",
      "P03-P1",
      "P03-P0",
      "P05-P0",
      "P05-P1",
      "P07-P1",
      "P07-P0",
    ]);
    for (let index = 0; index < 8; index += 2) {
      const a = batch.cases[index]!.request;
      const b = batch.cases[index + 1]!.request;
      expect(a.input.systemInstruction).not.toBe(b.input.systemInstruction);
      expect({ ...a, input: { ...a.input, systemInstruction: "" } }).toEqual({
        ...b,
        input: { ...b.input, systemInstruction: "" },
      });
    }
  });

  it("binds confirmation to actual prompt, input, Schema and route definitions", () => {
    const baseline = m4ParserComparisonPlan();
    for (const field of [
      "systemInstruction",
      "userContext",
      "outputContract",
    ] as const) {
      const batch = buildM4ParserComparison();
      const input = batch.cases[0]!.request.input;
      if (input.taskKind !== "STRUCTURED_OUTPUT") throw new Error("wrong task");
      if (field === "systemInstruction") input.systemInstruction += " changed";
      if (field === "userContext")
        input.userContext = { ...input.userContext, question: "changed" };
      if (field === "outputContract")
        input.outputContract = { ...input.outputContract, jsonSchema: {} };
      expect(m4ParserComparisonPlan(batch).confirmation).not.toBe(
        baseline.confirmation,
      );
    }
    expect(
      baseline.manifest.calls.every(
        (item) => item.structuredReasoningEffort === "low",
      ),
    ).toBe(true);
    expect(JSON.stringify(baseline)).not.toContain("originalAnswer");
  });

  it("rejects changed scope and stale approval before using any adapter", async () => {
    const batch = buildM4ParserComparison();
    batch.cases.pop();
    expect(() => m4ParserComparisonPlan(batch)).toThrow("scope drifted");
    await expect(
      executeM4ParserComparison({
        adapter: {} as AiAttemptAdapter,
        confirmation: "not-approved",
        evidenceRoot: "/unused-m4-evidence",
      }),
    ).rejects.toThrow("exact request confirmation does not match");
  });
});
