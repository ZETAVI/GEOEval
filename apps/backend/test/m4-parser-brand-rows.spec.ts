import { describe, expect, it } from "vitest";
import { buildSampleParserTask } from "../src/geo-intelligence/sample-parser.policy.js";
import { buildM4CustomerSummaryTask } from "../src/ai-execution/controlled-validation/m4-parser-customer-summary.js";
import {
  buildM4BrandRowsTask,
  inspectM4BrandRowsOutput,
} from "../src/ai-execution/controlled-validation/m4-parser-brand-rows.js";
import { buildM4ReadingText } from "../src/ai-execution/controlled-validation/m4-reading-text.js";
import {
  buildM4ChainSynthesisTask,
  buildM4ReportCompositionTasks,
  buildM4BrandAssignmentTask,
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
  positiveRecommendation: true,
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
    { ...row("墨云"), positiveRecommendation: false },
  ],
});

describe("M4 content-oriented brand rows", () => {
  it("uses one reading string and preserves the original source and target context", () => {
    const before = structuredClone(prepared);
    const task = buildM4BrandRowsTask(prepared, source);
    const { answerLines: _lines, ...context } = prepared.userContext;
    expect(task.userContext).toEqual({
      ...context,
      answerText: buildM4ReadingText(source),
    });
    expect(prepared).toEqual(before);
    expect(task.userContext).not.toHaveProperty("answerLines");
    expect(task.userContext).not.toHaveProperty("originalAnswer");
    expect(task.userContext.companyName).toBe("青禾咖啡");
    expect(task.userContext.question).toBe(base.userContext.question);
    expect(task.outputContract.version).toBe(
      "experiment.m4.parser-brand-rows@4.2.0",
    );
    expect(JSON.stringify(task.outputContract.jsonSchema)).not.toMatch(
      /exactText|occurrence|startLine|endLine|evidence/,
    );
  });
  it("accepts direct original context but never rebuilds original bytes from indexed or cleaned text", () => {
    expect(buildM4BrandRowsTask(base).userContext.answerText).toBe(
      buildM4ReadingText(source),
    );
    expect(() => buildM4BrandRowsTask(prepared)).toThrow();
    expect(() => buildM4BrandRowsTask(prepared, "different")).toThrow(
      "match original",
    );
    expect(() => buildM4BrandRowsTask(base, "different")).toThrow("mismatch");
    expect(() =>
      buildM4BrandRowsTask(buildM4BrandRowsTask(base), source),
    ).toThrow("reading view");
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
  it("demonstrates independent co-listed brands, aliases, repeats and a tail addition in one full example", () => {
    const task = buildM4BrandRowsTask(base);
    const example = JSON.parse(
      [...task.systemInstruction.matchAll(/输出：\n(\{[^\n]+\})/g)][0]![1]!,
    );
    const result = inspectM4BrandRowsOutput(example);
    expect(result.output.brands.map((b) => b.displayName)).toEqual([
      "青禾咖啡",
      "山岚咖啡",
      "晴川咖啡",
      "墨云咖啡",
    ]);
    expect(result.projected.output.target!.position).toBe(1);
    expect(result.projected.output.otherBrands.map((b) => b.position)).toEqual([
      2, 3, 4,
    ]);
    expect(result.projected.output.target!.summary).toContain("Qinghe Coffee");
    expect(
      result.projected.output.target!.points.map((p) => p.polarity),
    ).toEqual(["POSITIVE", "NEGATIVE"]);
  });
  it("provides a valid absent-target example with concrete subjects and three attitude meanings", () => {
    const examples = [
      ...buildM4BrandRowsTask(base).systemInstruction.matchAll(
        /输出：\n(\{[^\n]+\})/g,
      ),
    ];
    expect(examples).toHaveLength(2);
    const result = inspectM4BrandRowsOutput(JSON.parse(examples[1]![1]!));
    expect(result.output.brands.map((b) => b.displayName)).toEqual([
      "岚谷咖啡",
      "白石咖啡",
      "南桥咖啡",
    ]);
    expect(
      result.output.brands.every((b) => b.targetDescription === null),
    ).toBe(true);
    expect(result.projected.output.target).toBeNull();
    expect(result.output.brands[0]!.mentionContext).toContain("各有取舍");
    expect(result.output.brands.map((b) => b.positiveRecommendation)).toEqual([
      false,
      true,
      false,
    ]);
    expect(
      result.projected.positiveCompetitors.map((b) => [
        b.displayName,
        b.position,
      ]),
    ).toEqual([["白石咖啡", 2]]);
    // This validates the worked example and unchanged projection, not LLM semantics.
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
    });
    expect(result.projected.positiveCompetitors.map((b) => b.position)).toEqual(
      [2, 3],
    );
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
    expect(task.outputContract.version).toContain("parser-content@1");
    const split = buildM4ReportCompositionTasks(task);
    for (const child of [
      split.grouping,
      split.narrative,
      buildM4BrandAssignmentTask(task),
    ]) {
      expect(child.systemInstruction).toContain("不是逐字引文");
      expect(child.outputContract.version).toContain("parser-content@1");
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
                message: { content: JSON.stringify(raw()) },
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
    expect(JSON.parse(messages[1]!.content).answerText).toBe(
      buildM4ReadingText(source),
    );
    expect(body!.reasoning_effort).toBe("low");
    expect(body).not.toHaveProperty("tools");
  });
});
