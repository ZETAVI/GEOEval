import { z } from "zod";

import type { EvaluationQuestionKind } from "./evaluation.types.js";
import {
  parseSampleParserOutput,
  sampleParserOutputSchema,
  type SampleParserAcceptanceContext,
  type SampleParserOutput,
  type SampleParserSemantic,
} from "./sample-parser.contract.js";

export const SAMPLE_PARSER_MODEL_CONTRACT_VERSION =
  "evaluation.sample-parser-model@2";

const boundedText = (maximum: number) => z.string().trim().min(1).max(maximum);

const evidenceSpanSchema = z
  .object({
    exactText: boundedText(1_000).describe(
      "逐字复制自原回答的完整证据片段，不得改写。",
    ),
    occurrence: z
      .number()
      .int()
      .positive()
      .max(100)
      .describe("该片段在原回答中从 1 开始的出现次序。"),
  })
  .strict();

const observationBaseShape = {
  label: boundedText(80),
  detail: boundedText(500),
  polarity: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED", "UNCERTAIN"]),
  evidence: z
    .array(evidenceSpanSchema)
    .min(1)
    .max(8)
    .describe("直接支持该观察的原文证据。"),
};

const directedObservationSchema = z
  .object({
    category: z.enum([
      "IDENTITY",
      "POSITIONING",
      "OFFERING",
      "AUDIENCE",
      "CHARACTERISTIC",
      "GENERAL",
    ]),
    ...observationBaseShape,
  })
  .strict();

const openObservationSchema = z
  .object({
    category: z.enum([
      "RECOMMENDATION_REASON",
      "CONDITION",
      "QUERY_FIT",
      "CHARACTERISTIC",
      "GENERAL",
    ]),
    ...observationBaseShape,
  })
  .strict();

const otherBrandSchema = z
  .object({
    displayName: boundedText(120),
    observedForms: z.array(boundedText(120)).min(1).max(12),
    role: z.enum([
      "RECOMMENDED",
      "CONDITIONALLY_RECOMMENDED",
      "COMPARED",
      "ALTERNATIVE",
      "EXAMPLE",
      "EXCLUDED",
      "MENTIONED_ONLY",
    ]),
    relativePosition: z.number().int().positive().max(100).nullable(),
    positionKind: z.enum(["RECOMMENDATION", "CONTEXTUAL"]).nullable(),
    evidence: z
      .array(evidenceSpanSchema)
      .min(1)
      .max(8)
      .describe("必须包含该品牌展示名或 observedForms 中的名称。"),
  })
  .strict();

const answerStructureSchema = z.enum([
  "ORDERED_LIST",
  "UNORDERED_LIST",
  "TABLE",
  "HEADINGS",
  "PARAGRAPHS",
  "MIXED",
]);

const sharedSemanticShape = {
  answerStructure: answerStructureSchema,
  targetDisplayedForms: z
    .array(boundedText(120))
    .max(12)
    .describe("当前品牌在原回答中实际出现的名称，不得添加装饰符号。"),
  targetMentionEvidence: z
    .array(evidenceSpanSchema)
    .max(12)
    .describe("判定当前品牌被提及的直接原文证据。"),
  otherBrands: z.array(otherBrandSchema).max(30),
  cardInterpretation: boundedText(500),
  limitations: z.array(boundedText(300)).max(8),
};

const brandDirectedModelOutputSchema = z
  .object({
    family: z.literal("BRAND_DIRECTED"),
    mentioned: z.boolean(),
    position: z.null(),
    semantic: z
      .object({
        profile: z.literal("BRAND_DIRECTED"),
        ...sharedSemanticShape,
        targetObservations: z.array(directedObservationSchema).max(20),
        contextualTargetPosition: z
          .number()
          .int()
          .positive()
          .max(100)
          .nullable(),
        contextualPositionEvidence: z.array(evidenceSpanSchema).max(12),
      })
      .strict(),
  })
  .strict();

