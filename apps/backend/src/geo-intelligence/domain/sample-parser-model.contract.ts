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
  "evaluation.sample-parser-model@4";

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
  cardInterpretation: boundedText(500).describe(
    "面向客户的一至两句简洁正式说明：说明原回答是否提及当前品牌以及如何呈现，只写原回答支持的结论。不得填写 JSON 符号、字段名、枚举、ID 或结构说明；未提及时写“该回答未提及当前品牌。”",
  ),
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
  return parseSampleParserOutput(
    projectModelOutput(modelOutput, context),
    context,
  );
}

type EvidencePurpose =
  SampleParserSemantic["evidenceAnchors"][number]["purposes"][number];
type EvidenceSpan = z.infer<typeof evidenceSpanSchema>;
type ModelObservation =
  | z.infer<typeof directedObservationSchema>
  | z.infer<typeof openObservationSchema>;

function projectModelOutput(
  input: SampleParserModelOutput,
  context: SampleParserAcceptanceContext,
): SampleParserOutput {
  const anchors = new EvidenceAnchorRegistry(context.originalAnswer);
  const targetDisplayedForms = input.mentioned
    ? uniqueStrings([
        ...input.semantic.targetDisplayedForms.filter((form) =>
          context.originalAnswer.includes(form),
        ),
        ...(context.originalAnswer.includes(context.companyName)
          ? [context.companyName]
          : []),
      ]).slice(0, 12)
    : [];
  let targetMentionAnchorIds = input.mentioned
    ? anchors.references(
        input.semantic.targetMentionEvidence.filter((span) =>
          targetDisplayedForms.some((form) => span.exactText.includes(form)),
        ),
        "TARGET_MENTION",
      )
    : [];
  if (
    input.mentioned &&
    targetMentionAnchorIds.length === 0 &&
    targetDisplayedForms[0]
  ) {
    targetMentionAnchorIds = anchors.references(
      [{ exactText: targetDisplayedForms[0], occurrence: 1 }],
      "TARGET_MENTION",
    );
  }

  let observationOrdinal = 0;
  const observation = (value: ModelObservation) => {
    const evidenceAnchorIds = anchors.references(
      value.evidence,
      value.category === "CHARACTERISTIC" ? "CHARACTERISTIC" : "DESCRIPTION",
    );
    if (evidenceAnchorIds.length === 0) return undefined;
    return {
      observationId: `o${++observationOrdinal}`,
      label: value.label,
      detail: value.detail,
      polarity: value.polarity,
      evidenceAnchorIds,
    };
  };
  type ProjectedObservation = NonNullable<ReturnType<typeof observation>>;

  if (input.family === "BRAND_DIRECTED") {
    const groups = {
      statedIdentity: [] as ProjectedObservation[],
      positioning: [] as ProjectedObservation[],
      offerings: [] as ProjectedObservation[],
      audiences: [] as ProjectedObservation[],
      targetObservations: [] as ProjectedObservation[],
    };
    for (const value of input.semantic.targetObservations) {
      const group =
        value.category === "IDENTITY"
          ? groups.statedIdentity
          : value.category === "POSITIONING"
            ? groups.positioning
            : value.category === "OFFERING"
              ? groups.offerings
              : value.category === "AUDIENCE"
                ? groups.audiences
                : groups.targetObservations;
      if (group.length >= 12) continue;
      const projected = observation(value);
      if (projected) group.push(projected);
    }
    const contextualPositionEvidenceAnchorIds = anchors.references(
      input.semantic.contextualPositionEvidence,
      "TARGET_POSITION",
    );
    const hasContextualPosition =
      input.mentioned &&
      input.semantic.contextualTargetPosition !== null &&
      contextualPositionEvidenceAnchorIds.length > 0;
    const otherBrands = projectOtherBrands(
      input,
      context,
      anchors,
      targetDisplayedForms,
    );
    return {
      family: "BRAND_DIRECTED",
      mentioned: input.mentioned,
      position: null,
      semantic: {
        profile: "BRAND_DIRECTED",
        answerStructure: input.semantic.answerStructure,
        targetDisplayedForms,
        targetObservations: groups.targetObservations,
        otherBrands,
        evidenceAnchors: anchors.values(),
        cardInterpretation: projectCardInterpretation(
          input.semantic.cardInterpretation,
          input.mentioned,
          null,
        ),
        limitations: input.semantic.limitations,
        statedIdentity: groups.statedIdentity,
        positioning: groups.positioning,
        offerings: groups.offerings,
        audiences: groups.audiences,
        contextualTargetPosition: hasContextualPosition
          ? input.semantic.contextualTargetPosition
          : null,
        contextualPositionEvidenceAnchorIds: hasContextualPosition
          ? contextualPositionEvidenceAnchorIds
          : [],
      },
    };
  }

  let targetPositionEvidenceAnchorIds = input.mentioned
    ? anchors.references(
        input.semantic.targetPositionEvidence,
        "TARGET_POSITION",
      )
    : [];
  if (
    input.mentioned &&
    input.position !== null &&
    targetPositionEvidenceAnchorIds.length === 0 &&
    targetDisplayedForms[0]
  ) {
    targetPositionEvidenceAnchorIds = anchors.references(
      [{ exactText: targetDisplayedForms[0], occurrence: 1 }],
      "TARGET_POSITION",
    );
  }
  const groups = {
    recommendationReasons: [] as ProjectedObservation[],
    conditions: [] as ProjectedObservation[],
    queryFit: [] as ProjectedObservation[],
    targetObservations: [] as ProjectedObservation[],
  };
  for (const value of input.semantic.targetObservations) {
    const group =
      value.category === "RECOMMENDATION_REASON"
        ? groups.recommendationReasons
        : value.category === "CONDITION"
          ? groups.conditions
          : value.category === "QUERY_FIT"
            ? groups.queryFit
            : groups.targetObservations;
    if (group.length >= 12) continue;
    const projected = observation(value);
    if (projected) group.push(projected);
  }
  const otherBrands = projectOtherBrands(
    input,
    context,
    anchors,
    targetDisplayedForms,
  );
  return {
    family: "OPEN_DISCOVERY",
    questionKind: input.questionKind,
    mentioned: input.mentioned,
    position: input.mentioned ? input.position : null,
    semantic: {
      profile: "OPEN_DISCOVERY",
      answerStructure: input.semantic.answerStructure,
      targetDisplayedForms,
      targetObservations: groups.targetObservations,
      otherBrands,
      evidenceAnchors: anchors.values(),
      cardInterpretation: projectCardInterpretation(
        input.semantic.cardInterpretation,
        input.mentioned,
        input.position,
      ),
      limitations: input.semantic.limitations,
      targetRole: input.mentioned
        ? input.semantic.targetRole === "NOT_MENTIONED"
          ? "MENTIONED_ONLY"
          : input.semantic.targetRole
        : "NOT_MENTIONED",
      recommendationReasons: groups.recommendationReasons,
      conditions: groups.conditions,
      queryFit: groups.queryFit,
    },
  };
}

