import { describe, expect, it } from "vitest";
import { buildM4ParserComparison } from "../src/ai-execution/controlled-validation/m4-parser-comparison.js";
import { buildM4BrandSubjectTask } from "../src/ai-execution/controlled-validation/m4-parser-evidence-first.js";
import {
  buildM4LineReferenceTask,
  projectM4LineReferenceOutput,
} from "../src/ai-execution/controlled-validation/m4-parser-line-references.js";
import { calculateEvaluationReportMetrics } from "../src/geo-intelligence/domain/evaluation-report.policy.js";

const source = buildM4ParserComparison().cases[0]!.request.input;
if (source.taskKind !== "STRUCTURED_OUTPUT")
  throw new Error("Expected Parser task");
const answer =
  "1. **青禾咖啡（杭州门店）**\r\n   若需要早午餐，可考虑这家店。\r\n\r\n2. **广州酒家**：建议比较。";
const context = {
  companyName: "青禾咖啡",
  questionKind: "INDUSTRY_RECOMMENDATION" as const,
  originalAnswer: answer,
};
const base = { ...source, userContext: { ...source.userContext, ...context } };
const range = (startLine: number, endLine = startLine) => ({
  startLine,
  endLine,
});
const valid = () => ({
  answerStructure: "ORDERED_LIST",
  target: {
    displayedForms: ["青禾咖啡"],
    mentionEvidence: [range(1)],
    positionEvidence: [range(1, 2)],
    position: 1,
    role: "CONDITIONALLY_RECOMMENDED",
    observations: [
      {
        category: "CONDITION",
        label: "早午餐需求",
        detail: "原文在需要早午餐时建议考虑该店。",
        polarity: "NEUTRAL",
        evidence: [range(1, 2)],
      },
    ],
  },
  otherBrands: [
    {
      displayName: "广州酒家",
      observedForms: ["广州酒家"],
      role: "RECOMMENDED",
      relativePosition: 2,
      positionKind: "RECOMMENDATION",
      evidence: [range(4)],
    },
  ],
  cardInterpretation: "原文将青禾咖啡作为有早午餐需求时的选择。",
  limitations: [],
});

