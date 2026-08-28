import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  OverallSynthesisSemanticError,
  parseOverallSynthesisOutput,
  type OverallSynthesisOutput,
  type OverallSynthesisSampleContext,
} from "../src/geo-intelligence/domain/overall-synthesis.contract.js";
import { parseAndProjectOverallSynthesisModelOutput } from "../src/geo-intelligence/domain/overall-synthesis-model.contract.js";

describe("overall synthesis contract", () => {
  it("accepts complete evidence-linked grouping", () => {
    const context = synthesisContext();
    const output = validOutput(context);
    expect(parseOverallSynthesisOutput(output, context)).toEqual(output);
  });

  it("rejects incomplete grouping, unresolved evidence, and metric fields", () => {
    const context = synthesisContext();
    const incomplete = validOutput(context);
    incomplete.brandEntityGroups = [];
    expect(() => parseOverallSynthesisOutput(incomplete, context)).toThrow(
      OverallSynthesisSemanticError,
    );

    const unresolved = validOutput(context);
    unresolved.themes.positive[0]!.evidenceRefs[0]!.observationId = "missing";
    expect(() => parseOverallSynthesisOutput(unresolved, context)).toThrow(
      OverallSynthesisSemanticError,
    );

    expect(() =>
      parseOverallSynthesisOutput(
        { ...validOutput(context), recommendationIndex: 5 },
        context,
      ),
    ).toThrow();
  });

  it("keeps public-search evidence explicit", () => {
    const context = synthesisContext();
    const output = validOutput(context);
    output.brandEntityGroups[0]!.resolutionBasis = [
      {
        kind: "PUBLIC_SEARCH",
        explanation: "使用公开资料确认名称关系",
        sourceUrl: null,
      },
    ];
    expect(() => parseOverallSynthesisOutput(output, context)).toThrow(
      OverallSynthesisSemanticError,
    );
  });

  it("projects model proposals into stable identities and singleton brand groups", () => {
    const context = synthesisContext();
    const domainOutput = validOutput(context);
    const output = parseAndProjectOverallSynthesisModelOutput(
      {
        brandEntityGroups: [],
        recommendationAssessment: domainOutput.recommendationAssessment,
        brandPerception: domainOutput.brandPerception,
        themes: {
          positive: domainOutput.themes.positive.map(
            ({ themeId: _themeId, ...theme }) => ({
              ...theme,
              evidenceRefs: [
                ...theme.evidenceRefs,
                {
                  sampleId: context[0]!.sampleId,
                  observationId: "starbucks-reserve",
                },
              ],
            }),
          ),
          negative: [],
        },
        customerDirections: domainOutput.customerDirections.map(
          ({ directionId: _directionId, ...direction }) => direction,
        ),
        internalGuidance: {
          summary: domainOutput.internalGuidance.summary,
          priorities: domainOutput.internalGuidance.priorities.map(
            ({ guidanceId: _guidanceId, ...guidance }) => guidance,
          ),
          writingAngles: domainOutput.internalGuidance.writingAngles.map(
            ({ guidanceId: _guidanceId, ...guidance }) => guidance,
          ),
          cautions: domainOutput.internalGuidance.cautions,
        },
        limitations: domainOutput.limitations,
      },
      context,
    );

    expect(output.brandEntityGroups).toEqual([
      {
        groupId: "brand-group-1",
        displayName: "Starbucks Reserve",
        members: [
          {
            sampleId: context[0]!.sampleId,
            brandMentionId: "starbucks-reserve",
            relationship: "SAME_NAME",
          },
        ],
        resolutionBasis: [
          {
            kind: "ANSWER_CONTEXT",
            explanation: "该名称作为独立品牌保留，未与其他名称合并。",
            sourceUrl: null,
          },
        ],
      },
    ]);
    expect(output.themes.positive[0]?.themeId).toBe("theme-1");
    expect(output.themes.positive[0]?.evidenceRefs).toEqual([
      {
        sampleId: context[0]!.sampleId,
        observationId: "service-positive",
      },
    ]);
    expect(output.customerDirections[0]?.directionId).toBe("direction-1");
    expect([
      output.internalGuidance.priorities[0]?.guidanceId,
      output.internalGuidance.writingAngles[0]?.guidanceId,
    ]).toEqual(["guidance-1", "guidance-2"]);
  });
});