function projectOtherBrands(
  input: SampleParserModelOutput,
  context: SampleParserAcceptanceContext,
  anchors: EvidenceAnchorRegistry,
  targetDisplayedForms: string[],
) {
  const targetNames = new Set(
    [context.companyName, ...targetDisplayedForms]
      .map(normalizeName)
      .filter(Boolean),
  );
  const seenNames = new Set<string>();
  const otherBrands: Array<{
    brandMentionId: string;
    displayName: string;
    observedForms: string[];
    role: SampleParserModelOutput["semantic"]["otherBrands"][number]["role"];
    relativePosition: number | null;
    positionKind: "RECOMMENDATION" | "CONTEXTUAL" | null;
    evidenceAnchorIds: string[];
  }> = [];
  for (const brand of input.semantic.otherBrands) {
    if (otherBrands.length >= 15) break;
    const observedForms = uniqueStrings(
      [brand.displayName, ...brand.observedForms].filter((form) =>
        context.originalAnswer.includes(form),
      ),
    ).slice(0, 12);
    const normalizedForms = observedForms.map(normalizeName).filter(Boolean);
    const normalizedDisplayName = normalizeName(brand.displayName);
    const identityNames = uniqueStrings([
      normalizedDisplayName,
      ...normalizedForms,
    ]).filter(Boolean);
    if (
      !normalizedDisplayName ||
      observedForms.length === 0 ||
      identityNames.some((name) => targetNames.has(name) || seenNames.has(name))
    ) {
      continue;
    }
    let evidenceAnchorIds = anchors.references(
      brand.evidence.filter((span) =>
        observedForms.some((form) => span.exactText.includes(form)),
      ),
      "OTHER_BRAND",
    );
    if (evidenceAnchorIds.length === 0) {
      evidenceAnchorIds = anchors.references(
        [{ exactText: observedForms[0]!, occurrence: 1 }],
        "OTHER_BRAND",
      );
    }
    if (evidenceAnchorIds.length === 0) continue;
    identityNames.forEach((name) => seenNames.add(name));
    const hasCompletePosition =
      brand.relativePosition !== null && brand.positionKind !== null;
    otherBrands.push({
      brandMentionId: `b${otherBrands.length + 1}`,
      displayName: brand.displayName,
      observedForms,
      role: brand.role,
      relativePosition: hasCompletePosition ? brand.relativePosition : null,
      positionKind: hasCompletePosition ? brand.positionKind : null,
      evidenceAnchorIds,
    });
  }
  return otherBrands;
}

