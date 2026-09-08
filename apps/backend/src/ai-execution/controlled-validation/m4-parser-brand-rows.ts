import { readFileSync } from "node:fs";
import { z } from "zod";
import type { StructuredOutputAttemptInput } from "../domain/ai-attempt.types.js";
import type { EvaluationQuestionKind } from "../../geo-intelligence/domain/evaluation.types.js";
import {
  inspectM4CustomerSummaryOutput,
  m4CustomerSummarySchema,
} from "./m4-parser-customer-summary.js";

const otherBrand = m4CustomerSummarySchema.shape.otherBrands.element;
const targetDescription = m4CustomerSummarySchema.shape.target
  .unwrap()
  .omit({ position: true, evidence: true });
const brandRow = z
  .object({
    displayName: otherBrand.shape.displayName,
    positiveRecommendation: otherBrand.shape.positiveRecommendation,
    evidence: otherBrand.shape.evidence,
    targetDescription: targetDescription
      .nullable()
      .describe(
        "本条是目标品牌时填写观点和摘要；其他品牌填null。这是唯一目标标记。",
      ),
  })
  .strict();
export const m4BrandRowsSchema = z
  .object({
    brands: z
      .array(brandRow)
      .max(11)
      .describe(
        "完整回答中的所有具名品牌共用一个列表，按首次出现顺序，每个主体一次。",
      ),
  })
  .strict();

const prompt = z
  .object({ id: z.string(), version: z.string(), content: z.string().min(1) })
  .strict()
  .parse(
    JSON.parse(
      readFileSync(
        new URL(
          "../../../geo-intelligence/experiments/m4-parser-brand-rows.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
const sourceLines = z
  .array(
    z.object({ line: z.number().int().positive(), text: z.string() }).strict(),
  )
  .min(1);
const openKinds: readonly string[] = [
  "INDUSTRY_RECOMMENDATION",
  "CHARACTERISTIC_ONE",
  "CHARACTERISTIC_TWO",
] satisfies EvaluationQuestionKind[];

// Input is an already prepared full-answer open Parser task. Preserve its
// complete context; only the experimental instruction/output contract changes.
export function buildM4BrandRowsTask(
  parserTask: StructuredOutputAttemptInput,
): StructuredOutputAttemptInput {
  if (!openKinds.includes(String(parserTask.userContext.questionKind))) {
    throw new Error("Open-question Parser task required");
  }
  const lines = sourceLines.parse(parserTask.userContext.answerLines);
  if (lines.some((line, index) => line.line !== index + 1)) {
    throw new Error("Full contiguous source lines required");
  }
  return {
    ...parserTask,
    systemInstruction: prompt.content,
    outputContract: {
      version: `${prompt.id}@${prompt.version}`,
      jsonSchema: z.toJSONSchema(m4BrandRowsSchema, {
        target: "draft-2020-12",
      }),
    },
  };
}

// The ordered wire contract owns sequence; position is now an array index,
// not a model field to repair. Never sort, deduplicate or infer missing brands.
export function inspectM4BrandRowsOutput(
  value: unknown,
  originalAnswer: string,
) {
  const output = m4BrandRowsSchema.parse(value);
  const targets = output.brands.filter(
    (brand) => brand.targetDescription !== null,
  );
  if (targets.length > 1) throw new Error("Multiple target brand rows");
  const names = new Set<string>();
  for (const brand of output.brands) {
    if (names.has(brand.displayName)) throw new Error("Duplicate brand row");
    names.add(brand.displayName);
  }
  // Assign before splitting or recommendation filtering: neither changes order.
  const indexed = output.brands.map((brand, index) => ({
    ...brand,
    position: index + 1,
  }));
  const target = indexed.find((brand) => brand.targetDescription !== null);
  const projected = inspectM4CustomerSummaryOutput(
    {
      target: target
        ? {
            position: target.position,
            evidence: target.evidence,
            ...target.targetDescription!,
          }
        : null,
      otherBrands: indexed
        .filter((brand) => brand.targetDescription === null)
        .map(({ targetDescription: _description, ...brand }) => brand),
    },
    originalAnswer,
  );
  return { output, projected };
}
