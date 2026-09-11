import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  OverallSynthesisSemanticError,
  parseOverallSynthesisOutput,
  type OverallSynthesisOutput,
  type OverallSynthesisSampleContext,
} from "../src/geo-intelligence/domain/overall-synthesis.contract.js";
import {
  buildOverallSynthesisModelReferenceProjection,
  overallSynthesisModelJsonSchema,
  parseAndProjectOverallSynthesisModelOutput,
} from "../src/geo-intelligence/domain/overall-synthesis-model.contract.js";

describe("overall synthesis contract", () => {
  it("publishes one strict, self-describing model output form", () => {
    const schema = overallSynthesisModelJsonSchema as {
      description?: string;
      additionalProperties?: boolean;
      required?: string[];
      properties?: Record<
        string,
        {
          description?: string;
          properties?: Record<string, { description?: string }>;
        }
      >;
    };
    expect(schema.description).toBe("一份完整的评测综合决策和证据引用");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(
      expect.arrayContaining([
        "brandEntityGroups",
        "independentCandidateRefs",
        "recommendationAssessment",
        "brandPerception",
        "themes",
        "customerDirections",
        "internalGuidance",
        "limitations",
      ]),
    );
    for (const field of schema.required ?? []) {
      expect(schema.properties?.[field]?.description, field).toBeTruthy();
    }
    for (const field of [
      "summary",
      "priorities",
      "writingAngles",
      "cautions",
    ]) {
      expect(
        schema.properties?.internalGuidance?.properties?.[field]?.description,
        `internalGuidance.${field}`,
      ).toBeTruthy();
    }
  });

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

  it("projects explicit model decisions into stable brand groups", () => {
    const context = synthesisContext();
    const domainOutput = validOutput(context);
    const references = buildOverallSynthesisModelReferenceProjection(context);
    const sampleRef = references.evidenceSamples[0]!.sampleRef;
    const observationRef =
      references.evidenceSamples[0]!.observations[0]!.observationRef;
    const output = parseAndProjectOverallSynthesisModelOutput(
      {
        brandEntityGroups: [],
        independentCandidateRefs: [references.brandCandidates[0]!.candidateRef],
        recommendationAssessment: {
          summary: domainOutput.recommendationAssessment.summary,
          evidenceRefs: [{ sampleRef, observationRef: null }],
        },
        brandPerception: {
          summary: domainOutput.brandPerception.summary,
          evidenceRefs: [{ sampleRef, observationRef }],
        },
        themes: {
          positive: domainOutput.themes.positive.map(
            ({ themeId: _themeId, ...theme }) => ({
              label: theme.label,
              summary: theme.summary,
              evidenceRefs: [{ sampleRef, observationRef }],
            }),
          ),
          negative: [],
        },
        customerDirections: domainOutput.customerDirections.map(
          ({
            directionId: _directionId,
            evidenceRefs: _evidenceRefs,
            ...direction
          }) => ({
            ...direction,
            evidenceRefs: [{ sampleRef, observationRef: null }],
          }),
        ),
        internalGuidance: {
          summary: domainOutput.internalGuidance.summary,
          priorities: domainOutput.internalGuidance.priorities.map(
            ({
              guidanceId: _guidanceId,
              evidenceRefs: _evidenceRefs,
              ...guidance
            }) => ({
              ...guidance,
              evidenceRefs: [{ sampleRef, observationRef: null }],
            }),
          ),
          writingAngles: domainOutput.internalGuidance.writingAngles.map(
            ({
              guidanceId: _guidanceId,
              evidenceRefs: _evidenceRefs,
              ...guidance
            }) => ({
              ...guidance,
              evidenceRefs: [{ sampleRef, observationRef }],
            }),
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
            explanation: "该候选经本次证据判断保持独立。",
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
