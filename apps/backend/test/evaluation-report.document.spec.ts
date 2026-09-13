import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  buildEvaluationReportDocument,
  evaluationReportDocumentSchema,
  parseStoredEvaluationReportDocument,
} from "../src/geo-intelligence/domain/evaluation-report.document.js";
import type { EvaluationReportMetrics } from "../src/geo-intelligence/domain/evaluation-report.policy.js";
import type {
  AcceptedOverallSynthesisSemantic,
  OverallSynthesisSampleContext,
} from "../src/geo-intelligence/domain/overall-synthesis.contract.js";

describe("evaluation report document", () => {
  it("counts a grouped consumer brand once per sample and keeps an independent sub-brand separate", () => {
    const firstSample = randomUUID();
    const secondSample = randomUUID();
    const samples = [
      sampleContext(firstSample, "deepseek"),
      sampleContext(secondSample, "qwen"),
    ];
    const metrics = metricFixture(firstSample, secondSample);
    const synthesis = synthesisFixture(firstSample, secondSample);

    const document = buildEvaluationReportDocument({
      metrics,
      synthesis,
      samples,
    });

    expect(document.competitors).toEqual([
      {
        groupId: "starbucks",
        displayName: "Starbucks",
        occurrenceCount: 2,
        platforms: ["deepseek", "qwen"],
        typicalPosition: { kind: "RANGE", first: 1, second: 3 },
      },
      {
        groupId: "independent-roastery",
        displayName: "独立烘焙品牌",
        occurrenceCount: 1,
        platforms: ["qwen"],
        typicalPosition: { kind: "SINGLE", position: 2 },
      },
    ]);
    expect(document.directions[0]?.evidence).toEqual({
      sampleCount: 2,
      platforms: ["deepseek", "qwen"],
    });
    expect(document.limitations).toEqual([]);
  });

  it("keeps legacy synthesis notes out of the customer projection", () => {
    const firstSample = randomUUID();
    const secondSample = randomUUID();
    const document = buildEvaluationReportDocument({
      metrics: metricFixture(firstSample, secondSample),
      synthesis: synthesisFixture(firstSample, secondSample),
      samples: [
        sampleContext(firstSample, "deepseek"),
        sampleContext(secondSample, "qwen"),
      ],
    });

    expect(
      parseStoredEvaluationReportDocument("evaluation.report-document@1", {
        ...document,
        limitations: ["evidenceRefs 使用内部样本编号。"],
      }).limitations,
    ).toEqual([]);
  });

  it("owns the customer-facing theme and direction limits", () => {
    const firstSample = randomUUID();
    const secondSample = randomUUID();
    const document = buildEvaluationReportDocument({
      metrics: metricFixture(firstSample, secondSample),
      synthesis: synthesisFixture(firstSample, secondSample),
      samples: [
        sampleContext(firstSample, "deepseek"),
        sampleContext(secondSample, "qwen"),
      ],
    });

    expect(
      evaluationReportDocumentSchema.parse({
        ...document,
        directions: [],
      }).directions,
    ).toEqual([]);
    expect(() =>
      evaluationReportDocumentSchema.parse({
        ...document,
        directions: Array.from({ length: 4 }, () => document.directions[0]),
      }),
    ).toThrow();
    expect(() =>
      evaluationReportDocumentSchema.parse({
        ...document,
        themes: {
          ...document.themes,
          positive: Array.from({ length: 6 }, (_, index) => ({
            themeId: `theme-${index}`,
            label: `主题 ${index}`,
            summary: "证据摘要",
            evidence: { sampleCount: 1, platforms: ["deepseek"] },
          })),
        },
      }),
    ).toThrow();
  });
});

function sampleContext(
  sampleId: string,
  platformKey: string,
): OverallSynthesisSampleContext {
  return {
    sampleId,
    questionKind: "INDUSTRY_RECOMMENDATION",
    platformKey,
    semantic: {
      profile: "OPEN_DISCOVERY",
      answerStructure: "ORDERED_LIST",
      targetDisplayedForms: [],
      targetObservations: [],
      otherBrands: [],
      evidenceAnchors: [],
      cardInterpretation: "样本未提及当前品牌。",
      limitations: [],
      targetRole: "NOT_MENTIONED",
      recommendationReasons: [],
      conditions: [],
      queryFit: [],
    },
  };
}

