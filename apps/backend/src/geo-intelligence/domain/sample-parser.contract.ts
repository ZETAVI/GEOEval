import { z } from "zod";

import type { EvaluationQuestionKind } from "./evaluation.types.js";

export const SAMPLE_PARSER_CONTRACT_VERSION = "1.0.0";
export const S3_COMPATIBILITY_CONTRACT_VERSION = "s3-compatibility@1";

const boundedText = (maximum: number) => z.string().trim().min(1).max(maximum);
const identifier = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const evidenceReferenceIds = z.array(identifier).min(1).max(12);

const semanticObservationSchema = z
  .object({
    observationId: identifier,
    label: boundedText(80),
    detail: boundedText(500),
    polarity: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED", "UNCERTAIN"]),
    evidenceAnchorIds: evidenceReferenceIds,
  })
  .strict();

const otherBrandRecordSchema = z
  .object({
    brandMentionId: identifier,
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
    evidenceAnchorIds: evidenceReferenceIds,
  })
  .strict();

const evidenceAnchorSchema = z
  .object({
    anchorId: identifier,
    exactText: boundedText(1_000),
    occurrence: z.number().int().positive().max(100),
    purposes: z
      .array(
        z.enum([
          "TARGET_MENTION",
          "TARGET_POSITION",
          "OTHER_BRAND",
          "DESCRIPTION",
          "CHARACTERISTIC",
          "LIMITATION",
        ]),
      )
      .min(1)
      .max(6),
  })
  .strict();

const sharedSemanticShape = {
  answerStructure: z.enum([
    "ORDERED_LIST",
    "UNORDERED_LIST",
    "TABLE",
    "HEADINGS",
    "PARAGRAPHS",
    "MIXED",
  ]),
  targetDisplayedForms: z.array(boundedText(120)).max(12),
  targetObservations: z.array(semanticObservationSchema).max(20),
  otherBrands: z.array(otherBrandRecordSchema).max(30),
  evidenceAnchors: z.array(evidenceAnchorSchema).max(40),
  cardInterpretation: boundedText(500),
  limitations: z.array(boundedText(300)).max(8),
};

const brandDirectedOutputSchema = z
  .object({
    family: z.literal("BRAND_DIRECTED"),
    mentioned: z.boolean(),
    position: z.null(),
    semantic: z
      .object({
        profile: z.literal("BRAND_DIRECTED"),
        ...sharedSemanticShape,
        statedIdentity: z.array(semanticObservationSchema).max(12),
        positioning: z.array(semanticObservationSchema).max(12),
        offerings: z.array(semanticObservationSchema).max(12),
        audiences: z.array(semanticObservationSchema).max(12),
        contextualTargetPosition: z
          .number()
          .int()
          .positive()
          .max(100)
          .nullable(),
        contextualPositionEvidenceAnchorIds: z.array(identifier).max(12),
      })
      .strict(),
  })
  .strict();

const openDiscoveryOutputSchema = z
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
        recommendationReasons: z.array(semanticObservationSchema).max(12),
        conditions: z.array(semanticObservationSchema).max(12),
        queryFit: z.array(semanticObservationSchema).max(12),
      })
      .strict(),
  })
  .strict();

export const sampleParserOutputSchema = z.discriminatedUnion("family", [
  brandDirectedOutputSchema,
  openDiscoveryOutputSchema,
]);

export type SampleParserOutput = z.infer<typeof sampleParserOutputSchema>;
export type SampleParserSemantic = SampleParserOutput["semantic"];
export type SampleSemanticObservation = z.infer<
  typeof semanticObservationSchema
>;

export const sampleParserJsonSchema = z.toJSONSchema(sampleParserOutputSchema, {
  target: "draft-2020-12",
});

const s3CompatibilitySemanticSchema = z
  .object({
    profile: z.literal("S3_COMPATIBILITY"),
    migratedDescription: z.string().nullable(),
    migratedCharacteristics: z.unknown(),
    migratedSummary: z.string(),
    migratedStructuredEvidence: z.unknown(),
    highlightUnavailable: z.literal(true),
  })
  .strict();

export type SampleParserAcceptanceContext = {
  questionKind: EvaluationQuestionKind;
  companyName: string;
  originalAnswer: string;
};

