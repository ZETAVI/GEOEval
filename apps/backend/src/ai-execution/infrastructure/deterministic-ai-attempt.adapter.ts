import type {
  AiAdapterResult,
  AiAttemptRequest,
  ResolvedAiAttemptRequest,
  ResolvedAiRoute,
} from "../domain/ai-attempt.types.js";
import type { AiAttemptAdapter } from "../domain/ai-attempt.adapter.js";

export type DeterministicAttemptScenario = (
  request: ResolvedAiAttemptRequest,
) => AiAdapterResult | undefined;

export class DeterministicAiAttemptAdapter implements AiAttemptAdapter {
  constructor(
    private readonly scenario: DeterministicAttemptScenario = () => undefined,
  ) {}

  resolve(request: AiAttemptRequest): ResolvedAiRoute {
    const providerKey = request.routePolicyId.includes("fallback")
      ? request.routePolicyId.includes("synthesis")
        ? "deterministic-synthesis-fallback"
        : "deterministic-parser-fallback"
      : request.routePolicyId.includes("synthesis")
        ? "deterministic-synthesis-primary"
        : request.purpose === "EVALUATION_INTERPRETATION"
          ? "deterministic-parser"
          : `deterministic-${request.routePolicyId}`;
    return {
      providerKey,
      serviceClass: "deterministic-fixture",
      protocol: "in-process",
      requestedModel: request.requestedModel,
    };
  }

