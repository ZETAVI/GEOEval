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
  return {
    recommendationIndex: metrics.recommendationIndex.displayScore,
    openQuestionMentions: `${metrics.recommendationIndex.mentionCount}/${metrics.recommendationIndex.validOpenSampleCount}`,
    typicalPosition: formatTypicalPosition(metrics.typicalPosition),
    validCoverage: `${metrics.coverage.validSampleCount}/${metrics.coverage.totalSampleCount}`,
    platforms: metrics.platforms.map((platform) => ({
      platform: platform.platformLabel,
      openQuestionMentions: `${platform.mentionCount}/${platform.validOpenSampleCount}`,
      typicalPosition: formatTypicalPosition(
        typicalPositionFromPositions(platform.mentionedPositions),
      ),
    })),
  };
}

function formatTypicalPosition(position: TypicalPosition): string {
  if (position.kind === "NONE") return "未观察到";
  if (position.kind === "SINGLE") return `约第 ${position.position} 位`;
  return `约第 ${position.first} 至 ${position.second} 位`;
}
