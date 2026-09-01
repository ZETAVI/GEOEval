import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { z } from "zod";

import {
  EVALUATION_QUESTION_GENERATION_MODEL_CONTRACT_VERSION,
  evaluationQuestionGenerationModelJsonSchema,
} from "./domain/evaluation-question-generation-model.contract.js";
import type { EvaluationBrandSnapshot } from "./domain/evaluation.types.js";
import { evaluationBrandTextContext } from "./domain/evaluation-brand-snapshot.js";

const assetSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    content: z.string().trim().min(1),
  })
  .strict();

export type EvaluationQuestionGenerationTaskContext = {
  companyName: string;
  regionLabel: string;
  primaryIndustryLabel: string;
  secondaryIndustryLabel: string;
  recommendationSubject: string;
  characteristicOne: string;
  characteristicTwo: string;
};

export function evaluationQuestionGenerationTaskContext(
  snapshot: EvaluationBrandSnapshot,
): EvaluationQuestionGenerationTaskContext {
  const context = evaluationBrandTextContext(snapshot);
  return {
    companyName: context.companyName,
    regionLabel: context.regionLabel,
    primaryIndustryLabel: context.primaryIndustry,
    secondaryIndustryLabel: context.secondaryIndustry,
    recommendationSubject: context.recommendationSubject,
    characteristicOne: context.characteristicOne,
    characteristicTwo: context.characteristicTwo,
  };
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
  return {
    taskKind: "STRUCTURED_OUTPUT" as const,
    systemInstruction,
    userContext: {
      capabilities: { publicSearch: false },
      ...context,
    },
    outputContract: {
      version: EVALUATION_QUESTION_GENERATION_MODEL_CONTRACT_VERSION,
      jsonSchema: evaluationQuestionGenerationModelJsonSchema as Record<
        string,
        unknown
      >,
    },
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