export class SampleParserSemanticError extends Error {
  constructor(readonly issues: string[]) {
    super(`Sample parser semantic validation failed: ${issues.join("; ")}`);
    this.name = "SampleParserSemanticError";
  }
}

export function parseSampleParserOutput(
  input: unknown,
  context: SampleParserAcceptanceContext,
): SampleParserOutput {
  const output = sampleParserOutputSchema.parse(input);
  const issues: string[] = [];
  const expectedFamily =
    context.questionKind === "BRAND_DIRECTED"
      ? "BRAND_DIRECTED"
      : "OPEN_DISCOVERY";
  if (output.family !== expectedFamily) {
    issues.push("output family does not match the immutable question kind");
  }
  if (
    output.family === "OPEN_DISCOVERY" &&
    output.questionKind !== context.questionKind
  ) {
    issues.push("open question kind does not match the immutable question");
  }

  const anchorIds = new Set<string>();
  for (const anchor of output.semantic.evidenceAnchors) {
    if (anchorIds.has(anchor.anchorId)) {
      issues.push(`duplicate evidence anchor ${anchor.anchorId}`);
    }
    anchorIds.add(anchor.anchorId);
    if (
      !hasOccurrence(
        context.originalAnswer,
        anchor.exactText,
        anchor.occurrence,
      )
    ) {
      issues.push(`evidence anchor ${anchor.anchorId} does not resolve`);
    }
  }

  const localIds = new Set<string>();
  const observations = allObservations(output);
  for (const observation of observations) {
    registerLocalId(localIds, observation.observationId, issues);
    requireReferences(
      observation.evidenceAnchorIds,
      anchorIds,
      `observation ${observation.observationId}`,
      issues,
    );
    rejectGeneratedHtml(
      [observation.label, observation.detail],
      `observation ${observation.observationId}`,
      issues,
    );
  }
  for (const brand of output.semantic.otherBrands) {
    registerLocalId(localIds, brand.brandMentionId, issues);
    requireReferences(
      brand.evidenceAnchorIds,
      anchorIds,
      `other brand ${brand.brandMentionId}`,
      issues,
    );
  }

  rejectGeneratedHtml(
    [output.semantic.cardInterpretation, ...output.semantic.limitations],
    "generated interpretation",
    issues,
  );

  const targetAnchors = output.semantic.evidenceAnchors.filter((anchor) =>
    anchor.purposes.includes("TARGET_MENTION"),
  );
  const positionAnchors = output.semantic.evidenceAnchors.filter((anchor) =>
    anchor.purposes.includes("TARGET_POSITION"),
  );
  if (output.mentioned) {
    if (output.semantic.targetDisplayedForms.length === 0) {
      issues.push("a mentioned target requires a displayed form");
    }
    if (targetAnchors.length === 0) {
      issues.push("a mentioned target requires a target-mention anchor");
    }
    if (
      !targetAnchors.some((anchor) =>
        output.semantic.targetDisplayedForms.some((form) =>
          anchor.exactText.includes(form),
        ),
      )
    ) {
      issues.push("target-mention evidence does not contain a displayed form");
    }
  } else if (
    output.semantic.targetDisplayedForms.length > 0 ||
    targetAnchors.length > 0 ||
    positionAnchors.length > 0
  ) {
    issues.push("a non-mentioned target cannot retain target forms or anchors");
  }

  const targetNames = new Set(
    [context.companyName, ...output.semantic.targetDisplayedForms].map(
      normalizeBrandName,
    ),
  );
  const otherBrandNames = new Set<string>();
  for (const brand of output.semantic.otherBrands) {
    const normalizedForms = [brand.displayName, ...brand.observedForms].map(
      normalizeBrandName,
    );
    if (normalizedForms.some((name) => targetNames.has(name))) {
      issues.push(
        `current target duplicated as other brand ${brand.displayName}`,
      );
    }
    if (normalizedForms.some((name) => otherBrandNames.has(name))) {
      issues.push(
        `other brand appears in more than one record ${brand.displayName}`,
      );
    }
    normalizedForms.forEach((name) => otherBrandNames.add(name));
    const brandAnchors = output.semantic.evidenceAnchors.filter((anchor) =>
      brand.evidenceAnchorIds.includes(anchor.anchorId),
    );
    if (
      !brandAnchors.some((anchor) =>
        brand.observedForms.some((form) => anchor.exactText.includes(form)),
      )
    ) {
      issues.push(`other-brand evidence does not contain ${brand.displayName}`);
    }
    if ((brand.relativePosition === null) !== (brand.positionKind === null)) {
      issues.push(
        `other-brand position and kind must appear together for ${brand.displayName}`,
      );
    }
  }

  if (output.family === "BRAND_DIRECTED") {
    requireReferences(
      output.semantic.contextualPositionEvidenceAnchorIds,
      anchorIds,
      "contextual target position",
      issues,
    );
    if (
      (output.semantic.contextualTargetPosition === null) !==
      (output.semantic.contextualPositionEvidenceAnchorIds.length === 0)
    ) {
      issues.push("contextual position and its evidence must appear together");
    }
    if (
      !output.mentioned &&
      output.semantic.contextualTargetPosition !== null
    ) {
      issues.push(
        "a non-mentioned direct target cannot have a contextual position",
      );
    }
  } else if (output.mentioned) {
    if (output.position === null) {
      issues.push("an open-question mention requires a positive position");
    }
    if (output.semantic.targetRole === "NOT_MENTIONED") {
      issues.push("a mentioned target cannot use NOT_MENTIONED role");
    }
    if (positionAnchors.length === 0) {
      issues.push("an open-question mention requires a target-position anchor");
    }
  } else if (
    output.position !== null ||
    output.semantic.targetRole !== "NOT_MENTIONED"
  ) {
    issues.push(
      "an open-question non-mention requires null position and NOT_MENTIONED role",
    );
  }

  if (issues.length > 0) throw new SampleParserSemanticError(issues);
  return output;
}

