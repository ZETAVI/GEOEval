import { describe, expect, it } from "vitest";

import { buildEvaluationReportDocument } from "../src/geo-intelligence/domain/evaluation-report.document.js";
import { calculateEvaluationReportMetrics } from "../src/geo-intelligence/domain/evaluation-report.policy.js";
import { parseAndProjectOverallSynthesisModelOutput } from "../src/geo-intelligence/domain/overall-synthesis-model.contract.js";
import {
  OverallSynthesisSemanticError,
  splitOverallSynthesis,
  type OverallSynthesisSampleContext,
} from "../src/geo-intelligence/domain/overall-synthesis.contract.js";
import { buildOverallSynthesisTask } from "../src/geo-intelligence/overall-synthesis.policy.js";

describe("overall synthesis customer-quality replay", () => {
  it("uses compact local references, merges obvious name variants, and fails safe at the public boundary", () => {
    const context = headFamilyReplayContext();
    const task = buildOverallSynthesisTask(context);
    expect(task.systemInstruction).toContain("分析顺序");
    expect(task.systemInstruction).toContain("完成标准");
    for (const symptomToken of [
      "BRAND_DIRECTED",
      "targetRole",
      "observationId",
      "UUID",
    ]) {
      expect(task.systemInstruction).not.toContain(symptomToken);
    }
    const modelContext = task.userContext as {
      evidenceScope: {
        validSampleCount: number;
        distinctQuestionCount: number;
        platformCount: number;
        statement: string;
      };
      performance: {
        openQuestionEvidence: {
          mentionedSampleCount: number;
          validSampleCount: number;
          statement: string;
        };
      };
      evidenceSamples: Array<{
        sampleRef: string;
        observations: Array<{ observationRef: string }>;
      }>;
      brandCandidates: Array<{
        candidateRef: string;
        names: string[];
      }>;
    };
    const requestText = JSON.stringify(modelContext);

    expect(modelContext.evidenceScope).toEqual({
      validSampleCount: 20,
      distinctQuestionCount: 4,
      platformCount: 5,
      statement: "本次综合输入包含 20 条有效样本，覆盖 4 个问题和 5 个平台。",
    });
    expect(modelContext.performance.openQuestionEvidence).toEqual({
      mentionedSampleCount: 0,
      validSampleCount: 15,
      statement: "15 条开放问题有效样本中，当前品牌被提及 0 条。",
    });

    for (const privateToken of [
      "BRAND_DIRECTED",
      "OPEN_DISCOVERY",
      "targetRole",
      "observationId",
      "sampleId",
      "brandMentionId",
    ]) {
      expect(requestText).not.toContain(privateToken);
    }
    expect(requestText).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
    expect(requestText.length).toBeLessThan(
      JSON.stringify({
        brand: context.brand,
        questions: context.questions,
        samples: context.samples,
        metrics: context.metrics,
      }).length * 0.55,
    );

    const firstSample = modelContext.evidenceSamples[0]!;
    const firstObservation = firstSample.observations[0]!;
    const studio = modelContext.brandCandidates.find((candidate) =>
      candidate.names.includes("好酒好蔡工作室"),
    );
    const researchStudio = modelContext.brandCandidates.find((candidate) =>
      candidate.names.includes("好酒好蔡研发工作室"),
    );
    expect(studio).toBeDefined();
    expect(researchStudio).toBeDefined();

    const sampleReference = {
      sampleRef: firstSample.sampleRef,
      observationRef: null,
    };
    const observationReference = {
      sampleRef: firstSample.sampleRef,
      observationRef: firstObservation.observationRef,
    };
    const modelOutput = {
      brandEntityGroups: [
        {
          displayName: "好酒好蔡",
          members: [
            {
              candidateRef: studio!.candidateRef,
              relationship: "STORE_FORMAT",
            },
            {
              candidateRef: researchStudio!.candidateRef,
              relationship: "SUBORDINATE_BRAND_LINE",
            },
          ],
          explanation: "两个名称共享清晰的消费者品牌主体。",
        },
      ],
      independentCandidateRefs: modelContext.brandCandidates
        .map((candidate) => candidate.candidateRef)
        .filter(
          (candidateRef) =>
            candidateRef !== studio!.candidateRef &&
            candidateRef !== researchStudio!.candidateRef,
        ),
      recommendationAssessment: {
        summary:
          "BRAND_DIRECTED 的 targetRole 来自 00000000-0000-4000-8000-000000000001，observationId 如下：}}}",
        evidenceRefs: [sampleReference],
      },
      brandPerception: {
        summary: "平台回答形成了一定的品牌认知，但不同问题下并不稳定。",
        evidenceRefs: [observationReference],
      },
      themes: {
        positive: [
          {
            label: "服务体验",
            summary: "部分回答认可了服务体验。",
            evidenceRefs: [observationReference],
          },
        ],
        negative: [],
      },
      customerDirections: [
        {
          currentProblem: "品牌在开放推荐问题中的出现仍不稳定。",
          recommendedDirection: "持续补充真实、清晰且可验证的品牌内容。",
          intendedImprovement: "帮助平台更准确地理解品牌特点。",
          evidenceRefs: [sampleReference],
        },
      ],
      internalGuidance: {
        summary: "后续写作围绕真实资料展开。",
        priorities: [
          {
            label: "可见度",
            detail: "优先改善开放问题中的品牌可见度。",
            evidenceRefs: [sampleReference],
          },
        ],
        writingAngles: [
          {
            label: "真实体验",
            detail: "使用真实服务场景组织内容。",
            evidenceRefs: [observationReference],
          },
        ],
        cautions: ["不承诺固定提升。"],
      },
      limitations: ["仅反映当前样本。"],
    };
    const replayedSamples = [...context.samples].reverse();
    const synthesis = parseAndProjectOverallSynthesisModelOutput(
      modelOutput,
      replayedSamples,
    );
    const report = buildEvaluationReportDocument({
      metrics: context.metrics,
      synthesis: splitOverallSynthesis(synthesis).semantic,
      samples: context.samples,
    });
    const reportText = JSON.stringify(report);

    expect(report.competitors).toContainEqual(
      expect.objectContaining({ displayName: "好酒好蔡" }),
    );
    expect(
      report.competitors.filter((competitor) =>
        competitor.displayName.includes("好酒好蔡"),
      ),
    ).toHaveLength(1);
    for (const privateToken of [
      "BRAND_DIRECTED",
      "targetRole",
      "observationId",
      "00000000-0000-4000-8000-000000000001",
      "}}}",
    ]) {
      expect(reportText).not.toContain(privateToken);
    }
    expect(report.overview.recommendationAssessment).not.toContain(
      "BRAND_DIRECTED",
    );

    const unresolved = structuredClone(modelOutput);
    unresolved.customerDirections[0]!.evidenceRefs[0]!.observationRef = "o99";
    expect(() =>
      parseAndProjectOverallSynthesisModelOutput(unresolved, replayedSamples),
    ).toThrow(OverallSynthesisSemanticError);

    const omittedBrandDecision = structuredClone(modelOutput);
    expect(omittedBrandDecision.independentCandidateRefs.pop()).toBeDefined();
    expect(() =>
      parseAndProjectOverallSynthesisModelOutput(
        omittedBrandDecision,
        replayedSamples,
      ),
    ).toThrow(OverallSynthesisSemanticError);
  });
});

