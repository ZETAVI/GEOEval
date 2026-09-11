import { z } from "zod";

import {
  typicalPositionFromPositions,
  type EvaluationReportMetrics,
  type TypicalPosition,
} from "./evaluation-report.policy.js";
import type {
  AcceptedOverallSynthesisSemantic,
  OverallSynthesisSampleContext,
} from "./overall-synthesis.contract.js";

export const EVALUATION_REPORT_DOCUMENT_VERSION =
  "evaluation.report-document@1";

const typicalPositionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("NONE") }).strict(),
  z
    .object({
      kind: z.literal("SINGLE"),
      position: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("RANGE"),
      first: z.number().int().positive(),
      second: z.number().int().positive(),
    })
    .strict(),
]);

const evidenceSummarySchema = z
  .object({
    sampleCount: z.number().int().nonnegative(),
    platforms: z.array(z.string().min(1)),
  })
  .strict();

export const evaluationReportDocumentSchema = z
  .object({
    overview: z
      .object({
        recommendationAssessment: z.string().min(1),
        brandPerception: z.string().min(1),
        recommendationIndex: z
          .object({
            score: z.number().min(0).max(5),
            stars: z.number().min(0).max(5),
            mentionRate: z.number().min(0).max(1),
            mentionCount: z.number().int().nonnegative(),
            validOpenSampleCount: z.number().int().nonnegative(),
          })
          .strict(),
        typicalPosition: typicalPositionSchema,
        coverage: z
          .object({
            validSampleCount: z.number().int().nonnegative(),
            totalSampleCount: z.number().int().nonnegative(),
            missingSampleCount: z.number().int().nonnegative(),
          })
          .strict(),
      })
      .strict(),
    platforms: z.array(
      z
        .object({
          platformKey: z.string().min(1),
          platformLabel: z.string().min(1),
          validSampleCount: z.number().int().nonnegative(),
          totalSampleCount: z.number().int().nonnegative(),
          validOpenSampleCount: z.number().int().nonnegative(),
          mentionCount: z.number().int().nonnegative(),
          mentionRate: z.number().min(0).max(1),
          typicalPosition: typicalPositionSchema,
        })
        .strict(),
    ),
    themes: z
      .object({
        positive: z
          .array(
            z
              .object({
                themeId: z.string().min(1),
                label: z.string().min(1),
                summary: z.string().min(1),
                evidence: evidenceSummarySchema,
              })
              .strict(),
          )
          .max(5),
        negative: z
          .array(
            z
              .object({
                themeId: z.string().min(1),
                label: z.string().min(1),
                summary: z.string().min(1),
                evidence: evidenceSummarySchema,
              })
              .strict(),
          )
          .max(5),
      })
      .strict(),
    competitors: z
      .array(
        z
          .object({
            groupId: z.string().min(1),
            displayName: z.string().min(1),
            occurrenceCount: z.number().int().positive(),
            platforms: z.array(z.string().min(1)).min(1),
            typicalPosition: typicalPositionSchema,
          })
          .strict(),
      )
      .max(5),
    directions: z
      .array(
        z
          .object({
            directionId: z.string().min(1),
            currentProblem: z.string().min(1),
            recommendedDirection: z.string().min(1),
            intendedImprovement: z.string().min(1),
            evidence: evidenceSummarySchema,
          })
          .strict(),
      )
      .min(1)
      .max(3),
    limitations: z.array(z.string().min(1)),
  })
  .strict();

export type EvaluationReportDocument = z.infer<
  typeof evaluationReportDocumentSchema
>;

