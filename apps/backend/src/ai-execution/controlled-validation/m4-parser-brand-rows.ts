import { readFileSync } from "node:fs";
import { z } from "zod";
import type { StructuredOutputAttemptInput } from "../domain/ai-attempt.types.js";
import type { EvaluationQuestionKind } from "../../geo-intelligence/domain/evaluation.types.js";
import {
  inspectM4CustomerSummaryOutput,
  m4CustomerSummarySchema,
} from "./m4-parser-customer-summary.js";

const otherBrand = m4CustomerSummarySchema.shape.otherBrands.element;
const brandRow = z
  .object({
    displayName: otherBrand.shape.displayName,
    isTarget: z.boolean(),
    position: otherBrand.shape.position,
    positiveRecommendation: otherBrand.shape.positiveRecommendation,
    evidence: otherBrand.shape.evidence,
  })
  .strict();
const targetDescription = m4CustomerSummarySchema.shape.target
  .unwrap()
  .omit({ position: true, evidence: true });
export const m4BrandRowsSchema = z
  .object({
    brands: z.array(brandRow).max(11),
    targetDescription: targetDescription.nullable(),
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

// This is a shape projection, not identity resolution or position recovery.
// Keep raw rows, reject contradictory/repeated rows, and never sort or renumber.
export function inspectM4BrandRowsOutput(
  value: unknown,
  originalAnswer: string,
) {
  const output = m4BrandRowsSchema.parse(value);
  const targets = output.brands.filter((brand) => brand.isTarget);
  if (targets.length > 1) throw new Error("Multiple target brand rows");
  if ((targets.length === 1) !== (output.targetDescription !== null)) {
    throw new Error("Target row and description must agree");
  }
  const names = new Set<string>();
  for (const brand of output.brands) {
    if (names.has(brand.displayName)) throw new Error("Duplicate brand row");
    names.add(brand.displayName);
  }
  const target = targets[0];
  const projected = inspectM4CustomerSummaryOutput(
    {
      target: target
        ? {
            position: target.position,
            evidence: target.evidence,
            ...output.targetDescription!,
          }
        : null,
      otherBrands: output.brands
        .filter((brand) => !brand.isTarget)
        .map(({ isTarget: _target, ...brand }) => brand),
    },
    originalAnswer,
  );
  return { output, projected };
}
