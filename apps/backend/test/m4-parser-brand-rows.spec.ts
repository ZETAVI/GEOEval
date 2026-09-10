import { describe, expect, it } from "vitest";
import { buildSampleParserTask } from "../src/geo-intelligence/sample-parser.policy.js";
import { buildM4CustomerSummaryTask } from "../src/ai-execution/controlled-validation/m4-parser-customer-summary.js";
import {
  buildM4BrandRowsTask,
  inspectM4BrandRowsOutput,
  inspectM4BrandMentionsOutput,
  m4ContentHandoffSchema,
} from "../src/ai-execution/controlled-validation/m4-parser-brand-rows.js";
import { buildM4ReadingText } from "../src/ai-execution/controlled-validation/m4-reading-text.js";
import {
  buildM4ChainSynthesisTask,
  buildM4ReportCompositionTasks,
  buildM4BrandAssignmentTask,
  inspectM4BrandGroupingOutput,
} from "../src/ai-execution/controlled-validation/m4-chain-synthesis.js";
import { ModelStudioProviderAdapter } from "../src/ai-execution/infrastructure/providers/model-studio-provider.adapter.js";
import {
  ProviderHttpTransport,
  type ProviderHttpRequest,
} from "../src/ai-execution/infrastructure/providers/provider-http.transport.js";
import { REAL_AI_ROUTES } from "../src/ai-execution/infrastructure/providers/real-route.catalog.js";

const source =
  "# 比较\r\n\r\n1. **青禾咖啡**安静但略贵。\r\n2. 山岚 / 晴川值得考虑。\r\n墨云仅作背景。\r\n";
const base = buildSampleParserTask({
  companyName: "青禾咖啡",
  primaryIndustry: "餐饮",
  secondaryIndustry: "咖啡",
  region: "杭州",
  characteristicOne: "现磨",
  characteristicTwo: "安静",
  questionKind: "INDUSTRY_RECOMMENDATION",
  question: "哪些咖啡值得考虑？",
  originalAnswer: source,
});
const prepared = buildM4CustomerSummaryTask(base);
const row = (displayName: string, target = false) => ({
  displayName,
  attitude: "POSITIVE" as "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  mentionContext: displayName + "被作为安静但偏贵的选择。",
  targetDescription: target
    ? { points: [{ text: "环境安静但价格偏高。", polarity: "MIXED" }] }
    : null,
});
const raw = () => ({
  brands: [
    row("青禾咖啡", true),
    row("山岚"),
    row("晴川"),
    { ...row("墨云"), attitude: "NEGATIVE" as const },
  ],
});

