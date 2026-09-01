import { z } from "zod";

import {
  overallSynthesisOutputSchema,
  parseOverallSynthesisOutput,
  type OverallSynthesisOutput,
  type OverallSynthesisSampleContext,
} from "./overall-synthesis.contract.js";
import { collectSampleSemanticObservations } from "./sample-parser.contract.js";

export const OVERALL_SYNTHESIS_MODEL_CONTRACT_VERSION =
  "evaluation.overall-synthesis-model@2";

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

const brandGroupProposalSchema = z
  .object({
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
      .min(2)
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
    label: boundedText(80),
    summary: boundedText(600),
    evidenceRefs: z.array(observationReferenceSchema).min(1).max(60),
  })
  .strict();

const customerDirectionProposalSchema = z
  .object({
    currentProblem: boundedText(400),
    recommendedDirection: boundedText(600),
    intendedImprovement: boundedText(300),
    evidenceRefs: z.array(sampleReferenceSchema).min(1).max(60),
  })
  .strict();

const guidanceProposalSchema = z
  .object({
    label: boundedText(100),
    detail: boundedText(1_000),
    evidenceRefs: z.array(sampleReferenceSchema).min(1).max(80),
  })
  .strict();

export const overallSynthesisModelOutputSchema = z
  .object({
    brandEntityGroups: z.array(brandGroupProposalSchema).max(100),
    recommendationAssessment: evidenceLinkedNarrativeSchema,
    brandPerception: evidenceLinkedNarrativeSchema,
    themes: z
      .object({
        positive: z.array(themeProposalSchema).max(5),
        negative: z.array(themeProposalSchema).max(5),
      })
      .strict(),
    customerDirections: z.array(customerDirectionProposalSchema).min(1).max(3),
    internalGuidance: z
      .object({
        summary: boundedText(2_000),
        priorities: z.array(guidanceProposalSchema).min(1).max(8),
        writingAngles: z.array(guidanceProposalSchema).min(1).max(8),
        cautions: z.array(boundedText(500)).max(8),
      })
      .strict(),
    limitations: z.array(boundedText(500)).max(8),
  })
  .strict();

export type OverallSynthesisModelOutput = z.infer<
  typeof overallSynthesisModelOutputSchema
>;

export const overallSynthesisModelJsonSchema = z.toJSONSchema(
  overallSynthesisModelOutputSchema,
  { target: "draft-2020-12" },
);

export function parseAndProjectOverallSynthesisModelOutput(
  input: unknown,
  samples: OverallSynthesisSampleContext[],
  providerContext?: {
    searchObservation?: "TRIGGERED" | "NOT_TRIGGERED" | "UNKNOWN";
    sourceMetadata?: Array<Record<string, unknown>>;
  },
): OverallSynthesisOutput {
  const acceptedDomainOutput = overallSynthesisOutputSchema.safeParse(input);
  if (acceptedDomainOutput.success) {
    return parseOverallSynthesisOutput(acceptedDomainOutput.data, samples);
  }
  const modelOutput = overallSynthesisModelOutputSchema.parse(input);
  return parseOverallSynthesisOutput(
    projectModelOutput(modelOutput, samples, providerContext),
    samples,
  );
}

