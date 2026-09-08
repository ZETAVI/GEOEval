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
const description = () => ({
  points: [{ text: "环境安静。", polarity: "POSITIVE", evidence: evidence(2) }],
  summary: "适合安静用餐，但消费偏高。",
});
const row = (displayName: string, line: number, isTarget = false) => ({
  displayName,
  positiveRecommendation: true,
  evidence: evidence(line),
  targetDescription: isTarget ? description() : null,
});
const raw = () => ({
  brands: [
    row("青禾咖啡", 2, true),
    row("山岚", 3),
    row("晴川", 3),
    { ...row("墨云", 4), positiveRecommendation: false },
  ],
});

describe("M4 single Parser brand-subject rows", () => {
  it("keeps the complete worked example valid with target after a negative merchant", () => {
    const task = buildM4BrandRowsTask(prepared);
    const example = JSON.parse(
      task.systemInstruction.split("输出：\n").at(-1)!,
    );
    const result = inspectM4BrandRowsOutput(
      example,
      "山岚小馆服务差，不推荐。\n青禾粤菜出品稳定但价格偏高，值得考虑。\n饭后可以去甜园吃糖水，营业时间可在邻里指南上查询。",
    );
    expect(result.projected.output.target!.position).toBe(2);
    expect(result.projected.output.target!.points[0]!.polarity).toBe("MIXED");
    expect(
      result.projected.output.otherBrands.map((b) => b.displayName),
    ).toEqual(["山岚小馆", "甜园"]);
    expect(result.projected.positiveCompetitors.map((b) => b.position)).toEqual(
      [3],
    );
  });
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
    expect(schema.required).toEqual(["brands"]);
    expect(schema.properties).not.toHaveProperty("targetDescription");
    expect(schema.properties.brands.items.properties).not.toHaveProperty(
      "isTarget",
    );
    expect(schema.properties.brands.items.required).toContain(
      "targetDescription",
    );
    expect(schema.properties.brands.maxItems).toBe(11);
    expect(schema.properties.brands.items.properties).not.toHaveProperty(
      "sourceItemLine",
    );
    expect(schema.properties.brands.items.properties).not.toHaveProperty(
      "position",
    );
    expect(candidate.userContext.question).toBe("哪些咖啡值得考虑？");
    expect(candidate.userContext).not.toHaveProperty("brands");
    expect(candidate.userContext).not.toHaveProperty("positions");
    expect(candidate.userContext.answerLines).toEqual(
      source.split("\r\n").map((text, index) => ({ line: index + 1, text })),
    );
    expect(candidate.outputContract.version).toBe(
      "experiment.m4.parser-brand-rows@3.1.0",
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
        ...value.brands[0]!.targetDescription,
      },
      otherBrands: value.brands
        .slice(1)
        .map(({ targetDescription: _t, ...b }, index) => ({
          ...b,
          position: index + 2,
        })),
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
  it("derives indices before target splitting or positive filtering and never repairs wrong order", () => {
    const value = raw();
    // Deliberately wrong source order: preserve it, do not sort using evidence.
    value.brands = [
      value.brands[3]!,
      value.brands[1]!,
      value.brands[0]!,
      value.brands[2]!,
    ];
    const before = structuredClone(value);
    const result = inspectM4BrandRowsOutput(value, source);
    expect(result.output).toEqual(before);
    expect(value).toEqual(before);
    expect(result.projected.output.target!.position).toBe(3);
    expect(result.projected.output.otherBrands.map((b) => b.position)).toEqual([
      1, 2, 4,
    ]);
    expect(result.projected.positiveCompetitors.map((b) => b.position)).toEqual(
      [2, 4],
    );
    // Mechanically continuous indices are not semantic proof of source order.
  });
  it("allows natural absence, empty input findings and eleven rows only when one is target", () => {
    expect(
      inspectM4BrandRowsOutput({ brands: [] }, source).projected.output.target,
    ).toBeNull();
    const value = raw();
    value.brands = [
      value.brands[0]!,
      ...Array.from({ length: 10 }, (_, i) => row(`品牌${i}`, 3)),
    ];
    expect(
      inspectM4BrandRowsOutput(value, source).projected.output.otherBrands,
    ).toHaveLength(10);
    expect(() =>
      inspectM4BrandRowsOutput(
        {
          brands: value.brands.map((b) => ({ ...b, targetDescription: null })),
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
          brands: value.brands.map((b) => ({
            ...b,
            targetDescription: description(),
          })),
        },
        source,
      ),
    ).toThrow("Multiple target");
    expect(() =>
      inspectM4BrandRowsOutput({ ...value, targetDescription: null }, source),
    ).toThrow();
    expect(() =>
      inspectM4BrandRowsOutput(
        { brands: [{ ...value.brands[0], isTarget: true }] },
        source,
      ),
    ).toThrow();
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
  it("keeps semantic false-null visible instead of fabricating a target description", () => {
    const value = raw();
    value.brands[0]!.targetDescription = null;
    const result = inspectM4BrandRowsOutput(value, source);
    expect(result.output).toEqual(value);
    expect(result.projected.output.target).toBeNull();
    expect(result.projected.output.otherBrands[0]!.displayName).toBe(
      "青禾咖啡",
    );
    // The source mentions the target. Legal null is not semantic acceptance.
  });
  it("requires each row's description slot and complete content for a described target", () => {
    const value = raw();
    const { targetDescription: _description, ...missing } = value.brands[0]!;
    expect(() =>
      inspectM4BrandRowsOutput({ brands: [missing] }, source),
    ).toThrow();
    expect(() =>
      inspectM4BrandRowsOutput(
        { brands: [{ ...missing, targetDescription: { points: [] } }] },
        source,
      ),
    ).toThrow();
    expect(() =>
      inspectM4BrandRowsOutput(
        {
          brands: [
            { ...missing, targetDescription: { points: [], summary: "" } },
          ],
        },
        source,
      ),
    ).toThrow();
  });
  it("rejects obsolete pointers, model positions and invalid evidence", () => {
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
    for (const position of [1, 5, null]) {
      expect(() =>
        inspectM4BrandRowsOutput(
          { ...value, brands: [{ ...value.brands[0], position }] },
          source,
        ),
      ).toThrow();
    }
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