export function buildEvaluationReportDocument(input: {
  metrics: EvaluationReportMetrics;
  synthesis: AcceptedOverallSynthesisSemantic;
  samples: OverallSynthesisSampleContext[];
}): EvaluationReportDocument {
  const samplePlatforms = new Map(
    input.samples.map((sample) => [sample.sampleId, sample.platformKey]),
  );
  const groupByMention = new Map<string, { groupId: string; name: string }>();
  for (const group of input.synthesis.brandEntityGroups) {
    for (const member of group.members) {
      groupByMention.set(referenceKey(member.sampleId, member.brandMentionId), {
        groupId: group.groupId,
        name: group.displayName,
      });
    }
  }

  const competitorMap = new Map<
    string,
    {
      groupId: string;
      displayName: string;
      sampleIds: Set<string>;
      platforms: Set<string>;
      samplePositions: Map<string, number | null>;
    }
  >();
  for (const occurrence of input.metrics.eligibleCompetitorOccurrences) {
    const group = groupByMention.get(
      referenceKey(occurrence.sampleId, occurrence.brandMentionId),
    );
    if (!group) {
      throw new Error(
        `Eligible competitor ${occurrence.sampleId}:${occurrence.brandMentionId} has no accepted group`,
      );
    }
    const aggregate = competitorMap.get(group.groupId) ?? {
      groupId: group.groupId,
      displayName: group.name,
      sampleIds: new Set<string>(),
      platforms: new Set<string>(),
      samplePositions: new Map<string, number | null>(),
    };
    const firstInSample = !aggregate.sampleIds.has(occurrence.sampleId);
    if (firstInSample) {
      aggregate.sampleIds.add(occurrence.sampleId);
      aggregate.platforms.add(occurrence.platformKey);
    }
    const currentPosition = aggregate.samplePositions.get(occurrence.sampleId);
    if (
      firstInSample ||
      (occurrence.relativePosition !== null &&
        (currentPosition === null ||
          currentPosition === undefined ||
          occurrence.relativePosition < currentPosition))
    ) {
      aggregate.samplePositions.set(
        occurrence.sampleId,
        occurrence.relativePosition,
      );
    }
    competitorMap.set(group.groupId, aggregate);
  }
  const competitors = [...competitorMap.values()]
    .map((competitor) => ({
      groupId: competitor.groupId,
      displayName: competitor.displayName,
      occurrenceCount: competitor.sampleIds.size,
      platforms: [...competitor.platforms].sort(),
      typicalPosition: typicalPositionFromPositions(
        [...competitor.samplePositions.values()].filter(
          (position): position is number => position !== null,
        ),
      ),
    }))
    .sort(
      (left, right) =>
        right.occurrenceCount - left.occurrenceCount ||
        right.platforms.length - left.platforms.length ||
        typicalSortValue(left.typicalPosition) -
          typicalSortValue(right.typicalPosition) ||
        left.displayName.localeCompare(right.displayName),
    )
    .slice(0, 5);

  return protectCustomerDocument(
    evaluationReportDocumentSchema.parse({
      overview: {
        recommendationAssessment:
          input.synthesis.recommendationAssessment.summary,
        brandPerception: input.synthesis.brandPerception.summary,
        recommendationIndex: {
          score: input.metrics.recommendationIndex.displayScore,
          stars: input.metrics.recommendationIndex.starScore,
          mentionRate: input.metrics.recommendationIndex.mentionRate,
          mentionCount: input.metrics.recommendationIndex.mentionCount,
          validOpenSampleCount:
            input.metrics.recommendationIndex.validOpenSampleCount,
        },
        typicalPosition: input.metrics.typicalPosition,
        coverage: {
          validSampleCount: input.metrics.coverage.validSampleCount,
          totalSampleCount: input.metrics.coverage.totalSampleCount,
          missingSampleCount: input.metrics.coverage.missingSampleCount,
        },
      },
      platforms: input.metrics.platforms.map((platform) => ({
        platformKey: platform.platformKey,
        platformLabel: platform.platformLabel,
        validSampleCount: platform.validSampleCount,
        totalSampleCount: platform.totalSampleCount,
        validOpenSampleCount: platform.validOpenSampleCount,
        mentionCount: platform.mentionCount,
        mentionRate: platform.mentionRate,
        typicalPosition: typicalPositionFromPositions(
          platform.mentionedPositions,
        ),
      })),
      themes: {
        positive: input.synthesis.themes.positive.map((theme) => ({
          themeId: theme.themeId,
          label: theme.label,
          summary: theme.summary,
          evidence: evidenceSummary(theme.evidenceRefs, samplePlatforms),
        })),
        negative: input.synthesis.themes.negative.map((theme) => ({
          themeId: theme.themeId,
          label: theme.label,
          summary: theme.summary,
          evidence: evidenceSummary(theme.evidenceRefs, samplePlatforms),
        })),
      },
      competitors,
      directions: input.synthesis.customerDirections.map((direction) => ({
        directionId: direction.directionId,
        currentProblem: direction.currentProblem,
        recommendedDirection: direction.recommendedDirection,
        intendedImprovement: direction.intendedImprovement,
        evidence: evidenceSummary(direction.evidenceRefs, samplePlatforms),
      })),
      // Synthesis limitations remain internal analysis context. The first
      // customer report has no free-form implementation-note surface.
      limitations: [],
    }),
  );
}