function projectModelOutput(
  input: OverallSynthesisModelOutput,
  samples: OverallSynthesisSampleContext[],
  providerContext:
    | {
        searchObservation?: "TRIGGERED" | "NOT_TRIGGERED" | "UNKNOWN";
        sourceMetadata?: Array<Record<string, unknown>>;
      }
    | undefined,
): OverallSynthesisOutput {
  const observationKeys = new Set(
    samples.flatMap((sample) =>
      collectSampleSemanticObservations(sample.semantic).map(
        (observation) => `${sample.sampleId}:${observation.observationId}`,
      ),
    ),
  );
  const groupedMentionKeys = new Set(
    input.brandEntityGroups.flatMap((group) =>
      group.members.map((member) => brandMentionKey(member)),
    ),
  );
  const singletonGroups = samples.flatMap((sample) =>
    sample.semantic.otherBrands
      .filter(
        (brand) =>
          !groupedMentionKeys.has(
            brandMentionKey({
              sampleId: sample.sampleId,
              brandMentionId: brand.brandMentionId,
            }),
          ),
      )
      .map((brand) => ({
        displayName: brand.displayName,
        members: [
          {
            sampleId: sample.sampleId,
            brandMentionId: brand.brandMentionId,
            relationship: "SAME_NAME" as const,
          },
        ],
        resolutionBasis: [
          {
            kind: "ANSWER_CONTEXT" as const,
            explanation: "该名称作为独立品牌保留，未与其他名称合并。",
            sourceUrl: null,
          },
        ],
      })),
  );
  const brandEntityGroups = [
    ...input.brandEntityGroups,
    ...singletonGroups,
  ].map((group, index) => ({
    groupId: `brand-group-${index + 1}`,
    displayName: group.displayName,
    members: group.members,
    resolutionBasis: group.resolutionBasis.map((basis) =>
      projectResolutionBasis(basis, providerContext),
    ),
  }));
  let themeOrdinal = 0;
  const projectTheme = (
    theme: OverallSynthesisModelOutput["themes"]["positive"][number],
  ) => ({
    themeId: `theme-${++themeOrdinal}`,
    label: theme.label,
    summary: theme.summary,
    evidenceRefs: normalizeObservationReferences(
      theme.evidenceRefs,
      observationKeys,
    ),
  });
  let guidanceOrdinal = 0;
  const projectGuidance = (
    guidance: OverallSynthesisModelOutput["internalGuidance"]["priorities"][number],
  ) => ({
    guidanceId: `guidance-${++guidanceOrdinal}`,
    label: guidance.label,
    detail: guidance.detail,
    evidenceRefs: normalizeSampleReferences(
      guidance.evidenceRefs,
      observationKeys,
    ),
  });

  return {
    brandEntityGroups,
    recommendationAssessment: {
      ...input.recommendationAssessment,
      evidenceRefs: normalizeSampleReferences(
        input.recommendationAssessment.evidenceRefs,
        observationKeys,
      ),
    },
    brandPerception: {
      ...input.brandPerception,
      evidenceRefs: normalizeSampleReferences(
        input.brandPerception.evidenceRefs,
        observationKeys,
      ),
    },
    themes: {
      positive: input.themes.positive.map(projectTheme),
      negative: input.themes.negative.map(projectTheme),
    },
    customerDirections: input.customerDirections.map((direction, index) => ({
      directionId: `direction-${index + 1}`,
      currentProblem: direction.currentProblem,
      recommendedDirection: direction.recommendedDirection,
      intendedImprovement: direction.intendedImprovement,
      evidenceRefs: normalizeSampleReferences(
        direction.evidenceRefs,
        observationKeys,
      ),
    })),
    internalGuidance: {
      summary: input.internalGuidance.summary,
      priorities: input.internalGuidance.priorities.map(projectGuidance),
      writingAngles: input.internalGuidance.writingAngles.map(projectGuidance),
      cautions: input.internalGuidance.cautions,
    },
    limitations: input.limitations,
  };
}

function normalizeSampleReferences<
  Reference extends { sampleId: string; observationId: string | null },
>(references: Reference[], observationKeys: Set<string>) {
  return uniqueReferences(
    references.map((reference) => ({
      ...reference,
      observationId:
        reference.observationId !== null &&
        observationKeys.has(`${reference.sampleId}:${reference.observationId}`)
          ? reference.observationId
          : null,
    })),
  );
}

function projectResolutionBasis(
  basis: OverallSynthesisModelOutput["brandEntityGroups"][number]["resolutionBasis"][number],
  providerContext:
    | {
        searchObservation?: "TRIGGERED" | "NOT_TRIGGERED" | "UNKNOWN";
        sourceMetadata?: Array<Record<string, unknown>>;
      }
    | undefined,
): OverallSynthesisModelOutput["brandEntityGroups"][number]["resolutionBasis"][number] {
  if (basis.kind === "ANSWER_CONTEXT") return { ...basis, sourceUrl: null };
  const allowedUrls = new Set(
    (providerContext?.sourceMetadata ?? [])
      .map((source) =>
        typeof source.url === "string"
          ? source.url
          : typeof source.uri === "string"
            ? source.uri
            : undefined,
      )
      .filter((url): url is string => url !== undefined)
      .map(normalizeUrl),
  );
  if (
    providerContext?.searchObservation === "TRIGGERED" &&
    basis.sourceUrl !== null &&
    allowedUrls.has(normalizeUrl(basis.sourceUrl))
  ) {
    return basis;
  }
  return { ...basis, kind: "ANSWER_CONTEXT", sourceUrl: null };
}

function normalizeObservationReferences<
  Reference extends { sampleId: string; observationId: string },
>(references: Reference[], observationKeys: Set<string>): Reference[] {
  return uniqueReferences(
    references.filter((reference) =>
      observationKeys.has(`${reference.sampleId}:${reference.observationId}`),
    ),
  );
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

function uniqueReferences<
  Reference extends { sampleId: string; observationId: string | null },
>(references: Reference[]): Reference[] {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = `${reference.sampleId}:${reference.observationId ?? "*"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function brandMentionKey(input: {
  sampleId: string;
  brandMentionId: string;
}): string {
  return `${input.sampleId}:${input.brandMentionId}`;
}
