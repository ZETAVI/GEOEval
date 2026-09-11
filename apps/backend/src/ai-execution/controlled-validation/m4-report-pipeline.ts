import { readFileSync } from "node:fs";
import { z } from "zod";
import type { StructuredOutputAttemptInput } from "../domain/ai-attempt.types.js";
import type { EvaluationQuestionKind } from "../../geo-intelligence/domain/evaluation.types.js";
import { buildM4ReadingText } from "./m4-reading-text.js";

// Controlled report-oriented experiment, not a runtime or legacy-report adapter.
const asset = z
  .object({
    id: z.string(),
    version: z.string(),
    compositionVersion: z.string().optional(),
    open: z.string(),
    direct: z.string(),
    resolution: z.string(),
    composition: z.string(),
  })
  .strict()
  .parse(
    JSON.parse(
      readFileSync(
        new URL(
          "../../../geo-intelligence/experiments/m4-report-pipeline.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
const text = (max: number) => z.string().trim().min(1).max(max);
const reference = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const polarity = z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]);
const contentPoint = z.object({ text: text(1200), polarity }).strict();
const brand = z
  .object({
    displayName: text(120),
    isFocusBrand: z.boolean(),
    attitude: polarity,
    mentionContext: z.array(contentPoint),
  })
  .strict();
export const m4ReportSampleSchema = z
  .object({
    brands: z.array(brand),
    cardInterpretation: text(600),
  })
  .strict();
type SampleOutput = z.infer<typeof m4ReportSampleSchema>;
const kinds = z.enum([
  "BRAND_DIRECTED",
  "INDUSTRY_RECOMMENDATION",
  "CHARACTERISTIC_ONE",
  "CHARACTERISTIC_TWO",
]);

// Experiment-only message assembly. Keep the schema instruction next to its
// executable owner rather than duplicating it in each private replay runner.
export function buildM4ReportMessages(
  input: StructuredOutputAttemptInput,
  schemaMode: "full" | "omit" | "compact" = "full",
) {
  return [
    {
      role: "system" as const,
      content:
        input.systemInstruction +
        (schemaMode === "full"
          ? "\n\n请根据输入完成任务，输出一个符合以下 JSON Schema 的数据对象。Schema 只说明字段和类型，不是要返回的答案；请填写实际解析结果，不要复述 Schema。仅输出 JSON 对象本身，不加代码围栏或解释。\n" +
            JSON.stringify(input.outputContract.jsonSchema)
          : schemaMode === "compact"
            ? compactCompositionGuide(input)
            : "\n\n请根据输入完成任务，按上述输出要求返回填有实际结果的 JSON 对象。仅输出 JSON 对象本身，不加代码围栏或解释。"),
    },
    { role: "user" as const, content: JSON.stringify(input.userContext) },
  ];
}

// Composition-only experiment: derive the shape and bounds from the same
// contract used locally, without repeating all allowed evidence IDs in prose.
function compactCompositionGuide(input: StructuredOutputAttemptInput) {
  if (!input.outputContract.version.includes(".composition@"))
    throw Error("Compact guide is only defined for report composition");
  const bounds: string[] = [];
  const shape = (schema: any, path: string): unknown => {
    if (schema === false || schema.not) return null;
    if (schema.type === "object")
      return Object.fromEntries(
        Object.entries(schema.properties).map(([key, value]) => [
          key,
          shape(value, path ? `${path}.${key}` : key),
        ]),
      );
    if (schema.type === "array") {
      if (schema.minItems || schema.maxItems !== undefined)
        bounds.push(
          `${path}：${schema.minItems ?? 0}–${schema.maxItems ?? "不限"}项`,
        );
      const item = shape(schema.items, `${path}[]`);
      return item === null ? [] : [item];
    }
    if (schema.maxLength)
      bounds.push(`${path}：${schema.minLength ?? 0}–${schema.maxLength}字符`);
    return schema.enum?.[0] ?? "填写实际内容";
  };
  const skeleton = shape(input.outputContract.jsonSchema, "");
  return (
    "\n\n输出一个 JSON 数据对象，字段和嵌套层级如下，所有字段都要保留，不增加其他字段。骨架中的文字和 ID 仅示意位置，请根据输入填写实际结果；没有适用内容的列表填写空数组。\n" +
    JSON.stringify(skeleton) +
    "\npositiveThemes、negativeThemes 的 pointIds 引用 samples[].target.mentionContext[].id，表示具体内容点；directions 的 sampleIds 引用 samples[].sampleId，表示整条样本。两类 ID 不可混用，复制输入中对应层级的 ID。\n" +
    "格式范围（不是要求写满）：" +
    bounds.join("；") +
    "。仅输出 JSON 对象本身，不加代码围栏或解释。"
  );
}

function task(
  part: "open" | "direct" | "resolution" | "composition",
  userContext: Record<string, unknown>,
  schema: z.ZodType,
): StructuredOutputAttemptInput {
  return {
    taskKind: "STRUCTURED_OUTPUT",
    systemInstruction: asset[part],
    userContext,
    outputContract: {
      version: `${asset.id}.${part}@${part === "composition" ? (asset.compositionVersion ?? asset.version) : asset.version}`,
      jsonSchema: z.toJSONSchema(schema, { target: "draft-2020-12" }),
    },
  };
}
export function buildM4ReportSampleTask(input: {
  focusBrand: string;
  question: string;
  questionKind: EvaluationQuestionKind;
  originalAnswer: string;
}) {
  kinds.parse(input.questionKind);
  const direct = input.questionKind === "BRAND_DIRECTED";
  const schema = direct
    ? m4ReportSampleSchema.extend({
        brands: z.array(brand.extend({ isFocusBrand: z.literal(true) })).max(1),
      })
    : m4ReportSampleSchema;
  return task(
    direct ? "direct" : "open",
    {
      focusBrand: text(120).parse(input.focusBrand),
      question: text(500).parse(input.question),
      content: buildM4ReadingText(text(100000).parse(input.originalAnswer)),
    },
    schema,
  );
}
export function inspectM4ReportSample(
  value: unknown,
  kind: EvaluationQuestionKind,
) {
  kinds.parse(kind);
  const output = m4ReportSampleSchema.parse(value);
  if (output.brands.filter((b) => b.isFocusBrand).length > 1)
    throw Error("Multiple focus rows");
  if (
    new Set(output.brands.map((b) => b.displayName)).size !==
    output.brands.length
  )
    throw Error("Duplicate brand row");
  if (
    kind === "BRAND_DIRECTED" &&
    (output.brands.length > 1 || output.brands.some((b) => !b.isFocusBrand))
  )
    throw Error("Direct output must contain only the focus brand");
  return output;
}
export type M4ReportSample = {
  sampleId: string;
  questionId: string;
  question: string;
  questionKind: EvaluationQuestionKind;
  platformLabel: string;
  parsedOutput: unknown;
};
export function prepareM4ReportSamples(inputs: M4ReportSample[]) {
  if (inputs.length < 2) throw Error("Multiple valid samples required");
  const ids = new Set<string>(),
    pairs = new Set<string>();
  const questions = new Map<string, string>();
  return inputs.map((input) => {
    reference.parse(input.sampleId);
    reference.parse(input.questionId);
    if (ids.has(input.sampleId)) throw Error("Duplicate sample");
    ids.add(input.sampleId);
    const questionIdentity = JSON.stringify([
      input.question,
      input.questionKind,
    ]);
    if (
      questions.has(input.questionId) &&
      questions.get(input.questionId) !== questionIdentity
    )
      throw Error("Question snapshot mismatch");
    questions.set(input.questionId, questionIdentity);
    const pair = JSON.stringify([input.questionId, input.platformLabel]);
    if (pairs.has(pair)) throw Error("Repeated parse is not another sample");
    pairs.add(pair);
    const output = inspectM4ReportSample(
      input.parsedOutput,
      input.questionKind,
    );
    const rows = output.brands.map((b, bi) => ({
      ...b,
      id: reference.parse(`${input.sampleId}-b${bi + 1}`),
      position: input.questionKind === "BRAND_DIRECTED" ? null : bi + 1,
      mentionContext: b.mentionContext.map((p, pi) => ({
        ...p,
        id: reference.parse(`${input.sampleId}-b${bi + 1}-p${pi + 1}`),
      })),
    }));
    return {
      sampleId: input.sampleId,
      questionId: input.questionId,
      question: input.question,
      questionKind: input.questionKind,
      platformLabel: input.platformLabel,
      cardInterpretation: output.cardInterpretation,
      target: rows.find((b) => b.isFocusBrand) ?? null,
      otherBrands:
        input.questionKind === "BRAND_DIRECTED"
          ? []
          : rows.filter((b) => !b.isFocusBrand),
    };
  });
}
type Prepared = ReturnType<typeof prepareM4ReportSamples>;
function records(samples: Prepared) {
  return samples.flatMap((s) =>
    s.otherBrands.map((b) => ({
      id: b.id,
      displayName: b.displayName,
      mentionContext: b.mentionContext.map((p) => p.text),
    })),
  );
}

function observedBrandNames(samples: Prepared) {
  const names = new Map<
    string,
    { observedName: string; mentionContext: string[] }
  >();
  for (const record of records(samples)) {
    const entry = names.get(record.displayName) ?? {
      observedName: record.displayName,
      mentionContext: [],
    };
    for (const point of record.mentionContext)
      if (!entry.mentionContext.includes(point))
        entry.mentionContext.push(point);
    names.set(record.displayName, entry);
  }
  return [...names.values()];
}
function resolutionSchema(samples: Prepared) {
  return z
    .object({
      assignments: z
        .object(
          Object.fromEntries(
            records(samples).map((r) => [r.id, text(120).nullable()]),
          ),
        )
        .strict(),
    })
    .strict();
}
export function buildM4ReportResolutionTask(samples: Prepared) {
  return task(
    "resolution",
    { records: records(samples) },
    resolutionSchema(samples),
  );
}
function summarize(samples: Prepared) {
  const open = samples.filter((s) => s.questionKind !== "BRAND_DIRECTED");
  const mentioned = open.filter((s) => s.target !== null);
  return {
    validOpenSampleCount: open.length,
    mentionedOpenSampleCount: mentioned.length,
    mentionRate: open.length ? mentioned.length / open.length : null,
    positions: mentioned.map((s) => s.target!.position),
  };
}
// Compare presentation whitespace only. Keep Latin word boundaries and all
// name characters; identity/alias decisions still belong to resolution.
function brandNameSpacingKey(name: string) {
  return name
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/(\p{Script=Han}) (?=[\p{Script=Latin}\p{Number}])/gu, "$1")
    .replace(/([\p{Script=Latin}\p{Number}]) (?=\p{Script=Han})/gu, "$1");
}

function resolutionRows(samples: Prepared) {
  return samples.flatMap((s) =>
    s.otherBrands.map((b) => ({
      ...b,
      sampleId: s.sampleId,
      platformLabel: s.platformLabel,
    })),
  );
}
function focusNameKeys(samples: Prepared, focusBrand: string) {
  return new Set(
    [
      focusBrand,
      ...samples.flatMap((s) => (s.target ? [s.target.displayName] : [])),
    ].map((s) => brandNameSpacingKey(s.normalize("NFKC").toLocaleLowerCase())),
  );
}

export function inspectM4ReportResolution(
  value: unknown,
  samples: Prepared,
  focusBrand: string,
) {
  const output = resolutionSchema(samples).parse(value);
  const all = resolutionRows(samples);
  const targetNames = focusNameKeys(samples, focusBrand);
  const grouped = new Map<
    string,
    { displayName: string; members: typeof all }
  >();
  for (const row of all) {
    const name = output.assignments[row.id];
    if (name === null) continue;
    if (name === undefined) throw Error("Missing resolution slot");
    if (
      targetNames.has(
        brandNameSpacingKey(name.normalize("NFKC").toLocaleLowerCase()),
      )
    )
      throw Error("Resolved competitor is focus brand; requires review");
    const key = brandNameSpacingKey(name);
    const group = grouped.get(key) ?? { displayName: name, members: [] };
    group.members.push(row);
    grouped.set(key, group);
  }
  return {
    output,
    competitors: summarizeResolutionGroups([...grouped.values()]),
  };
}

function summarizeResolutionGroups(
  groups: Array<{
    displayName: string;
    members: ReturnType<typeof resolutionRows>;
  }>,
) {
  return groups
    .flatMap(({ displayName, members }) => {
      const eligible = members.filter((m) => m.attitude !== "NEGATIVE");
      const perSample = new Map<string, number>();
      for (const m of eligible) {
        if (m.position === null)
          throw Error("Direct position in competitor statistics");
        perSample.set(
          m.sampleId,
          Math.min(perSample.get(m.sampleId) ?? Infinity, m.position),
        );
      }
      return perSample.size
        ? [
            {
              displayName,
              occurrenceCount: perSample.size,
              platforms: [...new Set(eligible.map((m) => m.platformLabel))],
              positions: [...perSample.values()],
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        b.occurrenceCount - a.occurrenceCount ||
        a.displayName.localeCompare(b.displayName),
    );
}

const groupedResolutionSchema = z
  .object({
    brandGroups: z.array(
      z
        .object({
          displayName: text(120),
          observedNames: z.array(text(120)).min(1),
        })
        .strict(),
    ),
    ignoredNames: z.array(text(120)),
  })
  .strict();

// Experimental name-level resolution. Internal record IDs stay in the program;
// the model only groups the observed names and uses their content for context.
export function buildM4ReportGroupedResolutionTask(
  samples: Prepared,
): StructuredOutputAttemptInput {
  const prompt = JSON.parse(
    readFileSync(
      new URL(
        "../../../geo-intelligence/experiments/m4-resolution-groups.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as { id: string; version: string; instruction: string };
  return {
    taskKind: "STRUCTURED_OUTPUT",
    systemInstruction: prompt.instruction,
    userContext: { brandNames: observedBrandNames(samples) },
    outputContract: {
      version: `${prompt.id}@${prompt.version}`,
      jsonSchema: z.toJSONSchema(groupedResolutionSchema, {
        target: "draft-2020-12",
      }),
    },
  };
}

export function inspectM4ReportGroupedResolution(
  value: unknown,
  samples: Prepared,
  focusBrand: string,
) {
  const output = groupedResolutionSchema.parse(value);
  const rows = new Map<string, ReturnType<typeof resolutionRows>>();
  for (const row of resolutionRows(samples)) {
    const matches = rows.get(row.displayName) ?? [];
    matches.push(row);
    rows.set(row.displayName, matches);
  }
  const seen = new Set<string>();
  const take = (name: string) => {
    const matches = rows.get(name);
    if (!matches) throw Error("Unknown resolution name");
    if (seen.has(name)) throw Error("Repeated resolution name");
    seen.add(name);
    return matches;
  };
  const targetNames = focusNameKeys(samples, focusBrand);
  const groups = output.brandGroups.map((group) => {
    if (
      targetNames.has(
        brandNameSpacingKey(
          group.displayName.normalize("NFKC").toLocaleLowerCase(),
        ),
      )
    )
      throw Error("Resolved competitor is focus brand; requires review");
    return {
      displayName: group.displayName,
      members: group.observedNames.flatMap(take),
    };
  });
  output.ignoredNames.forEach(take);
  if (seen.size !== rows.size) throw Error("Missing resolution member");
  // Group membership, not display text, is the identity used for counting.
  // Exact observed names are expanded back to all source records only here.
  return { output, competitors: summarizeResolutionGroups(groups) };
}
function reportSchema(samples: Prepared) {
  const points = samples.flatMap(
    (s) => s.target?.mentionContext.map((p) => p.id) ?? [],
  );
  const pointId = points.length
    ? z.enum(points as [string, ...string[]])
    : z.never();
  const sampleIds = samples.map((s) => s.sampleId) as [string, ...string[]];
  const theme = z
    .object({
      label: text(80),
      summary: text(600),
      pointIds: z.array(pointId).min(1),
    })
    .strict();
  return z
    .object({
      recommendationAssessment: text(1200),
      brandPerception: text(1200),
      positiveThemes: z.array(theme).max(5),
      negativeThemes: z.array(theme).max(5),
      directions: z
        .array(
          z
            .object({
              problem: text(400),
              suggestion: text(600),
              sampleIds: z.array(z.enum(sampleIds)).min(1),
            })
            .strict(),
        )
        .max(2),
    })
    .strict();
}
export function buildM4ReportCompositionTask(
  focusBrand: string,
  samples: Prepared,
  resolution: unknown,
) {
  const resolved = inspectM4ReportResolution(resolution, samples, focusBrand);
  return compositionTask(focusBrand, samples, resolved.competitors);
}

export function buildM4ReportGroupedCompositionTask(
  focusBrand: string,
  samples: Prepared,
  resolution: unknown,
) {
  const resolved = inspectM4ReportGroupedResolution(
    resolution,
    samples,
    focusBrand,
  );
  return compositionTask(focusBrand, samples, resolved.competitors);
}

function compositionTask(
  focusBrand: string,
  samples: Prepared,
  competitors: ReturnType<typeof summarizeResolutionGroups>,
) {
  const questions = [...new Set(samples.map((s) => s.questionId))].map(
    (questionId) => {
      const group = samples.filter((s) => s.questionId === questionId);
      return {
        questionId,
        question: group[0]!.question,
        questionKind: group[0]!.questionKind,
        validSampleCount: group.length,
        mentionedSampleCount: group.filter((s) => s.target !== null).length,
        ...summarize(group),
      };
    },
  );
  const platforms = [...new Set(samples.map((s) => s.platformLabel))].map(
    (platformLabel) => ({
      platformLabel,
      ...summarize(samples.filter((s) => s.platformLabel === platformLabel)),
    }),
  );
  return task(
    "composition",
    {
      focusBrand: text(120).parse(focusBrand),
      performance: { ...summarize(samples), questions, platforms },
      competitors: competitors.slice(0, 5),
      samples: samples.map((s) => ({
        sampleId: s.sampleId,
        questionId: s.questionId,
        question: s.question,
        questionKind: s.questionKind,
        platformLabel: s.platformLabel,
        target: s.target
          ? {
              displayName: s.target.displayName,
              attitude: s.target.attitude,
              position: s.target.position,
              mentionContext: s.target.mentionContext,
            }
          : null,
      })),
    },
    reportSchema(samples),
  );
}
export function inspectM4ReportComposition(value: unknown, samples: Prepared) {
  const output = reportSchema(samples).parse(value);
  const points = new Map(
    samples.flatMap(
      (s) =>
        s.target?.mentionContext.map(
          (p) =>
            [
              p.id,
              { sampleId: s.sampleId, platformLabel: s.platformLabel },
            ] as const,
        ) ?? [],
    ),
  );
  const support = (theme: { pointIds: string[] }) => {
    const refs = theme.pointIds.map((id) => points.get(id)!);
    return {
      sampleCount: new Set(refs.map((r) => r.sampleId)).size,
      platforms: [...new Set(refs.map((r) => r.platformLabel))],
    };
  };
  return {
    output,
    themes: {
      positive: output.positiveThemes.map((t) => ({
        ...t,
        evidence: support(t),
      })),
      negative: output.negativeThemes.map((t) => ({
        ...t,
        evidence: support(t),
      })),
    },
  };
}
export function composeM4ReportPipelinePreview(
  focusBrand: string,
  samples: Prepared,
  resolution: unknown,
  composition: unknown,
) {
  const brands = inspectM4ReportResolution(resolution, samples, focusBrand);
  return reportPreview(samples, brands.competitors, composition);
}

export function composeM4ReportGroupedPipelinePreview(
  focusBrand: string,
  samples: Prepared,
  resolution: unknown,
  composition: unknown,
) {
  const brands = inspectM4ReportGroupedResolution(
    resolution,
    samples,
    focusBrand,
  );
  return reportPreview(samples, brands.competitors, composition);
}

function reportPreview(
  samples: Prepared,
  competitors: ReturnType<typeof summarizeResolutionGroups>,
  composition: unknown,
) {
  const report = inspectM4ReportComposition(composition, samples);
  return {
    experimental: true,
    ...report,
    competitors: competitors.slice(0, 5),
    cards: samples.map((s) => ({
      sampleId: s.sampleId,
      cardInterpretation: s.cardInterpretation,
    })),
    performance: summarize(samples),
  };
}