class EvidenceAnchorRegistry {
  private readonly anchors: Array<{
    anchorId: string;
    exactText: string;
    occurrence: number;
    purposes: EvidencePurpose[];
  }> = [];
  private readonly bySpan = new Map<string, number>();

  constructor(private readonly originalAnswer: string) {}

  references(spans: EvidenceSpan[], purpose: EvidencePurpose): string[] {
    const references: string[] = [];
    for (const span of spans) {
      if (!hasOccurrence(this.originalAnswer, span)) continue;
      const key = `${span.occurrence}\u0000${span.exactText}`;
      const existingIndex = this.bySpan.get(key);
      if (existingIndex !== undefined) {
        const existing = this.anchors[existingIndex]!;
        if (!existing.purposes.includes(purpose))
          existing.purposes.push(purpose);
        references.push(existing.anchorId);
        continue;
      }
      if (this.anchors.length >= 40) continue;
      const anchorId = `e${this.anchors.length + 1}`;
      this.bySpan.set(key, this.anchors.length);
      this.anchors.push({
        anchorId,
        exactText: span.exactText,
        occurrence: span.occurrence,
        purposes: [purpose],
      });
      references.push(anchorId);
    }
    return uniqueStrings(references);
  }

  values(): SampleParserSemantic["evidenceAnchors"] {
    return this.anchors.map((anchor) => ({ ...anchor }));
  }
}

function hasOccurrence(answer: string, span: EvidenceSpan): boolean {
  let offset = 0;
  let found = 0;
  while (offset <= answer.length - span.exactText.length) {
    const index = answer.indexOf(span.exactText, offset);
    if (index < 0) return false;
    found += 1;
    if (found === span.occurrence) return true;
    offset = index + Math.max(1, span.exactText.length);
  }
  return false;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function projectCardInterpretation(
  value: string,
  mentioned: boolean,
  position: number | null,
): string {
  if (/[\p{L}\p{N}]/u.test(value)) return value;
  if (!mentioned) return "该回答未提及当前品牌。";
  return position === null
    ? "该回答提及了当前品牌。"
    : `该回答提及了当前品牌，位于第${position}个候选位置。`;
}
