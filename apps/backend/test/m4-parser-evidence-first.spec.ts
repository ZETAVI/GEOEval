import { describe, expect, it } from "vitest";
import { buildM4ParserComparison } from "../src/ai-execution/controlled-validation/m4-parser-comparison.js";
import {
  buildM4EvidenceFirstTask,
  buildM4SubjectGroundedTask,
  buildM4BrandSubjectTask,
  m4EvidenceFirstSchema,
  projectM4EvidenceFirstOutput,
} from "../src/ai-execution/controlled-validation/m4-parser-evidence-first.js";
import { calculateEvaluationReportMetrics } from "../src/geo-intelligence/domain/evaluation-report.policy.js";

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
  it("changes P4 instruction and field descriptions without changing constraints or input", () => {
    const p2 = buildM4EvidenceFirstTask(base);
    const before = structuredClone(p2);
    const p4 = buildM4BrandSubjectTask(base);
    expect(p4.userContext).toEqual(p2.userContext);
    expect(p4.outputContract.version).toBe(
      "experiment.m4.parser-brand-subject@1",
    );
    expect(withoutDescriptions(p4.outputContract.jsonSchema)).toEqual(
      withoutDescriptions(p2.outputContract.jsonSchema),
    );
    expect(p4.systemInstruction).not.toBe(p2.systemInstruction);
    expect(p4.systemInstruction).toContain("原文未提及目标时 target=null");
    expect(p2).toEqual(before);
    expect(buildM4EvidenceFirstTask(base)).toEqual(before);
  });

  it("retains a branch's original evidence while projecting a short brand and its metric role", () => {
    const answer =
      "1. 晴川咖啡杭州分公司：若需要企业团购，可考虑该品牌。\n2. 广州酒家杭州门店：可作为餐饮选择。\n附近写字楼也有未具名团队。";
    const value = {
      ...valid(),
      target: null,
      cardInterpretation: "该回答未提及当前品牌。",
      otherBrands: [
        {
          displayName: "晴川咖啡",
          observedForms: ["晴川咖啡杭州分公司"],
          role: "CONDITIONALLY_RECOMMENDED",
          relativePosition: 1,
          positionKind: "RECOMMENDATION",
          evidence: [quote(answer.split("\n")[0]!)],
        },
        {
          displayName: "广州酒家",
          observedForms: ["广州酒家杭州门店"],
          role: "RECOMMENDED",
          relativePosition: 2,
          positionKind: "RECOMMENDATION",
          evidence: [quote(answer.split("\n")[1]!)],
        },
      ],
    };
    const projected = projectM4EvidenceFirstOutput(value, {
      ...context,
      originalAnswer: answer,
    }).projected;
    expect(projected.semantic.otherBrands.map((b) => b.displayName)).toEqual([
      "晴川咖啡",
      "广州酒家",
    ]);
    expect(projected.semantic.evidenceAnchors.map((a) => a.exactText)).toEqual(
      answer.split("\n").slice(0, 2),
    );
    const metrics = calculateEvaluationReportMetrics([
      {
        sampleId: "fixture",
        questionKind: "INDUSTRY_RECOMMENDATION",
        questionOrdinal: 2,
        platformKey: "qwen",
        platformLabel: "千问",
        platformOrdinal: 1,
        interpretation: projected,
      },
    ]);
    expect(
      metrics.eligibleCompetitorOccurrences.map((b) => ({
        name: b.displayName,
        role: b.role,
        position: b.relativePosition,
      })),
    ).toEqual([
      { name: "晴川咖啡", role: "CONDITIONALLY_RECOMMENDED", position: 1 },
      { name: "广州酒家", role: "RECOMMENDED", position: 2 },
    ]);
  });

  it("keeps affiliation-only named brands distinct without counting them as recommendations", () => {
    const answer = "可了解甲方品牌或乙方品牌旗下机构，具体团队未具名。";
    const value = {
      ...valid(),
      target: null,
      cardInterpretation: "该回答未提及当前品牌。",
      otherBrands: ["甲方品牌", "乙方品牌"].map((displayName) => ({
        displayName,
        observedForms: [displayName],
        role: "MENTIONED_ONLY",
        relativePosition: null,
        positionKind: null,
        evidence: [quote(answer)],
      })),
    };
    const projected = projectM4EvidenceFirstOutput(value, {
      ...context,
      originalAnswer: answer,
    }).projected;
    expect(projected.semantic.otherBrands.map((b) => b.displayName)).toEqual([
      "甲方品牌",
      "乙方品牌",
    ]);
    expect(
      calculateEvaluationReportMetrics([
        {
          sampleId: "fixture",
          questionKind: "INDUSTRY_RECOMMENDATION",
          questionOrdinal: 2,
          platformKey: "qwen",
          platformLabel: "千问",
          platformOrdinal: 1,
          interpretation: projected,
        },
      ]).eligibleCompetitorOccurrences,
    ).toEqual([]);
  });

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
    expect(() =>
      buildM4BrandSubjectTask({
        ...base,
        userContext: { ...base.userContext, questionKind: "BRAND_DIRECTED" },
      }),
    ).toThrow("open questions only");
  });
});

function withoutDescriptions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutDescriptions);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "description")
        .map(([key, child]) => [key, withoutDescriptions(child)]),
    );
  return value;
}
