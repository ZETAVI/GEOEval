import { describe, expect, it } from "vitest";

import {
  applyBrandNameResolution,
  parseBrandNameResolution,
} from "../src/geo-intelligence/domain/brand-name-resolution.contract.js";
import { calculateEvaluationReportMetrics } from "../src/geo-intelligence/domain/evaluation-report.policy.js";
import { parseAndProjectReportComposition } from "../src/geo-intelligence/domain/report-composition.contract.js";
import { buildBrandNameResolutionTask } from "../src/geo-intelligence/brand-name-resolution.policy.js";
import { buildReportCompositionTask } from "../src/geo-intelligence/report-composition.policy.js";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

describe("formal evaluation aggregate analysis", () => {
  it("groups readable names without internal record IDs", () => {
    const samples = sampleSet();
    const task = buildBrandNameResolutionTask(samples);
    expect(task.userContext).toEqual({
      brandNames: [
        {
          observedName: "北京大成（广州）律师事务所",
          mentionContext: ["团队覆盖多个专业领域。"],
        },
        {
          observedName: "大成律师事务所",
          mentionContext: ["适合企业综合法律需求。"],
        },
      ],
    });
    expect(task.outputContract.enforcement).toBe("JSON_OBJECT");
    expect(task.systemInstruction).not.toContain("recordId");
    expect(task.systemInstruction).toContain(
      "个人或未说明所属品牌的从业团队、政府或公共服务单位",
    );

    expect(
      parseBrandNameResolution(
        {
          brandGroups: [
            {
              displayName: "大成",
              observedNames: ["北京大成（广州）律师事务所", "大成律师事务所"],
            },
          ],
          ignoredNames: [],
        },
        samples,
        "金鹏律师事务所",
      ),
    ).toMatchObject({ brandGroups: [{ displayName: "大成" }] });
  });

  it("rejects missing, repeated and focus-leaking names", () => {
    const samples = sampleSet();
    expect(() =>
      parseBrandNameResolution(
        {
          brandGroups: [
            {
              displayName: "大成",
              observedNames: ["北京大成（广州）律师事务所"],
            },
          ],
          ignoredNames: [],
        },
        samples,
        "金鹏律师事务所",
      ),
    ).toThrow("missing observed name");
    expect(() =>
      parseBrandNameResolution(
        {
          brandGroups: [
            {
              displayName: "金鹏律师事务所",
              observedNames: ["北京大成（广州）律师事务所", "大成律师事务所"],
            },
          ],
          ignoredNames: [],
        },
        samples,
        "金鹏律师事务所",
      ),
    ).toThrow("focus brand");
  });

  it("filters ignored names before deterministic competitor statistics", () => {
    const samples = sampleSet();
    const metrics = metricsFor(samples);
    const resolved = applyBrandNameResolution(
      {
        brandGroups: [
          {
            displayName: "大成",
            observedNames: ["北京大成（广州）律师事务所"],
          },
        ],
        ignoredNames: ["大成律师事务所"],
      },
      samples,
      metrics,
    );
    expect(resolved.competitors).toEqual([
      expect.objectContaining({ displayName: "大成", occurrenceCount: 1 }),
    ]);
    expect(resolved.metrics.eligibleCompetitorOccurrences).toHaveLength(1);
  });

  it("projects concise composition into the existing report owner", () => {
    const samples = sampleSet();
    const metrics = metricsFor(samples);
    const resolution = {
      brandGroups: [
        {
          displayName: "大成",
          observedNames: ["北京大成（广州）律师事务所", "大成律师事务所"],
        },
      ],
      ignoredNames: [],
    };
    const task = buildReportCompositionTask({
      brand: brandSnapshot(),
      samples,
      metrics,
      resolution,
    });
    expect(task.outputContract.enforcement).toBe("JSON_OBJECT");
    expect(task.userContext).not.toHaveProperty("rawAnswers");
    expect(task.systemInstruction).toContain(
      "不要先用稳健、良好或优秀等笼统正面词",
    );

    const projected = parseAndProjectReportComposition({
      output: {
        recommendationAssessment:
          "品牌在两个有效开放回答中均被提及，并保持靠前出现。",
        brandPerception: "回答主要将品牌理解为面向企业需求的综合法律服务机构。",
        positiveThemes: [
          {
            label: "企业服务",
            summary: "回答强调了企业综合法律需求下的服务能力。",
            pointRefs: [{ sampleId: firstId, pointId: "p1" }],
          },
        ],
        negativeThemes: [],
        directions: [
          {
            currentProblem: "企业服务特点还可以介绍得更集中。",
            recommendedDirection: "强化企业法律服务场景",
            intendedImprovement: "讲清团队能力和适用的企业需求。",
            sampleIds: [firstId],
          },
        ],
      },
      focusBrand: "金鹏律师事务所",
      samples,
      metrics,
      resolution,
    });
    expect(projected.synthesis.brandEntityGroups).toHaveLength(1);
    expect(projected.synthesis.themes.positive[0]?.evidenceRefs).toEqual([
      { sampleId: firstId, observationId: "p1" },
    ]);
    expect(projected.synthesis.internalGuidance.writingAngles).toHaveLength(1);
  });

  it("rejects missing references and internal IDs in customer prose", () => {
    const samples = sampleSet();
    const metrics = metricsFor(samples);
    const resolution = {
      brandGroups: [
        {
          displayName: "大成",
          observedNames: ["北京大成（广州）律师事务所", "大成律师事务所"],
        },
      ],
      ignoredNames: [],
    };
    expect(() =>
      parseAndProjectReportComposition({
        output: {
          recommendationAssessment: "q1中表现较好。",
          brandPerception: "回答形成了基础品牌认识。",
          positiveThemes: [
            {
              label: "服务",
              summary: "具备企业服务能力。",
              pointRefs: [{ sampleId: firstId, pointId: "missing" }],
            },
          ],
          negativeThemes: [],
          directions: [],
        },
        focusBrand: "金鹏律师事务所",
        samples,
        metrics,
        resolution,
      }),
    ).toThrow("internal reference");
  });
});

