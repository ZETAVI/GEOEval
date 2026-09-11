import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildM4ReportMessages,
  buildM4ReportSampleTask,
  inspectM4ReportSample,
  prepareM4ReportSamples,
  buildM4ReportResolutionTask,
  buildM4ReportGroupedResolutionTask,
  inspectM4ReportGroupedResolution,
  inspectM4ReportResolution,
  buildM4ReportCompositionTask,
  buildM4ReportGroupedCompositionTask,
  composeM4ReportGroupedPipelinePreview,
  inspectM4ReportComposition,
  composeM4ReportPipelinePreview,
} from "../src/ai-execution/controlled-validation/m4-report-pipeline.js";

it("freezes the selected experiment candidate without enabling runtime fallback", () => {
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

it("requests a data instance and preserves the complete user context and schema", () => {
  const input = buildM4ReportSampleTask({
    focusBrand: "青禾",
    question: "有哪些品牌？",
    questionKind: "INDUSTRY_RECOMMENDATION",
    originalAnswer: "**青禾**适合聚餐。\n山岚也可考虑。",
  });
  const messages = buildM4ReportMessages(input);
  expect(input.systemInstruction).toContain("完成品牌识别后");
  expect(input.systemInstruction).toContain("不要求名称逐字一致");
  expect(messages[0].content).toContain(
    "Schema 只说明字段和类型，不是要返回的答案",
  );
  expect(
    messages[0].content.endsWith(
      JSON.stringify(input.outputContract.jsonSchema),
    ),
  ).toBe(true);
  expect(JSON.parse(messages[1].content)).toEqual(input.userContext);
  expect(Object.keys(input.outputContract.jsonSchema.properties)).toEqual([
    "brands",
    "cardInterpretation",
  ]);
  expect(messages[0].content).not.toContain("输出JSON结构：");
  const before = structuredClone(input);
  const omitted = buildM4ReportMessages(input, "omit");
  expect(omitted[0].content).toContain(input.systemInstruction);
  expect(omitted[0].content).not.toContain("json-schema.org");
  expect(omitted[0].content).not.toContain(
    JSON.stringify(input.outputContract.jsonSchema),
  );
  expect(omitted[1]).toEqual(messages[1]);
  expect(input).toEqual(before);
});

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
  it("derives a compact composition shape without repeating ID enumerations or changing validation", () => {
    const samples = prepare();
    const input = buildM4ReportCompositionTask("青禾", samples, resolution);
    expect(input.outputContract.version).toBe(
      "experiment.m4.report-pipeline.composition@1.6.0",
    );
    expect(buildM4ReportResolutionTask(samples).outputContract.version).toBe(
      "experiment.m4.report-pipeline.resolution@1.4.0",
    );
    const before = structuredClone(input);
    const messages = buildM4ReportMessages(input, "compact");
    expect(messages[1]).toEqual(buildM4ReportMessages(input)[1]);
    expect(messages[0].content).not.toContain("json-schema.org");
    expect(messages[0].content).not.toContain("s3-b1-p2");
    expect(messages[0].content).toContain(
      "samples[].target.mentionContext[].id",
    );
    expect(messages[0].content).toContain("samples[].sampleId");
    expect(messages[0].content).toContain("不增加其他字段");
    expect(messages[0].content).toContain("directions：0–2项");
    expect(input).toEqual(before);
    expect(() =>
      inspectM4ReportComposition(
        { ...report(), overallPerformance: "多余" },
        samples,
      ),
    ).toThrow();
    const wrong = report();
    wrong.directions[0]!.sampleIds = ["s1-b2-p1"];
    expect(() => inspectM4ReportComposition(wrong, samples)).toThrow();
    expect(() =>
      buildM4ReportMessages(buildM4ReportResolutionTask(samples), "compact"),
    ).toThrow();
  });
  it("connects grouped identity to the same composition and preview without regrouping display names", () => {
    const samples = prepare();
    const grouped = {
      brandGroups: [{ displayName: "山岚", observedNames: ["山岚"] }],
      ignoredNames: [],
    };
    expect(
      buildM4ReportGroupedCompositionTask("青禾", samples, grouped),
    ).toEqual(buildM4ReportCompositionTask("青禾", samples, resolution));
    expect(
      composeM4ReportGroupedPipelinePreview("青禾", samples, grouped, report()),
    ).toEqual(
      composeM4ReportPipelinePreview("青禾", samples, resolution, report()),
    );
    const second = source("s2");
    second.parsedOutput.brands[0] = { ...other, displayName: "Hill" };
    const distinctNames = prepareM4ReportSamples([
      source("s1"),
      second,
      source("s3", true),
    ]);
    const separate = {
      brandGroups: [
        { displayName: "相同展示名", observedNames: ["山岚"] },
        { displayName: "相同展示名", observedNames: ["Hill"] },
      ],
      ignoredNames: [],
    };
    const input = buildM4ReportGroupedCompositionTask(
      "青禾",
      distinctNames,
      separate,
    );
    expect(input.userContext.competitors).toHaveLength(2);
    expect(
      composeM4ReportGroupedPipelinePreview(
        "青禾",
        distinctNames,
        separate,
        report(),
      ).competitors.map((c) => c.occurrenceCount),
    ).toEqual([1, 1]);
  });
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
  it("sends unique observed names without internal IDs and restores all source rows", () => {
    const p = prepare();
    const task = buildM4ReportGroupedResolutionTask(p);
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
      "experiment.m4.resolution-groups@2.1.0",
    );
    expect(task.systemInstruction).toContain("简体与繁体");
    expect(task.systemInstruction).toContain("每个observedName必须原样复制");
    expect(task.systemInstruction).toContain("只出现一次");
    expect(task.systemInstruction).toContain("不输出检查过程");
    const raw = {
      brandGroups: [{ displayName: "统一名称", observedNames: ["山岚"] }],
      ignoredNames: [],
    };
    const before = structuredClone(raw);
    const result = inspectM4ReportGroupedResolution(raw, p, "青禾");
    expect(result.competitors[0]).toMatchObject({
      occurrenceCount: 2,
      positions: [1, 1],
    });
    expect(raw).toEqual(before);
    const second = source("s2");
    second.parsedOutput.brands[0] = { ...other, displayName: "Hill" };
    const distinctNames = prepareM4ReportSamples([source("s1"), second]);
    const separate = inspectM4ReportGroupedResolution(
      {
        brandGroups: [
          { displayName: "相同展示名", observedNames: ["山岚"] },
          { displayName: "相同展示名", observedNames: ["Hill"] },
        ],
        ignoredNames: [],
      },
      distinctNames,
      "青禾",
    );
    expect(separate.competitors).toHaveLength(2);
  });
  it("rejects missing, repeated and unknown observed names including ignored names", () => {
    const second = source("s2");
    second.parsedOutput.brands[0] = { ...other, displayName: "Hill" };
    const p = prepareM4ReportSamples([source("s1"), second]);
    for (const [members, ignored, message] of [
      [["山岚"], [], "Missing"],
      [["山岚", "山岚"], ["Hill"], "Repeated"],
      [["山岚"], ["山岚", "Hill"], "Repeated"],
      [["山岚", "missing"], ["Hill"], "Unknown"],
    ] as const)
      expect(() =>
        inspectM4ReportGroupedResolution(
          {
            brandGroups: [{ displayName: "山岚", observedNames: members }],
            ignoredNames: ignored,
          },
          p,
          "青禾",
        ),
      ).toThrow(message);
    expect(
      inspectM4ReportGroupedResolution(
        { brandGroups: [], ignoredNames: ["山岚", "Hill"] },
        p,
        "青禾",
      ).competitors,
    ).toEqual([]);
    expect(() =>
      inspectM4ReportGroupedResolution(
        {
          brandGroups: [{ displayName: "青禾", observedNames: ["山岚"] }],
          ignoredNames: ["Hill"],
        },
        p,
        "青禾",
      ),
    ).toThrow("focus brand");
  });
  it("keeps distinct-sample counting and negative exclusion with group membership", () => {
    const s = source("s1");
    s.parsedOutput.brands.push({ ...other, displayName: "Hill" });
    const t = source("s2");
    t.parsedOutput.brands[0] = {
      ...t.parsedOutput.brands[0]!,
      attitude: "NEGATIVE",
    };
    const p = prepareM4ReportSamples([s, t]);
    const result = inspectM4ReportGroupedResolution(
      {
        brandGroups: [{ displayName: "山岚", observedNames: ["山岚", "Hill"] }],
        ignoredNames: [],
      },
      p,
      "青禾",
    );
    expect(result.competitors[0]).toMatchObject({
      occurrenceCount: 1,
      positions: [1],
      platforms: ["s1"],
    });
  });
  it("groups presentation-only Han/Latin whitespace without rewriting resolution evidence", () => {
    const p = prepare();
    const raw = {
      assignments: {
        "s1-b1": "The Pizza Factory 披萨工坊",
        "s2-b1": "The Pizza Factory披萨工坊",
      },
    };
    const before = structuredClone(raw);
    const result = inspectM4ReportResolution(raw, p, "青禾");
    expect(result.competitors).toEqual([
      {
        displayName: "The Pizza Factory 披萨工坊",
        occurrenceCount: 2,
        platforms: ["s1", "s2"],
        positions: [1, 1],
      },
    ]);
    expect(result.output).toEqual(before);
    expect(raw).toEqual(before);
  });
  it("does not erase Latin word boundaries or punctuation to guess identity", () => {
    for (const [a, b] of [
      ["AB C", "A BC"],
      ["Pizza Factory", "PizzaFactory"],
      ["甲品牌", "乙品牌"],
      ["A-B", "AB"],
    ]) {
      const result = inspectM4ReportResolution(
        { assignments: { "s1-b1": a, "s2-b1": b } },
        prepare(),
        "青禾",
      );
      expect(result.competitors).toHaveLength(2);
    }
  });
  it("uses the same spacing comparison for focus exclusion", () => {
    expect(() =>
      inspectM4ReportResolution(
        { assignments: { "s1-b1": "Gram酸种披萨", "s2-b1": "山岚" } },
        prepare(),
        "Gram 酸种披萨",
      ),
    ).toThrow("focus brand");
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
