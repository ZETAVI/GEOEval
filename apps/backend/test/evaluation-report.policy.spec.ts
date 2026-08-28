import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  calculateEvaluationReportMetrics,
  normalizedPositionScore,
  typicalPositionFromPositions,
  type EvaluationReportMetricInput,
} from "../src/geo-intelligence/domain/evaluation-report.policy.js";
import type { SampleParserSemantic } from "../src/geo-intelligence/domain/sample-parser.contract.js";

describe("evaluation report metric policy", () => {
  it("uses the confirmed normalized position buckets", () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(normalizedPositionScore)).toEqual([
      1, 0.8, 0.6, 0.4, 0.4, 0.2, 0.2,
    ]);
    expect(() => normalizedPositionScore(0)).toThrow();
  });

  it("keeps failed samples outside the denominator and separates median display", () => {
    const samples = [
      metricSample("INDUSTRY_RECOMMENDATION", true, 1, "deepseek", 1),
      metricSample("CHARACTERISTIC_ONE", true, 6, "deepseek", 1),
      metricSample("CHARACTERISTIC_TWO", false, null, "qwen", 2),
      metricSample("INDUSTRY_RECOMMENDATION", false, null, "qwen", 2),
      metricSample("CHARACTERISTIC_ONE", undefined, null, "hunyuan", 3),
      metricSample("BRAND_DIRECTED", true, null, "deepseek", 1),
    ];
    const metrics = calculateEvaluationReportMetrics(samples);

    expect(metrics.coverage).toMatchObject({
      totalSampleCount: 6,
      validSampleCount: 5,
      missingSampleCount: 1,
    });
    expect(metrics.recommendationIndex).toEqual({
      validOpenSampleCount: 4,
      mentionCount: 2,
      mentionRate: 0.5,
      averageNormalizedPositionScore: 0.6,
      rawScore: 2.2,
      displayScore: 2.2,
      starScore: 2,
    });
    expect(metrics.typicalPosition).toEqual({
      kind: "RANGE",
      first: 1,
      second: 6,
    });
    expect(metrics.platforms[0]).toMatchObject({
      platformKey: "deepseek",
      validOpenSampleCount: 2,
      mentionCount: 2,
      mentionRate: 1,
    });
  });

  it("represents empty, odd, and equal-even median positions directly", () => {
    expect(typicalPositionFromPositions([])).toEqual({ kind: "NONE" });
    expect(typicalPositionFromPositions([4, 1, 2])).toEqual({
      kind: "SINGLE",
      position: 2,
    });
    expect(typicalPositionFromPositions([2, 2])).toEqual({
      kind: "SINGLE",
      position: 2,
    });
  });
});

function metricSample(
  questionKind: EvaluationReportMetricInput["questionKind"],
  mentioned: boolean | undefined,
  position: number | null,
  platformKey: string,
  platformOrdinal: number,
): EvaluationReportMetricInput {
  return {
    sampleId: randomUUID(),
    questionKind,
    questionOrdinal: questionKind === "BRAND_DIRECTED" ? 1 : 2,
    platformKey,
    platformLabel: platformKey,
    platformOrdinal,
    interpretation:
      mentioned === undefined
        ? undefined
        : {
            mentioned,
            position,
            semantic: semanticFor(questionKind, mentioned),
          },
  };
}

function semanticFor(
  questionKind: EvaluationReportMetricInput["questionKind"],
  mentioned: boolean,
): SampleParserSemantic {
  const shared = {
    answerStructure: "PARAGRAPHS" as const,
    targetDisplayedForms: mentioned ? ["测试品牌"] : [],
    targetObservations: [],
    otherBrands: [],
    evidenceAnchors: [],
    cardInterpretation: "客观样本说明",
    limitations: [],
  };
  return questionKind === "BRAND_DIRECTED"
    ? {
        profile: "BRAND_DIRECTED",
        ...shared,
        statedIdentity: [],
        positioning: [],
        offerings: [],
        audiences: [],
        contextualTargetPosition: null,
        contextualPositionEvidenceAnchorIds: [],
      }
    : {
        profile: "OPEN_DISCOVERY",
        ...shared,
        targetRole: mentioned ? "RECOMMENDED" : "NOT_MENTIONED",
        recommendationReasons: [],
        conditions: [],
        queryFit: [],
      };
}