  async execute(request: ResolvedAiAttemptRequest): Promise<AiAdapterResult> {
    const controlled = this.scenario(request);
    if (controlled) return controlled;

    if (request.purpose === "EVALUATION_ACQUISITION") {
      const companyName = requiredString(request.input, "companyName");
      const query = requiredString(request.input, "query");
      const platformLabel = requiredString(request.input, "platformLabel");
      const questionOrdinal = requiredNumber(request.input, "questionOrdinal");
      return {
        kind: "SUCCEEDED",
        output: {
          kind: "ACQUISITION",
          answerContent: deterministicAcquisitionAnswer({
            companyName,
            platformLabel,
            query,
            questionOrdinal,
          }),
          answerFormat: "MARKDOWN",
          sourceMetadata: [
            {
              title: `${companyName} 公开资料`,
              url: `https://example.invalid/${request.sampleId}`,
            },
          ],
          searchObservation: "TRIGGERED",
          returnedModel: request.requestedModel,
        },
        usage: { inputTokens: 128, outputTokens: 196 },
      };
    }

    if (request.purpose === "OVERALL_SYNTHESIS") {
      return {
        kind: "SUCCEEDED",
        output: deterministicOverallSynthesis(request.input.userContext),
        usage: { inputTokens: 640, outputTokens: 280 },
      };
    }

    const userContext = request.input.userContext;
    const companyName = requiredString(userContext, "companyName");
    const answerContent = requiredString(userContext, "originalAnswer");
    const questionKind = requiredString(userContext, "questionKind");
    const mentioned = questionKind !== "INDUSTRY_RECOMMENDATION";
    const targetLine = mentioned
      ? findLineContaining(answerContent, companyName)
      : undefined;
    const conditionLine = mentioned
      ? findLineContaining(answerContent, "需要结合实际需求判断")
      : undefined;
    const targetAnchor = targetLine
      ? {
          anchorId: "target-mention",
          exactText: targetLine,
          occurrence: 1,
          purposes: [
            "TARGET_MENTION",
            ...(questionKind === "BRAND_DIRECTED" ? [] : ["TARGET_POSITION"]),
            "DESCRIPTION",
          ],
        }
      : undefined;
    const conditionAnchor = conditionLine
      ? {
          anchorId: "target-condition",
          exactText: conditionLine,
          occurrence: 1,
          purposes: ["CHARACTERISTIC", "LIMITATION"],
        }
      : undefined;
    const otherBrandFixtures = [
      { id: "morning-coffee", name: "晨光咖啡" },
      { id: "city-coffee", name: "城市咖啡" },
    ].flatMap((brand, index) => {
      const line = findLineContaining(answerContent, brand.name);
      if (!line) return [];
      const relativePosition =
        questionKind === "CHARACTERISTIC_TWO" ? index + 2 : index + 1;
      return [
        {
          brand,
          relativePosition,
          anchor: {
            anchorId: `other-${brand.id}`,
            exactText: line,
            occurrence: 1,
            purposes: ["OTHER_BRAND"],
          },
        },
      ];
    });
    const targetPosition =
      questionKind === "CHARACTERISTIC_ONE"
        ? 3
        : questionKind === "CHARACTERISTIC_TWO"
          ? 1
          : null;
    const shared = {
      answerStructure:
        questionKind === "CHARACTERISTIC_TWO"
          ? "TABLE"
          : questionKind === "BRAND_DIRECTED"
            ? "MIXED"
            : "ORDERED_LIST",
      targetDisplayedForms: mentioned ? [companyName] : [],
      targetObservations: targetAnchor
        ? [
            {
              observationId: "target-visible",
              label: "品牌信息可识别",
              detail: `${companyName} 在回答中以候选对象出现。`,
              polarity: "NEUTRAL",
              evidenceAnchorIds: [targetAnchor.anchorId],
            },
          ]
        : [],
      otherBrands: otherBrandFixtures.map((fixture) => ({
        brandMentionId: fixture.brand.id,
        displayName: fixture.brand.name,
        observedForms: [fixture.brand.name],
        role: "RECOMMENDED",
        relativePosition: fixture.relativePosition,
        positionKind: "RECOMMENDATION",
        evidenceAnchorIds: [fixture.anchor.anchorId],
      })),
      evidenceAnchors: [
        targetAnchor,
        conditionAnchor,
        ...otherBrandFixtures.map((fixture) => fixture.anchor),
      ].filter((anchor): anchor is NonNullable<typeof anchor> =>
        Boolean(anchor),
      ),
      cardInterpretation: mentioned
        ? "回答提及了当前品牌，同时保留了适用条件。"
        : "回答有效，但没有明确提及当前品牌。",
      limitations: conditionAnchor ? ["公开回答要求结合实际需求判断。"] : [],
    };
    const conditionObservation = conditionAnchor
      ? [
          {
            observationId: "conditional-fit",
            label: "适用性需要判断",
            detail: "回答没有给出无条件肯定，需要结合实际需求判断。",
            polarity: "UNCERTAIN",
            evidenceAnchorIds: [conditionAnchor.anchorId],
          },
        ]
      : [];
    return {
      kind: "SUCCEEDED",
      output:
        questionKind === "BRAND_DIRECTED"
          ? {
              family: "BRAND_DIRECTED",
              mentioned,
              position: null,
              semantic: {
                profile: "BRAND_DIRECTED",
                ...shared,
                statedIdentity: targetAnchor
                  ? [
                      {
                        observationId: "stated-identity",
                        label: "品牌身份",
                        detail: "回答能够识别并介绍当前品牌。",
                        polarity: "NEUTRAL",
                        evidenceAnchorIds: [targetAnchor.anchorId],
                      },
                    ]
                  : [],
                positioning: [],
                offerings: [],
                audiences: [],
                contextualTargetPosition: null,
                contextualPositionEvidenceAnchorIds: [],
              },
            }
          : {
              family: "OPEN_DISCOVERY",
              questionKind,
              mentioned,
              position: mentioned ? targetPosition : null,
              semantic: {
                profile: "OPEN_DISCOVERY",
                ...shared,
                targetRole: mentioned
                  ? "CONDITIONALLY_RECOMMENDED"
                  : "NOT_MENTIONED",
                recommendationReasons: [],
                conditions: conditionObservation,
                queryFit: targetAnchor
                  ? [
                      {
                        observationId: "query-fit",
                        label: "进入候选范围",
                        detail: "回答将当前品牌纳入了该问题的候选语境。",
                        polarity: "NEUTRAL",
                        evidenceAnchorIds: [targetAnchor.anchorId],
                      },
                    ]
                  : [],
              },
            },
      usage: { inputTokens: 220, outputTokens: 96 },
    };
  }
}