const openDiscoveryModelOutputSchema = z
  .object({
    family: z.literal("OPEN_DISCOVERY"),
    questionKind: z.enum([
      "INDUSTRY_RECOMMENDATION",
      "CHARACTERISTIC_ONE",
      "CHARACTERISTIC_TWO",
    ]),
    mentioned: z.boolean(),
    position: z.number().int().positive().max(100).nullable(),
    semantic: z
      .object({
        profile: z.literal("OPEN_DISCOVERY"),
        ...sharedSemanticShape,
        targetRole: z.enum([
          "RECOMMENDED",
          "CONDITIONALLY_RECOMMENDED",
          "COMPARED",
          "EXCLUDED",
          "MENTIONED_ONLY",
          "NOT_MENTIONED",
        ]),
        targetPositionEvidence: z.array(evidenceSpanSchema).max(12),
        targetObservations: z.array(openObservationSchema).max(20),
      })
      .strict(),
  })
  .strict();

export const sampleParserModelOutputSchema = z.discriminatedUnion("family", [
  brandDirectedModelOutputSchema,
  openDiscoveryModelOutputSchema,
]);

export type SampleParserModelOutput = z.infer<
  typeof sampleParserModelOutputSchema
>;

const directedModelJsonSchema = z.toJSONSchema(brandDirectedModelOutputSchema, {
  target: "draft-2020-12",
});
const openModelJsonSchema = z.toJSONSchema(openDiscoveryModelOutputSchema, {
  target: "draft-2020-12",
});

export function sampleParserModelJsonSchemaForQuestionKind(
  questionKind: EvaluationQuestionKind,
): Record<string, unknown> {
  return questionKind === "BRAND_DIRECTED"
    ? (directedModelJsonSchema as Record<string, unknown>)
    : (openModelJsonSchema as Record<string, unknown>);
}

export function parseAndProjectSampleParserModelOutput(
  input: unknown,
  context: SampleParserAcceptanceContext,
): SampleParserOutput {
  const acceptedDomainOutput = sampleParserOutputSchema.safeParse(input);
  if (acceptedDomainOutput.success) {
    return parseSampleParserOutput(acceptedDomainOutput.data, context);
  }
  const modelOutput = sampleParserModelOutputSchema.parse(input);
  return parseSampleParserOutput(projectModelOutput(modelOutput), context);
}

type EvidencePurpose =
  SampleParserSemantic["evidenceAnchors"][number]["purposes"][number];
type EvidenceSpan = z.infer<typeof evidenceSpanSchema>;
type ModelObservation =
  | z.infer<typeof directedObservationSchema>
  | z.infer<typeof openObservationSchema>;

