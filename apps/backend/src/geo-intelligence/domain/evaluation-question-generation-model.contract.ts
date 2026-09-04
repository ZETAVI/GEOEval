import { z } from "zod";

import type {
  EvaluationQuestionKind,
  GeneratedEvaluationQuestion,
} from "./evaluation.types.js";

export const EVALUATION_QUESTION_GENERATION_MODEL_CONTRACT_VERSION =
  "evaluation.question-generation-model@4";
export const EVALUATION_QUESTION_SET_CONTRACT_VERSION =
  "evaluation.question-set@1";

const QUESTION_KINDS = [
  "BRAND_DIRECTED",
  "INDUSTRY_RECOMMENDATION",
  "CHARACTERISTIC_ONE",
  "CHARACTERISTIC_TWO",
] as const satisfies readonly EvaluationQuestionKind[];

const questionText = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .describe("自然、语义完整且有明确询问意图的中文问题，不包含答案或内部说明。");

export const evaluationQuestionGenerationModelOutputSchema = z
  .object({
    queryTargetName: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .describe(
        "直接问题使用的自然品牌称呼。优先选择普通用户更可能使用、仍有辨识度且在 companyName 中连续出现的简称；没有合适简称时才使用完整 companyName。",
      ),
    brandDirected: questionText.describe(
      "明确写出 queryTargetName、用于了解该品牌业务与整体表现的问题。",
    ),
    industryRecommendation: questionText.describe(
      "不写目标品牌，在明确位置寻找能提供主打产品或服务的商家或服务方。",
    ),
    characteristicAngleOne: questionText.describe(
      "不写目标品牌，以明确位置和主打产品或服务为主线，结合特点形成第一个自然需求场景。",
    ),
    characteristicAngleTwo: questionText.describe(
      "不写目标品牌，以明确位置和主打产品或服务为主线，结合特点形成与第一题互补的自然需求场景。",
    ),
  })
  .strict();

export type EvaluationQuestionGenerationModelOutput = z.infer<
  typeof evaluationQuestionGenerationModelOutputSchema
>;

export const evaluationQuestionGenerationModelJsonSchema = z.toJSONSchema(
  evaluationQuestionGenerationModelOutputSchema,
  { target: "draft-2020-12" },
);

export class EvaluationQuestionGenerationSemanticError extends Error {
  constructor(readonly issues: string[]) {
    super(`Evaluation question generation failed: ${issues.join("; ")}`);
    this.name = "EvaluationQuestionGenerationSemanticError";
  }
}

export function parseAndProjectEvaluationQuestionModelOutput(
  input: unknown,
  context: { companyName: string },
): GeneratedEvaluationQuestion[] {
  const output = evaluationQuestionGenerationModelOutputSchema.parse(input);
  const issues: string[] = [];
  const questions = [
    output.brandDirected,
    output.industryRecommendation,
    output.characteristicAngleOne,
    output.characteristicAngleTwo,
  ];

  const normalizedCompanyName = normalizeExactName(context.companyName);
  const normalizedQueryTargetName = normalizeExactName(output.queryTargetName);
  if (!normalizedCompanyName) {
    issues.push("companyName is empty after normalization");
  } else if (!normalizedCompanyName.includes(normalizedQueryTargetName)) {
    issues.push("queryTargetName is not contained in companyName");
  } else {
    for (const [index, question] of questions.entries()) {
      const normalizedContent = normalizeExactName(question);
      const containsQueryTargetName = normalizedContent.includes(
        normalizedQueryTargetName,
      );
      const containsFullCompanyName = normalizedContent.includes(
        normalizedCompanyName,
      );
      const kind = QUESTION_KINDS[index]!;
      if (kind === "BRAND_DIRECTED" && !containsQueryTargetName) {
        issues.push("BRAND_DIRECTED does not contain queryTargetName");
      }
      if (
        kind !== "BRAND_DIRECTED" &&
        (containsQueryTargetName || containsFullCompanyName)
      ) {
        issues.push(`${kind} contains the target brand name`);
      }
    }
  }

  if (issues.length > 0) {
    throw new EvaluationQuestionGenerationSemanticError(issues);
  }

  return questions.map((content, index) => ({
    kind: QUESTION_KINDS[index]!,
    ordinal: index + 1,
    content,
  }));
}

function normalizeExactName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/gu, "")
    .toLocaleLowerCase("zh-CN");
}
