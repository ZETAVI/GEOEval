import { readFileSync } from "node:fs";
import { z } from "zod";
import type { StructuredOutputAttemptInput } from "../domain/ai-attempt.types.js";
import type { SampleParserAcceptanceContext } from "../../geo-intelligence/domain/sample-parser.contract.js";
import { m4EvidenceFirstSchema } from "./m4-parser-evidence-first.js";
import {
  buildM4IdentityRoleTask,
  projectM4LineReferenceOutput,
  restoreM4SourceReferences,
} from "./m4-parser-line-references.js";

const prompt = z
  .object({
    id: z.string(),
    version: z.string(),
    extractionInstruction: z.string().min(1),
    judgmentInstruction: z.string().min(1),
  })
  .strict()
  .parse(
    JSON.parse(
      readFileSync(
        new URL(
          "../../../geo-intelligence/experiments/m4-parser-task-split.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
const targetFields = m4EvidenceFirstSchema.shape.target.unwrap().shape;
const inventorySchema = z
  .object({
    answerStructure: m4EvidenceFirstSchema.shape.answerStructure,
    target: z
      .object({
        displayedForms: targetFields.displayedForms,
        evidence: z.array(targetFields.mentionEvidence.element).min(1),
      })
      .strict()
      .nullable(),
    otherBrands: z.array(
      m4EvidenceFirstSchema.shape.otherBrands.element.pick({
        displayName: true,
        observedForms: true,
        evidence: true,
      }),
    ),
  })
  .strict();
const rangeSchema = z
  .object({
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  })
  .strict();
const lineSchema = z
  .object({ line: z.number().int().positive(), text: z.string() })
  .strict();
const rawInventorySchema = inventorySchema.extend({
  target: inventorySchema.shape.target
    .unwrap()
    .extend({ evidence: z.array(rangeSchema).min(1) })
    .nullable(),
  otherBrands: z.array(
    inventorySchema.shape.otherBrands.element.extend({
      evidence: z.array(rangeSchema).min(1),
    }),
  ),
});

function contractParts(base: StructuredOutputAttemptInput) {
  const task = buildM4IdentityRoleTask(base);
  const properties = object(task.outputContract.jsonSchema.properties);
  const target = object(
    object((object(properties.target).anyOf as unknown[])[0]).properties,
  );
  const brands = object(properties.otherBrands);
  const brand = object(object(brands.items).properties);
  const targetRangeLimit = z
    .number()
    .int()
    .positive()
    .parse(object(target.observations).maxItems);
  const brandLimit = z.number().int().positive().parse(brands.maxItems);
  return {
    task,
    properties,
    target,
    brands,
    brand,
    targetRangeLimit,
    brandLimit,
  };
}

export function buildM4EvidenceExtractionTask(
  base: StructuredOutputAttemptInput,
): StructuredOutputAttemptInput {
  const p = contractParts(base);
  const { companyName, question, questionKind, answerLines } =
    p.task.userContext;
  return {
    ...p.task,
    systemInstruction: prompt.extractionInstruction,
    userContext: { companyName, question, questionKind, answerLines },
    outputContract: {
      version: "experiment.m4.parser-source-inventory@1",
      jsonSchema: {
        $schema: p.task.outputContract.jsonSchema.$schema,
        type: "object",
        additionalProperties: false,
        required: ["answerStructure", "target", "otherBrands"],
        properties: {
          answerStructure: p.properties.answerStructure,
          target: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["displayedForms", "evidence"],
                properties: {
                  displayedForms: p.target.displayedForms,
                  evidence: {
                    ...object(p.brand.evidence),
                    maxItems: p.targetRangeLimit,
                    description:
                      "覆盖目标的身份、正负描述、条件和位置语境，供下一步使用。",
                  },
                },
              },
              { type: "null" },
            ],
          },
          otherBrands: {
            ...p.brands,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["displayName", "observedForms", "evidence"],
              properties: {
                displayName: p.brand.displayName,
                observedForms: p.brand.observedForms,
                evidence: p.brand.evidence,
              },
            },
          },
        },
      },
    },
  };
}

