import { readFileSync } from "node:fs";
import { z } from "zod";
import { parseAndProjectSampleParserModelOutput } from "../../geo-intelligence/domain/sample-parser-model.contract.js";
import { collectSampleSemanticObservations } from "../../geo-intelligence/domain/sample-parser.contract.js";
import type { EvaluationQuestionKind } from "../../geo-intelligence/domain/evaluation.types.js";
import {
  inspectM4CustomerSummaryOutput,
  m4CustomerSummarySchema,
} from "./m4-parser-customer-summary.js";
import {
  inspectM4BrandMentionsOutput,
  m4ContentHandoffSchema,
} from "./m4-parser-brand-rows.js";

const contentNote =
  "\n\n标记为PARSER_CONTENT的样本由首层整理而来：mentionContext、points和summary是内容概括，不是逐字引文或已核验事实。结合这些语境理解品牌和目标表现；不假定拿到了完整原回答或精确引用。若记录含attitude，它表示整体正向、中性或负向；正向和中性均可作为竞品，统计由程序负责。";
const mentionsNote =
  "\n\n标记为PARSER_MENTIONS的样本保留首层按品牌整理的mentionContext摘录数组和整体attitude。摘录可以包含不同倾向的具体内容，不把整体态度当成每条内容的倾向。这里只提供整理后的内容，不是完整原文或外部核验事实；位次、提及和统计由程序保留。";

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
const assignmentPrompt = loadPrompt("m4-brand-assignment");
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
  interpretationFormat?: "BRAND_CONTENT" | "BRAND_MENTIONS";
};

function sourceView(companyName: string, sample: M4ChainSample) {
  if (sample.interpretationFormat === "BRAND_MENTIONS") {
    if (sample.questionKind === "BRAND_DIRECTED")
      throw new Error("Brand-mentions format is open-question only");
    const parsed = inspectM4BrandMentionsOutput(sample.parsedOutput);
    return {
      target: parsed.indexedBrands.find((brand) => brand.isFocusBrand) ?? null,
      otherBrands: parsed.indexedBrands.filter((brand) => !brand.isFocusBrand),
      sampleSummary: undefined,
    };
  }
  if (sample.interpretationFormat === "BRAND_CONTENT") {
    if (sample.questionKind === "BRAND_DIRECTED")
      throw new Error("Brand-content format is open-question only");
    const parsed = m4ContentHandoffSchema.parse(sample.parsedOutput);
    return {
      ...parsed,
      sampleSummary: parsed.target?.summary ?? "本条回答未提及目标品牌。",
    };
  }
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
      interpretationBasis:
        sample.interpretationFormat === "BRAND_CONTENT"
          ? ("PARSER_CONTENT" as const)
          : sample.interpretationFormat === "BRAND_MENTIONS"
            ? ("PARSER_MENTIONS" as const)
            : undefined,
      target: restored.target,
      ...(restored.sampleSummary === undefined
        ? {}
        : { sampleSummary: restored.sampleSummary }),
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
    systemInstruction:
      prompt.content +
      (inputs.some((s) => s.interpretationFormat === "BRAND_CONTENT")
        ? contentNote
        : "") +
      (inputs.some((s) => s.interpretationFormat === "BRAND_MENTIONS")
        ? mentionsNote
        : ""),
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
      version: `${prompt.id}@${prompt.version}${inputs.some((s) => s.interpretationFormat === "BRAND_CONTENT") ? "+parser-content@2" : ""}${inputs.some((s) => s.interpretationFormat === "BRAND_MENTIONS") ? "+parser-mentions@1" : ""}`,
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
  const note = task.userContext.samples.some(
    (s) => s.interpretationBasis === "PARSER_CONTENT",
  )
    ? contentNote
    : "";
  const mentions = task.userContext.samples.some(
    (s) => s.interpretationBasis === "PARSER_MENTIONS",
  );
  const { otherBrands, ...narrativeContext } =
    flattenM4ChainSynthesisTask(task).userContext;
  const { brandGroups, ...narrativeProperties } =
    task.outputContract.jsonSchema.properties!;
  const contract = (
    asset: typeof prompt,
    properties: NonNullable<typeof task.outputContract.jsonSchema.properties>,
    contentVersion = 2,
  ) => ({
    version: `${asset.id}@${asset.version}${note ? `+parser-content@${contentVersion}` : ""}${mentions ? "+parser-mentions@1" : ""}`,
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
      systemInstruction:
        groupingPrompt.content + note + (mentions ? mentionsNote : ""),
      userContext: { otherBrands },
      outputContract: contract(groupingPrompt, { brandGroups: brandGroups! }),
    },
    narrative: {
      taskKind: "STRUCTURED_OUTPUT" as const,
      systemInstruction: narrativePrompt.content,
      userContext: {
        ...narrativeContext,
        samples: narrativeContext.samples.map((sample) => {
          // Only remove an exact duplicate in the explicitly content-based format.
          // Retain absent-target explanations and independent legacy summaries.
          if (
            sample.interpretationBasis === "PARSER_CONTENT" &&
            sample.target !== null &&
            "summary" in sample.target &&
            sample.sampleSummary === sample.target.summary
          ) {
            const { sampleSummary: _duplicate, ...rest } = sample;
            return rest;
          }
          return sample;
        }),
      },
      outputContract: contract(narrativePrompt, narrativeProperties, 3),
    },
  };
}