describe("M4 program-owned source-reference handoff", () => {
  it("changes only source representation and span leaves, keeping frozen P4 intact", () => {
    const control = buildM4BrandSubjectTask(base);
    const before = structuredClone(control);
    const task = buildM4LineReferenceTask(base);
    expect(task.userContext).toEqual({
      ...base.userContext,
      originalAnswer: undefined,
      answerLines: [
        { line: 1, text: "1. **青禾咖啡（杭州门店）**" },
        { line: 2, text: "   若需要早午餐，可考虑这家店。" },
        { line: 3, text: "" },
        { line: 4, text: "2. **广州酒家**：建议比较。" },
      ],
    });
    expect(Object.hasOwn(task.userContext, "originalAnswer")).toBe(false);
    expect(task.systemInstruction).toContain("原文未提及目标时 target=null");
    expect(task.systemInstruction).not.toContain("originalAnswer");
    expect(
      withoutEvidenceRepresentation(task.outputContract.jsonSchema),
    ).toEqual(withoutEvidenceRepresentation(control.outputContract.jsonSchema));
    expect(control).toEqual(before);
    expect(buildM4BrandSubjectTask(base)).toEqual(before);
  });

  it("restores Markdown, CRLF and adjacent condition, preserving metrics and prose", () => {
    const input = valid();
    const before = structuredClone(input);
    const result = projectM4LineReferenceOutput(input, context);
    expect(result.restoredEvidenceFirstOutput.target!.positionEvidence).toEqual(
      [
        {
          exactText:
            "1. **青禾咖啡（杭州门店）**\r\n   若需要早午餐，可考虑这家店。",
          occurrence: 1,
        },
      ],
    );
    expect(result.projected.semantic.cardInterpretation).toBe(
      input.cardInterpretation,
    );
    expect(result.projected.semantic.otherBrands[0]!.displayName).toBe(
      "广州酒家",
    );
    const metrics = calculateEvaluationReportMetrics([
      {
        sampleId: "fixture",
        questionKind: context.questionKind,
        questionOrdinal: 2,
        platformKey: "qwen",
        platformLabel: "千问",
        platformOrdinal: 1,
        interpretation: result.projected,
      },
    ]);
    expect(metrics.recommendationIndex.mentionCount).toBe(1);
    expect(metrics.eligibleCompetitorOccurrences[0]!.relativePosition).toBe(2);
    expect(input).toEqual(before);
  });

  it("resolves the selected repeated occurrence instead of guessing the first", () => {
    const repeated = "**广州酒家**：仅作例子。";
    const input = {
      ...valid(),
      target: null,
      otherBrands: [
        {
          ...valid().otherBrands[0]!,
          role: "MENTIONED_ONLY",
          relativePosition: null,
          positionKind: null,
          evidence: [range(3)],
        },
      ],
    };
    const result = projectM4LineReferenceOutput(input, {
      ...context,
      originalAnswer: `${repeated}\n\n${repeated}\n`,
    });
    expect(result.restoredEvidenceFirstOutput.otherBrands[0]!.evidence).toEqual(
      [{ exactText: repeated, occurrence: 2 }],
    );
    expect(result.projected.semantic.evidenceAnchors[0]!.occurrence).toBe(2);
    expect(result.projected.mentioned).toBe(false);
  });

  it.each([
    range(0),
    range(99),
    range(2, 1),
    range(1.5),
    range(3),
    { ...range(1), exactText: "made up" },
  ])(
    "rejects an unresolvable or malformed reference %j before recovery",
    (reference) => {
      const value = valid();
      value.target.mentionEvidence = [reference];
      expect(() => projectM4LineReferenceOutput(value, context)).toThrow();
    },
  );

  it("keeps existing size and list limits instead of truncating the chosen source", () => {
    expect(() =>
      projectM4LineReferenceOutput(valid(), {
        ...context,
        originalAnswer: answer.replace(
          "青禾咖啡",
          "青禾咖啡" + "长".repeat(1001),
        ),
      }),
    ).toThrow();
    const value = valid();
    value.target.mentionEvidence = [range(1), range(1), range(1)];
    expect(() => projectM4LineReferenceOutput(value, context)).toThrow();
  });

  it("does not infer a brand, role, position or card from referenced text", () => {
    const value = valid();
    value.otherBrands[0]!.role = "EXCLUDED";
    value.otherBrands[0]!.relativePosition = 8;
    value.cardInterpretation = "错误但可读的模型文案。";
    const result = projectM4LineReferenceOutput(value, context);
    expect(result.restoredEvidenceFirstOutput.otherBrands[0]!.role).toBe(
      "EXCLUDED",
    );
    expect(
      result.restoredEvidenceFirstOutput.otherBrands[0]!.relativePosition,
    ).toBe(8);
    expect(result.projected.semantic.cardInterpretation).toBe(
      value.cardInterpretation,
    );
  });

  it("retains open-question scope and requires the actual answer", () => {
    expect(() =>
      buildM4LineReferenceTask({
        ...base,
        userContext: { ...base.userContext, questionKind: "BRAND_DIRECTED" },
      }),
    ).toThrow("open questions only");
    expect(() =>
      buildM4LineReferenceTask({
        ...base,
        userContext: { ...base.userContext, originalAnswer: "" },
      }),
    ).toThrow("nonempty");
    expect(() =>
      projectM4LineReferenceOutput(valid(), {
        ...context,
        questionKind: "BRAND_DIRECTED",
      }),
    ).toThrow("Open questions only");
  });
});

function withoutEvidenceRepresentation(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutEvidenceRepresentation);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const props = record.properties as Record<string, unknown> | undefined;
    if (
      props &&
      (("exactText" in props && "occurrence" in props) ||
        ("startLine" in props && "endLine" in props))
    )
      return "EVIDENCE_SPAN";
    return Object.fromEntries(
      Object.entries(record)
        .filter(([key]) => key !== "description")
        .map(([key, child]) => [key, withoutEvidenceRepresentation(child)]),
    );
  }
  return value;
}
