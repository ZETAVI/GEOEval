import { readFileSync } from "node:fs";
import { z } from "zod";

import type { EvaluationBrandSnapshot } from "./domain/evaluation.types.js";
import type { EvaluationReportMetrics } from "./domain/evaluation-report.policy.js";
import type { BrandNameResolutionOutput } from "./domain/brand-name-resolution.contract.js";
import { applyBrandNameResolution } from "./domain/brand-name-resolution.contract.js";
import {
  REPORT_COMPOSITION_MODEL_CONTRACT_VERSION,
  reportCompositionJsonSchema,
  reportCompositionSampleRef,
  type ReportCompositionSample,
} from "./domain/report-composition.contract.js";

const asset = z
  .object({ id: z.string(), version: z.string(), content: z.string().min(1) })
  .strict()
  .parse(
    JSON.parse(
      readFileSync(
        new URL(
          "../../geo-intelligence/report-composition/common.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );

export function buildReportCompositionTask(input: {
  brand: EvaluationBrandSnapshot;
  samples: ReportCompositionSample[];
  metrics: EvaluationReportMetrics;
  resolution: BrandNameResolutionOutput;
}) {
  const resolved = applyBrandNameResolution(
    input.resolution,
    input.samples,
    input.metrics,
  );
  return {
    taskKind: "STRUCTURED_OUTPUT" as const,
    systemInstruction: `${asset.content}\n\n${compactOutputGuide()}`,
    userContext: {
      focusBrand: input.brand.companyName,
      performance: performanceProjection(input.metrics),
      competitors: resolved.competitors,
      samples: input.samples.map((sample, index) => ({
        sampleRef: reportCompositionSampleRef(index),
        question: sample.question,
        questionKind: sample.questionKind,
        platformLabel: sample.platformLabel,
        target:
          sample.semantic.targetDisplayedForms.length > 0
            ? {
                displayName: sample.semantic.targetDisplayedForms[0],
                attitude:
                  sample.semantic.profile === "OPEN_DISCOVERY" &&
                  sample.semantic.targetRole === "EXCLUDED"
                    ? "NEGATIVE"
                    : sample.semantic.targetObservations.some(
                          (point) => point.polarity === "POSITIVE",
                        )
                      ? "POSITIVE"
                      : "NEUTRAL",
                position: sample.position,
                mentionContext: sample.semantic.targetObservations.map(
                  (point) => ({
                    text: point.detail,
                    polarity: point.polarity,
                  }),
                ),
              }
            : null,
      })),
    },
    outputContract: {
      version: REPORT_COMPOSITION_MODEL_CONTRACT_VERSION,
      jsonSchema: reportCompositionJsonSchema as Record<string, unknown>,
      enforcement: "JSON_OBJECT" as const,
    },
  };
}

export function reportCompositionInstructionProfile(): string {
  return `${asset.id}@${asset.version}`;
}

function performanceProjection(metrics: EvaluationReportMetrics) {
  return {
    validOpenSampleCount: metrics.recommendationIndex.validOpenSampleCount,
    mentionedOpenSampleCount: metrics.recommendationIndex.mentionCount,
    mentionRate: metrics.recommendationIndex.mentionRate,
    typicalPosition: metrics.typicalPosition,
    platforms: metrics.platforms.map((platform) => ({
      platformLabel: platform.platformLabel,
      validOpenSampleCount: platform.validOpenSampleCount,
      mentionedOpenSampleCount: platform.mentionCount,
      mentionRate: platform.mentionRate,
      typicalPosition: platform.mentionedPositions,
    })),
  };
}

function compactOutputGuide() {
  return "输出字段为recommendationAssessment、brandPerception、positiveThemes、negativeThemes和directions。每个theme包含label、summary和sampleRefs；每个direction包含currentProblem、recommendedDirection、intendedImprovement和sampleRefs。sampleRefs只从输入samples复制有相应重点品牌内容的sampleRef；积极主题对应POSITIVE内容，负面主题对应NEGATIVE内容，同一引用不重复。保留全部字段，没有适用内容的数组填写空数组。仅输出填写实际内容后的JSON对象。";
}