export function buildM4EvidenceJudgmentTask(
  base: StructuredOutputAttemptInput,
  proposal: unknown,
) {
  const p = contractParts(base);
  const raw = rawInventorySchema.parse(proposal);
  const originalAnswer = String(base.userContext.originalAnswer);
  const inventory = inventorySchema.parse(
    restoreM4SourceReferences(raw, originalAnswer),
  );
  if (
    inventory.otherBrands.length > p.brandLimit ||
    (inventory.target?.evidence.length ?? 0) > p.targetRangeLimit
  )
    throw new Error("Inventory exceeds source contract capacity");
  for (const item of [
    ...(inventory.target
      ? [
          {
            forms: inventory.target.displayedForms,
            evidence: inventory.target.evidence,
          },
        ]
      : []),
    ...inventory.otherBrands.map((b) => ({
      forms: b.observedForms,
      evidence: b.evidence,
    })),
  ]) {
    if (
      !item.forms.every((form) =>
        item.evidence.some((span) => span.exactText.includes(form)),
      )
    )
      throw new Error("Inventory name is not grounded in its selected source");
  }
  const selected = new Set<number>();
  for (const ref of [
    ...(raw.target?.evidence ?? []),
    ...raw.otherBrands.flatMap((b) => b.evidence),
  ])
    for (let line = ref.startLine; line <= ref.endLine; line++)
      selected.add(line);
  const allLines = z.array(lineSchema).parse(p.task.userContext.answerLines);
  const answerLines = allLines.filter((line) => selected.has(line.line));
  const { companyName, question, questionKind } = p.task.userContext;
  const sourceInventory = {
    answerStructure: inventory.answerStructure,
    target: inventory.target
      ? {
          displayedForms: inventory.target.displayedForms,
          sourceRanges: raw.target!.evidence,
        }
      : null,
    otherBrands: inventory.otherBrands.map((b, i) => ({
      displayName: b.displayName,
      observedForms: b.observedForms,
      sourceRanges: raw.otherBrands[i]!.evidence,
    })),
  };
  const systemInstruction = p.task.systemInstruction
    .replace(
      "answerLines 按原有换行呈现完整原回答，是事实来源",
      "answerLines 是前一步选择的原文行，保留原行号，是当前可见事实来源",
    )
    .replace("先通读完整回答", "先阅读全部提供的证据")
    .replace("从完整回答的候选呈现关系", "从提供证据的候选呈现关系");
  if (systemInstruction === p.task.systemInstruction)
    throw new Error("P6 instruction changed; review handoff wording");
  return {
    inventory,
    visibleLineCount: answerLines.length,
    originalLineCount: allLines.length,
    task: {
      ...p.task,
      systemInstruction: `${systemInstruction}\n\n${prompt.judgmentInstruction}`,
      userContext: {
        companyName,
        question,
        questionKind,
        answerLines,
        sourceInventory,
      },
      outputContract: {
        ...p.task.outputContract,
        version: "experiment.m4.parser-evidence-judgment@1",
      },
    },
  };
}

export function projectM4EvidenceJudgmentOutput(
  value: unknown,
  base: StructuredOutputAttemptInput,
  proposal: unknown,
) {
  const handoff = buildM4EvidenceJudgmentTask(base, proposal);
  const visible = new Set(
    handoff.task.userContext.answerLines.map((line) => line.line),
  );
  const check = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(check);
    if (!v || typeof v !== "object") return;
    if ("startLine" in v || "endLine" in v) {
      const r = rangeSchema.parse(v);
      if (r.endLine < r.startLine || r.endLine - r.startLine >= visible.size)
        throw new Error("Judgment cites unavailable source");
      for (let n = r.startLine; n <= r.endLine; n++)
        if (!visible.has(n))
          throw new Error("Judgment cites unavailable source");
    } else Object.values(v).forEach(check);
  };
  check(value);
  return projectM4LineReferenceOutput(value, {
    companyName: String(base.userContext.companyName),
    originalAnswer: String(base.userContext.originalAnswer),
    questionKind: base.userContext
      .questionKind as SampleParserAcceptanceContext["questionKind"],
  });
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("P6 schema shape changed; review inventory contract");
  return value as Record<string, unknown>;
}
