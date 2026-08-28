import type { EvaluationQuestionKind } from "./evaluation.types.js";
import type { SampleParserSemantic } from "./sample-parser.contract.js";

export const EVALUATION_REPORT_METRIC_POLICY_VERSION =
  "evaluation.report-metrics@1";

const OPEN_QUESTION_KINDS = new Set<EvaluationQuestionKind>([
  "INDUSTRY_RECOMMENDATION",
  "CHARACTERISTIC_ONE",
  "CHARACTERISTIC_TWO",
]);

const COMPETITOR_ROLES = new Set([
  "RECOMMENDED",
  "CONDITIONALLY_RECOMMENDED",
  "ALTERNATIVE",
]);

export type EvaluationReportMetricInput = {
  sampleId: string;
  questionKind: EvaluationQuestionKind;
  questionOrdinal: number;
  platformKey: string;
  platformLabel: string;
  platformOrdinal: number;
  interpretation:
    | {
        mentioned: boolean;
        position: number | null;
        semantic: SampleParserSemantic;
      }
    | undefined;
};

export type EligibleCompetitorOccurrence = {
  sampleId: string;
  questionKind: Exclude<EvaluationQuestionKind, "BRAND_DIRECTED">;
  platformKey: string;
  platformLabel: string;
  brandMentionId: string;
  displayName: string;
  role: "RECOMMENDED" | "CONDITIONALLY_RECOMMENDED" | "ALTERNATIVE";
  relativePosition: number | null;
};

export type TypicalPosition =
  | { kind: "NONE" }
  | { kind: "SINGLE"; position: number }
  | { kind: "RANGE"; first: number; second: number };

export type EvaluationReportMetrics = {
  policyVersion: typeof EVALUATION_REPORT_METRIC_POLICY_VERSION;
  coverage: {
    totalSampleCount: number;
    validSampleCount: number;
    missingSampleCount: number;
    missingSampleIds: string[];
  };
  recommendationIndex: {
    validOpenSampleCount: number;
    mentionCount: number;
    mentionRate: number;
    averageNormalizedPositionScore: number | null;
    rawScore: number;
    displayScore: number;
    starScore: number;
  };
  typicalPosition: TypicalPosition;
  platforms: Array<{
    platformKey: string;
    platformLabel: string;
    platformOrdinal: number;
    totalSampleCount: number;
    validSampleCount: number;
    validOpenSampleCount: number;
    mentionCount: number;
    mentionRate: number;
    mentionedPositions: number[];
  }>;
  eligibleCompetitorOccurrences: EligibleCompetitorOccurrence[];
};

