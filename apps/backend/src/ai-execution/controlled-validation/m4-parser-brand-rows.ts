import { readFileSync } from "node:fs";
import { z } from "zod";
import type { StructuredOutputAttemptInput } from "../domain/ai-attempt.types.js";
import type { EvaluationQuestionKind } from "../../geo-intelligence/domain/evaluation.types.js";
import { m4CustomerSummarySchema } from "./m4-parser-customer-summary.js";
import { buildM4ReadingText } from "./m4-reading-text.js";

const oldTarget = m4CustomerSummarySchema.shape.target.unwrap();
const otherBrand = m4CustomerSummarySchema.shape.otherBrands.element;
const points = z
  .array(oldTarget.shape.points.element.omit({ evidence: true }))
  .max(8);
const mentionContext = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .describe(
    "简短整理回答如何提到这个品牌，可自然概括；保留有用的别称或关系语境，不是逐字引文。",
  );
const targetDescription = z.object({ points }).strict();
const attitude = z
  .enum(["POSITIVE", "NEUTRAL", "NEGATIVE"])
  .describe("原回答对该主体的整体态度：正向、中性或负向。");
const brandRow = z
  .object({
    displayName: otherBrand.shape.displayName,
    attitude,
    mentionContext,
    targetDescription: targetDescription
      .nullable()
      .describe(
        "本条是目标品牌时填写主要观点；其他品牌填null。这仍是唯一目标标记。",
      ),
  })
  .strict();
export const m4BrandRowsSchema = z
  .object({
    brands: z
      .array(brandRow)
      .max(11)
      .describe("按品牌主体首次出现顺序排列的记录。"),
  })
  .strict();

// Explicitly a content interpretation, not the legacy source-anchored contract.
const legacyBrandContentSummarySchema = z
  .object({
    target: z
      .object({
        position: oldTarget.shape.position,
        points,
        summary: mentionContext,
      })
      .strict()
      .nullable(),
    otherBrands: z
      .array(otherBrand.omit({ evidence: true }).extend({ mentionContext }))
      .max(10),
  })
  .strict();

export const m4BrandContentSummarySchema = legacyBrandContentSummarySchema
  .extend({
    target: legacyBrandContentSummarySchema.shape.target
      .unwrap()
      .extend({ attitude })
      .nullable(),
    otherBrands: z
      .array(
        otherBrand
          .omit({ evidence: true, positiveRecommendation: true })
          .extend({ mentionContext, attitude })
          .strict(),
      )
      .max(10),
  })
  .strict();

// Retained boolean records keep their original meaning; never infer a ternary
// label from false or accept records carrying both conflicting representations.
export const m4ContentHandoffSchema = z.union([
  m4BrandContentSummarySchema,
  legacyBrandContentSummarySchema,
]);

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

export function buildM4BrandRowsTask(
  parserTask: StructuredOutputAttemptInput,
  originalAnswer?: string,
): StructuredOutputAttemptInput {
  if (!openKinds.includes(String(parserTask.userContext.questionKind)))
    throw new Error("Open-question Parser task required");
  const {
    answerLines,
    originalAnswer: suppliedAnswer,
    ...context
  } = parserTask.userContext;
  if ("answerText" in context)
    throw new Error("Prepare from the original source, not a reading view");
  const answer = z
    .string()
    .min(1)
    .parse(originalAnswer ?? suppliedAnswer);
  if (!answer.trim()) throw new Error("A nonempty original answer is required");
  if (suppliedAnswer !== undefined && suppliedAnswer !== answer)
    throw new Error("Original answer mismatch");
  if (answerLines !== undefined) {
    const lines = sourceLines.parse(answerLines);
    const texts = answer
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .split("\n");
    // The legacy indexer does not create an extra line after a final newline.
    // This compares its view only; the original/reading strings stay intact.
    if (texts.at(-1) === "") texts.pop();
    if (
      lines.length !== texts.length ||
      lines.some(
        (line, index) => line.line !== index + 1 || line.text !== texts[index],
      )
    )
      throw new Error(
        "Full contiguous source lines must match original answer",
      );
  }
  return {
    ...parserTask,
    systemInstruction: prompt.content,
    userContext: { ...context, answerText: buildM4ReadingText(answer) },
    outputContract: {
      version: `${prompt.id}@${prompt.version}`,
      jsonSchema: z.toJSONSchema(m4BrandRowsSchema, {
        target: "draft-2020-12",
      }),
    },
  };
}

// Structural projection only: no quote/semantic validation, repair or invented
// evidence. Position remains the original model-array index before filtering.
export function inspectM4BrandRowsOutput(value: unknown) {
  const output = m4BrandRowsSchema.parse(value);
  if (output.brands.filter((b) => b.targetDescription !== null).length > 1)
    throw new Error("Multiple target brand rows");
  const names = new Set<string>();
  for (const brand of output.brands) {
    if (names.has(brand.displayName)) throw new Error("Duplicate brand row");
    names.add(brand.displayName);
  }
  const indexed = output.brands.map((brand, index) => ({
    ...brand,
    position: index + 1,
  }));
  const target = indexed.find((b) => b.targetDescription !== null);
  const parsed = m4BrandContentSummarySchema.parse({
    target: target
      ? {
          position: target.position,
          points: target.targetDescription!.points,
          summary: target.mentionContext,
          attitude: target.attitude,
        }
      : null,
    otherBrands: indexed
      .filter((b) => b.targetDescription === null)
      .map(({ targetDescription: _target, ...brand }) => brand),
  });
  return {
    output,
    projected: {
      interpretationFormat: "BRAND_CONTENT" as const,
      output: parsed,
      sampleSummary: parsed.target?.summary ?? "本条回答未提及目标品牌。",
      competitors: parsed.otherBrands.filter((b) => b.attitude !== "NEGATIVE"),
    },
  };
}
