import { describe, expect, it } from "vitest";
import { buildSampleParserTask } from "../src/geo-intelligence/sample-parser.policy.js";
import { buildM4WorkedExampleTask } from "../src/ai-execution/controlled-validation/m4-parser-task-split.js";
import {
  buildM4CustomerSummaryTask,
  buildM4NullableTargetTask,
  inspectM4CustomerSummaryOutput,
} from "../src/ai-execution/controlled-validation/m4-parser-customer-summary.js";

const originalAnswer =
  "1. 青禾咖啡：安静适合办公，但价格较高。\r\n2. 山岚咖啡虽然略贵，但仍值得考虑。\r\n3. 不建议去晴川咖啡，环境嘈杂。\r\n墨云咖啡仅作为背景提及。";
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
    summary: "回答认为青禾咖啡适合安静办公，但价格偏高，并提供了其他选择。",
  },
  otherBrands: [
    {
      displayName: "山岚咖啡",
      position: 2,
      positiveRecommendation: true,
      evidence: [range(2)],
    },
    {
      displayName: "晴川咖啡",
      position: 3,
      positiveRecommendation: false,
      evidence: [range(3)],
    },
    {
      displayName: "墨云咖啡",
      position: null,
      positiveRecommendation: false,
      evidence: [range(4)],
    },
  ],
});