export function parseStoredEvaluationReportDocument(
  contractVersion: string,
  payload: unknown,
): EvaluationReportDocument {
  if (contractVersion !== EVALUATION_REPORT_DOCUMENT_VERSION) {
    throw new Error(`Unsupported report document contract ${contractVersion}`);
  }
  const document = evaluationReportDocumentSchema.parse(payload);
  // Keep older immutable documents readable without re-exposing notes that
  // were accepted before the customer projection boundary was tightened, and
  // apply the same minimum narrative guard used for newly materialized reports.
  return protectCustomerDocument({ ...document, limitations: [] });
}

function protectCustomerDocument(
  document: EvaluationReportDocument,
): EvaluationReportDocument {
  const safeThemes = (themes: EvaluationReportDocument["themes"]["positive"]) =>
    themes.filter(
      (theme) =>
        isSafeCustomerText(theme.label) && isSafeCustomerText(theme.summary),
    );
  const safeDirections = document.directions.filter(
    (direction) =>
      isSafeCustomerText(direction.currentProblem) &&
      isSafeCustomerText(direction.recommendedDirection) &&
      isSafeCustomerText(direction.intendedImprovement),
  );
  const fallbackEvidence = document.directions[0]?.evidence ?? {
    sampleCount: document.overview.coverage.validSampleCount,
    platforms: document.platforms.map((platform) => platform.platformKey),
  };
  return evaluationReportDocumentSchema.parse({
    ...document,
    overview: {
      ...document.overview,
      recommendationAssessment: isSafeCustomerText(
        document.overview.recommendationAssessment,
      )
        ? document.overview.recommendationAssessment
        : fallbackRecommendationAssessment(document),
      brandPerception: isSafeCustomerText(document.overview.brandPerception)
        ? document.overview.brandPerception
        : "本轮有效样本形成了可供参考的品牌观察，具体差异可结合下方平台结果查看。",
    },
    themes: {
      positive: safeThemes(document.themes.positive),
      negative: safeThemes(document.themes.negative),
    },
    competitors: document.competitors.filter((competitor) =>
      isSafeCustomerText(competitor.displayName),
    ),
    directions:
      safeDirections.length > 0
        ? safeDirections
        : [
            {
              directionId: "customer-safe-direction",
              currentProblem: "品牌在相关问题中的可见度和表达仍有提升空间。",
              recommendedDirection:
                "围绕真实业务信息，持续补充清晰、一致且可验证的品牌内容。",
              intendedImprovement: "帮助各平台更准确地理解品牌及其服务特点。",
              evidence: fallbackEvidence,
            },
          ],
    limitations: [],
  });
}

function fallbackRecommendationAssessment(
  document: EvaluationReportDocument,
): string {
  const recommendation = document.overview.recommendationIndex;
  if (recommendation.mentionCount === 0) {
    return "本轮开放问题的有效样本中，尚未观察到该品牌被提及。";
  }
  return `本轮 ${recommendation.validOpenSampleCount} 条开放问题有效样本中，品牌被提及 ${recommendation.mentionCount} 次；不同平台的可见度仍有差异。`;
}

function isSafeCustomerText(value: string): boolean {
  const internalTerms =
    /\b(?:BRAND_DIRECTED|OPEN_DISCOVERY|INDUSTRY_RECOMMENDATION|CHARACTERISTIC_(?:ONE|TWO)|targetRole|observationId|sampleId|brandMentionId|sampleRef|observationRef|candidateRef|evidenceRefs|questionKind)\b/i;
  const uuidOrFragment =
    /\b[0-9a-f]{8}(?:-[0-9a-f]{4}){1,4}(?:-[0-9a-f]{8,12})?\b/i;
  const structuralResidue = /[{}\[\]]{2,}/;
  return (
    !internalTerms.test(value) &&
    !uuidOrFragment.test(value) &&
    !structuralResidue.test(value)
  );
}

function evidenceSummary(
  references: Array<{ sampleId: string }>,
  samplePlatforms: Map<string, string>,
) {
  const sampleIds = new Set(references.map((reference) => reference.sampleId));
  const platforms = new Set<string>();
  for (const sampleId of sampleIds) {
    const platform = samplePlatforms.get(sampleId);
    if (!platform)
      throw new Error(`Evidence references missing sample ${sampleId}`);
    platforms.add(platform);
  }
  return { sampleCount: sampleIds.size, platforms: [...platforms].sort() };
}

function typicalSortValue(position: TypicalPosition): number {
  if (position.kind === "NONE") return Number.POSITIVE_INFINITY;
  if (position.kind === "SINGLE") return position.position;
  return (position.first + position.second) / 2;
}

function referenceKey(sampleId: string, localId: string): string {
  return `${sampleId}:${localId}`;
}
