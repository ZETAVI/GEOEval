import { readFileSync } from "node:fs";
import { z } from "zod";
import { parseAndProjectSampleParserModelOutput } from "../../geo-intelligence/domain/sample-parser-model.contract.js";
import { collectSampleSemanticObservations } from "../../geo-intelligence/domain/sample-parser.contract.js";
import type { EvaluationQuestionKind } from "../../geo-intelligence/domain/evaluation.types.js";
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
            displayName: text(120).describe("归并后的一个具体消费者品牌名。"),
            members: z
              .array(id)
              .min(2)
              .max(100)
              .describe("该品牌对应的 otherBrands 记录 id，不是 sampleId。"),
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
function loadPrompt(fileName: string) {
  return z
    .object({ id: z.string(), version: z.string(), content: z.string().min(1) })
    .strict()
    .parse(
      JSON.parse(
        readFileSync(
          new URL(
            `../../../geo-intelligence/experiments/${fileName}.json`,
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    );
}
const prompt = loadPrompt("m4-chain-synthesis");
const groupingPrompt = loadPrompt("m4-brand-grouping");
const narrativePrompt = loadPrompt("m4-target-narrative");
const groupingSchema = m4ChainSynthesisSchema.pick({ brandGroups: true });
const narrativeSchema = m4ChainSynthesisSchema.omit({ brandGroups: true });

export type M4ChainSample = {
  sampleId: string;
  question: string;
  platformLabel: string;
  originalAnswer: string;
  parsedOutput: unknown;
  questionKind?: EvaluationQuestionKind;
};

function sourceView(companyName: string, sample: M4ChainSample) {
  if (sample.questionKind !== "BRAND_DIRECTED") {
    const inspected = inspectM4CustomerSummaryOutput(
      sample.parsedOutput,
      sample.originalAnswer,
    );
    return {
      ...sourceBackedSchema.parse(inspected.sourceBackedOutput),
      sampleSummary: inspected.sampleSummary,
    };
  }
  const accepted = parseAndProjectSampleParserModelOutput(sample.parsedOutput, {
    companyName,
    questionKind: "BRAND_DIRECTED",
    originalAnswer: sample.originalAnswer,
  });
  if (accepted.family !== "BRAND_DIRECTED")
    throw new Error("Wrong direct-question family");
  const anchors = new Map(
    accepted.semantic.evidenceAnchors.map((a) => [a.anchorId, a]),
  );
  const evidenceFor = (ids: string[]) =>
    ids.map((anchorId) => {
      const anchor = anchors.get(anchorId);
      if (!anchor) throw new Error("Missing direct-question evidence");
      return { exactText: anchor.exactText, occurrence: anchor.occurrence };
    });
  return {
    target: accepted.mentioned
      ? {
          position: null,
          evidence: evidenceFor(
            accepted.semantic.evidenceAnchors
              .filter((a) => a.purposes.includes("TARGET_MENTION"))
              .map((a) => a.anchorId),
          ),
          points: collectSampleSemanticObservations(accepted.semantic).map(
            (observation) => ({
              text: observation.detail,
              polarity: observation.polarity,
              evidence: evidenceFor(observation.evidenceAnchorIds),
            }),
          ),
          summary: accepted.semantic.cardInterpretation,
        }
      : null,
    // Direct questions describe the target; their other mentions are not competitors.
    otherBrands: [],
    sampleSummary: accepted.semantic.cardInterpretation,
  };
}

// Controlled analysis preview only. No legacy semantic adapter or official score.
export function buildM4ChainSynthesisTask(
  companyName: string,
  inputs: M4ChainSample[],
  expectedSampleCount = inputs.length,
  brandContext?: string,
) {
  if (!companyName.trim() || inputs.length < 2)
    throw new Error("Brand and multiple real samples required");
  z.number().int().min(inputs.length).parse(expectedSampleCount);
  const seen = new Set<string>();
  const samples = inputs.map((sample) => {
    id.parse(sample.sampleId);
    if (seen.has(sample.sampleId)) throw new Error("Duplicate sample ID");
    seen.add(sample.sampleId);
    const questionKind = sample.questionKind ?? "INDUSTRY_RECOMMENDATION";
    const restored = sourceView(companyName, { ...sample, questionKind });
    return {
      sampleId: sample.sampleId,
      question: sample.question,
      platformLabel: sample.platformLabel,
      questionKind,
      target: restored.target,
      sampleSummary: restored.sampleSummary,
      otherBrands: restored.otherBrands.map((brand, index) => ({
        ...brand,
        id: id.parse(`${sample.sampleId}-b${index + 1}`),
      })),
    };
  });
  // The model selects existing references; it has no reason to invent identifiers.
  const sampleIds = samples.map((sample) => sample.sampleId);
  const brandIds = samples.flatMap((sample) =>
    sample.otherBrands.map((brand) => brand.id),
  );
  const sampleRefs = z
    .array(z.enum(sampleIds as [string, ...string[]]))
    .min(1)
    .max(20);
  const groupShape = m4ChainSynthesisSchema.shape.brandGroups.element;
  const boundSchema = m4ChainSynthesisSchema.extend({
    positiveThemes: z.array(theme.extend({ sampleIds: sampleRefs })).max(5),
    negativeThemes: z.array(theme.extend({ sampleIds: sampleRefs })).max(5),
    directions: z
      .array(
        m4ChainSynthesisSchema.shape.directions.element.extend({
          sampleIds: sampleRefs,
        }),
      )
      .max(3),
    brandGroups:
      brandIds.length < 2
        ? z.array(groupShape).max(0)
        : z
            .array(
              groupShape.extend({
                members: z
                  .array(z.enum(brandIds as [string, ...string[]]))
                  .min(2)
                  .max(100)
                  .describe("从所给其他品牌记录 id 中选择同一品牌的成员。"),
              }),
            )
            .max(30),
  });
  return {
    taskKind: "STRUCTURED_OUTPUT" as const,
    systemInstruction: prompt.content,
    userContext: {
      companyName,
      ...(brandContext === undefined
        ? {}
        : { brandContext: text(2000).parse(brandContext) }),
      coverage: {
        expectedSampleCount,
        sampleCount: samples.length,
        unavailableSampleCount: expectedSampleCount - samples.length,
        mentionedSampleCount: samples.filter((s) => s.target !== null).length,
        openSampleCount: samples.filter(
          (s) => s.questionKind !== "BRAND_DIRECTED",
        ).length,
        mentionedOpenSampleCount: samples.filter(
          (s) => s.questionKind !== "BRAND_DIRECTED" && s.target !== null,
        ).length,
      },
      samples,
    },
    outputContract: {
      version: `${prompt.id}@${prompt.version}`,
      jsonSchema: z.toJSONSchema(boundSchema, {
        target: "draft-2020-12",
      }),
    },
  };
}

// Alternate model-facing layout only; keep the original task for inspection/counts.
export function flattenM4ChainSynthesisTask(
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const { samples, ...context } = task.userContext;
  return {
    ...task,
    userContext: {
      ...context,
      otherBrands: samples.flatMap((sample) =>
        sample.otherBrands.map(({ id, displayName, ...details }) => ({
          id,
          displayName,
          sampleId: sample.sampleId,
          ...details,
        })),
      ),
      samples: samples.map(
        ({ otherBrands: _otherBrands, ...sample }) => sample,
      ),
    },
  };
}

// Experimental task split only; neither component consumes the other's output.
export function buildM4ReportCompositionTasks(
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const { otherBrands, ...narrativeContext } =
    flattenM4ChainSynthesisTask(task).userContext;
  const { brandGroups, ...narrativeProperties } =
    task.outputContract.jsonSchema.properties!;
  const contract = (
    asset: typeof prompt,
    properties: NonNullable<typeof task.outputContract.jsonSchema.properties>,
  ) => ({
    version: `${asset.id}@${asset.version}`,
    jsonSchema: {
      type: "object" as const,
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    },
  });
  return {
    grouping: {
      taskKind: "STRUCTURED_OUTPUT" as const,
      systemInstruction: groupingPrompt.content,
      userContext: { otherBrands },
      outputContract: contract(groupingPrompt, { brandGroups: brandGroups! }),
    },
    narrative: {
      taskKind: "STRUCTURED_OUTPUT" as const,
      systemInstruction: narrativePrompt.content,
      userContext: narrativeContext,
      outputContract: contract(narrativePrompt, narrativeProperties),
    },
  };
}

function validateNarrativeReferences(
  output: z.infer<typeof narrativeSchema>,
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const sampleIds = new Set(task.userContext.samples.map((s) => s.sampleId));
  for (const item of [
    ...output.positiveThemes,
    ...output.negativeThemes,
    ...output.directions,
  ]) {
    for (const sampleId of item.sampleIds)
      if (!sampleIds.has(sampleId)) throw new Error("Unknown evidence sample");
  }
}

function projectBrandGroups(
  output: z.infer<typeof groupingSchema>,
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
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
  return groups
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
}

export function inspectM4BrandGroupingOutput(
  value: unknown,
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const output = groupingSchema.parse(value);
  return { output, competitorPreview: projectBrandGroups(output, task) };
}

export function inspectM4TargetNarrativeOutput(
  value: unknown,
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const output = narrativeSchema.parse(value);
  validateNarrativeReferences(output, task);
  return { output };
}

export function inspectM4ChainSynthesisOutput(
  value: unknown,
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const output = m4ChainSynthesisSchema.parse(value);
  validateNarrativeReferences(output, task);
  return {
    output,
    coverage: task.userContext.coverage,
    competitorPreview: projectBrandGroups(output, task),
  };
}

// Both raw components are required. No prose/identity repair or partial report.
export function composeM4ReportPreview(
  grouping: unknown,
  narrative: unknown,
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  return inspectM4ChainSynthesisOutput(
    { ...groupingSchema.parse(grouping), ...narrativeSchema.parse(narrative) },
    task,
  );
}
