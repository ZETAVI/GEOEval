import { createHash } from "node:crypto";

import type {
  AiProviderEvidence,
  AiAttemptRequest,
  AiExecutionPurpose,
} from "../domain/ai-attempt.types.js";
import { REAL_AI_ROUTES } from "../infrastructure/providers/real-route.catalog.js";
import type { ProviderRouteDefinition } from "../infrastructure/providers/provider-route.js";
import { calculateEvaluationReportMetrics } from "../../geo-intelligence/domain/evaluation-report.policy.js";
import { parseAcceptedEvidence } from "../../geo-intelligence/domain/evaluation-process.types.js";
import type {
  OverallSynthesisOutput,
  OverallSynthesisSampleContext,
} from "../../geo-intelligence/domain/overall-synthesis.contract.js";
import { parseAndProjectOverallSynthesisModelOutput } from "../../geo-intelligence/domain/overall-synthesis-model.contract.js";
import {
  SAMPLE_PARSER_CONTRACT_VERSION,
  collectSampleSemanticObservations,
  type SampleParserOutput,
  type SampleParserSemantic,
} from "../../geo-intelligence/domain/sample-parser.contract.js";
import { parseAndProjectSampleParserModelOutput } from "../../geo-intelligence/domain/sample-parser-model.contract.js";
import type {
  EvaluationBrandSnapshot,
  EvaluationQuestionKind,
} from "../../geo-intelligence/domain/evaluation.types.js";
import {
  EVALUATION_OBJECTIVITY_PROFILE,
  EVALUATION_PLATFORM_POLICY,
} from "../../geo-intelligence/evaluation-policy.js";
import {
  buildOverallSynthesisTask,
  overallSynthesisInstructionProfile,
  type OverallSynthesisTaskContext,
} from "../../geo-intelligence/overall-synthesis.policy.js";
import {
  buildSampleParserTask,
  sampleParserInstructionProfile,
} from "../../geo-intelligence/sample-parser.policy.js";

export const S6_CONTROLLED_MANIFEST_VERSION = "s6-controlled-call-manifest@1";

export type S6ControlledBatchId = "sampling-smoke" | "semantic-probe";

export type S6ControlledCase = {
  fixtureId: string;
  fixtureProfile: string;
  instructionProfile: string;
  request: AiAttemptRequest;
  validateOutput(
    output: Record<string, unknown>,
    providerEvidence?: AiProviderEvidence,
  ): void;
};

export type S6ControlledBatch = {
  id: S6ControlledBatchId;
  description: string;
  automaticTransportRetries: 0;
  stopConditions: string[];
  cases: S6ControlledCase[];
};

export type S6PublicControlledManifest = {
  version: typeof S6_CONTROLLED_MANIFEST_VERSION;
  batchId: S6ControlledBatchId;
  description: string;
  maxExternalRequests: number;
  automaticTransportRetries: 0;
  stopConditions: string[];
  calls: Array<{
    ordinal: number;
    fixtureId: string;
    fixtureProfile: string;
    instructionProfile: string;
    outputContractVersion: string | null;
    purpose: AiExecutionPurpose | "OVERALL_SYNTHESIS";
    routePolicyId: string;
    providerKey: string;
    serviceClass: string;
    protocol: string;
    requestedModel: string;
    structuredReasoningEffort: "low" | "medium" | "xhigh" | null;
    maxExternalRequests: 1;
  }>;
};

const FICTIONAL_BRAND: EvaluationBrandSnapshot = {
  companyName: "星河咖啡实验店",
  primaryIndustry: "本地生活",
  secondaryIndustry: "咖啡饮品",
  characteristicOne: "安静办公空间",
  characteristicTwo: "手冲咖啡",
  province: "广东省",
  city: "广州市",
  district: "天河区",
};

const FIXED_QUESTIONS = [
  {
    kind: "BRAND_DIRECTED" as const,
    ordinal: 1,
    content: "星河咖啡实验店怎么样？",
  },
  {
    kind: "INDUSTRY_RECOMMENDATION" as const,
    ordinal: 2,
    content: "广州天河区有哪些适合日常办公的独立咖啡店？",
  },
  {
    kind: "CHARACTERISTIC_ONE" as const,
    ordinal: 3,
    content: "广州天河区有哪些环境安静、适合办公的咖啡店？",
  },
  {
    kind: "CHARACTERISTIC_TWO" as const,
    ordinal: 4,
    content: "广州天河区有哪些手冲咖啡值得尝试的咖啡店？",
  },
];

