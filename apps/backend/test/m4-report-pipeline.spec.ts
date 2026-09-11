import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildM4ReportCompositionTask,
  buildM4ReportMessages,
  buildM4ReportResolutionTask,
  buildM4ReportSampleTask,
  composeM4ReportPipelinePreview,
  inspectM4ReportComposition,
  inspectM4ReportResolution,
  inspectM4ReportSample,
  prepareM4ReportSamples,
} from "../src/ai-execution/controlled-validation/m4-report-pipeline.js";

const focus = {
  displayName: "青禾",
  isFocusBrand: true,
  attitude: "POSITIVE" as const,
  mentionContext: [
    { text: "环境安静", polarity: "POSITIVE" as const },
    { text: "价格偏高", polarity: "NEGATIVE" as const },
  ],
};
const other = {
  ...focus,
  displayName: "山岚",
  isFocusBrand: false,
  attitude: "NEUTRAL" as const,
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
    brands: direct ? [focus] : [other, focus],
    cardInterpretation: "青禾环境安静，但价格偏高。",
  },
});
const prepare = () =>
  prepareM4ReportSamples([source("s1"), source("s2"), source("s3", true)]);
const resolution = {
  brandGroups: [{ displayName: "山岚", observedNames: ["山岚"] }],
  ignoredNames: [],
};
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

