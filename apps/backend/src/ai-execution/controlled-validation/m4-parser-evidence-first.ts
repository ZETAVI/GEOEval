import { readFileSync } from "node:fs";
import { z } from "zod";

import type { StructuredOutputAttemptInput } from "../domain/ai-attempt.types.js";
import {
  sampleParserModelOutputSchema,
  parseAndProjectSampleParserModelOutput,
} from "../../geo-intelligence/domain/sample-parser-model.contract.js";
import type { SampleParserAcceptanceContext } from "../../geo-intelligence/domain/sample-parser.contract.js";

// Proposed model-facing experiment only. Reuse current field semantics and the
// current final acceptance path; never import this from an application coordinator.
const openModel = sampleParserModelOutputSchema.options[1];
const fields = openModel.shape.semantic.shape;
const prompt = loadInstruction("m4-parser-evidence-first.json");
const subjectGroundedPrompt = loadInstruction(
  "m4-parser-subject-grounded.json",
);

function loadInstruction(fileName: string) {
  return z
    .object({ id: z.string(), version: z.string(), content: z.string().min(1) })
    .strict()
    .parse(
      JSON.parse(
        readFileSync(
          new URL(
            `../../../geo-intelligence/experiments/${fileName}`,
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    );
}

export const M4_EVIDENCE_FIRST_VERSION =
  "experiment.m4.parser-evidence-first@1";
export const m4EvidenceFirstSchema = z
  .object({
    answerStructure: fields.answerStructure,
    target: z
      .object({
        displayedForms: fields.targetDisplayedForms.min(1),
        mentionEvidence: fields.targetMentionEvidence.min(1),
        positionEvidence: fields.targetPositionEvidence
          .min(1)
          .describe("支持原回答中目标候选呈现顺序的连续原文片段。"),
        position: z.number().int().min(1).max(100),
        role: fields.targetRole.exclude(["NOT_MENTIONED"]),
        observations: fields.targetObservations,
      })
      .strict()
      .nullable()
      .describe(
        "原回答未提及当前品牌时为 null；否则返回名称、证据、位置和观察组成的完整判断。",
      ),
    otherBrands: fields.otherBrands.describe(
      "原回答中与本次问题相关的实际其他候选或比较品牌；按原文整理有依据的独立记录。",
    ),
    cardInterpretation: fields.cardInterpretation,
    limitations: fields.limitations,
  })
  .strict();

export function buildM4EvidenceFirstTask(
  base: StructuredOutputAttemptInput,
): StructuredOutputAttemptInput {
  if (base.userContext.questionKind === "BRAND_DIRECTED") {
    throw new Error(
      "M4 evidence-first candidate currently covers open questions only",
    );
  }
  if (
    ![
      "INDUSTRY_RECOMMENDATION",
      "CHARACTERISTIC_ONE",
      "CHARACTERISTIC_TWO",
    ].includes(String(base.userContext.questionKind))
  ) {
    throw new Error("Unknown open-question kind");
  }
  return {
    ...base,
    systemInstruction: prompt.content,
    outputContract: {
      version: M4_EVIDENCE_FIRST_VERSION,
      jsonSchema: z.toJSONSchema(m4EvidenceFirstSchema, {
        target: "draft-2020-12",
      }),
    },
  };
}

export function projectM4EvidenceFirstOutput(
  value: unknown,
  context: SampleParserAcceptanceContext,
) {
  if (context.questionKind === "BRAND_DIRECTED")
    throw new Error("Open questions only");
  const parsed = m4EvidenceFirstSchema.parse(value);
  const target = parsed.target;
  // Deterministic renaming/known constants only. No quotes, names or ranks are invented.
  const modelOutput = {
    family: "OPEN_DISCOVERY" as const,
    questionKind: context.questionKind,
    mentioned: target !== null,
    position: target?.position ?? null,
    semantic: {
      profile: "OPEN_DISCOVERY" as const,
      answerStructure: parsed.answerStructure,
      targetDisplayedForms: target?.displayedForms ?? [],
      targetMentionEvidence: target?.mentionEvidence ?? [],
      targetPositionEvidence: target?.positionEvidence ?? [],
      targetRole: target?.role ?? "NOT_MENTIONED",
      targetObservations: target?.observations ?? [],
      otherBrands: parsed.otherBrands,
      cardInterpretation: parsed.cardInterpretation,
      limitations: parsed.limitations,
    },
  };
  return {
    modelOutput,
    projected: parseAndProjectSampleParserModelOutput(modelOutput, context),
  };
}

// P3 changes instruction only. Keep P2's input, Schema and projector frozen so
// the experiment does not attribute interface changes to better instructions.
export function buildM4SubjectGroundedTask(
  base: StructuredOutputAttemptInput,
): StructuredOutputAttemptInput {
  return {
    ...buildM4EvidenceFirstTask(base),
    systemInstruction: subjectGroundedPrompt.content,
  };
}
