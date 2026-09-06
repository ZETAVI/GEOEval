import { describe, expect, it } from "vitest";
import { buildSampleParserTask } from "../src/geo-intelligence/sample-parser.policy.js";
import { buildM4WorkedExampleTask } from "../src/ai-execution/controlled-validation/m4-parser-task-split.js";
import {
  buildM4CustomerSummaryTask,
  inspectM4CustomerSummaryOutput,
} from "../src/ai-execution/controlled-validation/m4-parser-customer-summary.js";

const originalAnswer =
  "1. 青禾咖啡：安静适合办公，但价格较高。\r\n2. 山岚咖啡值得考虑。\r\n3. 不建议去晴川咖啡，环境嘈杂。\r\n墨云咖啡仅作为背景提及。";
const base = buildSampleParserTask({
  companyName: "青禾咖啡",
  primaryIndustry: "餐饮",
  secondaryIndustry: "咖啡",
  region: "杭州",
  characteristicOne: "现磨",
  characteristicTwo: "办公",
  questionKind: "INDUSTRY_RECOMMENDATION",
  question: "哪些咖啡店适合办公？",
  originalAnswer,
});
const range = (line: number) => ({ startLine: line, endLine: line });
const value = () => ({
  target: {
    displayedForms: ["青禾咖啡"],
    position: 1,
    evidence: [range(1)],
    points: [
      {
        text: "环境安静，适合办公。",
        polarity: "POSITIVE",
        evidence: [range(1)],
      },
      { text: "消费偏高。", polarity: "NEGATIVE", evidence: [range(1)] },
    ],
  },
  otherBrands: [
    {
      displayName: "山岚咖啡",
      observedForms: ["山岚咖啡"],
      position: 2,
      positiveRecommendation: true,
      evidence: [range(2)],
    },
    {
      displayName: "晴川咖啡",
      observedForms: ["晴川咖啡"],
      position: 3,
      positiveRecommendation: false,
      evidence: [range(3)],
    },
    {
      displayName: "墨云咖啡",
      observedForms: ["墨云咖啡"],
      position: null,
      positiveRecommendation: false,
      evidence: [range(4)],
    },
  ],
  summary: "回答认为青禾咖啡适合安静办公，但价格偏高，并提供了其他选择。",
});

describe("M4 customer-value Parser experiment", () => {
  it("retains full task context without mutating the historical builder", () => {
    const baseline = buildM4WorkedExampleTask(base);
    const candidate = buildM4CustomerSummaryTask(base);
    expect(candidate.userContext).toEqual(baseline.userContext);
    expect(candidate.userContext.answerLines).toHaveLength(4);
    expect(buildM4WorkedExampleTask(base)).toEqual(baseline);
    expect(candidate.systemInstruction.length).toBeLessThan(
      baseline.systemInstruction.length,
    );
  });
  it("actually removes role/category/condition obligations from the model contract", () => {
    const schema = buildM4CustomerSummaryTask(base).outputContract
      .jsonSchema as any;
    expect(schema.required).toEqual(["target", "otherBrands", "summary"]);
    expect(Object.keys(schema.properties.target.anyOf[0].properties)).toEqual([
      "displayedForms",
      "position",
      "evidence",
      "points",
    ]);
    expect(Object.keys(schema.properties.otherBrands.items.properties)).toEqual(
      [
        "displayName",
        "observedForms",
        "position",
        "positiveRecommendation",
        "evidence",
      ],
    );
    expect(JSON.stringify(schema)).not.toMatch(
      /targetRole|positionKind|category|CONDITIONALLY_RECOMMENDED/,
    );
  });
  it("allows natural point summaries while restoring exact supporting source", () => {
    const result = inspectM4CustomerSummaryOutput(value(), originalAnswer);
    expect(result.output.target!.points[1]!.text).toBe("消费偏高。");
    const restored = result.sourceBackedOutput as any;
    expect(restored.target.points[1].evidence[0].exactText).toBe(
      originalAnswer.split("\r\n")[0],
    );
    expect(result).not.toHaveProperty("projected");
    expect(restored).not.toHaveProperty("targetRole");
  });
  it("projects only explicitly positive flags into the diagnostic competitor list", () => {
    const result = inspectM4CustomerSummaryOutput(value(), originalAnswer);
    expect(result.output.otherBrands).toHaveLength(3);
    expect(result.positiveCompetitors.map((b) => b.displayName)).toEqual([
      "山岚咖啡",
    ]);
  });
  it("retains a valid absent target without inventing points or a position", () => {
    const absent = {
      ...value(),
      target: null,
      summary: "回答未提及目标品牌，列出了其他咖啡店选择。",
    };
    expect(
      inspectM4CustomerSummaryOutput(absent, originalAnswer).output.target,
    ).toBeNull();
  });
  it("rejects unreachable source references without repairing them", () => {
    const bad = value();
    bad.target.points[0]!.evidence = [range(99)];
    expect(() => inspectM4CustomerSummaryOutput(bad, originalAnswer)).toThrow(
      "does not resolve",
    );
  });
  it("does not silently accept old semantic categories or direct-question tasks", () => {
    expect(() =>
      inspectM4CustomerSummaryOutput(
        { ...value(), conditions: [] },
        originalAnswer,
      ),
    ).toThrow();
    expect(() =>
      buildM4CustomerSummaryTask({
        ...base,
        userContext: { ...base.userContext, questionKind: "BRAND_DIRECTED" },
      }),
    ).toThrow();
  });
});