function projectModelOutput(
  input: SampleParserModelOutput,
): SampleParserOutput {
  const anchors = new EvidenceAnchorRegistry();
  let observationOrdinal = 0;
  const observation = (value: ModelObservation) => ({
    observationId: `o${++observationOrdinal}`,
    label: value.label,
    detail: value.detail,
    polarity: value.polarity,
    evidenceAnchorIds: anchors.references(
      value.evidence,
      value.category === "CHARACTERISTIC" ? "CHARACTERISTIC" : "DESCRIPTION",
    ),
  });
  const otherBrands = input.semantic.otherBrands.map((brand, index) => ({
    brandMentionId: `b${index + 1}`,
    displayName: brand.displayName,
    observedForms: brand.observedForms,
    role: brand.role,
    relativePosition: brand.relativePosition,
    positionKind: brand.positionKind,
    evidenceAnchorIds: anchors.references(brand.evidence, "OTHER_BRAND"),
  }));
  anchors.references(input.semantic.targetMentionEvidence, "TARGET_MENTION");

  if (input.family === "BRAND_DIRECTED") {
    const groups = {
      statedIdentity: [] as ReturnType<typeof observation>[],
      positioning: [] as ReturnType<typeof observation>[],
      offerings: [] as ReturnType<typeof observation>[],
      audiences: [] as ReturnType<typeof observation>[],
      targetObservations: [] as ReturnType<typeof observation>[],
    };
    for (const value of input.semantic.targetObservations) {
      const projected = observation(value);
      if (value.category === "IDENTITY") groups.statedIdentity.push(projected);
      else if (value.category === "POSITIONING")
        groups.positioning.push(projected);
      else if (value.category === "OFFERING") groups.offerings.push(projected);
      else if (value.category === "AUDIENCE") groups.audiences.push(projected);
      else groups.targetObservations.push(projected);
    }
    const contextualPositionEvidenceAnchorIds = anchors.references(
      input.semantic.contextualPositionEvidence,
      "TARGET_POSITION",
    );
    return {
      family: "BRAND_DIRECTED",
      mentioned: input.mentioned,
      position: null,
      semantic: {
        profile: "BRAND_DIRECTED",
        answerStructure: input.semantic.answerStructure,
        targetDisplayedForms: input.semantic.targetDisplayedForms,
        targetObservations: groups.targetObservations,
        otherBrands,
        evidenceAnchors: anchors.values(),
        cardInterpretation: input.semantic.cardInterpretation,
        limitations: input.semantic.limitations,
        statedIdentity: groups.statedIdentity,
        positioning: groups.positioning,
        offerings: groups.offerings,
        audiences: groups.audiences,
        contextualTargetPosition: input.semantic.contextualTargetPosition,
        contextualPositionEvidenceAnchorIds,
      },
    };
  }

  anchors.references(input.semantic.targetPositionEvidence, "TARGET_POSITION");
  const groups = {
    recommendationReasons: [] as ReturnType<typeof observation>[],
    conditions: [] as ReturnType<typeof observation>[],
    queryFit: [] as ReturnType<typeof observation>[],
    targetObservations: [] as ReturnType<typeof observation>[],
  };
  for (const value of input.semantic.targetObservations) {
    const projected = observation(value);
    if (value.category === "RECOMMENDATION_REASON")
      groups.recommendationReasons.push(projected);
    else if (value.category === "CONDITION") groups.conditions.push(projected);
    else if (value.category === "QUERY_FIT") groups.queryFit.push(projected);
    else groups.targetObservations.push(projected);
  }
  return {
    family: "OPEN_DISCOVERY",
    questionKind: input.questionKind,
    mentioned: input.mentioned,
    position: input.position,
    semantic: {
      profile: "OPEN_DISCOVERY",
      answerStructure: input.semantic.answerStructure,
      targetDisplayedForms: input.semantic.targetDisplayedForms,
      targetObservations: groups.targetObservations,
      otherBrands,
      evidenceAnchors: anchors.values(),
      cardInterpretation: input.semantic.cardInterpretation,
      limitations: input.semantic.limitations,
      targetRole: input.semantic.targetRole,
      recommendationReasons: groups.recommendationReasons,
      conditions: groups.conditions,
      queryFit: groups.queryFit,
    },
  };
}

class EvidenceAnchorRegistry {
  private readonly anchors: Array<{
    anchorId: string;
    exactText: string;
    occurrence: number;
    purposes: EvidencePurpose[];
  }> = [];
  private readonly bySpan = new Map<string, number>();

  references(spans: EvidenceSpan[], purpose: EvidencePurpose): string[] {
    return spans.map((span) => {
      const key = `${span.occurrence}\u0000${span.exactText}`;
      const existingIndex = this.bySpan.get(key);
      if (existingIndex !== undefined) {
        const existing = this.anchors[existingIndex]!;
        if (!existing.purposes.includes(purpose))
          existing.purposes.push(purpose);
        return existing.anchorId;
      }
      const anchorId = `e${this.anchors.length + 1}`;
      this.bySpan.set(key, this.anchors.length);
      this.anchors.push({
        anchorId,
        exactText: span.exactText,
        occurrence: span.occurrence,
        purposes: [purpose],
      });
      return anchorId;
    });
  }

  values(): SampleParserSemantic["evidenceAnchors"] {
    return this.anchors.map((anchor) => ({ ...anchor }));
  }
}
