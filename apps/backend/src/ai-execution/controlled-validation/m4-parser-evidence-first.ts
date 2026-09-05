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
const brandSubjectPrompt = loadInstruction("m4-parser-brand-subject.json");

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

// P4 is a Prompt + field-meaning package, not a schema-only experiment. Reuse
// every executable constraint and the unchanged projector; only annotate the
// generated model-facing schema so the historical P2/P3 controls stay frozen.
export function buildM4BrandSubjectTask(
  base: StructuredOutputAttemptInput,
): StructuredOutputAttemptInput {
  const task = buildM4EvidenceFirstTask(base);
  const jsonSchema = structuredClone(task.outputContract.jsonSchema);
  const properties = schemaObject(jsonSchema.properties);
  const brands = schemaObject(properties.otherBrands);
  const brandFields = schemaObject(schemaObject(brands.items).properties);
  brands.description =
    "与本题相关、原文明确具名的其他品牌主体。没有品牌名称的团队、地点、类别或机构不单列；品牌旗下或合作语境保留具名主体及其实际角色，不拼造未具名公司。认证工具或平台不是本题候选品牌。";
  const descriptions: Record<string, string> = {
    displayName:
      "用于报告的简洁品牌主体名，不带可明确分离的分公司、门店或组织修饰；品牌自身包含的地域词保留。不是整句描述，也不是将几个品牌合成的名称。",
    observedForms:
      "本条原文实际出现的名称写法，每项只含名称而非描述段落或 Markdown 装饰；可以保留原文的分公司/门店完整名称以追溯，但不能替代主体名或完整证据。",
    role: "原文对这个品牌本身的呈现角色。推荐依赖明确需求或前提时保留条件角色；仅以旗下/合作关系具名而没有推荐该主体时为 MENTIONED_ONLY，不能把关系对象的推荐转给它。",
    relativePosition:
      "原文能支持该品牌候选顺序时才给位置；仅提及、无顺序依据或未知时为 null。不要把记录数组序号当作原文位置。",
    positionKind: "与有依据的位置一致；relativePosition 为 null 时也为 null。",
    evidence:
      "逐字复制的连续原文，每段同时包含该品牌名称及支持其角色、否定或条件的相邻上下文。主体名可以简洁，证据中的分公司/门店范围不能抹去；不要把名字与无主语评价拆成互不关联的短片段。",
  };
  for (const [name, description] of Object.entries(descriptions))
    schemaObject(brandFields[name]).description = description;
  schemaObject(properties.limitations).description =
    "只记录影响理解的实际证据局限；没有则为空，不记录字段解释、处理过程或未具名团队的清单。";
  return {
    ...task,
    systemInstruction: brandSubjectPrompt.content,
    outputContract: {
      version: "experiment.m4.parser-brand-subject@1",
      jsonSchema,
    },
  };
}

function schemaObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(
      "M4 generated schema path changed; review before execution",
    );
  return value as Record<string, unknown>;
}