function metricFixture(
  firstSample: string,
  secondSample: string,
): EvaluationReportMetrics {
  return {
    policyVersion: "evaluation.report-metrics@1",
    coverage: {
      totalSampleCount: 2,
      validSampleCount: 2,
      missingSampleCount: 0,
      missingSampleIds: [],
    },
    recommendationIndex: {
      validOpenSampleCount: 2,
      mentionCount: 0,
      mentionRate: 0,
      averageNormalizedPositionScore: null,
      rawScore: 0,
      displayScore: 0,
      starScore: 0,
    },
    typicalPosition: { kind: "NONE" },
    platforms: [platformMetric("deepseek", 1), platformMetric("qwen", 2)],
    eligibleCompetitorOccurrences: [
      occurrence(firstSample, "deepseek", "starbucks", "Starbucks", 2),
      occurrence(
        firstSample,
        "deepseek",
        "starbucks-reserve",
        "Starbucks Reserve",
        1,
      ),
      occurrence(
        secondSample,
        "qwen",
        "starbucks-reserve",
        "Starbucks Reserve",
        3,
      ),
      occurrence(
        secondSample,
        "qwen",
        "independent-roastery",
        "独立烘焙品牌",
        2,
      ),
    ],
  };
}

function platformMetric(platformKey: string, platformOrdinal: number) {
  return {
    platformKey,
    platformLabel: platformKey,
    platformOrdinal,
    totalSampleCount: 1,
    validSampleCount: 1,
    validOpenSampleCount: 1,
    mentionCount: 0,
    mentionRate: 0,
    mentionedPositions: [],
  };
}

function occurrence(
  sampleId: string,
  platformKey: string,
  brandMentionId: string,
  displayName: string,
  relativePosition: number,
) {
  return {
    sampleId,
    questionKind: "INDUSTRY_RECOMMENDATION" as const,
    platformKey,
    platformLabel: platformKey,
    brandMentionId,
    displayName,
    role: "RECOMMENDED" as const,
    relativePosition,
  };
}

function synthesisFixture(
  firstSample: string,
  secondSample: string,
): AcceptedOverallSynthesisSemantic {
  return {
    brandEntityGroups: [
      {
        groupId: "starbucks",
        displayName: "Starbucks",
        members: [
          member(firstSample, "starbucks", "SAME_NAME"),
          member(firstSample, "starbucks-reserve", "SUBORDINATE_BRAND_LINE"),
          member(secondSample, "starbucks-reserve", "SUBORDINATE_BRAND_LINE"),
        ],
        resolutionBasis: [contextBasis()],
      },
      {
        groupId: "independent-roastery",
        displayName: "独立烘焙品牌",
        members: [member(secondSample, "independent-roastery", "SAME_NAME")],
        resolutionBasis: [contextBasis()],
      },
    ],
    recommendationAssessment: {
      summary: "当前品牌尚未进入候选语境。",
      evidenceRefs: [{ sampleId: firstSample, observationId: null }],
    },
    brandPerception: {
      summary: "当前回答没有形成稳定品牌认知。",
      evidenceRefs: [{ sampleId: firstSample, observationId: null }],
    },
    themes: { positive: [], negative: [] },
    customerDirections: [
      {
        directionId: "visibility",
        currentProblem: "开放问题可见度不足。",
        recommendedDirection: "补充可验证的品牌内容。",
        intendedImprovement: "增加进入候选语境的机会。",
        evidenceRefs: [
          { sampleId: firstSample, observationId: null },
          { sampleId: secondSample, observationId: null },
        ],
      },
    ],
    limitations: ["仅反映当前样本。"],
  };
}

function member(
  sampleId: string,
  brandMentionId: string,
  relationship: "SAME_NAME" | "SUBORDINATE_BRAND_LINE",
) {
  return { sampleId, brandMentionId, relationship };
}

function contextBasis() {
  return {
    kind: "ANSWER_CONTEXT" as const,
    explanation: "根据当前样本名称关系归组。",
    sourceUrl: null,
  };
}
