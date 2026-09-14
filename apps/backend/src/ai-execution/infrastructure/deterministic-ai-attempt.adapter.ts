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

    if (request.purpose === "BRAND_NAME_RESOLUTION") {
      return {
        kind: "SUCCEEDED",
        output: deterministicBrandNameResolution(request.input.userContext),
        usage: { inputTokens: 320, outputTokens: 120 },
      };
    }

    if (request.purpose === "REPORT_COMPOSITION") {
      return {
        kind: "SUCCEEDED",
        output: deterministicReportComposition(request.input.userContext),
        usage: { inputTokens: 560, outputTokens: 240 },
      };
    }

    if (request.purpose === "EVALUATION_QUESTION_GENERATION") {
      return {
        kind: "SUCCEEDED",
        output: deterministicQuestionGeneration(request.input.userContext),
        usage: { inputTokens: 420, outputTokens: 240 },
      };
    }

    return {
      kind: "SUCCEEDED",
      output: deterministicSampleParser(request.input.userContext),
      usage: { inputTokens: 220, outputTokens: 96 },
    };
  }
}

function deterministicSampleParser(userContext: Record<string, unknown>) {
  const focusBrand = requiredString(userContext, "focusBrand");
  const content = requiredString(userContext, "content");
  const names = [focusBrand, "晨光咖啡", "城市咖啡"]
    .filter((name) => content.includes(name))
    .sort((left, right) => content.indexOf(left) - content.indexOf(right));
  return {
    brands: names.map((displayName) => ({
      displayName,
      isFocusBrand: displayName === focusBrand,
      attitude: "POSITIVE",
      mentionContext: [
        {
          text:
            displayName === focusBrand
              ? `${focusBrand}在回答中被作为相关选择介绍。`
              : `${displayName}在回答中被列为相关选择。`,
          polarity: "POSITIVE",
        },
      ],
    })),
    cardInterpretation: content.includes(focusBrand)
      ? `该回答提及${focusBrand}，并将其作为相关选择介绍。`
      : `该回答未提及${focusBrand}。`,
  };
}

function deterministicBrandNameResolution(
  userContext: Record<string, unknown>,
) {
  const brandNames = requiredArray(userContext, "brandNames").map((value) =>
    requiredRecordValue(value, "brand name"),
  );
  return {
    brandGroups: brandNames.map((brand) => ({
      displayName: requiredString(brand, "observedName"),
      observedNames: [requiredString(brand, "observedName")],
    })),
    ignoredNames: [],
  };
}

function deterministicReportComposition(userContext: Record<string, unknown>) {
  const samples = requiredArray(userContext, "samples").map((value) =>
    requiredRecordValue(value, "composition sample"),
  );
  const targetSamples = samples.filter((sample) => sample.target !== null);
  const pointRefs = targetSamples.flatMap((sample) => {
    const target = requiredRecord(sample, "target");
    return optionalArray(target, "mentionContext")
      .slice(0, 1)
      .map((value) => {
        const point = requiredRecordValue(value, "composition point");
        return {
          sampleRef: requiredString(sample, "sampleRef"),
          pointRef: requiredString(point, "pointRef"),
        };
      });
  });
  const sampleRefs = (targetSamples.length > 0 ? targetSamples : samples)
    .slice(0, 5)
    .map((sample) => requiredString(sample, "sampleRef"));
  return {
    recommendationAssessment:
      "当前品牌在不同需求问题中的出现情况存在差异，可结合提及和首次出现顺序理解整体表现。",
    brandPerception:
      "现有回答主要将品牌理解为能够回应相关需求的具体选择，并保留了适用场景与体验方面的介绍。",
    positiveThemes:
      pointRefs.length > 0
        ? [
            {
              label: "已有正向认知",
              summary: "部分回答已经形成可用于后续内容强化的正向品牌印象。",
              pointRefs,
            },
          ]
        : [],
    negativeThemes: [],
    directions: [
      {
        currentProblem: "品牌在相关需求下的介绍还可以更加集中清楚。",
        recommendedDirection: "强化核心场景内容",
        intendedImprovement: "围绕已有优势和用户关心的问题补充清晰的品牌内容。",
        sampleRefs,
      },
    ],
  };
}

function deterministicQuestionGeneration(
  userContext: Record<string, unknown>,
): Record<string, unknown> {
  const companyName = requiredString(userContext, "companyName");
  const location = requiredRecord(userContext, "location");
  const locality = requiredRecord(location, "locality");
  requiredString(locality, "kind");
  const region = [
    requiredString(location, "cityLabel"),
    requiredString(location, "terminalRegionLabel"),
    requiredString(locality, "label"),
  ]
    .filter((value, index, values) => values.indexOf(value) === index)
    .join("");
  const subject = requiredString(userContext, "recommendationSubject");
  const flagship = requiredString(userContext, "flagshipProductOrService");
  const characteristics = requiredStringArray(userContext, "characteristics");
  const characteristicOne = characteristics[0]!;
  const characteristicTwo = characteristics[1]!;
  return {
    queryTargetName: companyName,
    brandDirected: `${region}${companyName}这家${subject}怎么样，主要提供哪些产品或服务，整体表现如何？`,
    industryRecommendation: `想在${region}找${flagship}，有哪些${subject}值得了解和比较？`,
    characteristicAngleOne: `想在${region}找${flagship}，比较看重${characteristicOne}，有哪些选择？`,
    characteristicAngleTwo: `${region}附近有哪些在${characteristicTwo}方面有特点的${flagship}商家？`,
  };
}

