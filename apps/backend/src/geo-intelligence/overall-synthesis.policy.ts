import { readFileSync } from "node:fs";

import { z } from "zod";

import { evaluationBrandTextContext } from "./domain/evaluation-brand-snapshot.js";
import {
  typicalPositionFromPositions,
  type EvaluationReportMetrics,
  type TypicalPosition,
} from "./domain/evaluation-report.policy.js";
import type { EvaluationBrandSnapshot } from "./domain/evaluation.types.js";
import { type OverallSynthesisSampleContext } from "./domain/overall-synthesis.contract.js";
import {
  OVERALL_SYNTHESIS_MODEL_CONTRACT_VERSION,
  buildOverallSynthesisModelReferenceProjection,
  orderOverallSynthesisSamples,
  overallSynthesisModelJsonSchema,
} from "./domain/overall-synthesis-model.contract.js";

const assetSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    content: z.string().trim().min(1),
  })
  .strict();

const common = loadAsset("common.json");

export type OverallSynthesisTaskContext = {
  brand: EvaluationBrandSnapshot;
  questions: Array<{
    questionId: string;
    kind: OverallSynthesisSampleContext["questionKind"];
    ordinal: number;
    content: string;
  }>;
  samples: Array<
    OverallSynthesisSampleContext & {
      platformLabel: string;
      questionId: string;
    }
  >;
  metrics: EvaluationReportMetrics;
};

export function buildOverallSynthesisTask(
  context: OverallSynthesisTaskContext,
) {
  const orderedSamples = orderOverallSynthesisSamples(context.samples);
  const references =
    buildOverallSynthesisModelReferenceProjection(orderedSamples);
  const questionById = new Map(
    context.questions.map((question) => [question.questionId, question]),
  );
  return {
    taskKind: "STRUCTURED_OUTPUT" as const,
    systemInstruction: common.content,
    userContext: {
      brand: evaluationBrandTextContext(context.brand),
      evidenceScope: compactEvidenceScope(orderedSamples),
      performance: compactPerformance(context.metrics),
      evidenceSamples: references.evidenceSamples.map((sample, index) => {
        const source = orderedSamples[index]!;
        const question = questionById.get(source.questionId);
        if (!question) {
          throw new Error(
            `Synthesis sample ${source.sampleId} has no question`,
          );
        }
        return {
          ...sample,
          platform: source.platformLabel,
          question: question.content,
          questionPurpose:
            source.questionKind === "BRAND_DIRECTED"
              ? "了解品牌自身呈现"
              : "观察开放推荐中的品牌表现",
        };
      }),
      brandCandidates: references.brandCandidates,
    },
    outputContract: {
      version: OVERALL_SYNTHESIS_MODEL_CONTRACT_VERSION,
      jsonSchema: overallSynthesisModelJsonSchema as Record<string, unknown>,
    },
  };
}

export function overallSynthesisInstructionProfile(): string {
  return `${common.id}@${common.version}`;
}

function loadAsset(fileName: string) {
  const raw = readFileSync(
    new URL(
      `../../geo-intelligence/overall-synthesis/${fileName}`,
      import.meta.url,
    ),
    "utf8",
  );
  return assetSchema.parse(JSON.parse(raw));
}

function compactPerformance(metrics: EvaluationReportMetrics) {
  const mentionedSampleCount = metrics.recommendationIndex.mentionCount;
  const validOpenSampleCount = metrics.recommendationIndex.validOpenSampleCount;
  return {
    recommendationIndex: {
      score: metrics.recommendationIndex.displayScore,
      scale: "0 至 5 分",
      statement: `推荐指数为 ${metrics.recommendationIndex.displayScore}，满分为 5 分。`,
    },
    openQuestionEvidence: {
      mentionedSampleCount,
      validSampleCount: validOpenSampleCount,
      statement: `${validOpenSampleCount} 条开放问题有效样本中，当前品牌被提及 ${mentionedSampleCount} 条。`,
    },
    typicalPosition: formatTypicalPosition(metrics.typicalPosition),
    coverage: {
      validSampleCount: metrics.coverage.validSampleCount,
      totalSampleCount: metrics.coverage.totalSampleCount,
      statement: `共 ${metrics.coverage.totalSampleCount} 条样本，其中 ${metrics.coverage.validSampleCount} 条有效。`,
    },
    platforms: metrics.platforms.map((platform) => ({
      platform: platform.platformLabel,
      mentionedOpenSampleCount: platform.mentionCount,
      validOpenSampleCount: platform.validOpenSampleCount,
      statement: `${platform.platformLabel} 的 ${platform.validOpenSampleCount} 条开放问题有效样本中，当前品牌被提及 ${platform.mentionCount} 条。`,
      typicalPosition: formatTypicalPosition(
        typicalPositionFromPositions(platform.mentionedPositions),
      ),
    })),
  };
}

function compactEvidenceScope(samples: OverallSynthesisTaskContext["samples"]) {
  const validSampleCount = samples.length;
  const distinctQuestionCount = new Set(
    samples.map((sample) => sample.questionId),
  ).size;
  const platformCount = new Set(samples.map((sample) => sample.platformKey))
    .size;
  return {
    validSampleCount,
    distinctQuestionCount,
    platformCount,
    statement: `本次综合输入包含 ${validSampleCount} 条有效样本，覆盖 ${distinctQuestionCount} 个问题和 ${platformCount} 个平台。`,
  };
}

function formatTypicalPosition(position: TypicalPosition): string {
  if (position.kind === "NONE") return "未观察到";
  if (position.kind === "SINGLE") return `约第 ${position.position} 位`;
  return `约第 ${position.first} 至 ${position.second} 位`;
}
