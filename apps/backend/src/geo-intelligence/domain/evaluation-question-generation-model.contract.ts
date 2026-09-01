import { z } from "zod";

import type {
  EvaluationQuestionKind,
  GeneratedEvaluationQuestion,
} from "./evaluation.types.js";

export const EVALUATION_QUESTION_GENERATION_MODEL_CONTRACT_VERSION =
  "evaluation.question-generation-model@1";
export const EVALUATION_QUESTION_SET_CONTRACT_VERSION =
  "evaluation.question-set@1";

const QUESTION_KINDS = [
  "BRAND_DIRECTED",
  "INDUSTRY_RECOMMENDATION",
  "CHARACTERISTIC_ONE",
  "CHARACTERISTIC_TWO",
] as const satisfies readonly EvaluationQuestionKind[];

const questionKindSchema = z.enum(QUESTION_KINDS);
const questionText = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .describe("自然、完整的中文问题，不包含答案或内部说明。");

const candidateGroupSchema = z
  .object({
    kind: questionKindSchema,
    candidates: z
      .array(questionText)
      .min(2)
      .max(3)
      .describe("该问题角色的不同自然提问角度。"),
  })
  .strict();

const selectedQuestionSchema = z
  .object({
    kind: questionKindSchema,
    content: questionText.describe("从对应 candidates 中逐字选择的问题。"),
  })
  .strict();

export const evaluationQuestionGenerationModelOutputSchema = z
  .object({
    queryTargetName: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .describe(
        "针对性问题使用的自然品牌称呼，必须是 companyName 本身或其中连续出现的有效简称。",
      ),
    candidateGroups: z
      .array(candidateGroupSchema)
      .length(4)
      .describe("按固定角色顺序排列的四组候选问题。"),
    selectedQuestions: z
      .array(selectedQuestionSchema)
      .length(4)
      .describe("按固定角色顺序排列的最终四问。"),
    selectionNote: z
      .string()
      .trim()
      .min(1)
      .max(300)
      .describe("仅供内部理解候选取舍的简短说明。"),
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
  assertOrderedKinds(
    output.candidateGroups.map((group) => group.kind),
    "candidateGroups",
    issues,
  );
  assertOrderedKinds(
    output.selectedQuestions.map((question) => question.kind),
    "selectedQuestions",
    issues,
  );

  for (const [index, selected] of output.selectedQuestions.entries()) {
    const group = output.candidateGroups[index];
    if (
      group?.kind === selected.kind &&
      !group.candidates.includes(selected.content)
    ) {
      issues.push(`${selected.kind} selected content is not a candidate`);
    }
  }

  const normalizedCompanyName = normalizeExactName(context.companyName);
  const normalizedQueryTargetName = normalizeExactName(output.queryTargetName);
  if (!normalizedCompanyName) {
    issues.push("companyName is empty after normalization");
  } else if (!normalizedCompanyName.includes(normalizedQueryTargetName)) {
    issues.push("queryTargetName is not contained in companyName");
  } else {
    for (const selected of output.selectedQuestions) {
      const normalizedContent = normalizeExactName(selected.content);
      const containsQueryTargetName = normalizedContent.includes(
        normalizedQueryTargetName,
      );
      const containsFullCompanyName = normalizedContent.includes(
        normalizedCompanyName,
      );
      if (selected.kind === "BRAND_DIRECTED" && !containsQueryTargetName) {
        issues.push("BRAND_DIRECTED does not contain queryTargetName");
      }
      if (
        selected.kind !== "BRAND_DIRECTED" &&
        (containsQueryTargetName || containsFullCompanyName)
      ) {
        issues.push(`${selected.kind} contains the target brand name`);
      }
    }
  }

  if (issues.length > 0) {
    throw new EvaluationQuestionGenerationSemanticError(issues);
  }

  return output.selectedQuestions.map((question, index) => ({
    kind: question.kind,
    ordinal: index + 1,
    content: question.content,
  }));
}

function assertOrderedKinds(
  actual: EvaluationQuestionKind[],
  field: string,
  issues: string[],
): void {
  if (
    actual.length !== QUESTION_KINDS.length ||
    actual.some((kind, index) => kind !== QUESTION_KINDS[index])
  ) {
    issues.push(`${field} does not contain the required ordered roles`);
  }
}

function normalizeExactName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\s+/gu, "")
    .toLocaleLowerCase("zh-CN");
}