function headFamilyReplayContext() {
  const questions = Array.from({ length: 4 }, (_, index) => ({
    questionId: fixedUuid(101 + index),
    kind: [
      "BRAND_DIRECTED",
      "INDUSTRY_RECOMMENDATION",
      "CHARACTERISTIC_ONE",
      "CHARACTERISTIC_TWO",
    ][index] as
      | "BRAND_DIRECTED"
      | "INDUSTRY_RECOMMENDATION"
      | "CHARACTERISTIC_ONE"
      | "CHARACTERISTIC_TWO",
    ordinal: index + 1,
    content: [
      "请介绍头家顺。",
      "广州天河区有哪些值得了解的餐饮品牌？",
      "广州天河区有哪些服务体验稳定的餐饮品牌？",
      "广州天河区有哪些适合家庭聚会的餐饮品牌？",
    ][index]!,
  }));
  const platformLabels = ["DeepSeek", "豆包", "千问", "文心一言", "混元"];
  const samples = Array.from({ length: 20 }, (_, index) => {
    const question = questions[Math.floor(index / 5)]!;
    return replaySample({
      sampleId: fixedUuid(index + 1),
      questionId: question.questionId,
      questionKind: question.kind,
      platformKey: `platform-${(index % 5) + 1}`,
      platformLabel: platformLabels[index % 5]!,
      index,
    });
  });
  const metrics = calculateEvaluationReportMetrics(
    samples.map((sample, index) => ({
      sampleId: sample.sampleId,
      questionKind: sample.questionKind,
      questionOrdinal: Math.floor(index / 5) + 1,
      platformKey: sample.platformKey,
      platformLabel: sample.platformLabel,
      platformOrdinal: (index % 5) + 1,
      interpretation: {
        mentioned: false,
        position: null,
        semantic: sample.semantic,
      },
    })),
  );
  return {
    brand: {
      companyName: "头家顺",
      primaryIndustry: "生活服务",
      secondaryIndustry: "餐饮服务",
      characteristicOne: "服务体验稳定",
      characteristicTwo: "适合家庭聚会",
      province: "广东省",
      city: "广州市",
      district: "天河区",
    },
    questions,
    samples,
    metrics,
  };
}

