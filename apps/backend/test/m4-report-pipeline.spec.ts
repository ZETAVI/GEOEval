import { describe, expect, it } from "vitest";
import {
  buildM4ReportSampleTask,
  inspectM4ReportSample,
  prepareM4ReportSamples,
  buildM4ReportResolutionTask,
  inspectM4ReportResolution,
  buildM4ReportCompositionTask,
  inspectM4ReportComposition,
  composeM4ReportPipelinePreview,
} from "../src/ai-execution/controlled-validation/m4-report-pipeline.js";

const focus = {
  displayName: "青禾",
  isFocusBrand: true,
  attitude: "POSITIVE",
  mentionContext: [
    { text: "环境安静", polarity: "POSITIVE" },
    { text: "价格偏高", polarity: "NEGATIVE" },
  ],
};
const other = {
  ...focus,
  displayName: "山岚",
  isFocusBrand: false,
  attitude: "NEUTRAL",
};
const source = (sampleId: string, direct = false) => ({
  sampleId,
  questionId: direct ? "direct" : "open",
  question: direct ? "青禾如何？" : "哪些咖啡值得考虑？",
  questionKind: direct
    ? ("BRAND_DIRECTED" as const)
    : ("INDUSTRY_RECOMMENDATION" as const),
  platformLabel: sampleId,
  parsedOutput: {
    cardInterpretation: "青禾环境安静，但价格偏高。",
    brands: direct ? [focus] : [other, focus],
  },
});
const prepare = () =>
  prepareM4ReportSamples([source("s1"), source("s2"), source("s3", true)]);