describe("M4 content-oriented brand rows", () => {
  it("uses one reading string and preserves the original source and target context", () => {
    const before = structuredClone(prepared);
    const task = buildM4BrandRowsTask(prepared, source);
    expect(
      task.systemInstruction.startsWith("你是一名品牌相关内容的语义解析助手。"),
    ).toBe(true);
    expect(task.systemInstruction).not.toContain("GEO评测");
    expect(task.userContext).toEqual({
      focusBrand: "青禾咖啡",
      question: base.userContext.question,
      content: buildM4ReadingText(source),
    });
    expect(prepared).toEqual(before);
    expect(task.userContext).not.toHaveProperty("answerLines");
    expect(task.userContext).not.toHaveProperty("answerText");
    expect(task.systemInstruction).not.toContain("answerText");
    expect(task.userContext).not.toHaveProperty("originalAnswer");
    expect(task.userContext.focusBrand).toBe("青禾咖啡");
    for (const field of ["companyName", "brandContext", "questionKind"])
      expect(task.userContext).not.toHaveProperty(field);
    const extra = buildM4BrandRowsTask(
      {
        ...prepared,
        userContext: {
          ...prepared.userContext,
          brandContext: "无关背景",
          diagnostic: "不发送",
        },
      },
      source,
    );
    expect(extra.userContext).toEqual(task.userContext);
    expect(task.userContext.question).toBe(base.userContext.question);
    expect(task.outputContract.version).toBe(
      "experiment.m4.parser-brand-rows@6.3.0+mentions-contract@2",
    );
    expect(JSON.stringify(task.outputContract.jsonSchema)).not.toMatch(
      /exactText|occurrence|startLine|endLine|evidence/,
    );
  });
  it("accepts direct original context but never rebuilds original bytes from indexed or cleaned text", () => {
    expect(buildM4BrandRowsTask(base).userContext.content).toBe(
      buildM4ReadingText(source),
    );
    expect(() => buildM4BrandRowsTask(prepared)).toThrow();
    expect(() => buildM4BrandRowsTask(prepared, "different")).toThrow(
      "match original",
    );
    expect(() => buildM4BrandRowsTask(base, "different")).toThrow("mismatch");
    expect(() =>
      buildM4BrandRowsTask(buildM4BrandRowsTask(base), source),
    ).toThrow();
    expect(() =>
      buildM4BrandRowsTask({
        ...base,
        userContext: { ...base.userContext, originalAnswer: " " },
      }),
    ).toThrow();
    expect(() =>
      buildM4BrandRowsTask({
        ...base,
        userContext: { ...base.userContext, questionKind: "BRAND_DIRECTED" },
      }),
    ).toThrow("Open-question");
  });
  it("uses real excerpts as uniform bullet content, with richer focus content and no legacy description", () => {
    const task = buildM4BrandRowsTask(base);
    const examples = [
      ...task.systemInstruction.matchAll(
        /content：\n([\s\S]*?)\n输出：\n(\{[^\n]+\})/g,
      ),
    ];
    expect(examples).toHaveLength(3);
    const clean = (text: string) => buildM4ReadingText(text).replace(/\s/g, "");
    for (const example of examples) {
      const result = inspectM4BrandMentionsOutput(JSON.parse(example[2]!));
      expect(result.interpretationFormat).toBe("BRAND_MENTIONS");
      expect(result).not.toHaveProperty("projected");
      for (const brand of result.output.brands) {
        expect(brand).not.toHaveProperty("targetDescription");
        for (const point of brand.mentionContext)
          expect(clean(example[1]!)).toContain(clean(point));
      }
    }
    const coffee = inspectM4BrandMentionsOutput(JSON.parse(examples[0]![2]!));
    expect(coffee.output.brands.map((b) => b.displayName)).toEqual([
      "Manner Coffee",
      "瑞幸咖啡",
    ]);
    expect(coffee.focusBrandIndex).toBe(1);
    expect(coffee.output.brands[1]!.mentionContext).toHaveLength(5);
    expect(coffee.competitors.map((b) => [b.displayName, b.position])).toEqual([
      ["Manner Coffee", 1],
    ]);
    const restaurant = inspectM4BrandMentionsOutput(
      JSON.parse(examples[1]![2]!),
    );
    expect(restaurant.output.brands.map((b) => b.displayName)).toEqual([
      "东明香",
      "新记",
    ]);
    expect(restaurant.focusBrandIndex).toBeNull();
    expect(restaurant.indexedBrands.map((b) => b.position)).toEqual([1, 2]);
    const aoi = inspectM4BrandMentionsOutput(JSON.parse(examples[2]![2]!));
    expect(aoi.output.brands.map((b) => b.displayName)).toEqual([
      "Aoi（葵日本料理）",
    ]);
    expect(aoi.focusBrandIndex).toBeNull();
    expect(aoi.output.brands[0]!.mentionContext).toHaveLength(4);
    expect(aoi.output.brands[0]!.mentionContext.at(-1)).toContain(
      "缺点是价格偏高",
    );
    // Source matching verifies authored examples only, not a live acceptance rule.
  });
  it("keeps new mentions distinct from legacy handoff and derives positions without repairing semantic errors", () => {
    const brand = {
      displayName: "青禾",
      isFocusBrand: true,
      attitude: "POSITIVE",
      mentionContext: ["原文相关内容。"],
    };
    const input = {
      brands: [
        brand,
        {
          ...brand,
          displayName: "山岚",
          isFocusBrand: false,
          attitude: "NEGATIVE",
        },
      ],
    };
    const before = structuredClone(input);
    const result = inspectM4BrandMentionsOutput(input);
    expect(input).toEqual(before);
    expect(result.output).toEqual(input);
    expect(result.competitors).toEqual([]);
    expect(m4ContentHandoffSchema.safeParse(result.output).success).toBe(false);
    expect(() => inspectM4BrandRowsOutput(result.output)).toThrow();
    expect(() => inspectM4BrandMentionsOutput(raw())).toThrow();
    expect(() =>
      inspectM4BrandMentionsOutput({ brands: [brand, brand] }),
    ).toThrow();
    expect(() =>
      inspectM4BrandMentionsOutput({
        brands: [brand, { ...brand, displayName: "其他" }],
      }),
    ).toThrow("Multiple focus");
    expect(() =>
      inspectM4BrandMentionsOutput({
        brands: [{ ...brand, mentionContext: [""] }],
      }),
    ).toThrow();
    expect(
      inspectM4BrandMentionsOutput({
        brands: [{ ...brand, mentionContext: [] }],
      }).output.brands[0]!.mentionContext,
    ).toEqual([]);
    expect(
      inspectM4BrandMentionsOutput({ brands: [] }).focusBrandIndex,
    ).toBeNull();
  });
  it("retains all source excerpts without an arbitrary point-count limit", () => {
    const mentionContext = Array.from(
      { length: 21 },
      (_, i) => `原文实际内容${i + 1}。`,
    );
    const input = {
      brands: [
        {
          displayName: "青禾",
          isFocusBrand: true,
          attitude: "POSITIVE",
          mentionContext,
        },
      ],
    };
    const result = inspectM4BrandMentionsOutput(input);
    expect(result.output).toEqual(input);
    expect(result.output.brands[0]!.mentionContext).toHaveLength(21);
    expect(() => inspectM4BrandMentionsOutput({ brands: 0 })).toThrow();
    expect(() =>
      inspectM4BrandMentionsOutput({
        brands: [{ ...input.brands[0], mentionContext: [""] }],
      }),
    ).toThrow();
  });
  it("derives positions before filtering without quotations, extra summaries or semantic repair", () => {
    const value = raw(),
      before = structuredClone(value);
    const result = inspectM4BrandRowsOutput(value);
    expect(value).toEqual(before);
    expect(result.output).toEqual(before);
    expect(result.projected.interpretationFormat).toBe("BRAND_CONTENT");
    expect(result.projected.output.target).toEqual({
      position: 1,
      points: value.brands[0]!.targetDescription!.points,
      summary: value.brands[0]!.mentionContext,
      attitude: "POSITIVE",
    });
    expect(result.projected.competitors.map((b) => b.position)).toEqual([2, 3]);
    expect(result.projected.output.otherBrands[2]!.position).toBe(4);
    expect(JSON.stringify(result.projected)).not.toMatch(
      /exactText|occurrence|evidence/,
    );
  });
  it("does not repair wrong model order, false absence, or an unsupported target assignment", () => {
    const value = raw();
    value.brands = [
      value.brands[3]!,
      value.brands[1]!,
      value.brands[0]!,
      value.brands[2]!,
    ];
    expect(
      inspectM4BrandRowsOutput(value).projected.output.target!.position,
    ).toBe(3);
    value.brands.forEach((b) => (b.targetDescription = null));
    expect(inspectM4BrandRowsOutput(value).projected.output.target).toBeNull();
    expect(
      inspectM4BrandRowsOutput({ brands: [row("虚构目标", true)] }).projected
        .output.target,
    ).not.toBeNull();
    // These shapes are valid. Their real source meaning must be tested separately.
  });
  it("keeps structural ownership, empty findings and existing capacity boundaries", () => {
    expect(
      inspectM4BrandRowsOutput({ brands: [] }).projected.output.target,
    ).toBeNull();
    expect(() =>
      inspectM4BrandRowsOutput({ brands: [row("同名"), row("同名")] }),
    ).toThrow("Duplicate");
    expect(() =>
      inspectM4BrandRowsOutput({ brands: [row("甲", true), row("乙", true)] }),
    ).toThrow("Multiple target");
    const eleven = [
      row("目标", true),
      ...Array.from({ length: 10 }, (_, i) => row("品牌" + i)),
    ];
    expect(
      inspectM4BrandRowsOutput({ brands: eleven }).projected.output.otherBrands,
    ).toHaveLength(10);
    expect(() =>
      inspectM4BrandRowsOutput({
        brands: eleven.map((b) => ({ ...b, targetDescription: null })),
      }),
    ).toThrow();
  });
  it("requires useful field presence but does not force a minimum number of points or exact quotes", () => {
    const value = row("目标", true);
    value.targetDescription!.points = [];
    expect(
      inspectM4BrandRowsOutput({ brands: [value] }).projected.output.target!
        .points,
    ).toEqual([]);
    expect(() =>
      inspectM4BrandRowsOutput({ brands: [{ ...value, mentionContext: "" }] }),
    ).toThrow();
    for (const extra of [{ evidence: [] }, { position: 1 }, { isTarget: true }])
      expect(() =>
        inspectM4BrandRowsOutput({ brands: [{ ...value, ...extra }] }),
      ).toThrow();
    expect(() =>
      inspectM4BrandRowsOutput({
        brands: [
          { ...value, targetDescription: { points: [], summary: "duplicate" } },
        ],
      }),
    ).toThrow();
  });
  it("hands parsed content to synthesis explicitly, never fabricating raw excerpts", () => {
    const parsed = inspectM4BrandRowsOutput(raw()).projected;
    const samples = ["s1", "s2"].map((sampleId) => ({
      sampleId,
      question: "哪些咖啡？",
      platformLabel: "千问",
      originalAnswer: source + "ONLY_ORIGINAL_TAIL",
      parsedOutput: parsed.output,
      interpretationFormat: parsed.interpretationFormat,
    }));
    const task = buildM4ChainSynthesisTask("青禾咖啡", samples);
    expect(task.userContext.samples[0]!.interpretationBasis).toBe(
      "PARSER_CONTENT",
    );
    expect(task.userContext.samples[0]!.target!.summary).toBe(
      raw().brands[0]!.mentionContext,
    );
    expect(JSON.stringify(task.userContext)).not.toMatch(
      /ONLY_ORIGINAL_TAIL|exactText|occurrence|evidence/,
    );
    expect(task.systemInstruction).toContain("不是逐字引文");
    expect(task.outputContract.version).toContain("parser-content@2");
    const split = buildM4ReportCompositionTasks(task);
    for (const child of [
      split.grouping,
      split.narrative,
      buildM4BrandAssignmentTask(task),
    ]) {
      expect(child.systemInstruction).toContain("不是逐字引文");
      expect(child.outputContract.version).toContain(
        child === split.narrative ? "parser-content@3" : "parser-content@2",
      );
    }
    expect(() =>
      buildM4ChainSynthesisTask(
        "青禾",
        samples.map(({ interpretationFormat: _format, ...s }) => s),
      ),
    ).toThrow();
    expect(() =>
      buildM4ChainSynthesisTask(
        "青禾",
        samples.map((s) => ({ ...s, questionKind: "BRAND_DIRECTED" as const })),
      ),
    ).toThrow("open-question");
  });
  it("removes only exact duplicate content summaries from narrative context", () => {
    const parsed = inspectM4BrandRowsOutput(raw()).projected;
    const task = buildM4ChainSynthesisTask(
      "青禾咖啡",
      ["s1", "s2"].map((sampleId) => ({
        sampleId,
        question: "哪些咖啡？",
        platformLabel: "千问",
        originalAnswer: source,
        parsedOutput: parsed.output,
        interpretationFormat: "BRAND_CONTENT" as const,
      })),
    );
    task.userContext.samples[1]!.sampleSummary = "独立补充的小结。";
    const before = structuredClone(task);
    const candidate = buildM4ReportCompositionTasks(task).narrative;
    expect(candidate.userContext.samples[0]).not.toHaveProperty(
      "sampleSummary",
    );
    expect(candidate.userContext.samples[0]!.target).toEqual(
      task.userContext.samples[0]!.target,
    );
    expect(candidate.userContext.samples[1]).toHaveProperty(
      "sampleSummary",
      "独立补充的小结。",
    );
    expect(candidate.systemInstruction).not.toContain("正向和中性均可作为竞品");
    expect(task).toEqual(before);
    const unmarked = structuredClone(task);
    delete unmarked.userContext.samples[0]!.interpretationBasis;
    expect(
      buildM4ReportCompositionTasks(unmarked).narrative.userContext.samples[0],
    ).toHaveProperty("sampleSummary");
  });
  it("preserves neutral and negative labels through synthesis without reclassifying legacy false", () => {
    const parsed = inspectM4BrandRowsOutput({
      brands: [
        { ...row("目标", true), attitude: "NEGATIVE" },
        { ...row("中性品牌"), attitude: "NEUTRAL" },
        { ...row("负向品牌"), attitude: "NEGATIVE" },
      ],
    }).projected;
    expect(parsed.output.target!.position).toBe(1);
    expect(parsed.competitors.map((b) => [b.displayName, b.position])).toEqual([
      ["中性品牌", 2],
    ]);
    const old = {
      target: null,
      otherBrands: [
        {
          displayName: "中性品牌",
          position: 1,
          positiveRecommendation: false,
          mentionContext: "旧版未作正向推荐。",
        },
        {
          displayName: "旧正向",
          position: 2,
          positiveRecommendation: true,
          mentionContext: "旧版推荐。",
        },
      ],
    };
    const samples = [
      { sampleId: "new", parsedOutput: parsed.output },
      { sampleId: "old", parsedOutput: old },
    ].map((s) => ({
      ...s,
      question: "哪些品牌？",
      originalAnswer: "ONLY_RAW_SOURCE",
      platformLabel: "千问",
      interpretationFormat: "BRAND_CONTENT" as const,
    }));
    const task = buildM4ChainSynthesisTask("目标", samples);
    expect(task.userContext.samples[0]!.otherBrands[0]).toHaveProperty(
      "attitude",
      "NEUTRAL",
    );
    expect(task.userContext.samples[1]!.otherBrands[0]).not.toHaveProperty(
      "attitude",
    );
    expect(JSON.stringify(task.userContext)).not.toContain("ONLY_RAW_SOURCE");
    const result = inspectM4BrandGroupingOutput(
      {
        brandGroups: [
          { displayName: "中性品牌", members: ["new-b1", "old-b1"] },
        ],
      },
      task,
    );
    expect(
      result.competitorPreview.map((g) => [
        g.displayName,
        g.eligibleSampleCount,
      ]),
    ).toEqual([
      ["中性品牌", 1],
      ["旧正向", 1],
    ]);
    expect(() =>
      buildM4ChainSynthesisTask("目标", [
        samples[0]!,
        {
          ...samples[1]!,
          parsedOutput: {
            ...old,
            otherBrands: [{ ...old.otherBrands[0]!, attitude: "NEUTRAL" }],
          },
        },
      ]),
    ).toThrow();
  });
  it("rejects missing, invalid or contradictory model attitude fields", () => {
    const { attitude: _attitude, ...withoutAttitude } = row("商家");
    for (const brand of [
      withoutAttitude,
      { ...row("商家"), attitude: "MIXED" },
      { ...row("商家"), positiveRecommendation: true },
    ]) {
      expect(() => inspectM4BrandRowsOutput({ brands: [brand] })).toThrow();
    }
  });
  it("sends the cleaned whole reading string through the actual Qwen adapter", async () => {
    let body: Record<string, unknown> | undefined;
    const route = REAL_AI_ROUTES.find(
      (r) => r.routePolicyId === "evaluation.interpretation.qwen-primary@2",
    )!;
    class Capture extends ProviderHttpTransport {
      override async send(request: ProviderHttpRequest) {
        body = request.body;
        return {
          ok: true,
          status: 200,
          headers: {},
          body: {
            model: route.requestedModel,
            choices: [
              {
                finish_reason: "stop",
                message: {
                  content: JSON.stringify({
                    brands: [
                      {
                        displayName: "青禾咖啡",
                        isFocusBrand: true,
                        attitude: "POSITIVE",
                        mentionContext: ["青禾咖啡安静但略贵。"],
                      },
                    ],
                  }),
                },
              },
            ],
          },
        };
      }
    }
    const input = buildM4BrandRowsTask(prepared, source);
    const adapter = new ModelStudioProviderAdapter(
      { baseUrl: "http://offline.invalid/v1", apiKey: "offline-placeholder" },
      new Capture(1000),
    );
    await adapter.execute(
      {
        ...route,
        input,
        runId: "42000000-0000-4000-8000-000000000001",
        cycleId: "42000000-0000-4000-8000-000000000002",
        sampleId: "42000000-0000-4000-8000-000000000003",
        correlationId: "content-test",
        attemptNumber: 1,
      },
      route,
    );
    const messages = body!.messages as Array<{ role: string; content: string }>;
    expect(messages).toEqual([
      { role: "system", content: input.systemInstruction },
      { role: "user", content: JSON.stringify(input.userContext) },
    ]);
    expect(JSON.parse(messages[1]!.content).content).toBe(
      buildM4ReadingText(source),
    );
    expect(body!.reasoning_effort).toBe("low");
    expect(body).not.toHaveProperty("tools");
  });
});