export function parseStoredSampleSemantic(
  contractVersion: string,
  payload: unknown,
): SampleParserSemantic | z.infer<typeof s3CompatibilitySemanticSchema> {
  if (contractVersion === S3_COMPATIBILITY_CONTRACT_VERSION) {
    return s3CompatibilitySemanticSchema.parse(payload);
  }
  if (contractVersion !== SAMPLE_PARSER_CONTRACT_VERSION) {
    throw new Error(`Unsupported sample semantic contract ${contractVersion}`);
  }
  const semantic = z.discriminatedUnion("profile", [
    brandDirectedOutputSchema.shape.semantic,
    openDiscoveryOutputSchema.shape.semantic,
  ]);
  return semantic.parse(payload);
}

export function collectSampleSemanticObservations(
  semantic: SampleParserSemantic,
): SampleSemanticObservation[] {
  const common = semantic.targetObservations;
  return semantic.profile === "BRAND_DIRECTED"
    ? [
        ...common,
        ...semantic.statedIdentity,
        ...semantic.positioning,
        ...semantic.offerings,
        ...semantic.audiences,
      ]
    : [
        ...common,
        ...semantic.recommendationReasons,
        ...semantic.conditions,
        ...semantic.queryFit,
      ];
}

function allObservations(output: SampleParserOutput) {
  return collectSampleSemanticObservations(output.semantic);
}

function registerLocalId(ids: Set<string>, id: string, issues: string[]): void {
  if (ids.has(id)) issues.push(`duplicate local semantic ID ${id}`);
  ids.add(id);
}

function requireReferences(
  references: string[],
  anchorIds: Set<string>,
  owner: string,
  issues: string[],
): void {
  for (const reference of references) {
    if (!anchorIds.has(reference)) {
      issues.push(`${owner} references missing anchor ${reference}`);
    }
  }
}

function hasOccurrence(answer: string, exactText: string, occurrence: number) {
  let found = 0;
  let offset = 0;
  while (offset <= answer.length - exactText.length) {
    const index = answer.indexOf(exactText, offset);
    if (index < 0) return false;
    found += 1;
    if (found === occurrence) return true;
    offset = index + Math.max(1, exactText.length);
  }
  return false;
}

function normalizeBrandName(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s·・._-]/g, "");
}

function rejectGeneratedHtml(
  values: string[],
  owner: string,
  issues: string[],
): void {
  if (values.some((value) => /<\/?[a-z][^>]*>/iu.test(value))) {
    issues.push(`${owner} contains HTML`);
  }
}