function deterministicOverallSynthesis(
  userContext: Record<string, unknown>,
): Record<string, unknown> {
  const samples = requiredArray(userContext, "evidenceSamples").map((value) =>
    requiredRecordValue(value, "synthesis sample"),
  );
  if (samples.length === 0) {
    throw new Error("Deterministic synthesis input has no valid samples");
  }
  const sampleReferences = samples.slice(0, 40).map((sample) => ({
    sampleRef: requiredString(sample, "sampleRef"),
    observationRef: null,
  }));
  const openReferences = samples
    .filter(
      (sample) =>
        requiredString(sample, "questionPurpose") !== "了解品牌自身呈现",
    )
    .slice(0, 40)
    .map((sample) => ({
      sampleRef: requiredString(sample, "sampleRef"),
      observationRef: null,
    }));
  const directReferences = samples
    .filter(
      (sample) =>
        requiredString(sample, "questionPurpose") === "了解品牌自身呈现",
    )
    .slice(0, 40)
    .map((sample) => ({
      sampleRef: requiredString(sample, "sampleRef"),
      observationRef: null,
    }));
  const observations = samples.flatMap((sample) => {
    return optionalArray(sample, "observations").map((value) => {
      const observation = requiredRecordValue(value, "synthesis observation");
      return {
        sampleRef: requiredString(sample, "sampleRef"),
        observationRef: requiredString(observation, "observationRef"),
        tone: requiredString(observation, "tone"),
      };
    });
  });

  const groupMap = new Map<
    string,
    {
      displayName: string;
      members: Array<{
        candidateRef: string;
        relationship:
          | "SAME_NAME"
          | "TRANSLATION_OR_ABBREVIATION"
          | "STORE_FORMAT"
          | "SUBORDINATE_BRAND_LINE";
      }>;
      explanation: string;
    }
  >();
  const candidates = requiredArray(userContext, "brandCandidates").map(
    (value) => requiredRecordValue(value, "brand candidate"),
  );
  for (const candidate of candidates) {
    const names = requiredArray(candidate, "names");
    const displayName = names.find(
      (name): name is string => typeof name === "string" && name.length > 0,
    );
    if (!displayName) {
      throw new Error("Deterministic synthesis brand candidate has no name");
    }
    const normalized = deterministicBrandGroup(displayName);
    let group = groupMap.get(normalized.key);
    if (!group) {
      group = {
        displayName: normalized.displayName,
        members: [],
        explanation: "根据紧凑候选中的明显名称关系进行归组。",
      };
      groupMap.set(normalized.key, group);
    }
    group.members.push({
      candidateRef: requiredString(candidate, "candidateRef"),
      relationship: normalized.subordinate
        ? "SUBORDINATE_BRAND_LINE"
        : "SAME_NAME",
    });
  }

  const positiveRefs = observations
    .filter((observation) => observation.tone === "正面")
    .slice(0, 60)
    .map(({ sampleRef, observationRef }) => ({ sampleRef, observationRef }));
  const negativeRefs = observations
    .filter((observation) => observation.tone === "负面")
    .slice(0, 60)
    .map(({ sampleRef, observationRef }) => ({ sampleRef, observationRef }));
  const directionEvidence =
    openReferences.length > 0 ? openReferences : sampleReferences;

  return {
    brandEntityGroups: [...groupMap.values()].filter(
      (group) => group.members.length >= 2,
    ),
    recommendationAssessment: {
      summary:
        "当前品牌在开放问题中的可见度存在差异，应结合提及与位置综合理解。",
      evidenceRefs:
        openReferences.length > 0 ? openReferences : sampleReferences,
    },
    brandPerception: {
      summary: "现有回答能够形成基础品牌认知，但不同平台的表达完整度并不一致。",
      evidenceRefs:
        directReferences.length > 0 ? directReferences : sampleReferences,
    },
    themes: {
      positive:
        positiveRefs.length === 0
          ? []
          : [
              {
                label: "已有正向认知",
                summary: "部分回答保留了可用于强化的正向品牌描述。",
                evidenceRefs: positiveRefs,
              },
            ],
      negative:
        negativeRefs.length === 0
          ? []
          : [
              {
                label: "仍有认知缺口",
                summary: "部分回答呈现了需要后续内容优化的负向表现。",
                evidenceRefs: negativeRefs,
              },
            ],
    },
    customerDirections: [
      {
        currentProblem: "品牌在不同开放问题和平台中的出现情况不够稳定。",
        recommendedDirection:
          "围绕核心优势持续补充结构清晰、可被引用的公开内容。",
        intendedImprovement:
          "增加品牌进入相关问题候选语境的机会，但不承诺具体提升。",
        evidenceRefs: directionEvidence.slice(0, 60),
      },
    ],
    internalGuidance: {
      summary:
        "后续写作应以真实品牌资料和本轮可见度缺口为基础，强化可验证的品牌定位与优势表达。",
      priorities: [
        {
          label: "优先改善开放问题可见度",
          detail: "围绕行业和品牌特色建立清楚、稳定且不夸大的内容信号。",
          evidenceRefs: directionEvidence.slice(0, 80),
        },
      ],
      writingAngles: [
        {
          label: "使用证据支撑的品牌表达",
          detail: "结合用户资料组织品牌定位、核心特色、适用人群和使用场景。",
          evidenceRefs: directionEvidence.slice(0, 80),
        },
      ],
      cautions: ["不得编造事实或承诺发布后一定提升 AI 推荐表现。"],
    },
    limitations: ["本结果来自当前有效样本，仅反映本轮评测状态。"],
  };
}

