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
    cardInterpretation: text(600),
    brands: z.array(brand),
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
export function buildM4ReportMessages(input: StructuredOutputAttemptInput) {
  return [
    {
      role: "system" as const,
      content:
        input.systemInstruction +
        "\n\n请根据输入完成任务，输出一个符合以下 JSON Schema 的数据对象。Schema 只说明字段和类型，不是要返回的答案；请填写实际解析结果，不要复述 Schema。仅输出 JSON 对象本身，不加代码围栏或解释。\n" +
        JSON.stringify(input.outputContract.jsonSchema),
    },
    { role: "user" as const, content: JSON.stringify(input.userContext) },
  ];
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
      version: `${asset.id}.${part}@${asset.version}`,
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
export function inspectM4ReportResolution(
  value: unknown,
  samples: Prepared,
  focusBrand: string,
) {
  const output = resolutionSchema(samples).parse(value);
  const all = samples.flatMap((s) =>
    s.otherBrands.map((b) => ({
      ...b,
      sampleId: s.sampleId,
      platformLabel: s.platformLabel,
    })),
  );
  const targetNames = new Set(
    [
      focusBrand,
      ...samples.flatMap((s) => (s.target ? [s.target.displayName] : [])),
    ].map((s) => s.normalize("NFKC").toLocaleLowerCase()),
  );
  const grouped = new Map<string, typeof all>();
  for (const row of all) {
    const name = output.assignments[row.id];
    if (name === null) continue;
    if (name === undefined) throw Error("Missing resolution slot");
    if (targetNames.has(name.normalize("NFKC").toLocaleLowerCase()))
      throw Error("Resolved competitor is focus brand; requires review");
    const members = grouped.get(name) ?? [];
    members.push(row);
    grouped.set(name, members);
  }
  const competitors = [...grouped]
    .flatMap(([displayName, members]) => {
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
  return { output, competitors };
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
      competitors: resolved.competitors.slice(0, 5),
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
  const report = inspectM4ReportComposition(composition, samples);
  return {
    experimental: true,
    ...report,
    competitors: brands.competitors.slice(0, 5),
    cards: samples.map((s) => ({
      sampleId: s.sampleId,
      cardInterpretation: s.cardInterpretation,
    })),
    performance: summarize(samples),
  };
}
