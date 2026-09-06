import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  inspectM4CustomerSummaryOutput,
  m4CustomerSummarySchema,
} from "./m4-parser-customer-summary.js";

const text = (max: number) => z.string().trim().min(1).max(max);
const id = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const refs = z.array(id).min(1).max(20);
const theme = z.object({ summary: text(600), sampleIds: refs }).strict();
export const m4ChainSynthesisSchema = z
  .object({
    overview: text(1200),
    positiveThemes: z.array(theme).max(5),
    negativeThemes: z.array(theme).max(5),
    directions: z
      .array(
        z
          .object({
            problem: text(400),
            suggestion: text(600),
            sampleIds: refs,
          })
          .strict(),
      )
      .max(3),
    brandGroups: z
      .array(
        z
          .object({
            displayName: text(120),
            members: z.array(id).min(2).max(100),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();

const excerpt = z.array(
  z
    .object({
      exactText: z.string().min(1),
      occurrence: z.number().int().positive(),
    })
    .strict(),
);
const targetShape = m4CustomerSummarySchema.shape.target.unwrap();
const sourceBackedSchema = m4CustomerSummarySchema.extend({
  target: targetShape
    .extend({
      evidence: excerpt,
      points: z.array(
        targetShape.shape.points.element.extend({ evidence: excerpt }),
      ),
    })
    .nullable(),
  otherBrands: z.array(
    m4CustomerSummarySchema.shape.otherBrands.element.extend({
      evidence: excerpt,
    }),
  ),
});
const prompt = z
  .object({ id: z.string(), version: z.string(), content: z.string().min(1) })
  .strict()
  .parse(
    JSON.parse(
      readFileSync(
        new URL(
          "../../../geo-intelligence/experiments/m4-chain-synthesis.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );

export type M4ChainSample = {
  sampleId: string;
  question: string;
  platformLabel: string;
  originalAnswer: string;
  parsedOutput: unknown;
};

// Controlled analysis preview only. No legacy semantic adapter or official score.
export function buildM4ChainSynthesisTask(
  companyName: string,
  inputs: M4ChainSample[],
) {
  if (!companyName.trim() || inputs.length < 2)
    throw new Error("Brand and multiple real samples required");
  const seen = new Set<string>();
  const samples = inputs.map((sample) => {
    id.parse(sample.sampleId);
    if (seen.has(sample.sampleId)) throw new Error("Duplicate sample ID");
    seen.add(sample.sampleId);
    const inspected = inspectM4CustomerSummaryOutput(
      sample.parsedOutput,
      sample.originalAnswer,
    );
    const restored = sourceBackedSchema.parse(inspected.sourceBackedOutput);
    return {
      sampleId: sample.sampleId,
      question: sample.question,
      platformLabel: sample.platformLabel,
      target: restored.target,
      sampleSummary: inspected.sampleSummary,
      otherBrands: restored.otherBrands.map((brand, index) => ({
        ...brand,
        id: id.parse(`${sample.sampleId}-b${index + 1}`),
      })),
    };
  });
  return {
    taskKind: "STRUCTURED_OUTPUT" as const,
    systemInstruction: prompt.content,
    userContext: {
      companyName,
      coverage: {
        sampleCount: samples.length,
        mentionedSampleCount: samples.filter((s) => s.target !== null).length,
      },
      samples,
    },
    outputContract: {
      version: `${prompt.id}@${prompt.version}`,
      jsonSchema: z.toJSONSchema(m4ChainSynthesisSchema, {
        target: "draft-2020-12",
      }),
    },
  };
}

export function inspectM4ChainSynthesisOutput(
  value: unknown,
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const output = m4ChainSynthesisSchema.parse(value);
  const sampleIds = new Set(task.userContext.samples.map((s) => s.sampleId));
  for (const item of [
    ...output.positiveThemes,
    ...output.negativeThemes,
    ...output.directions,
  ]) {
    for (const sampleId of item.sampleIds)
      if (!sampleIds.has(sampleId)) throw new Error("Unknown evidence sample");
  }
  const brands = task.userContext.samples.flatMap((sample) =>
    sample.otherBrands.map((brand) => ({
      ...brand,
      sampleId: sample.sampleId,
    })),
  );
  const byId = new Map(brands.map((brand) => [brand.id, brand]));
  const assigned = new Set<string>();
  const groups = output.brandGroups.map((group) => {
    for (const member of group.members) {
      if (!byId.has(member)) throw new Error("Unknown brand member");
      if (assigned.has(member)) throw new Error("Brand member assigned twice");
      assigned.add(member);
    }
    return group;
  });
  groups.push(
    ...brands
      .filter((b) => !assigned.has(b.id))
      .map((b) => ({ displayName: b.displayName, members: [b.id] })),
  );
  const competitorPreview = groups
    .map((group) => ({
      ...group,
      positiveSampleCount: new Set(
        group.members
          .map((member) => byId.get(member)!)
          .filter((b) => b.positiveRecommendation)
          .map((b) => b.sampleId),
      ).size,
    }))
    .filter((group) => group.positiveSampleCount > 0);
  return { output, coverage: task.userContext.coverage, competitorPreview };
}