function sampleSet() {
  return [
    sample(firstId, "北京大成（广州）律师事务所", "团队覆盖多个专业领域。"),
    sample(secondId, "大成律师事务所", "适合企业综合法律需求。"),
  ];
}

function sample(sampleId: string, competitor: string, context: string) {
  return {
    sampleId,
    questionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    question: "广州有哪些企业法律服务机构值得了解？",
    questionKind: "INDUSTRY_RECOMMENDATION" as const,
    platformKey: sampleId === firstId ? "deepseek" : "qwen",
    platformLabel: sampleId === firstId ? "DeepSeek" : "千问",
    mentioned: true,
    position: 1,
    semantic: {
      profile: "OPEN_DISCOVERY" as const,
      answerStructure: "PARAGRAPHS" as const,
      targetDisplayedForms: ["金鹏律师事务所"],
      targetObservations: [
        {
          observationId: "p1",
          label: "企业服务",
          detail: "面向企业提供综合法律服务。",
          polarity: "POSITIVE" as const,
          evidenceAnchorIds: [],
        },
      ],
      otherBrands: [
        {
          brandMentionId: "b1",
          displayName: competitor,
          observedForms: [competitor],
          role: "RECOMMENDED" as const,
          relativePosition: 2,
          positionKind: "RECOMMENDATION" as const,
          evidenceAnchorIds: [],
          mentionContext: [context],
        },
      ],
      evidenceAnchors: [],
      cardInterpretation: "回答提及金鹏律师事务所。",
      limitations: [],
      targetRole: "RECOMMENDED" as const,
      recommendationReasons: [],
      conditions: [],
      queryFit: [],
    },
  };
}

function metricsFor(samples: ReturnType<typeof sampleSet>) {
  return calculateEvaluationReportMetrics(
    samples.map((sample, index) => ({
      sampleId: sample.sampleId,
      questionKind: sample.questionKind,
      questionOrdinal: 2,
      platformKey: sample.platformKey,
      platformLabel: sample.platformLabel,
      platformOrdinal: index + 1,
      interpretation: {
        mentioned: sample.mentioned,
        position: sample.position,
        semantic: sample.semantic,
      },
    })),
  );
}

function brandSnapshot() {
  return {
    schemaVersion: "brand-evaluation-snapshot@3" as const,
    companyName: "金鹏律师事务所",
    primaryIndustry: "专业服务",
    secondaryIndustry: "律师事务所",
    flagshipProductOrService: "企业法律服务",
    recommendationSubject: "律师事务所",
    characteristics: ["企业服务", "综合能力"],
    location: {
      provinceCode: "440000",
      provinceLabel: "广东省",
      cityCode: "440100",
      cityLabel: "广州市",
      terminalRegionCode: "440106",
      terminalRegionLabel: "天河区",
      coordinates: { longitude: 113.3, latitude: 23.1 },
      source: { provider: "AMAP" as const, placeId: "test" },
      locality: { kind: "BUSINESS_AREA" as const, label: "珠江新城" },
    },
  };
}