export function calculateEvaluationReportMetrics(
  samples: EvaluationReportMetricInput[],
): EvaluationReportMetrics {
  const valid = samples.filter((sample) => sample.interpretation !== undefined);
  const validOpen = valid.filter((sample) =>
    OPEN_QUESTION_KINDS.has(sample.questionKind),
  );
  const mentionedOpen = validOpen.filter(
    (sample) => sample.interpretation?.mentioned === true,
  );
  const positions = mentionedOpen.map((sample) => {
    const position = sample.interpretation?.position;
    if (position === null || position === undefined) {
      throw new Error(
        `Mentioned open sample ${sample.sampleId} has no position`,
      );
    }
    return position;
  });
  const mentionRate = ratio(mentionedOpen.length, validOpen.length);
  const averageNormalizedPositionScore =
    positions.length === 0
      ? null
      : round(
          positions.reduce(
            (total, position) => total + normalizedPositionScore(position),
            0,
          ) / positions.length,
          6,
        );
  const rawScore =
    averageNormalizedPositionScore === null
      ? 0
      : 5 * mentionRate * (0.7 + 0.3 * averageNormalizedPositionScore);

  const platformMap = new Map<
    string,
    EvaluationReportMetrics["platforms"][number]
  >();
  for (const sample of samples) {
    const platform = platformMap.get(sample.platformKey) ?? {
      platformKey: sample.platformKey,
      platformLabel: sample.platformLabel,
      platformOrdinal: sample.platformOrdinal,
      totalSampleCount: 0,
      validSampleCount: 0,
      validOpenSampleCount: 0,
      mentionCount: 0,
      mentionRate: 0,
      mentionedPositions: [],
    };
    platform.totalSampleCount += 1;
    if (sample.interpretation) platform.validSampleCount += 1;
    if (sample.interpretation && OPEN_QUESTION_KINDS.has(sample.questionKind)) {
      platform.validOpenSampleCount += 1;
      if (sample.interpretation.mentioned) {
        platform.mentionCount += 1;
        if (sample.interpretation.position === null) {
          throw new Error(
            `Mentioned open sample ${sample.sampleId} has no position`,
          );
        }
        platform.mentionedPositions.push(sample.interpretation.position);
      }
    }
    platformMap.set(sample.platformKey, platform);
  }
  const platforms = [...platformMap.values()]
    .map((platform) => ({
      ...platform,
      mentionRate: ratio(platform.mentionCount, platform.validOpenSampleCount),
      mentionedPositions: [...platform.mentionedPositions].sort(
        (left, right) => left - right,
      ),
    }))
    .sort(
      (left, right) =>
        left.platformOrdinal - right.platformOrdinal ||
        left.platformKey.localeCompare(right.platformKey),
    );

  const eligibleCompetitorOccurrences = validOpen.flatMap((sample) => {
    const semantic = sample.interpretation?.semantic;
    if (!semantic || semantic.profile !== "OPEN_DISCOVERY") return [];
    return semantic.otherBrands.flatMap((brand) =>
      COMPETITOR_ROLES.has(brand.role)
        ? [
            {
              sampleId: sample.sampleId,
              questionKind: sample.questionKind as Exclude<
                EvaluationQuestionKind,
                "BRAND_DIRECTED"
              >,
              platformKey: sample.platformKey,
              platformLabel: sample.platformLabel,
              brandMentionId: brand.brandMentionId,
              displayName: brand.displayName,
              role: brand.role as EligibleCompetitorOccurrence["role"],
              relativePosition:
                brand.positionKind === "RECOMMENDATION"
                  ? brand.relativePosition
                  : null,
            },
          ]
        : [],
    );
  });

  return {
    policyVersion: EVALUATION_REPORT_METRIC_POLICY_VERSION,
    coverage: {
      totalSampleCount: samples.length,
      validSampleCount: valid.length,
      missingSampleCount: samples.length - valid.length,
      missingSampleIds: samples
        .filter((sample) => sample.interpretation === undefined)
        .map((sample) => sample.sampleId),
    },
    recommendationIndex: {
      validOpenSampleCount: validOpen.length,
      mentionCount: mentionedOpen.length,
      mentionRate,
      averageNormalizedPositionScore,
      rawScore: round(rawScore, 6),
      displayScore: round(rawScore, 1),
      starScore: Math.round(rawScore * 2) / 2,
    },
    typicalPosition: typicalPositionFromPositions(positions),
    platforms,
    eligibleCompetitorOccurrences,
  };
}

export function normalizedPositionScore(position: number): number {
  if (!Number.isInteger(position) || position < 1) {
    throw new Error("Position must be a positive integer");
  }
  if (position === 1) return 1;
  if (position === 2) return 0.8;
  if (position === 3) return 0.6;
  if (position <= 5) return 0.4;
  return 0.2;
}

export function typicalPositionFromPositions(
  positions: number[],
): TypicalPosition {
  if (positions.length === 0) return { kind: "NONE" };
  const ordered = [...positions].sort((left, right) => left - right);
  const upperIndex = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) {
    return { kind: "SINGLE", position: ordered[upperIndex]! };
  }
  const first = ordered[upperIndex - 1]!;
  const second = ordered[upperIndex]!;
  return first === second
    ? { kind: "SINGLE", position: first }
    : { kind: "RANGE", first, second };
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : round(numerator / denominator, 6);
}

function round(value: number, precision: number): number {
  const scale = 10 ** precision;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}
