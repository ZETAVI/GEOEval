import { readFileSync } from "node:fs";

import { z } from "zod";

import type { EvaluationReportMetrics } from "./domain/evaluation-report.policy.js";
import type { EvaluationBrandSnapshot } from "./domain/evaluation.types.js";
import { type OverallSynthesisSampleContext } from "./domain/overall-synthesis.contract.js";
import {
  OVERALL_SYNTHESIS_MODEL_CONTRACT_VERSION,
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
  return {
    taskKind: "STRUCTURED_OUTPUT" as const,
    systemInstruction: common.content,
    userContext: {
      capabilities: { publicSearch: false },
      brand: context.brand,
      questions: context.questions,
      samples: context.samples,
      metrics: context.metrics,
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