describe("M4 customer-value Parser experiment", () => {
  it("reuses the existing nullable-target contract and full input without replacing the baseline", () => {
    const before = buildM4CustomerSummaryTask(base, "青禾是门店简称。");
    const candidate = buildM4NullableTargetTask(base, "青禾是门店简称。");
    expect(candidate.userContext).toEqual(before.userContext);
    expect(candidate.outputContract.jsonSchema).toEqual(
      before.outputContract.jsonSchema,
    );
    expect(candidate.outputContract.version).toBe(
      "experiment.m4.parser-nullable-target@1.0.0",
    );
    expect(candidate.systemInstruction).not.toBe(before.systemInstruction);
    expect(candidate.userContext).not.toHaveProperty("brands");
    expect(candidate.userContext).not.toHaveProperty("sourceInventory");
    expect(buildM4CustomerSummaryTask(base, "青禾是门店简称。")).toEqual(
      before,
    );
  });
  it("keeps false absence structurally representable so real-source review must check mention truth", () => {
    const falseAbsence = { target: null, otherBrands: value().otherBrands };
    expect(originalAnswer).toContain("青禾咖啡");
    expect(
      inspectM4CustomerSummaryOutput(falseAbsence, originalAnswer).output
        .target,
    ).toBeNull();
    // This is NOT semantic approval: known target-present replays must flag it.
    expect(() =>
      inspectM4CustomerSummaryOutput(
        { ...value(), target: { ...value().target, summary: null } },
        originalAnswer,
      ),
    ).toThrow();
  });
  it("passes optional owner brand context without changing the source or inferring output", () => {
    const plain = buildM4CustomerSummaryTask(base);
    const contextual = buildM4CustomerSummaryTask(
      base,
      "青禾是青禾咖啡的门店简称。",
    );
    expect(contextual.userContext).toEqual({
      ...plain.userContext,
      brandContext: "青禾是青禾咖啡的门店简称。",
    });
    expect(contextual.outputContract).toEqual(plain.outputContract);
    expect(base.userContext).not.toHaveProperty("brandContext");
    expect(() => buildM4CustomerSummaryTask(base, "  ")).toThrow();
  });
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
    expect(schema.required).toEqual(["target", "otherBrands"]);
    expect(Object.keys(schema.properties.target.anyOf[0].properties)).toEqual([
      "position",
      "evidence",
      "points",
      "summary",
    ]);
    expect(Object.keys(schema.properties.otherBrands.items.properties)).toEqual(
      ["displayName", "position", "positiveRecommendation", "evidence"],
    );
    expect(JSON.stringify(schema)).not.toMatch(
      /targetRole|positionKind|category|CONDITIONALLY_RECOMMENDED/,
    );
  });
  it("allows natural point summaries while restoring exact supporting source", () => {
    const result = inspectM4CustomerSummaryOutput(value(), originalAnswer);
    expect(result.output.target!.points[1]!.text).toBe("消费偏高。");
    expect(result.sampleSummary).toBe(value().target.summary);
    const restored = result.sourceBackedOutput as any;
    expect(restored.target.points[1].evidence[0].exactText).toBe(
      originalAnswer.split("\r\n")[0],
    );
    expect(result).not.toHaveProperty("projected");
    expect(restored).not.toHaveProperty("targetRole");
  });
  it("retains overall recommendations with drawbacks and excludes negative/background mentions", () => {
    const result = inspectM4CustomerSummaryOutput(value(), originalAnswer);
    expect(buildM4CustomerSummaryTask(base).systemInstruction).toContain(
      "整体仍推荐但带普通缺点的品牌仍为true",
    );
    expect(result.output.otherBrands).toHaveLength(3);
    expect(result.positiveCompetitors.map((b) => b.displayName)).toEqual([
      "山岚咖啡",
    ]);
  });
  it("retains a valid absent target without inventing points or a position", () => {
    const absent = {
      ...value(),
      target: null,
    };
    expect(
      inspectM4CustomerSummaryOutput(absent, originalAnswer).output.target,
    ).toBeNull();
    const inspected = inspectM4CustomerSummaryOutput(absent, originalAnswer);
    expect(inspected.sampleSummary).toBe("本条回答未提及目标品牌。");
    expect(inspected.output).not.toHaveProperty("summary");
    expect(
      (
        inspectM4CustomerSummaryOutput(absent, originalAnswer)
          .sourceBackedOutput as any
      ).target,
    ).toBeNull();
  });
  it("preserves two brand subjects sharing one item, position and original name context", () => {
    const answer =
      "1. 山岚咖啡 (Hill Coffee) 或晴川咖啡 (River Coffee) 都值得考虑，虽然略贵。";
    const output = {
      target: null,
      otherBrands: ["山岚咖啡", "晴川咖啡"].map((displayName) => ({
        displayName,
        position: 1,
        positiveRecommendation: true,
        evidence: [range(1)],
      })),
    };
    const inspected = inspectM4CustomerSummaryOutput(output, answer);
    expect(inspected.positiveCompetitors.map((b) => b.displayName)).toEqual([
      "山岚咖啡",
      "晴川咖啡",
    ]);
    const restored = inspected.sourceBackedOutput as any;
    expect(restored.otherBrands.map((b: any) => b.position)).toEqual([1, 1]);
    for (const brand of restored.otherBrands) {
      expect(brand.evidence[0].exactText).toBe(answer);
      expect(brand).not.toHaveProperty("observedForms");
    }
    expect(() =>
      inspectM4CustomerSummaryOutput(
        {
          ...output,
          otherBrands: [
            { ...output.otherBrands[0], observedForms: ["虚构别名"] },
          ],
        },
        answer,
      ),
    ).toThrow();
    expect(() =>
      inspectM4CustomerSummaryOutput(
        {
          ...output,
          summary: "另一份可能矛盾的缺席判断",
        },
        answer,
      ),
    ).toThrow();
  });
  it("hands off target evidence without regenerating a known brand name", () => {
    const result = inspectM4CustomerSummaryOutput(value(), originalAnswer);
    const handoff = JSON.parse(
      JSON.stringify({
        companyName: base.userContext.companyName,
        sample: result.sourceBackedOutput,
      }),
    );
    expect(handoff.companyName).toBe("青禾咖啡");
    expect(handoff.sample.target.position).toBe(1);
    expect(handoff.sample.target.points).toHaveLength(2);
    expect(handoff.sample.target.evidence[0].exactText).toBe(
      originalAnswer.split("\r\n")[0],
    );
    expect(handoff.sample.target).not.toHaveProperty("displayedForms");
    expect(() =>
      inspectM4CustomerSummaryOutput(
        {
          ...value(),
          target: { ...value().target, displayedForms: ["],"] },
        },
        originalAnswer,
      ),
    ).toThrow();
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