function synthesisContext(): OverallSynthesisSampleContext[] {
  return [
    {
      sampleId: randomUUID(),
      questionKind: "CHARACTERISTIC_ONE",
      platformKey: "deepseek",
      semantic: {
        profile: "OPEN_DISCOVERY",
        answerStructure: "ORDERED_LIST",
        targetDisplayedForms: ["测试品牌"],
        targetObservations: [
          {
            observationId: "service-positive",
            label: "服务体验",
            detail: "回答提到服务体验较好。",
            polarity: "POSITIVE",
            evidenceAnchorIds: ["target-evidence"],
          },
        ],
        otherBrands: [
          {
            brandMentionId: "starbucks-reserve",
            displayName: "Starbucks Reserve",
            observedForms: ["Starbucks Reserve"],
            role: "RECOMMENDED",
            relativePosition: 1,
            positionKind: "RECOMMENDATION",
            evidenceAnchorIds: ["other-evidence"],
          },
        ],
        evidenceAnchors: [
          {
            anchorId: "target-evidence",
            exactText: "测试品牌",
            occurrence: 1,
            purposes: ["TARGET_MENTION"],
          },
          {
            anchorId: "other-evidence",
            exactText: "Starbucks Reserve",
            occurrence: 1,
            purposes: ["OTHER_BRAND"],
          },
        ],
        cardInterpretation: "回答包含当前品牌和其他候选品牌。",
        limitations: [],
        targetRole: "RECOMMENDED",
        recommendationReasons: [],
        conditions: [],
        queryFit: [],
      },
    },
  ];
}

function validOutput(
  context: OverallSynthesisSampleContext[],
): OverallSynthesisOutput {
  const sampleId = context[0]!.sampleId;
  const sampleRef = { sampleId, observationId: null };
  const observationRef = { sampleId, observationId: "service-positive" };
  return {
    brandEntityGroups: [
      {
        groupId: "starbucks",
        displayName: "Starbucks",
        members: [
          {
            sampleId,
            brandMentionId: "starbucks-reserve",
            relationship: "SUBORDINATE_BRAND_LINE",
          },
        ],
        resolutionBasis: [
          {
            kind: "ANSWER_CONTEXT",
            explanation: "名称体现明显从属关系",
            sourceUrl: null,
          },
        ],
      },
    ],
    recommendationAssessment: {
      summary: "当前品牌已进入部分候选语境。",
      evidenceRefs: [sampleRef],
    },
    brandPerception: {
      summary: "回答形成了基础正向认知。",
      evidenceRefs: [observationRef],
    },
    themes: {
      positive: [
        {
          themeId: "service",
          label: "服务体验",
          summary: "服务体验是已有正向认知。",
          evidenceRefs: [observationRef],
        },
      ],
      negative: [],
    },
    customerDirections: [
      {
        directionId: "improve-visibility",
        currentProblem: "开放问题可见度仍不稳定。",
        recommendedDirection: "持续补充可验证的品牌内容。",
        intendedImprovement: "增加进入候选语境的机会。",
        evidenceRefs: [sampleRef],
      },
    ],
    internalGuidance: {
      summary: "围绕真实优势组织后续文章。",
      priorities: [
        {
          guidanceId: "visibility",
          label: "可见度",
          detail: "优先改善开放问题中的品牌可见度。",
          evidenceRefs: [sampleRef],
        },
      ],
      writingAngles: [
        {
          guidanceId: "service-angle",
          label: "服务体验",
          detail: "用真实案例强化服务体验表达。",
          evidenceRefs: [observationRef],
        },
      ],
      cautions: ["不承诺一定提升。"],
    },
    limitations: ["仅反映当前样本。"],
  };
}