function deterministicBrandGroup(value: string): {
  key: string;
  displayName: string;
  subordinate: boolean;
} {
  const normalized = value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s·・._-]/g, "");
  if (normalized.includes("starbucksreserve")) {
    return { key: "starbucks", displayName: "Starbucks", subordinate: true };
  }
  if (normalized.includes("星巴克臻选")) {
    return { key: "星巴克", displayName: "星巴克", subordinate: true };
  }
  return { key: normalized, displayName: value, subordinate: false };
}

function requiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Deterministic AI input is missing ${key}`);
  }
  return value;
}

function requiredNumber(input: Record<string, unknown>, key: string): number {
  const value = input[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Deterministic AI input is missing ${key}`);
  }
  return value;
}

function requiredRecord(
  input: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return requiredRecordValue(input[key], key);
}

function requiredRecordValue(
  value: unknown,
  owner: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Deterministic AI input is missing ${owner}`);
  }
  return value as Record<string, unknown>;
}

function requiredArray(input: Record<string, unknown>, key: string): unknown[] {
  const value = input[key];
  if (!Array.isArray(value)) {
    throw new Error(`Deterministic AI input is missing ${key}`);
  }
  return value;
}

function optionalArray(input: Record<string, unknown>, key: string): unknown[] {
  const value = input[key];
  return Array.isArray(value) ? value : [];
}

function findLineContaining(content: string, fragment: string) {
  return content.split("\n").find((line) => line.includes(fragment));
}

function deterministicAcquisitionAnswer(input: {
  companyName: string;
  platformLabel: string;
  query: string;
  questionOrdinal: number;
}): string {
  const heading = `## ${input.platformLabel} 的公开信息回答`;
  if (input.questionOrdinal === 1) {
    return [
      heading,
      "",
      `针对“${input.query}”，可参考的对象包括 ${input.companyName} 及同类商家。`,
      "",
      "| 观察维度 | 客观信息 |",
      "| --- | --- |",
      `| 品牌信息 | ${input.companyName} 在公开资料中有可识别信息 |`,
      "",
      `综合公开资料，${input.companyName} 的特点需要结合实际需求判断。`,
    ].join("\n");
  }
  if (input.questionOrdinal === 4) {
    return [
      heading,
      "",
      `针对“${input.query}”，可按回答中的呈现顺序参考：`,
      "",
      "| 顺序 | 候选品牌 |",
      "| --- | --- |",
      `| 1 | ${input.companyName} |`,
      "| 2 | 晨光咖啡 |",
      "| 3 | 城市咖啡 |",
      "",
      `综合公开资料，${input.companyName} 的特点需要结合实际需求判断。`,
    ].join("\n");
  }
  const candidates =
    input.questionOrdinal === 3
      ? ["1. 晨光咖啡", "2. 城市咖啡", `3. ${input.companyName}`]
      : ["1. 晨光咖啡", "2. 城市咖啡"];
  return [
    heading,
    "",
    `针对“${input.query}”，可按回答中的呈现顺序参考：`,
    "",
    ...candidates,
    "",
    input.questionOrdinal === 3
      ? `综合公开资料，${input.companyName} 的特点需要结合实际需求判断。`
      : "本题按行业范围给出候选，没有明确推荐目标品牌。",
  ].join("\n");
}