const resolution = { assignments: { "s1-b1": "山岚", "s2-b1": "山岚" } };
const report = () => ({
  recommendationAssessment: "青禾进入了开放回答。",
  brandPerception: "青禾主要被理解为安静的咖啡空间。",
  positiveThemes: [
    {
      label: "环境安静",
      summary: "空间较安静",
      pointIds: ["s1-b2-p1", "s2-b2-p1", "s3-b1-p1"],
    },
  ],
  negativeThemes: [
    { label: "价格偏高", summary: "价格有所顾虑", pointIds: ["s1-b2-p2"] },
  ],
  directions: [
    {
      problem: "价格顾虑",
      suggestion: "介绍空间及体验价值",
      sampleIds: ["s1"],
    },
  ],
});
describe("report-oriented M4 experiment", () => {
  it("prepares open/direct messages from one cleaned full text, no sampling metadata", () => {
    const input = {
      focusBrand: "青禾",
      question: "青禾如何？",
      questionKind: "BRAND_DIRECTED" as const,
      originalAnswer:
        "**青禾**\n- 安静\n| 菜单 | 价格 |\n|---|---|\n| 咖啡 | 20 |",
    };
    const t = buildM4ReportSampleTask(input);
    expect(t.userContext).toEqual({
      focusBrand: "青禾",
      question: "青禾如何？",
      content: input.originalAnswer.replaceAll("**", ""),
    });
    expect(t.outputContract.version).toContain(".direct@");
    expect(
      buildM4ReportSampleTask({ ...input, questionKind: "CHARACTERISTIC_ONE" })
        .outputContract.version,
    ).toContain(".open@");
    expect(input.originalAnswer).toContain("**青禾**");
  });
  it("keeps enough points and the separate sample card without old exact evidence", () => {
    const points = Array.from({ length: 21 }, () => ({
      text: "相关内容",
      polarity: "NEUTRAL",
    }));
    const out = {
      cardInterpretation: "单条总结",
      brands: [{ ...focus, mentionContext: points }],
    };
    expect(inspectM4ReportSample(out, "BRAND_DIRECTED")).toEqual(out);
    expect(() =>
      inspectM4ReportSample(
        { ...out, brands: [focus, other] },
        "BRAND_DIRECTED",
      ),
    ).toThrow();
    expect(() =>
      inspectM4ReportSample(
        { ...out, brands: [focus, focus] },
        "INDUSTRY_RECOMMENDATION",
      ),
    ).toThrow();
    expect(() =>
      inspectM4ReportSample({ brands: [focus] }, "BRAND_DIRECTED"),
    ).toThrow();
  });
  it("does not disguise malformed output or parser repeats as absent independent answers", () => {
    expect(() =>
      prepareM4ReportSamples([
        source("s1"),
        { ...source("s2"), parsedOutput: { brands: 0 } },
      ]),
    ).toThrow();
    expect(() => prepareM4ReportSamples([source("s1"), source("s1")])).toThrow(
      "Duplicate sample",
    );
    expect(() =>
      prepareM4ReportSamples([
        source("s1"),
        { ...source("s2"), platformLabel: "s1" },
      ]),
    ).toThrow("Repeated parse");
    expect(() =>
      prepareM4ReportSamples([
        source("s1"),
        { ...source("s2"), question: "changed" },
      ]),
    ).toThrow("Question snapshot");
  });
  it("sends only names, ids and context to resolution and supports explicit null filtering", () => {
    const p = prepare(),
      r = buildM4ReportResolutionTask(p);
    expect(Object.keys(r.userContext)).toEqual(["records"]);
    expect(Object.keys((r.userContext.records as object[])[0]!)).toEqual([
      "id",
      "displayName",
      "mentionContext",
    ]);
    const result = inspectM4ReportResolution(
      { assignments: { "s1-b1": null, "s2-b1": "山岚" } },
      p,
      "青禾",
    );
    expect(result.competitors[0]).toMatchObject({
      occurrenceCount: 1,
      positions: [1],
    });
    expect(() =>
      inspectM4ReportResolution(
        { assignments: { "s1-b1": "山岚" } },
        p,
        "青禾",
      ),
    ).toThrow();
    expect(() =>
      inspectM4ReportResolution(
        { assignments: { ...resolution.assignments, extra: null } },
        p,
        "青禾",
      ),
    ).toThrow();
    expect(() =>
      inspectM4ReportResolution(
        { assignments: { "s1-b1": "青禾", "s2-b1": "山岚" } },
        p,
        "青禾",
      ),
    ).toThrow("focus brand");
  });
  it("keeps neutral competitors, excludes negative occurrences, deduplicates merged members per sample", () => {
    const s = source("s1");
    s.parsedOutput.brands.push({
      ...other,
      displayName: "Hill",
      attitude: "NEGATIVE",
    });
    const p = prepareM4ReportSamples([s, source("s2")]);
    const result = inspectM4ReportResolution(
      { assignments: { "s1-b1": "山岚", "s1-b3": "山岚", "s2-b1": "山岚" } },
      p,
      "青禾",
    );
    expect(result.competitors).toHaveLength(1);
    expect(result.competitors[0]!.occurrenceCount).toBe(2);
  });
  it("requires resolution first and supplies positions without raw answers, competitor text or card duplicates", () => {
    const p = prepare(),
      before = structuredClone(p);
    expect(() => buildM4ReportCompositionTask("青禾", p, undefined)).toThrow();
    const t = buildM4ReportCompositionTask("青禾", p, resolution);
    expect(t.userContext.performance).toMatchObject({
      validOpenSampleCount: 2,
      mentionedOpenSampleCount: 2,
      positions: [2, 2],
    });
    expect(t.userContext.competitors).toEqual([
      {
        displayName: "山岚",
        occurrenceCount: 2,
        platforms: ["s1", "s2"],
        positions: [1, 1],
      },
    ]);
    expect(JSON.stringify(t.userContext)).not.toMatch(
      /originalAnswer|cardInterpretation|isFocusBrand|otherBrands/,
    );
    expect(p).toEqual(before);
  });
  it("preserves true absence and permits genuinely empty themes", () => {
    const p = prepareM4ReportSamples(
      ["s1", "s2"].map((id) => ({
        ...source(id),
        parsedOutput: { cardInterpretation: "未提及青禾", brands: [other] },
      })),
    );
    expect(
      buildM4ReportCompositionTask("青禾", p, resolution).userContext
        .performance,
    ).toMatchObject({ mentionedOpenSampleCount: 0, mentionRate: 0 });
    expect(
      inspectM4ReportComposition(
        { ...report(), positiveThemes: [], negativeThemes: [] },
        p,
      ).themes.positive,
    ).toEqual([]);
  });
  it("counts themes by independent sample not repeated point references and rejects missing refs", () => {
    const p = prepare(),
      r = report();
    r.positiveThemes[0]!.pointIds.push("s1-b2-p1");
    const preview = composeM4ReportPipelinePreview("青禾", p, resolution, r);
    expect(preview.themes.positive[0]!.evidence.sampleCount).toBe(3);
    expect(preview.cards).toHaveLength(3);
    expect(preview.output.brandPerception).not.toEqual(
      preview.output.recommendationAssessment,
    );
    r.positiveThemes[0]!.pointIds.push("missing");
    expect(() => inspectM4ReportComposition(r, p)).toThrow();
    expect(() =>
      inspectM4ReportComposition(
        {
          ...report(),
          directions: [
            { problem: "x", suggestion: "y", sampleIds: ["missing"] },
          ],
        },
        p,
      ),
    ).toThrow();
    expect(() =>
      composeM4ReportPipelinePreview("青禾", p, resolution, undefined),
    ).toThrow();
  });
});
