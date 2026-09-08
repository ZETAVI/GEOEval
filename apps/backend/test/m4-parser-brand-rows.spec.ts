import { describe, expect, it } from "vitest";
import { buildSampleParserTask } from "../src/geo-intelligence/sample-parser.policy.js";
import {
  buildM4CustomerSummaryTask,
  inspectM4CustomerSummaryOutput,
} from "../src/ai-execution/controlled-validation/m4-parser-customer-summary.js";
import {
  buildM4BrandRowsTask,
  inspectM4BrandRowsOutput,
} from "../src/ai-execution/controlled-validation/m4-parser-brand-rows.js";
import {
  buildM4ChainSynthesisTask,
  buildM4ReportCompositionTasks,
} from "../src/ai-execution/controlled-validation/m4-chain-synthesis.js";

const source =
  "先看环境\r\n1. 青禾咖啡，安静但价格略高。\r\n3. 山岚或晴川都值得考虑。\r\n墨云只是背景。";
const prepared = buildM4CustomerSummaryTask(
  buildSampleParserTask({
    companyName: "青禾咖啡",
    primaryIndustry: "餐饮",
    secondaryIndustry: "咖啡",
    region: "杭州",
    characteristicOne: "现磨",
    characteristicTwo: "安静",
    questionKind: "INDUSTRY_RECOMMENDATION",
    question: "哪些咖啡值得考虑？",
    originalAnswer: source,
  }),
);
const evidence = (line: number) => [{ startLine: line, endLine: line }];
const row = (
  displayName: string,
  line: number,
  position: number | null,
  isTarget = false,
) => ({
  displayName,
  position,
  isTarget,
  positiveRecommendation: position !== null,
  evidence: evidence(line),
});
const raw = () => ({
  brands: [
    row("青禾咖啡", 2, 1, true),
    row("山岚", 3, 2),
    row("晴川", 3, 3),
    { ...row("墨云", 4, 4), positiveRecommendation: false },
  ],
  targetDescription: {
    points: [
      { text: "环境安静。", polarity: "POSITIVE", evidence: evidence(2) },
    ],
    summary: "适合安静用餐，但消费偏高。",
  },
});