describe("current M4 report-analysis candidate", () => {
  it("freezes the selected model without activating fallback", () => {
    const candidate = JSON.parse(
      readFileSync(
        new URL(
          "../geo-intelligence/experiments/m4-report-candidate.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(candidate).toMatchObject({
      scope: "controlled-scale-validation-only",
      model: "deepseek-v4-flash-0731",
      thinking: false,
      temperature: 0.6,
      promptVersion: "1.4.0",
      concurrency: 5,
      expectedSampleCount: 20,
      maxAcquisitionAttempts: 1,
      maxAnalysisAttempts: 2,
      automaticModelFallback: false,
    });
  });

  it("builds full, omitted and compact messages without mutation", () => {
    const sample = buildM4ReportSampleTask({
      focusBrand: "青禾",
      question: "有哪些品牌？",
      questionKind: "INDUSTRY_RECOMMENDATION",
      originalAnswer: "**青禾**适合聚餐。\n山岚也可考虑。",
    });
    const before = structuredClone(sample);
    const full = buildM4ReportMessages(sample);
    const omitted = buildM4ReportMessages(sample, "omit");
    expect(full[0].content).toContain("Schema 只说明字段和类型");
    expect(full[0].content).toContain("json-schema.org");
    expect(omitted[0].content).not.toContain("json-schema.org");
    expect(omitted[1]).toEqual(full[1]);
    expect(sample).toEqual(before);

    const composition = buildM4ReportCompositionTask(
      "青禾",
      prepare(),
      resolution,
    );
    const compact = buildM4ReportMessages(composition, "compact");
    expect(compact[0].content).not.toContain("json-schema.org");
    expect(compact[0].content).toContain(
      "samples[].target.mentionContext[].id",
    );
    expect(compact[0].content).toContain("samples[].sampleId");
    expect(() => buildM4ReportMessages(sample, "compact")).toThrow();
  });

  it("passes one cleaned complete answer to the appropriate parser", () => {
    const originalAnswer =
      "**青禾**\n- 安静\n| 菜单 | 价格 |\n|---|---|\n| 咖啡 | 20 |";
    const input = buildM4ReportSampleTask({
      focusBrand: "青禾",
      question: "青禾如何？",
      questionKind: "BRAND_DIRECTED",
      originalAnswer,
    });
    expect(input.userContext).toEqual({
      focusBrand: "青禾",
      question: "青禾如何？",
      content: originalAnswer.replaceAll("**", ""),
    });
    expect(input.outputContract.version).toContain(".direct@1.4.0");
    expect(
      buildM4ReportSampleTask({
        focusBrand: "青禾",
        question: "有哪些品牌？",
        questionKind: "CHARACTERISTIC_ONE",
        originalAnswer,
      }).outputContract.version,
    ).toContain(".open@1.4.0");
  });

  it("rejects duplicate brands and invalid directed outputs", () => {
    expect(
      inspectM4ReportSample(
        { brands: [focus], cardInterpretation: "青禾环境安静。" },
        "BRAND_DIRECTED",
      ).brands,
    ).toHaveLength(1);
    expect(() =>
      inspectM4ReportSample(
        { brands: [focus, focus], cardInterpretation: "重复。" },
        "INDUSTRY_RECOMMENDATION",
      ),
    ).toThrow("Multiple focus");
    expect(() =>
      inspectM4ReportSample(
        { brands: [other], cardInterpretation: "错误。" },
        "BRAND_DIRECTED",
      ),
    ).toThrow("Direct output");
  });

  it("rejects malformed, duplicate or non-independent samples", () => {
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
  });

  it("sends unique names and aggregated context without record IDs", () => {
    const task = buildM4ReportResolutionTask(prepare());
    expect(task.userContext).toEqual({
      brandNames: [
        {
          observedName: "山岚",
          mentionContext: ["环境安静", "价格偏高"],
        },
      ],
    });
    expect(JSON.stringify(task.userContext)).not.toContain("s1-b1");
    expect(task.outputContract.version).toBe(
      "experiment.m4.report-pipeline.resolution@2.1.0",
    );
    expect(task.systemInstruction).toContain("简体与繁体");
    expect(task.systemInstruction).toContain("每个observedName必须原样复制");
  });

  it("restores grouped names to every source occurrence", () => {
    const before = structuredClone(resolution);
    const result = inspectM4ReportResolution(resolution, prepare(), "青禾");
    expect(result.competitors).toEqual([
      {
        displayName: "山岚",
        occurrenceCount: 2,
        platforms: ["s1", "s2"],
        positions: [1, 1],
      },
    ]);
    expect(resolution).toEqual(before);
  });

  it("rejects incomplete or contradictory name groups", () => {
    const second = source("s2");
    second.parsedOutput.brands[0] = { ...other, displayName: "Hill" };
    const samples = prepareM4ReportSamples([source("s1"), second]);
    const inspect = (value: unknown) =>
      inspectM4ReportResolution(value, samples, "青禾");
    expect(() =>
      inspect({
        brandGroups: [{ displayName: "山岚", observedNames: ["山岚"] }],
        ignoredNames: [],
      }),
    ).toThrow("Missing");
    expect(() =>
      inspect({
        brandGroups: [{ displayName: "山岚", observedNames: ["山岚", "山岚"] }],
        ignoredNames: ["Hill"],
      }),
    ).toThrow("Repeated resolution name");
    expect(() =>
      inspect({
        brandGroups: [
          { displayName: "山岚", observedNames: ["山岚", "missing"] },
        ],
        ignoredNames: ["Hill"],
      }),
    ).toThrow("Unknown");
    expect(() =>
      inspect({
        brandGroups: [
          { displayName: "相同", observedNames: ["山岚"] },
          { displayName: "相同", observedNames: ["Hill"] },
        ],
        ignoredNames: [],
      }),
    ).toThrow("Repeated resolution group name");
    expect(() =>
      inspect({
        brandGroups: [{ displayName: "青禾", observedNames: ["山岚"] }],
        ignoredNames: ["Hill"],
      }),
    ).toThrow("focus brand");
  });

  it("keeps neutral and excludes negative competitor occurrences", () => {
    const first = source("s1");
    first.parsedOutput.brands.push({
      ...other,
      displayName: "Hill",
      attitude: "NEGATIVE",
    });
    const second = source("s2");
    second.parsedOutput.brands[0] = {
      ...second.parsedOutput.brands[0]!,
      attitude: "NEGATIVE",
    };
    const samples = prepareM4ReportSamples([first, second]);
    const result = inspectM4ReportResolution(
      {
        brandGroups: [{ displayName: "山岚", observedNames: ["山岚", "Hill"] }],
        ignoredNames: [],
      },
      samples,
      "青禾",
    );
    expect(result.competitors[0]).toMatchObject({
      occurrenceCount: 1,
      platforms: ["s1"],
      positions: [1],
    });
  });

  it("composes parsed target context and deterministic statistics", () => {
    const task = buildM4ReportCompositionTask("青禾", prepare(), resolution);
    expect(task.outputContract.version).toBe(
      "experiment.m4.report-pipeline.composition@1.6.0",
    );
    expect(task.userContext).toMatchObject({
      focusBrand: "青禾",
      performance: {
        validOpenSampleCount: 2,
        mentionedOpenSampleCount: 2,
        mentionRate: 1,
        positions: [2, 2],
      },
      competitors: [{ displayName: "山岚", occurrenceCount: 2 }],
    });
    expect(JSON.stringify(task.userContext)).not.toContain(
      "青禾环境安静，但价格偏高。",
    );
    expect(JSON.stringify(task.userContext)).not.toContain("otherBrands");
  });

  it("validates report references and builds the customer preview", () => {
    const samples = prepare();
    const output = report();
    expect(
      inspectM4ReportComposition(output, samples).themes.positive[0]!.evidence,
    ).toEqual({ sampleCount: 3, platforms: ["s1", "s2", "s3"] });
    const preview = composeM4ReportPipelinePreview(
      "青禾",
      samples,
      resolution,
      output,
    );
    expect(preview).toMatchObject({
      experimental: true,
      performance: { mentionRate: 1 },
      competitors: [{ displayName: "山岚", occurrenceCount: 2 }],
    });
    expect(preview.cards).toHaveLength(3);

    const wrong = report();
    wrong.directions[0]!.sampleIds = ["s1-b2-p1"];
    expect(() => inspectM4ReportComposition(wrong, samples)).toThrow();
    expect(() =>
      inspectM4ReportComposition(
        { ...report(), overallPerformance: "extra" },
        samples,
      ),
    ).toThrow();
  });
});