// A fixed slot per retained record replaces model-authored member lists. This
// constrains assignment structure, not whether the chosen identity is correct.
function brandAssignmentSchema(
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const ids = task.userContext.samples.flatMap((s) =>
    s.otherBrands.map((b) => b.id),
  );
  if (new Set(ids).size !== ids.length)
    throw new Error("Duplicate input brand id");
  return z
    .object({
      assignments: z
        .object(Object.fromEntries(ids.map((key) => [key, text(120)])))
        .strict(),
    })
    .strict();
}

export function buildM4BrandAssignmentTask(
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const note = task.userContext.samples.some(
    (s) => s.interpretationBasis === "PARSER_CONTENT",
  )
    ? contentNote
    : "";
  const mentions = task.userContext.samples.some(
    (s) => s.interpretationBasis === "PARSER_MENTIONS",
  );
  return {
    taskKind: "STRUCTURED_OUTPUT" as const,
    systemInstruction:
      assignmentPrompt.content + note + (mentions ? mentionsNote : ""),
    userContext: {
      otherBrands: flattenM4ChainSynthesisTask(task).userContext.otherBrands,
    },
    outputContract: {
      version: `${assignmentPrompt.id}@${assignmentPrompt.version}${note ? "+parser-content@2" : ""}${mentions ? "+parser-mentions@1" : ""}`,
      jsonSchema: z.toJSONSchema(brandAssignmentSchema(task), {
        target: "draft-2020-12",
      }),
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
      eligibleSampleCount: new Set(
        group.members
          .map((member) => byId.get(member)!)
          .filter((b) =>
            "attitude" in b
              ? b.attitude !== "NEGATIVE"
              : b.positiveRecommendation,
          )
          .map((b) => b.sampleId),
      ).size,
    }))
    .filter((group) => group.eligibleSampleCount > 0);
}

export function inspectM4BrandGroupingOutput(
  value: unknown,
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const output = groupingSchema.parse(value);
  return { output, competitorPreview: projectBrandGroups(output, task) };
}

export function inspectM4BrandAssignmentOutput(
  value: unknown,
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const output = brandAssignmentSchema(task).parse(value);
  const groups = new Map<string, string[]>();
  for (const [member, displayName] of Object.entries(output.assignments)) {
    const members = groups.get(displayName) ?? [];
    members.push(member);
    groups.set(displayName, members);
  }
  const brandGroups = Array.from(groups, ([displayName, members]) => ({
    displayName,
    members,
  }));
  return {
    output,
    competitorPreview: projectBrandGroups({ brandGroups }, task),
  };
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

// Experiment-only composition; every assignment and the narrative must pass.
// Singleton labels are retained too, without forcing the old group-list limits.
export function composeM4AssignedReportPreview(
  assignment: unknown,
  narrative: unknown,
  task: ReturnType<typeof buildM4ChainSynthesisTask>,
) {
  const brands = inspectM4BrandAssignmentOutput(assignment, task);
  const target = inspectM4TargetNarrativeOutput(narrative, task);
  return {
    output: { ...brands.output, ...target.output },
    coverage: task.userContext.coverage,
    competitorPreview: brands.competitorPreview,
  };
}