function deterministicOverallSynthesis(
  userContext: Record<string, unknown>,
): Record<string, unknown> {
  const samples = requiredArray(userContext, "samples").map((value) =>
    requiredRecordValue(value, "synthesis sample"),
  );
  if (samples.length === 0) {
    throw new Error("Deterministic synthesis input has no valid samples");
  }
  const sampleReferences = samples.slice(0, 40).map((sample) => ({
    sampleId: requiredString(sample, "sampleId"),
    observationId: null,
  }));
  const openReferences = samples
    .filter(
      (sample) => requiredString(sample, "questionKind") !== "BRAND_DIRECTED",
    )
    .slice(0, 40)
    .map((sample) => ({
      sampleId: requiredString(sample, "sampleId"),
      observationId: null,
    }));
  const directReferences = samples
    .filter(
      (sample) => requiredString(sample, "questionKind") === "BRAND_DIRECTED",
    )
    .slice(0, 40)
    .map((sample) => ({
      sampleId: requiredString(sample, "sampleId"),
      observationId: null,
    }));
  const observations = samples.flatMap((sample) => {
    const semantic = requiredRecord(sample, "semantic");
    return semanticObservations(semantic).map((observation) => ({
      sampleId: requiredString(sample, "sampleId"),
      observationId: requiredString(observation, "observationId"),
      polarity: requiredString(observation, "polarity"),
    }));
  });

  const groupMap = new Map<
    string,
    {
      groupId: string;
      displayName: string;
      members: Array<{
        sampleId: string;
        brandMentionId: string;
        relationship:
          | "SAME_NAME"
          | "TRANSLATION_OR_ABBREVIATION"
          | "STORE_FORMAT"
          | "SUBORDINATE_BRAND_LINE";
      }>;
      resolutionBasis: Array<{
        kind: "ANSWER_CONTEXT";
        explanation: string;
        sourceUrl: null;
      }>;
    }
  >();
  for (const sample of samples) {
    const semantic = requiredRecord(sample, "semantic");
    const otherBrands = optionalArray(semantic, "otherBrands");
    for (const value of otherBrands) {
      const brand = requiredRecordValue(value, "other brand");
      const displayName = requiredString(brand, "displayName");
      const normalized = deterministicBrandGroup(displayName);
      let group = groupMap.get(normalized.key);
      if (!group) {
        group = {
          groupId: `brand-group-${groupMap.size + 1}`,
          displayName: normalized.displayName,
          members: [],
          resolutionBasis: [
            {
              kind: "ANSWER_CONTEXT",
              explanation: "根据样本中保留的品牌名称关系进行确定性归组。",
              sourceUrl: null,
            },
          ],
        };
        groupMap.set(normalized.key, group);
      }
      group.members.push({
        sampleId: requiredString(sample, "sampleId"),
        brandMentionId: requiredString(brand, "brandMentionId"),
        relationship: normalized.subordinate
          ? "SUBORDINATE_BRAND_LINE"
          : "SAME_NAME",
      });
    }
  }

  const positiveRefs = observations
    .filter((observation) => observation.polarity === "POSITIVE")
    .slice(0, 60)
    .map(({ sampleId, observationId }) => ({ sampleId, observationId }));
  const negativeRefs = observations
    .filter((observation) => observation.polarity === "NEGATIVE")
    .slice(0, 60)
    .map(({ sampleId, observationId }) => ({ sampleId, observationId }));
  const directionEvidence =
    openReferences.length > 0 ? openReferences : sampleReferences;

  return {
    brandEntityGroups: [...groupMap.values()],
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
                themeId: "positive-evidence",
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
                themeId: "negative-evidence",
                label: "仍有认知缺口",
                summary: "部分回答呈现了需要后续内容优化的负向表现。",
                evidenceRefs: negativeRefs,
              },
            ],
    },
    customerDirections: [
      {
        directionId: "strengthen-discovery",
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
          guidanceId: "visibility-priority",
          label: "优先改善开放问题可见度",
          detail: "围绕行业和品牌特色建立清楚、稳定且不夸大的内容信号。",
          evidenceRefs: directionEvidence.slice(0, 80),
        },
      ],
      writingAngles: [
        {
          guidanceId: "evidence-led-writing",
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

function semanticObservations(
  semantic: Record<string, unknown>,
): Record<string, unknown>[] {
  const keys = [
    "targetObservations",
    "statedIdentity",
    "positioning",
    "offerings",
    "audiences",
    "recommendationReasons",
    "conditions",
    "queryFit",
  ];
  return keys.flatMap((key) =>
    optionalArray(semantic, key).map((value) =>
      requiredRecordValue(value, `semantic observation ${key}`),
    ),
  );
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

function requiredStringArray(
  input: Record<string, unknown>,
  key: string,
): string[] {
  const values = requiredArray(input, key);
  if (
    values.length < 2 ||
    values.some((value) => typeof value !== "string" || value.length === 0)
  ) {
    throw new Error(`Deterministic AI input is missing ${key}`);
  }
  return values as string[];
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
