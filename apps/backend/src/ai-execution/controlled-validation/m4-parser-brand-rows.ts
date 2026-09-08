import { readFileSync } from "node:fs";
import { z } from "zod";
import type { StructuredOutputAttemptInput } from "../domain/ai-attempt.types.js";
import type { EvaluationQuestionKind } from "../../geo-intelligence/domain/evaluation.types.js";
import {
  inspectM4CustomerSummaryOutput,
  m4CustomerSummarySchema,
} from "./m4-parser-customer-summary.js";
import { locateM4SourceQuotes } from "./m4-parser-line-references.js";

const otherBrand = m4CustomerSummarySchema.shape.otherBrands.element;
const evidence = z
  .array(
    z
      .object({
        exactText: z
          .string()
          .min(1)
          .describe("用于定位的连续原文引用，保留原文格式。"),
        occurrence: z
          .number()
          .int()
          .positive()
          .describe("该引用在原文中第几次出现，通常为1。"),
      })
      .strict(),
  )
  .min(1)
  .max(2);
const targetDescription = m4CustomerSummarySchema.shape.target
  .unwrap()
  .omit({ position: true, evidence: true })
  .extend({
    points: z
      .array(
        m4CustomerSummarySchema.shape.target
          .unwrap()
          .shape.points.element.extend({ evidence }),
      )
      .max(8),
  });
const brandRow = z
  .object({
    displayName: otherBrand.shape.displayName,
    positiveRecommendation: otherBrand.shape.positiveRecommendation,
    evidence,
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
      .describe("按品牌主体首次出现顺序排列的记录。"),
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

// Keep the original answer as one string. A caller with a previously indexed
// task must supply the authoritative original; joining lines loses CRLF data.
export function buildM4BrandRowsTask(
  parserTask: StructuredOutputAttemptInput,
  originalAnswer?: string,
): StructuredOutputAttemptInput {
  if (!openKinds.includes(String(parserTask.userContext.questionKind))) {
    throw new Error("Open-question Parser task required");
  }
  const {
    answerLines,
    originalAnswer: suppliedAnswer,
    ...context
  } = parserTask.userContext;
  const answer = z
    .string()
    .min(1)
    .parse(originalAnswer ?? suppliedAnswer);
  if (!answer.trim()) throw new Error("A nonempty original answer is required");
  if (suppliedAnswer !== undefined && suppliedAnswer !== answer) {
    throw new Error("Original answer mismatch");
  }
  if (answerLines !== undefined) {
    const lines = sourceLines.parse(answerLines);
    const texts = answer
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .split("\n");
    if (
      lines.length !== texts.length ||
      lines.some(
        (line, index) => line.line !== index + 1 || line.text !== texts[index],
      )
    ) {
      throw new Error(
        "Full contiguous source lines must match original answer",
      );
    }
  }
  return {
    ...parserTask,
    systemInstruction: prompt.content,
    userContext: { ...context, originalAnswer: answer },
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
    locateM4SourceQuotes(
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
    ),
    originalAnswer,
  );
  return { output, projected };
}