function replaySample(input: {
  sampleId: string;
  questionId: string;
  questionKind:
    | "BRAND_DIRECTED"
    | "INDUSTRY_RECOMMENDATION"
    | "CHARACTERISTIC_ONE"
    | "CHARACTERISTIC_TWO";
  platformKey: string;
  platformLabel: string;
  index: number;
}): OverallSynthesisSampleContext & {
  questionId: string;
  platformLabel: string;
} {
  const brandNames = [
    input.index % 2 === 0 ? "好酒好蔡工作室" : "好酒好蔡研发工作室",
    "广州酒家",
    `本地餐饮候选${input.index % 5}`,
    `社区餐厅${input.index % 7}`,
  ];
  const evidenceAnchors = [
    {
      anchorId: "target-evidence",
      exactText: "头家顺",
      occurrence: 1,
      purposes: ["DESCRIPTION" as const],
    },
    ...brandNames.map((name, index) => ({
      anchorId: `brand-evidence-${index + 1}`,
      exactText: name,
      occurrence: 1,
      purposes: ["OTHER_BRAND" as const],
    })),
  ];
  const shared = {
    answerStructure: "ORDERED_LIST" as const,
    targetDisplayedForms: [] as string[],
    targetObservations: [
      {
        observationId: "service-finding",
        label: "品牌认知",
        detail: "回答对品牌形成了有限但可识别的描述。",
        polarity: "NEUTRAL" as const,
        evidenceAnchorIds: ["target-evidence"],
      },
    ],
    otherBrands: brandNames.map((name, index) => ({
      brandMentionId: `brand-${index + 1}`,
      displayName: name,
      observedForms: [name],
      role: "RECOMMENDED" as const,
      relativePosition: index + 1,
      positionKind: "RECOMMENDATION" as const,
      evidenceAnchorIds: [`brand-evidence-${index + 1}`],
    })),
    evidenceAnchors,
    cardInterpretation: "该样本列出了多个餐饮候选，但未提及当前品牌。",
    limitations: [] as string[],
  };
  const semantic =
    input.questionKind === "BRAND_DIRECTED"
      ? {
          profile: "BRAND_DIRECTED" as const,
          ...shared,
          statedIdentity: [],
          positioning: [],
          offerings: [],
          audiences: [],
          contextualTargetPosition: null,
          contextualPositionEvidenceAnchorIds: [],
        }
      : {
          profile: "OPEN_DISCOVERY" as const,
          ...shared,
          targetRole: "NOT_MENTIONED" as const,
          recommendationReasons: [],
          conditions: [],
          queryFit: [],
        };
  return {
    sampleId: input.sampleId,
    questionId: input.questionId,
    questionKind: input.questionKind,
    platformKey: input.platformKey,
    platformLabel: input.platformLabel,
    semantic,
  };
}

function fixedUuid(value: number): string {
  return `00000000-0000-4000-8000-${value.toString().padStart(12, "0")}`;
}
