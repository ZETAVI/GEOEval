import { readFileSync } from "node:fs";
import { z } from "zod";
import type { StructuredOutputAttemptInput } from "../domain/ai-attempt.types.js";
import { buildM4FullSourceTask } from "./m4-parser-task-split.js";
import { restoreM4SourceReferences } from "./m4-parser-line-references.js";

const text = (max: number) => z.string().trim().min(1).max(max);
const evidence = z
  .array(
    z
      .object({
        startLine: z.number().int().positive(),
        endLine: z.number().int().positive(),
      })
      .strict(),
  )
  .min(1)
  .max(2)
  .describe("相关的连续原文行范围，程序还原片段。");
const sourcePosition = z.number().int().min(1).max(100);
export const m4CustomerSummarySchema = z
  .object({
    target: z
      .object({
        position: sourcePosition,
        evidence,
        points: z
          .array(
            z
              .object({
                text: text(500),
                polarity: z.enum([
                  "POSITIVE",
                  "NEGATIVE",
                  "NEUTRAL",
                  "MIXED",
                  "UNCERTAIN",
                ]),
                evidence,
              })
              .strict(),
          )
          .max(8),
        summary: text(500),
      })
      .strict()
      .nullable(),
    otherBrands: z
      .array(
        z
          .object({
            displayName: text(120),
            position: sourcePosition.nullable(),
            positiveRecommendation: z.boolean(),
            evidence,
          })
          .strict(),
      )
      .max(10),
  })
  .strict();

const prompt = z
  .object({
    id: z.string(),
    version: z.string(),
    content: z.string().min(1),
  })
  .strict()
  .parse(
    JSON.parse(
      readFileSync(
        new URL(
          "../../../geo-intelligence/experiments/m4-parser-customer-summary.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );

export function buildM4CustomerSummaryTask(
  base: StructuredOutputAttemptInput,
  brandContext?: string,
): StructuredOutputAttemptInput {
  const task = buildM4FullSourceTask(base);
  return {
    ...task,
    systemInstruction: prompt.content,
    userContext: {
      ...task.userContext,
      ...(brandContext === undefined
        ? {}
        : { brandContext: text(2000).parse(brandContext) }),
    },
    outputContract: {
      version: `${prompt.id}@${prompt.version}`,
      jsonSchema: z.toJSONSchema(m4CustomerSummarySchema, {
        target: "draft-2020-12",
      }),
    },
  };
}

const nullableTargetPrompt = z
  .object({ id: z.string(), version: z.string(), content: z.string().min(1) })
  .strict()
  .parse(
    JSON.parse(
      readFileSync(
        new URL(
          "../../../geo-intelligence/experiments/m4-parser-nullable-target.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );

// An explicit experimental entry point; the existing 1.4 builder stays unchanged.
// Reuse its full-source context and target/otherBrands schema, not brand-row state.
export function buildM4NullableTargetTask(
  base: StructuredOutputAttemptInput,
  brandContext?: string,
): StructuredOutputAttemptInput {
  const task = buildM4CustomerSummaryTask(base, brandContext);
  return {
    ...task,
    systemInstruction: nullableTargetPrompt.content,
    outputContract: {
      ...task.outputContract,
      version: `${nullableTargetPrompt.id}@${nullableTargetPrompt.version}`,
    },
  };
}

// A diagnostic view, not a canonical report adapter or a production score input.
// The caller already owns companyName; a non-null target refers to that identity.
// Do not regenerate its label here or infer target presence from that known input.
export function inspectM4CustomerSummaryOutput(
  value: unknown,
  originalAnswer: string,
) {
  const output = m4CustomerSummarySchema.parse(value);
  const sourceBackedOutput = restoreM4SourceReferences(output, originalAnswer);
  return {
    output,
    sourceBackedOutput,
    // Absence is already decided by the model; do not ask it to state it twice.
    sampleSummary: output.target?.summary ?? "本条回答未提及目标品牌。",
    positiveCompetitors: output.otherBrands.filter(
      (b) => b.positiveRecommendation,
    ),
  };
}
