import { describe, expect, it } from "vitest";
import { buildM4ParserComparison } from "../src/ai-execution/controlled-validation/m4-parser-comparison.js";
import {
  buildM4EvidenceFirstTask,
  buildM4SubjectGroundedTask,
  m4EvidenceFirstSchema,
  projectM4EvidenceFirstOutput,
} from "../src/ai-execution/controlled-validation/m4-parser-evidence-first.js";

const source = buildM4ParserComparison().cases[0]!;
if (source.request.input.taskKind !== "STRUCTURED_OUTPUT")
  throw new Error("Expected Parser task");
const base = source.request.input;
const context = {
  questionKind: "INDUSTRY_RECOMMENDATION" as const,
  companyName: "星河咖啡实验店",
  originalAnswer: String(base.userContext.originalAnswer),
};
const quote = (exactText: string) => ({ exactText, occurrence: 1 });
const secondLine = context.originalAnswer.split("\n")[1]!;
const valid = () => ({
  answerStructure: "ORDERED_LIST",
  target: {
    displayedForms: [context.companyName],
    mentionEvidence: [quote(secondLine)],
    positionEvidence: [quote(secondLine)],
    position: 2,
    role: "RECOMMENDED",
    observations: [],
  },
  otherBrands: ["云栖咖啡", "林间咖啡"].map((displayName, index) => ({
    displayName,
    observedForms: [displayName],
    role: "RECOMMENDED",
    relativePosition: index === 0 ? 1 : 3,
    positionKind: "RECOMMENDATION",
    evidence: [quote(context.originalAnswer.split("\n")[index === 0 ? 0 : 2]!)],
  })),
  cardInterpretation: "该回答将星河咖啡实验店列在第二位。",
  limitations: [],
});

describe("M4 evidence-first experimental contract", () => {
  it("isolates P3 instruction from P2 input, Schema and acceptance", () => {
    const p2 = buildM4EvidenceFirstTask(base);
    const p3 = buildM4SubjectGroundedTask(base);
    expect(p3.systemInstruction).not.toBe(p2.systemInstruction);
    expect({ ...p3, systemInstruction: p2.systemInstruction }).toEqual(p2);
    expect(() =>
      source.validateOutput(
        projectM4EvidenceFirstOutput(valid(), context).modelOutput,
      ),
    ).not.toThrow();
  });

  it("preserves input and reuses the current acceptance path", () => {
    const task = buildM4EvidenceFirstTask(base);
    expect(task.userContext).toEqual(base.userContext);
    expect(task.outputContract.version).toBe(
      "experiment.m4.parser-evidence-first@1",
    );
    const result = projectM4EvidenceFirstOutput(valid(), context);
    expect(result.projected).toMatchObject({ mentioned: true, position: 2 });
    expect(result.modelOutput.semantic.targetPositionEvidence).toEqual([
      quote(secondLine),
    ]);
    expect(() => source.validateOutput(result.modelOutput)).not.toThrow();
  });

  it("cannot represent a mentioned result with missing evidence", () => {
    for (const key of [
      "displayedForms",
      "mentionEvidence",
      "positionEvidence",
    ] as const) {
      const value = valid();
      value.target[key] = [];
      expect(m4EvidenceFirstSchema.safeParse(value).success).toBe(false);
    }
  });

  it("still rejects an invented rank quote and does not repair it", () => {
    const value = valid();
    value.target.positionEvidence = [quote("并不存在的位置证据")];
    expect(m4EvidenceFirstSchema.safeParse(value).success).toBe(true);
    expect(() => projectM4EvidenceFirstOutput(value, context)).toThrow(
      "target-position anchor",
    );
  });

  it("preserves valid no-mention meaning without forced evidence", () => {
    const value = {
      ...valid(),
      target: null,
      cardInterpretation: "该回答未提及当前品牌。",
    };
    expect(
      projectM4EvidenceFirstOutput(value, {
        ...context,
        companyName: "不存在的目标品牌",
      }).projected,
    ).toMatchObject({ mentioned: false, position: null });
  });

  it("does not claim coverage of direct questions", () => {
    expect(() =>
      buildM4EvidenceFirstTask({
        ...base,
        userContext: { ...base.userContext, questionKind: "BRAND_DIRECTED" },
      }),
    ).toThrow("open questions only");
    expect(() =>
      buildM4SubjectGroundedTask({
        ...base,
        userContext: { ...base.userContext, questionKind: "BRAND_DIRECTED" },
      }),
    ).toThrow("open questions only");
  });
});