export function buildS6ControlledBatch(
  id: S6ControlledBatchId,
): S6ControlledBatch {
  return id === "sampling-smoke" ? samplingSmokeBatch() : semanticProbeBatch();
}

export function publicS6ControlledManifest(
  batch: S6ControlledBatch,
): S6PublicControlledManifest {
  return {
    version: S6_CONTROLLED_MANIFEST_VERSION,
    batchId: batch.id,
    description: batch.description,
    maxExternalRequests: batch.cases.length,
    automaticTransportRetries: batch.automaticTransportRetries,
    stopConditions: [...batch.stopConditions],
    calls: batch.cases.map((controlledCase, index) => {
      const route = requiredRoute(controlledCase.request.routePolicyId);
      return {
        ordinal: index + 1,
        fixtureId: controlledCase.fixtureId,
        fixtureProfile: controlledCase.fixtureProfile,
        instructionProfile: controlledCase.instructionProfile,
        outputContractVersion:
          controlledCase.request.input.taskKind === "STRUCTURED_OUTPUT"
            ? controlledCase.request.input.outputContract.version
            : null,
        purpose: controlledCase.request.purpose,
        routePolicyId: route.routePolicyId,
        providerKey: route.providerKey,
        serviceClass: route.serviceClass,
        protocol: route.protocol,
        requestedModel: route.requestedModel,
        structuredReasoningEffort: route.structuredReasoningEffort ?? null,
        maxExternalRequests: 1,
      };
    }),
  };
}

