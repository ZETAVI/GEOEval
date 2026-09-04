import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { z } from "zod";

import {
  EVALUATION_QUESTION_GENERATION_MODEL_CONTRACT_VERSION,
  evaluationQuestionGenerationModelJsonSchema,
} from "./domain/evaluation-question-generation-model.contract.js";
import type { EvaluationBrandSnapshot } from "./domain/evaluation.types.js";
import {
  evaluationBrandQueryContext,
  type EvaluationBrandQueryContext,
} from "./domain/evaluation-brand-snapshot.js";

const assetSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    content: z.string().trim().min(1),
  })
  .strict();

export type EvaluationQuestionGenerationTaskContext =
  EvaluationBrandQueryContext;

export function evaluationQuestionGenerationTaskContext(
  snapshot: EvaluationBrandSnapshot,
): EvaluationQuestionGenerationTaskContext {
  return evaluationBrandQueryContext(snapshot);
}

const common = loadAsset("common.json");
const referenceExamples = loadAsset("reference-examples.json");
const systemInstruction = `${common.content}\n\n${referenceExamples.content}`;
const contentHash = createHash("sha256")
  .update(systemInstruction)
  .digest("hex");

export function buildEvaluationQuestionGenerationTask(
  context: EvaluationQuestionGenerationTaskContext,
) {
  return buildFrozenEvaluationQuestionGenerationTask(context, {
    instruction: evaluationQuestionGenerationInstructionSnapshot(),
    outputContract: evaluationQuestionGenerationOutputContractSnapshot(),
  });
}

export function buildFrozenEvaluationQuestionGenerationTask(
  context: EvaluationQuestionGenerationTaskContext,
  frozen: {
    instruction: { content: string };
    outputContract: {
      version: string;
      jsonSchema: Record<string, unknown>;
    };
  },
) {
  return {
    taskKind: "STRUCTURED_OUTPUT" as const,
    systemInstruction: frozen.instruction.content,
    userContext: {
      capabilities: { publicSearch: false },
      ...context,
    },
    outputContract: frozen.outputContract,
  };
}

export function evaluationQuestionGenerationInstructionSnapshot() {
  return {
    id: "evaluation.question-generation.profile",
    version: `${common.version}+${referenceExamples.version}`,
    contentHash,
    content: systemInstruction,
  };
}

export function evaluationQuestionGenerationOutputContractSnapshot() {
  return {
    version: EVALUATION_QUESTION_GENERATION_MODEL_CONTRACT_VERSION,
    jsonSchema: evaluationQuestionGenerationModelJsonSchema as Record<
      string,
      unknown
    >,
  };
}

function loadAsset(fileName: string) {
  const raw = readFileSync(
    new URL(
      `../../geo-intelligence/question-generation/${fileName}`,
      import.meta.url,
    ),
    "utf8",
  );
  return assetSchema.parse(JSON.parse(raw));
}