describe("M4 single Parser brand-subject rows", () => {
  it("preserves full source input without supplying extracted brands or positions", () => {
    const before = structuredClone(prepared);
    const candidate = buildM4BrandRowsTask(prepared);
    expect(candidate.userContext).toEqual(prepared.userContext);
    expect(prepared).toEqual(before);
    for (const questionKind of ["CHARACTERISTIC_ONE", "CHARACTERISTIC_TWO"]) {
      expect(
        buildM4BrandRowsTask({
          ...prepared,
          userContext: { ...prepared.userContext, questionKind },
        }).userContext.questionKind,
      ).toBe(questionKind);
    }
    const schema = candidate.outputContract.jsonSchema as any;
    expect(schema.required).toEqual(["brands", "targetDescription"]);
    expect(schema.properties.brands.maxItems).toBe(11);
    expect(schema.properties.brands.items.properties).not.toHaveProperty(
      "sourceItemLine",
    );
    expect(candidate.userContext).not.toHaveProperty("brands");
    expect(candidate.userContext).not.toHaveProperty("positions");
    expect(candidate.userContext.answerLines).toEqual(
      source.split("\r\n").map((text, index) => ({ line: index + 1, text })),
    );
    expect(candidate.outputContract.version).toBe(
      "experiment.m4.parser-brand-rows@1.2.0",
    );
    expect(() =>
      buildM4BrandRowsTask({
        ...prepared,
        userContext: {
          ...prepared.userContext,
          questionKind: "BRAND_DIRECTED",
        },
      }),
    ).toThrow("Open-question");
    expect(() =>
      buildM4BrandRowsTask({
        ...prepared,
        userContext: {
          ...prepared.userContext,
          answerLines: [{ line: 2, text: "cut" }],
        },
      }),
    ).toThrow("contiguous");
  });
  it("projects first-appearance positions without reordering or changing eligibility", () => {
    const value = raw(),
      before = structuredClone(value);
    const result = inspectM4BrandRowsOutput(value, source);
    expect(result.output).toEqual(value);
    expect(result.projected.output).toEqual({
      target: {
        position: 1,
        evidence: evidence(2),
        ...value.targetDescription,
      },
      otherBrands: value.brands.slice(1).map(({ isTarget: _t, ...b }) => b),
    });
    expect(result.projected.positiveCompetitors.map((b) => b.position)).toEqual(
      [2, 3],
    );
    expect(result.projected.output.otherBrands[2]!.positiveRecommendation).toBe(
      false,
    );
    expect(
      (result.projected.sourceBackedOutput as any).target.evidence[0].exactText,
    ).toBe(source.split("\r\n")[1]);
    expect(value).toEqual(before);
    expect(
      inspectM4BrandRowsOutput(value, source.replaceAll("\r\n", "\r")).projected
        .output,
    ).toEqual(result.projected.output);
  });
  it("preserves nonconforming tied, gapped or null model positions instead of fixing them", () => {
    const value = raw();
    value.brands[1]!.position = 3;
    value.brands[2]!.position = 3;
    value.brands[3]!.position = null;
    expect(
      inspectM4BrandRowsOutput(value, source).projected.output.otherBrands.map(
        (b) => b.position,
      ),
    ).toEqual([3, 3, null]);
    // Projection/source validity is not acceptance under the new Prompt meaning.
  });
  it("allows natural absence, empty input findings and eleven rows only when one is target", () => {
    expect(
      inspectM4BrandRowsOutput({ brands: [], targetDescription: null }, source)
        .projected.output.target,
    ).toBeNull();
    const value = raw();
    value.brands = [
      value.brands[0]!,
      ...Array.from({ length: 10 }, (_, i) => row(`品牌${i}`, 3, 3)),
    ];
    expect(
      inspectM4BrandRowsOutput(value, source).projected.output.otherBrands,
    ).toHaveLength(10);
    expect(() =>
      inspectM4BrandRowsOutput(
        {
          brands: value.brands.map((b) => ({ ...b, isTarget: false })),
          targetDescription: null,
        },
        source,
      ),
    ).toThrow();
  });
  it("rejects duplicate rows and conflicting target ownership without trimming", () => {
    const value = raw();
    expect(() =>
      inspectM4BrandRowsOutput(
        { ...value, brands: [...value.brands, value.brands[1]] },
        source,
      ),
    ).toThrow("Duplicate brand row");
    expect(() =>
      inspectM4BrandRowsOutput(
        {
          ...value,
          brands: value.brands.map((b) => ({ ...b, isTarget: true })),
        },
        source,
      ),
    ).toThrow("Multiple target");
    expect(() =>
      inspectM4BrandRowsOutput({ ...value, targetDescription: null }, source),
    ).toThrow("must agree");
    expect(() =>
      inspectM4BrandRowsOutput({ ...value, brands: [] }, source),
    ).toThrow("must agree");
    expect(() =>
      inspectM4BrandRowsOutput(
        {
          ...value,
          brands: [{ ...value.brands[0], position: null }],
        },
        source,
      ),
    ).toThrow();
  });
  it("rejects obsolete row pointers and invalid evidence but preserves model positions", () => {
    const value = raw();
    for (const sourceItemLine of [2, 99, null]) {
      expect(() =>
        inspectM4BrandRowsOutput(
          { ...value, brands: [{ ...value.brands[0], sourceItemLine }] },
          source,
        ),
      ).toThrow();
    }
    expect(() =>
      inspectM4BrandRowsOutput(
        { ...value, brands: [{ ...value.brands[0], evidence: evidence(99) }] },
        source,
      ),
    ).toThrow();
    // Valid evidence is not semantic proof. In particular, never turn this 5
    // into 1 because the target happens to be the first extracted record.
    const wrong = { ...value, brands: [{ ...value.brands[0], position: 5 }] };
    expect(
      inspectM4BrandRowsOutput(wrong, source).projected.output.target!.position,
    ).toBe(5);
  });
  it("hands only the existing parsed representation to synthesis", () => {
    const result = inspectM4BrandRowsOutput(raw(), source);
    const task = buildM4ChainSynthesisTask(
      "青禾咖啡",
      ["s1", "s2"].map((sampleId) => ({
        sampleId,
        question: "哪些咖啡？",
        platformLabel: "千问",
        originalAnswer: source,
        parsedOutput: result.projected.output,
      })),
    );
    const { narrative } = buildM4ReportCompositionTasks(task);
    expect(narrative.userContext.samples[0]!.target!.position).toBe(1);
    expect(narrative.userContext.samples[0]).not.toHaveProperty(
      "originalAnswer",
    );
    expect(narrative.userContext.samples[0]).not.toHaveProperty("brands");
    expect(JSON.stringify(narrative.userContext)).not.toContain(
      "sourceItemLine",
    );
    expect(result.projected).toEqual(
      inspectM4CustomerSummaryOutput(result.projected.output, source),
    );
  });
});