export function s6ControlledManifestConfirmation(
  manifest: S6PublicControlledManifest,
): string {
  return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

export function assertS6ControlledManifestConfirmation(
  manifest: S6PublicControlledManifest,
  confirmation: string | undefined,
): void {
  const expected = s6ControlledManifestConfirmation(manifest);
  if (confirmation !== expected) {
    throw new Error("S6 controlled manifest confirmation does not match");
  }
}

function samplingSmokeBatch(): S6ControlledBatch {
  return {
    id: "sampling-smoke",
    description: "五个平台各执行一次虚构品牌采样，验证生产适配器和证据归一化。",
    automaticTransportRetries: 0,
    stopConditions: [
      "任何请求失败均停止本批，脚本不自动重试",
      "路由或返回模型身份不一致",
      "鉴权、权限、模型或请求配置错误",
      "成功响应无法形成有效采样证据",
    ],
    cases: EVALUATION_PLATFORM_POLICY.map((platform, index) => {
      const route = requiredRoute(platform.routePolicyId);
      if (route.requestedModel !== platform.model) {
        throw new Error(`Sampling model drift for ${platform.routePolicyId}`);
      }
      const request: AiAttemptRequest = {
        runId: fixedUuid(1),
        cycleId: fixedUuid(2),
        sampleId: fixedUuid(100 + index),
        purpose: "EVALUATION_ACQUISITION",
        attemptNumber: 1,
        routePolicyId: route.routePolicyId,
        requestedModel: route.requestedModel,
        correlationId: fixedUuid(3),
        input: {
          taskKind: "EVALUATION_ACQUISITION",
          systemInstruction: EVALUATION_OBJECTIVITY_PROFILE.content,
          companyName: FICTIONAL_BRAND.companyName,
          query: FIXED_QUESTIONS[2]!.content,
          questionOrdinal: 3,
          platformLabel: platform.label,
          province: FICTIONAL_BRAND.province,
          city: FICTIONAL_BRAND.city,
        },
      };
      return {
        fixtureId: `R-SMOKE-${platform.key.toUpperCase()}`,
        fixtureProfile:
          "虚构咖啡品牌；广州天河；安静办公场景；每个平台一次非流式自动联网采样。",
        instructionProfile: `${EVALUATION_OBJECTIVITY_PROFILE.id}@${EVALUATION_OBJECTIVITY_PROFILE.version}`,
        request,
        validateOutput(output: Record<string, unknown>) {
          parseAcceptedEvidence(output);
        },
      };
    }),
  };
}

function semanticProbeBatch(): S6ControlledBatch {
  const cases = [
    parserCase("P01", "evaluation.interpretation.qwen-primary@1", 1),
    parserCase("P03", "evaluation.interpretation.qwen-primary@1", 1),
    parserCase("P05", "evaluation.interpretation.qwen-primary@1", 1),
    parserCase("P07", "evaluation.interpretation.qwen-primary@1", 1),
    parserCase("P03", "evaluation.interpretation.hy3-fallback@1", 3),
    parserCase("P07", "evaluation.interpretation.hy3-fallback@1", 3),
    synthesisCase("Y02", "evaluation.overall-synthesis.qwen-primary@1", 1),
    synthesisCase("Y03", "evaluation.overall-synthesis.qwen-primary@1", 1),
    synthesisCase("Y02", "evaluation.overall-synthesis.hy3-fallback@1", 3),
  ];
  return {
    id: "semantic-probe",
    description:
      "使用代表性虚构样本验证主解析、备用解析和整体归纳的严格结构与语义契约。",
    automaticTransportRetries: 0,
    stopConditions: [
      "任何请求失败均停止本批，脚本不自动重试",
      "路由或返回模型身份不一致",
      "任一结构化响应无效",
      "任一结果未通过既有业务语义契约",
      "鉴权、权限、模型或请求配置错误",
    ],
    cases,
  };
}

function parserCase(
  fixtureId: ParserFixtureId,
  routePolicyId: string,
  attemptNumber: number,
): S6ControlledCase {
  const fixture = parserFixture(fixtureId);
  const route = requiredRoute(routePolicyId);
  const request: AiAttemptRequest = {
    runId: fixedUuid(11),
    cycleId: fixedUuid(12),
    sampleId: fixedUuid(200 + fixture.index + attemptNumber),
    purpose: "EVALUATION_INTERPRETATION",
    attemptNumber,
    routePolicyId: route.routePolicyId,
    requestedModel: route.requestedModel,
    correlationId: fixedUuid(13),
    input: buildSampleParserTask({
      companyName: FICTIONAL_BRAND.companyName,
      primaryIndustry: FICTIONAL_BRAND.primaryIndustry,
      secondaryIndustry: FICTIONAL_BRAND.secondaryIndustry,
      region: `${FICTIONAL_BRAND.province}${FICTIONAL_BRAND.city}${FICTIONAL_BRAND.district}`,
      characteristicOne: FICTIONAL_BRAND.characteristicOne,
      characteristicTwo: FICTIONAL_BRAND.characteristicTwo,
      questionKind: fixture.questionKind,
      question: fixture.question,
      originalAnswer: fixture.originalAnswer,
    }),
  };
  return {
    fixtureId,
    fixtureProfile: fixture.profile,
    instructionProfile: sampleParserInstructionProfile(fixture.questionKind),
    request,
    validateOutput(output: Record<string, unknown>) {
      const parsed = parseAndProjectSampleParserModelOutput(output, {
        questionKind: fixture.questionKind,
        companyName: FICTIONAL_BRAND.companyName,
        originalAnswer: fixture.originalAnswer,
      });
      validateParserFixtureOutcome(fixtureId, parsed);
    },
  };
}

function validateParserFixtureOutcome(
  fixtureId: ParserFixtureId,
  output: SampleParserOutput,
): void {
  const fail = (message: string): never => {
    throw new Error(`Parser fixture ${fixtureId} failed: ${message}`);
  };
  if (fixtureId === "P07") {
    if (output.family !== "BRAND_DIRECTED" || !output.mentioned) {
      fail("direct brand mention was not retained");
    }
    const polarities = new Set(
      collectSampleSemanticObservations(output.semantic).map(
        (observation) => observation.polarity,
      ),
    );
    if (!polarities.has("POSITIVE") || !polarities.has("NEGATIVE")) {
      fail("positive and negative observations were not both retained");
    }
    return;
  }
  const openOutput =
    output.family === "OPEN_DISCOVERY"
      ? output
      : fail("open-discovery family was not retained");
  const otherBrandNames = new Set(
    openOutput.semantic.otherBrands.map((brand) => brand.displayName),
  );
  if (fixtureId === "P05") {
    if (
      openOutput.mentioned ||
      openOutput.position !== null ||
      openOutput.semantic.targetRole !== "NOT_MENTIONED"
    ) {
      fail("unfamiliar alias was incorrectly assigned to the target");
    }
    if (
      !otherBrandNames.has("星咖实验室") ||
      !otherBrandNames.has("云栖咖啡")
    ) {
      fail("explicit other brands were not retained");
    }
    return;
  }
  if (!openOutput.mentioned || openOutput.position !== 2) {
    fail("target was not retained at position two");
  }
  if (
    !openOutput.semantic.targetDisplayedForms.includes(
      FICTIONAL_BRAND.companyName,
    )
  ) {
    fail("exact target display name was not retained");
  }
  if (!otherBrandNames.has("云栖咖啡") || !otherBrandNames.has("林间咖啡")) {
    fail("explicit other brands were not retained");
  }
  if (
    fixtureId === "P03" &&
    openOutput.semantic.answerStructure !== "PARAGRAPHS"
  ) {
    fail("parallel paragraphs were not recognized");
  }
}

function synthesisCase(
  fixtureId: SynthesisFixtureId,
  routePolicyId: string,
  attemptNumber: number,
): S6ControlledCase {
  const context = synthesisFixture(fixtureId);
  const route = requiredRoute(routePolicyId);
  const request: AiAttemptRequest = {
    runId: fixedUuid(21),
    cycleId: fixedUuid(22),
    purpose: "OVERALL_SYNTHESIS",
    attemptNumber,
    routePolicyId: route.routePolicyId,
    requestedModel: route.requestedModel,
    correlationId: fixedUuid(23),
    input: buildOverallSynthesisTask(context),
  };
  return {
    fixtureId,
    fixtureProfile: context.fixtureProfile,
    instructionProfile: overallSynthesisInstructionProfile(),
    request,
    validateOutput(output: Record<string, unknown>, providerEvidence) {
      const parsed = parseAndProjectOverallSynthesisModelOutput(
        output,
        context.samples,
        providerEvidence,
      );
      validateSynthesisFixtureOutcome(fixtureId, parsed);
    },
  };
}

function validateSynthesisFixtureOutcome(
  fixtureId: SynthesisFixtureId,
  output: OverallSynthesisOutput,
): void {
  const fail = (message: string): never => {
    throw new Error(`Synthesis fixture ${fixtureId} failed: ${message}`);
  };
  if (fixtureId === "Y02") {
    const mergedCompetitor = output.brandEntityGroups.find((group) => {
      const memberIds = new Set(
        group.members.map((member) => member.brandMentionId),
      );
      return (
        memberIds.has("starbucks-reserve-cn") &&
        memberIds.has("starbucks-reserve-en")
      );
    });
    if (!mergedCompetitor)
      fail("Chinese and English competitor names diverged");
    const positiveEvidence = new Set(
      output.themes.positive.flatMap((theme) =>
        theme.evidenceRefs.map((reference) => reference.observationId),
      ),
    );
    const negativeEvidence = new Set(
      output.themes.negative.flatMap((theme) =>
        theme.evidenceRefs.map((reference) => reference.observationId),
      ),
    );
    if (!positiveEvidence.has("service-positive")) {
      fail("positive service evidence was not retained");
    }
    if (!negativeEvidence.has("price-negative")) {
      fail("negative price evidence was not retained");
    }
    return;
  }
  if (output.brandEntityGroups.length > 0) {
    fail("sparse fixture invented competitor groups");
  }
  if (output.themes.negative.length > 0) {
    fail("sparse fixture invented negative themes");
  }
  const positiveEvidence = output.themes.positive.flatMap((theme) =>
    theme.evidenceRefs.map((reference) => reference.observationId),
  );
  if (!positiveEvidence.includes("quiet-space")) {
    fail("the only positive observation was not retained");
  }
}

type ParserFixtureId = "P01" | "P03" | "P05" | "P07";

function parserFixture(id: ParserFixtureId): {
  index: number;
  profile: string;
  questionKind: EvaluationQuestionKind;
  question: string;
  originalAnswer: string;
} {
  switch (id) {
    case "P01":
      return {
        index: 1,
        profile: "有序推荐列表；当前品牌位于第二位。",
        questionKind: "INDUSTRY_RECOMMENDATION",
        question: FIXED_QUESTIONS[1]!.content,
        originalAnswer:
          "1. 云栖咖啡：座位较多，适合短时办公。\n2. 星河咖啡实验店：环境安静，并提供手冲咖啡。\n3. 林间咖啡：户外座位较有特色。",
      };
    case "P03":
      return {
        index: 3,
        profile: "三个隐式排序段落；当前品牌位于第二段。",
        questionKind: "CHARACTERISTIC_ONE",
        question: FIXED_QUESTIONS[2]!.content,
        originalAnswer:
          "云栖咖啡的座位数量较多，工作日上午通常更安静。\n\n星河咖啡实验店设置了相对独立的办公区域，也提供手冲咖啡。\n\n林间咖啡以户外空间为主，更适合轻松聊天。",
      };
    case "P05":
      return {
        index: 5,
        profile: "仅出现陌生简称；不得归为当前品牌。",
        questionKind: "CHARACTERISTIC_TWO",
        question: FIXED_QUESTIONS[3]!.content,
        originalAnswer:
          "星咖实验室提供多种手冲豆单，另外可以关注云栖咖啡的季节限定豆。",
      };
    case "P07":
      return {
        index: 7,
        profile: "直接品牌问题；同时包含服务优势与价格局限。",
        questionKind: "BRAND_DIRECTED",
        question: FIXED_QUESTIONS[0]!.content,
        originalAnswer:
          "星河咖啡实验店的店员讲解细致，办公区域也比较安静；不过部分顾客认为手冲咖啡价格偏高，是否合适仍取决于个人预算。",
      };
  }
}

type SynthesisFixtureId = "Y02" | "Y03";

function synthesisFixture(
  id: SynthesisFixtureId,
): OverallSynthesisTaskContext & { fixtureProfile: string } {
  return id === "Y02"
    ? conflictingSynthesisFixture()
    : sparseSynthesisFixture();
}

type SynthesisSample = OverallSynthesisSampleContext & {
  platformLabel: string;
  questionId: string;
  mentioned: boolean;
  position: number | null;
};

function conflictingSynthesisFixture(): OverallSynthesisTaskContext & {
  fixtureProfile: string;
} {
  const samples: SynthesisSample[] = [
    synthesisSample({
      index: 1,
      questionKind: "CHARACTERISTIC_ONE",
      platformKey: "deepseek",
      platformLabel: "DeepSeek",
      mentioned: true,
      position: 2,
      observation: {
        id: "service-positive",
        label: "服务细致",
        detail: "回答认为店员讲解细致。",
        polarity: "POSITIVE",
      },
    }),
    synthesisSample({
      index: 2,
      questionKind: "CHARACTERISTIC_TWO",
      platformKey: "doubao",
      platformLabel: "豆包",
      mentioned: true,
      position: 3,
      observation: {
        id: "price-negative",
        label: "价格偏高",
        detail: "回答提到部分顾客认为价格偏高。",
        polarity: "NEGATIVE",
      },
    }),
    synthesisSample({
      index: 3,
      questionKind: "INDUSTRY_RECOMMENDATION",
      platformKey: "qwen",
      platformLabel: "千问",
      mentioned: false,
      position: null,
      otherBrand: {
        id: "starbucks-reserve-cn",
        displayName: "星巴克臻选",
      },
    }),
    synthesisSample({
      index: 4,
      questionKind: "INDUSTRY_RECOMMENDATION",
      platformKey: "ernie",
      platformLabel: "文心一言",
      mentioned: false,
      position: null,
      otherBrand: {
        id: "starbucks-reserve-en",
        displayName: "Starbucks Reserve",
      },
    }),
  ];
  return {
    ...synthesisContext(samples),
    fixtureProfile:
      "跨平台样本同时包含服务优势与价格局限，并包含明显相关的中英文品牌名称。",
  };
}

function sparseSynthesisFixture(): OverallSynthesisTaskContext & {
  fixtureProfile: string;
} {
  const platforms = [
    ["deepseek", "DeepSeek"],
    ["doubao", "豆包"],
    ["qwen", "千问"],
    ["ernie", "文心一言"],
    ["hunyuan", "混元"],
  ] as const;
  const samples: SynthesisSample[] = Array.from({ length: 17 }, (_, index) => {
    const [platformKey, platformLabel] = platforms[index % platforms.length]!;
    const questionKind = FIXED_QUESTIONS[index % FIXED_QUESTIONS.length]!.kind;
    return synthesisSample({
      index: 20 + index,
      questionKind,
      platformKey,
      platformLabel,
      mentioned: index === 0,
      position: index === 0 && questionKind !== "BRAND_DIRECTED" ? 3 : null,
      ...(index === 0
        ? {
            observation: {
              id: "quiet-space",
              label: "环境安静",
              detail: "一条回答提到办公区域比较安静。",
              polarity: "POSITIVE" as const,
            },
          }
        : {}),
    });
  });
  return {
    ...synthesisContext(samples),
    fixtureProfile:
      "十七条有效但信息稀疏的样本；仅一条包含当前品牌的正向观察。",
  };
}

function synthesisContext(
  samples: SynthesisSample[],
): OverallSynthesisTaskContext {
  const metrics = calculateEvaluationReportMetrics(
    samples.map((sample, index) => ({
      sampleId: sample.sampleId,
      questionKind: sample.questionKind,
      questionOrdinal:
        FIXED_QUESTIONS.find(
          (question) => question.kind === sample.questionKind,
        )?.ordinal ?? 1,
      platformKey: sample.platformKey,
      platformLabel: sample.platformLabel,
      platformOrdinal:
        EVALUATION_PLATFORM_POLICY.findIndex(
          (platform) => platform.key === sample.platformKey,
        ) + 1 || index + 1,
      interpretation: {
        mentioned: sample.mentioned,
        position: sample.position,
        semantic: sample.semantic,
      },
    })),
  );
  return {
    brand: FICTIONAL_BRAND,
    questions: FIXED_QUESTIONS.map((question, index) => ({
      questionId: fixedUuid(500 + index),
      ...question,
    })),
    samples: samples.map(
      ({ mentioned: _mentioned, position: _position, ...sample }) => sample,
    ),
    metrics,
  };
}

function synthesisSample(input: {
  index: number;
  questionKind: EvaluationQuestionKind;
  platformKey: string;
  platformLabel: string;
  mentioned: boolean;
  position: number | null;
  observation?: {
    id: string;
    label: string;
    detail: string;
    polarity: "POSITIVE" | "NEGATIVE";
  };
  otherBrand?: { id: string; displayName: string };
}): SynthesisSample {
  const anchorId = `evidence-${input.index}`;
  const targetObservations = input.observation
    ? [
        {
          observationId: input.observation.id,
          label: input.observation.label,
          detail: input.observation.detail,
          polarity: input.observation.polarity,
          evidenceAnchorIds: [anchorId],
        },
      ]
    : [];
  const otherBrands = input.otherBrand
    ? [
        {
          brandMentionId: input.otherBrand.id,
          displayName: input.otherBrand.displayName,
          observedForms: [input.otherBrand.displayName],
          role: "RECOMMENDED" as const,
          relativePosition: 1,
          positionKind: "RECOMMENDATION" as const,
          evidenceAnchorIds: [anchorId],
        },
      ]
    : [];
  const evidencePurposes: SampleParserSemantic["evidenceAnchors"][number]["purposes"] =
    input.otherBrand ? ["OTHER_BRAND"] : ["TARGET_MENTION", "CHARACTERISTIC"];
  const evidenceAnchors =
    input.observation || input.otherBrand
      ? [
          {
            anchorId,
            exactText:
              input.observation?.detail ?? input.otherBrand!.displayName,
            occurrence: 1,
            purposes: evidencePurposes,
          },
        ]
      : [];
  const semantic: SampleParserSemantic = {
    profile: "OPEN_DISCOVERY",
    answerStructure: "PARAGRAPHS",
    targetDisplayedForms: input.mentioned ? [FICTIONAL_BRAND.companyName] : [],
    targetObservations,
    otherBrands,
    evidenceAnchors,
    cardInterpretation: input.mentioned
      ? "回答提到了当前品牌。"
      : "回答没有提到当前品牌。",
    limitations: [],
    targetRole: input.mentioned ? "RECOMMENDED" : "NOT_MENTIONED",
    recommendationReasons: [],
    conditions: [],
    queryFit: [],
  };
  return {
    sampleId: fixedUuid(600 + input.index),
    questionKind: input.questionKind,
    platformKey: input.platformKey,
    platformLabel: input.platformLabel,
    questionId: fixedUuid(
      500 +
        FIXED_QUESTIONS.findIndex(
          (question) => question.kind === input.questionKind,
        ),
    ),
    semantic,
    mentioned: input.mentioned,
    position: input.position,
  };
}

function requiredRoute(routePolicyId: string): ProviderRouteDefinition {
  const route = REAL_AI_ROUTES.find(
    (candidate) => candidate.routePolicyId === routePolicyId,
  );
  if (!route) throw new Error(`Missing real route ${routePolicyId}`);
  return route;
}

function fixedUuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}
