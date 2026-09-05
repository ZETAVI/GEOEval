import { readFileSync } from "node:fs";
import { z } from "zod";

import type { StructuredOutputAttemptInput } from "../domain/ai-attempt.types.js";
import type { SampleParserAcceptanceContext } from "../../geo-intelligence/domain/sample-parser.contract.js";
import {
  buildM4BrandSubjectTask,
  m4EvidenceFirstSchema,
  projectM4EvidenceFirstOutput,
} from "./m4-parser-evidence-first.js";

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
const instruction = loadInstruction("m4-parser-line-references.json");
const identityRoleInstruction = loadInstruction("m4-parser-identity-role.json");
const rangeSchema = z
  .object({
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  })
  .strict();
const rangeJsonSchema = z.toJSONSchema(rangeSchema, {
  target: "draft-2020-12",
});
const evidenceFields = new Set([
  "evidence",
  "mentionEvidence",
  "positionEvidence",
]);

// Isolated P5 experiment: keep the P4 task and constraints, replacing only
// quote-copying with references to the complete, immutable answer's lines.
export function buildM4LineReferenceTask(
  base: StructuredOutputAttemptInput,
): StructuredOutputAttemptInput {
  const task = buildM4BrandSubjectTask(base);
  const { originalAnswer, ...context } = task.userContext;
  if (typeof originalAnswer !== "string" || !originalAnswer.trim())
    throw new Error("A nonempty original answer is required");
  let replaced = 0;
  const replaceSpans = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(replaceSpans);
    if (!isObject(value)) return value;
    const properties = value.properties;
    if (
      isObject(properties) &&
      "exactText" in properties &&
      "occurrence" in properties
    ) {
      if (Object.keys(properties).length !== 2)
        throw new Error("Evidence span changed; review before experiment");
      replaced++;
      const { $schema: _dialect, ...range } = rangeJsonSchema;
      return {
        ...range,
        description: "选择支持本条判断的连续原文行范围，程序还原精确引文。",
      };
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, replaceSpans(child)]),
    );
  };
  const jsonSchema = replaceSpans(task.outputContract.jsonSchema);
  if (replaced !== 4 || !isObject(jsonSchema))
    throw new Error("Expected four evidence span owners; review schema drift");
  return {
    ...task,
    systemInstruction: `${task.systemInstruction.replaceAll("originalAnswer", "answerLines").replaceAll("逐字证据", "证据行范围")}\n\n${instruction.content}`,
    userContext: {
      ...context,
      answerLines: indexAnswer(originalAnswer).map(({ line, text }) => ({
        line,
        text,
      })),
    },
    outputContract: {
      version: "experiment.m4.parser-line-references@1",
      jsonSchema,
    },
  };
}

export function projectM4LineReferenceOutput(
  value: unknown,
  context: SampleParserAcceptanceContext,
) {
  if (context.questionKind === "BRAND_DIRECTED")
    throw new Error("Open questions only");
  const lines = indexAnswer(context.originalAnswer);
  const restore = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(restore);
    if (!isObject(value)) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => {
        if (!evidenceFields.has(key)) return [key, restore(child)];
        if (!Array.isArray(child))
          throw new Error("Evidence references must be an array");
        return [
          key,
          child.map((reference) => {
            const range = rangeSchema.parse(reference);
            const first = lines[range.startLine - 1];
            const last = lines[range.endLine - 1];
            if (!first || !last || range.endLine < range.startLine)
              throw new Error("Evidence line range does not resolve");
            const selected = context.originalAnswer.slice(
              first.start,
              last.end,
            );
            const exactText = selected.trim();
            if (!exactText) throw new Error("Evidence line range is empty");
            const selectedStart = first.start + selected.indexOf(exactText);
            return {
              exactText,
              occurrence: occurrenceAt(
                context.originalAnswer,
                exactText,
                selectedStart,
              ),
            };
          }),
        ];
      }),
    );
  };
  // Reuse all canonical field/count/quote-size constraints. No name, role,
  // position or prose is inferred, filled or repaired by this reference bridge.
  const restoredEvidenceFirstOutput = m4EvidenceFirstSchema.parse(
    restore(value),
  );
  return {
    restoredEvidenceFirstOutput,
    ...projectM4EvidenceFirstOutput(restoredEvidenceFirstOutput, context),
  };
}

// P6 changes semantic instructions/descriptions only; P5 inputs, constraints,
// source restoration and the production acceptance/metric owners stay frozen.
export function buildM4IdentityRoleTask(
  base: StructuredOutputAttemptInput,
): StructuredOutputAttemptInput {
  const task = buildM4LineReferenceTask(base);
  const jsonSchema = structuredClone(task.outputContract.jsonSchema);
  const properties = objectAt(jsonSchema.properties);
  const brand = objectAt(
    objectAt(objectAt(properties.otherBrands).items).properties,
  );
  objectAt(brand.observedForms).description =
    "原文用来指代这一个品牌的名称片段，每项只指向该主体，可为全称、简称或原文别名。两品牌同处一段时各记录自己的名称；多个主体的整句、关系描述及 Markdown 标记属于证据而不是名称。";
  objectAt(brand.role).description =
    "判断回答对这个品牌本身的意思：RECOMMENDED=作为满足问题需求的可考虑选择；CONDITIONALLY_RECOMMENDED=只有额外实质条件成立时才作为选择；ALTERNATIVE=明确作为另一选项的替代。COMPARED=只作比较参照而未提出选它；EXAMPLE=仅作说明例子；EXCLUDED=明确不建议选择；MENTIONED_ONLY=仅在背景、旗下或合作关系中具名而未建议选择该主体。邀请用户比较/了解可选服务商也可能是推荐选择，不由某个动词决定。";
  objectAt(brand.relativePosition).description =
    "原文支持的这个主体的候选呈现顺序，不是市场排名。结合完整列表、表格、标题和段落理解；附带提及不获得推荐位置，没有顺序依据时为 null。";
  objectAt(brand.positionKind).description =
    "RECOMMENDATION 表示候选呈现位置，CONTEXTUAL 表示仅比较语境中的明确顺序；没有 relativePosition 时为 null。";
  objectAt(properties.answerStructure).description =
    "描述完整原回答的结构，结合标题、列表、表格与段落；多种结构共同组织内容时用 MIXED。";
  return {
    ...task,
    systemInstruction: identityRoleInstruction.content,
    outputContract: {
      version: "experiment.m4.parser-identity-role@1",
      jsonSchema,
    },
  };
}

function objectAt(value: unknown): Record<string, unknown> {
  if (!isObject(value))
    throw new Error("P5 schema path changed; review before P6");
  return value;
}

function indexAnswer(answer: string) {
  const lines: Array<{
    line: number;
    text: string;
    start: number;
    end: number;
  }> = [];
  for (const match of answer.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/gu)) {
    if (!match[0]) continue;
    const text = match[0].replace(/(?:\r\n|\n|\r)$/u, "");
    lines.push({
      line: lines.length + 1,
      text,
      start: match.index,
      end: match.index + text.length,
    });
  }
  return lines;
}

function occurrenceAt(
  answer: string,
  exactText: string,
  selectedStart: number,
) {
  let offset = 0;
  let occurrence = 0;
  while (offset <= selectedStart) {
    const found = answer.indexOf(exactText, offset);
    if (found < 0 || found > selectedStart) break;
    occurrence++;
    if (found === selectedStart) return occurrence;
    offset = found + exactText.length;
  }
  throw new Error(
    "Selected evidence cannot resolve under the current occurrence contract",
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
