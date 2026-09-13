import { z } from "zod";

import type { EvaluationQuestionKind } from "./evaluation.types.js";
import {
  collectSampleSemanticObservations,
  type SampleParserSemantic,
} from "./sample-parser.contract.js";

export const OVERALL_SYNTHESIS_CONTRACT_VERSION =
  "evaluation.overall-synthesis@1";

const boundedText = (maximum: number) => z.string().trim().min(1).max(maximum);
const identifier = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);

const sampleReferenceSchema = z
  .object({
    sampleId: z.string().uuid(),
    observationId: identifier.nullable(),
  })
  .strict();

const observationReferenceSchema = z
  .object({
    sampleId: z.string().uuid(),
    observationId: identifier,
  })
  .strict();

const evidenceLinkedNarrativeSchema = z
  .object({
    summary: boundedText(1_200),
    evidenceRefs: z.array(sampleReferenceSchema).min(1).max(40),
  })
  .strict();

const brandGroupSchema = z
  .object({
    groupId: identifier,
    displayName: boundedText(120),
    members: z
      .array(
        z
          .object({
            sampleId: z.string().uuid(),
            brandMentionId: identifier,
            relationship: z.enum([
              "SAME_NAME",
              "TRANSLATION_OR_ABBREVIATION",
              "STORE_FORMAT",
              "SUBORDINATE_BRAND_LINE",
            ]),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    resolutionBasis: z
      .array(
        z
          .object({
            kind: z.enum(["ANSWER_CONTEXT", "PUBLIC_SEARCH"]),
            explanation: boundedText(500),
            sourceUrl: z.string().url().max(2_000).nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(8),
  })
  .strict();

const themeProposalSchema = z
  .object({
    themeId: identifier,
    label: boundedText(80),
    summary: boundedText(600),
    evidenceRefs: z.array(observationReferenceSchema).min(1).max(60),
  })
  .strict();

const customerDirectionSchema = z
  .object({
    directionId: identifier,
    currentProblem: boundedText(400),
    recommendedDirection: boundedText(600),
    intendedImprovement: boundedText(300),
    evidenceRefs: z.array(sampleReferenceSchema).min(1).max(60),
  })
  .strict();

const evidenceLinkedGuidanceSchema = z
  .object({
    guidanceId: identifier,
    label: boundedText(100),
    detail: boundedText(1_000),
    evidenceRefs: z.array(sampleReferenceSchema).min(1).max(80),
  })
  .strict();

export const overallSynthesisOutputSchema = z
  .object({
    brandEntityGroups: z.array(brandGroupSchema).max(100),
    recommendationAssessment: evidenceLinkedNarrativeSchema,
    brandPerception: evidenceLinkedNarrativeSchema,
    themes: z
      .object({
        positive: z.array(themeProposalSchema).max(5),
        negative: z.array(themeProposalSchema).max(5),
      })
      .strict(),
    customerDirections: z.array(customerDirectionSchema).max(3),
    internalGuidance: z
      .object({
        summary: boundedText(2_000),
        priorities: z.array(evidenceLinkedGuidanceSchema).max(8),
        writingAngles: z.array(evidenceLinkedGuidanceSchema).max(8),
        cautions: z.array(boundedText(500)).max(8),
      })
      .strict(),
    limitations: z.array(boundedText(500)).max(8),
  })
  .strict();

export const overallSynthesisGuidanceSchema =
  overallSynthesisOutputSchema.shape.internalGuidance;

export type OverallSynthesisOutput = z.infer<
  typeof overallSynthesisOutputSchema
>;
export type AcceptedOverallSynthesisSemantic = Omit<
  OverallSynthesisOutput,
  "internalGuidance"
>;
export type OverallSynthesisGuidance = z.infer<
  typeof overallSynthesisGuidanceSchema
>;

export const overallSynthesisJsonSchema = z.toJSONSchema(
  overallSynthesisOutputSchema,
  { target: "draft-2020-12" },
);

export type OverallSynthesisSampleContext = {
  sampleId: string;
  questionKind: EvaluationQuestionKind;
  platformKey: string;
  semantic: SampleParserSemantic;
};

export class OverallSynthesisSemanticError extends Error {
  constructor(readonly issues: string[]) {
    super(`Overall synthesis semantic validation failed: ${issues.join("; ")}`);
    this.name = "OverallSynthesisSemanticError";
  }
}

export function parseOverallSynthesisOutput(
  input: unknown,
  samples: OverallSynthesisSampleContext[],
): OverallSynthesisOutput {
  const output = overallSynthesisOutputSchema.parse(input);
  const issues: string[] = [];
  const sampleMap = new Map(samples.map((sample) => [sample.sampleId, sample]));
  const observationKeys = new Set<string>();
  const brandMentionKeys = new Set<string>();

  for (const sample of samples) {
    for (const observation of collectSampleSemanticObservations(
      sample.semantic,
    )) {
      observationKeys.add(
        referenceKey(sample.sampleId, observation.observationId),
      );
    }
    for (const brand of sample.semantic.otherBrands) {
      brandMentionKeys.add(referenceKey(sample.sampleId, brand.brandMentionId));
    }
  }

  const groupIds = new Set<string>();
  const groupedMentions = new Set<string>();
  for (const group of output.brandEntityGroups) {
    registerId(groupIds, group.groupId, "brand group", issues);
    for (const basis of group.resolutionBasis) {
      if (basis.kind === "PUBLIC_SEARCH" && basis.sourceUrl === null) {
        issues.push(
          `public-search basis in group ${group.groupId} requires source URL`,
        );
      }
      if (basis.kind === "ANSWER_CONTEXT" && basis.sourceUrl !== null) {
        issues.push(
          `answer-context basis in group ${group.groupId} cannot claim source URL`,
        );
      }
    }
    for (const member of group.members) {
      const key = referenceKey(member.sampleId, member.brandMentionId);
      if (!brandMentionKeys.has(key)) {
        issues.push(`brand group ${group.groupId} references missing ${key}`);
      }
      if (groupedMentions.has(key)) {
        issues.push(`brand mention ${key} appears in more than one group`);
      }
      groupedMentions.add(key);
    }
  }
  for (const key of brandMentionKeys) {
    if (!groupedMentions.has(key)) {
      issues.push(`brand mention ${key} is missing from brand groups`);
    }
  }

  validateSampleReferences(
    output.recommendationAssessment.evidenceRefs,
    sampleMap,
    observationKeys,
    "recommendation assessment",
    issues,
  );
  validateSampleReferences(
    output.brandPerception.evidenceRefs,
    sampleMap,
    observationKeys,
    "brand perception",
    issues,
  );

  const themeIds = new Set<string>();
  for (const theme of [...output.themes.positive, ...output.themes.negative]) {
    registerId(themeIds, theme.themeId, "theme", issues);
    validateObservationReferences(
      theme.evidenceRefs,
      observationKeys,
      `theme ${theme.themeId}`,
      issues,
    );
  }

  const directionIds = new Set<string>();
  for (const direction of output.customerDirections) {
    registerId(directionIds, direction.directionId, "direction", issues);
    validateSampleReferences(
      direction.evidenceRefs,
      sampleMap,
      observationKeys,
      `direction ${direction.directionId}`,
      issues,
    );
  }

  const guidanceIds = new Set<string>();
  for (const guidance of [
    ...output.internalGuidance.priorities,
    ...output.internalGuidance.writingAngles,
  ]) {
    registerId(guidanceIds, guidance.guidanceId, "guidance", issues);
    validateSampleReferences(
      guidance.evidenceRefs,
      sampleMap,
      observationKeys,
      `guidance ${guidance.guidanceId}`,
      issues,
    );
  }

  if (issues.length > 0) throw new OverallSynthesisSemanticError(issues);
  return output;
}

export function splitOverallSynthesis(output: OverallSynthesisOutput): {
  semantic: AcceptedOverallSynthesisSemantic;
  guidance: OverallSynthesisGuidance;
} {
  const { internalGuidance, ...semantic } = output;
  return { semantic, guidance: internalGuidance };
}

export function parseStoredOverallSynthesis(
  contractVersion: string,
  payload: unknown,
): AcceptedOverallSynthesisSemantic {
  if (contractVersion !== OVERALL_SYNTHESIS_CONTRACT_VERSION) {
    throw new Error(
      `Unsupported overall synthesis contract ${contractVersion}`,
    );
  }
  return overallSynthesisOutputSchema
    .omit({ internalGuidance: true })
    .parse(payload);
}

export function parseStoredOverallSynthesisGuidance(
  contractVersion: string,
  payload: unknown,
): OverallSynthesisGuidance {
  if (contractVersion !== OVERALL_SYNTHESIS_CONTRACT_VERSION) {
    throw new Error(
      `Unsupported overall synthesis contract ${contractVersion}`,
    );
  }
  return overallSynthesisGuidanceSchema.parse(payload);
}

function validateSampleReferences(
  references: Array<{ sampleId: string; observationId: string | null }>,
  samples: Map<string, OverallSynthesisSampleContext>,
  observationKeys: Set<string>,
  owner: string,
  issues: string[],
): void {
  const seen = new Set<string>();
  for (const reference of references) {
    const key = referenceKey(
      reference.sampleId,
      reference.observationId ?? "*",
    );
    if (seen.has(key)) issues.push(`${owner} repeats evidence ${key}`);
    seen.add(key);
    if (!samples.has(reference.sampleId)) {
      issues.push(`${owner} references missing sample ${reference.sampleId}`);
    } else if (
      reference.observationId !== null &&
      !observationKeys.has(
        referenceKey(reference.sampleId, reference.observationId),
      )
    ) {
      issues.push(
        `${owner} references missing observation ${reference.sampleId}:${reference.observationId}`,
      );
    }
  }
}

function validateObservationReferences(
  references: Array<{ sampleId: string; observationId: string }>,
  observationKeys: Set<string>,
  owner: string,
  issues: string[],
): void {
  const seen = new Set<string>();
  for (const reference of references) {
    const key = referenceKey(reference.sampleId, reference.observationId);
    if (seen.has(key)) issues.push(`${owner} repeats evidence ${key}`);
    seen.add(key);
    if (!observationKeys.has(key)) {
      issues.push(`${owner} references missing observation ${key}`);
    }
  }
}

function registerId(
  ids: Set<string>,
  id: string,
  owner: string,
  issues: string[],
): void {
  if (ids.has(id)) issues.push(`duplicate ${owner} ID ${id}`);
  ids.add(id);
}

function referenceKey(sampleId: string, localId: string): string {
  return `${sampleId}:${localId}`;
}
