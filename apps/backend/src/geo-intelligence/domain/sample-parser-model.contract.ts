import { z } from "zod";

import type { EvaluationQuestionKind } from "./evaluation.types.js";
import {
  SampleParserSemanticError,
  parseSampleParserOutput,
  sampleParserOutputSchema,
  type SampleParserAcceptanceContext,
  type SampleParserOutput,
} from "./sample-parser.contract.js";

export const SAMPLE_PARSER_MODEL_CONTRACT_VERSION =
  "evaluation.sample-parser-model@7";

const boundedText = (maximum: number) => z.string().trim().min(1).max(maximum);
const polaritySchema = z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]);
const contentPointSchema = z
  .object({ text: boundedText(1_200), polarity: polaritySchema })
  .strict();
const brandContentShape = {
  displayName: boundedText(120),
  attitude: polaritySchema,
  mentionContext: z.array(contentPointSchema).max(30),
};
const directedBrandSchema = z
  .object({
    ...brandContentShape,
    isFocusBrand: z.literal(true),
  })
  .strict();
const queryRoleSchema = z.enum(["CANDIDATE", "REFERENCE", "NOT_APPLICABLE"]);
const openBrandSchema = z
  .object({
    ...brandContentShape,
    isFocusBrand: z.boolean(),
    queryRole: queryRoleSchema.nullable(),
  })
  .strict();
const directedModelOutputSchema = z
  .object({
    brands: z.array(directedBrandSchema).max(1),
    cardInterpretation: boundedText(600),
  })
  .strict();
const openModelOutputSchema = z
  .object({
    brands: z.array(openBrandSchema).max(100),
    cardInterpretation: boundedText(600),
  })
  .strict();

export type SampleParserModelOutput = z.infer<typeof openModelOutputSchema>;
type DirectedSampleParserModelOutput = z.infer<
  typeof directedModelOutputSchema
>;

const directedModelJsonSchema = z.toJSONSchema(directedModelOutputSchema, {
  target: "draft-2020-12",
});
const openModelJsonSchema = z.toJSONSchema(openModelOutputSchema, {
  target: "draft-2020-12",
});

export function sampleParserModelJsonSchemaForQuestionKind(
  questionKind: EvaluationQuestionKind,
): Record<string, unknown> {
  return questionKind === "BRAND_DIRECTED"
    ? (directedModelJsonSchema as Record<string, unknown>)
    : (openModelJsonSchema as Record<string, unknown>);
}

export function parseAndProjectSampleParserModelOutput(
  input: unknown,
  context: SampleParserAcceptanceContext,
): SampleParserOutput {
  const acceptedDomainOutput = sampleParserOutputSchema.safeParse(input);
  if (acceptedDomainOutput.success) {
    return parseSampleParserOutput(acceptedDomainOutput.data, context);
  }
  const modelOutput =
    context.questionKind === "BRAND_DIRECTED"
      ? directedModelOutputSchema.parse(normalizeModelEnums(input))
      : openModelOutputSchema.parse(normalizeModelEnums(input));
  return parseSampleParserOutput(
    projectModelOutput(modelOutput, context),
    context,
  );
}

function normalizeModelEnums(input: unknown): unknown {
  if (!isRecord(input) || !Array.isArray(input.brands)) return input;
  return {
    ...input,
    brands: input.brands.map((brand) => {
      if (!isRecord(brand)) return brand;
      return {
        ...brand,
        attitude: normalizeAttitude(brand.attitude),
        ...(Object.hasOwn(brand, "queryRole")
          ? { queryRole: normalizeEnumCase(brand.queryRole) }
          : {}),
        ...(Array.isArray(brand.mentionContext)
          ? {
              mentionContext: brand.mentionContext.map((point) =>
                isRecord(point)
                  ? {
                      ...point,
                      polarity: normalizeEnumCase(point.polarity),
                    }
                  : point,
              ),
            }
          : {}),
      };
    }),
  };
}

function normalizeAttitude(value: unknown): unknown {
  const normalized = normalizeEnumCase(value);
  return normalized === "MIXED" ? "NEUTRAL" : normalized;
}

function normalizeEnumCase(value: unknown): unknown {
  return typeof value === "string" ? value.trim().toUpperCase() : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function projectModelOutput(
  input: SampleParserModelOutput | DirectedSampleParserModelOutput,
  context: SampleParserAcceptanceContext,
): SampleParserOutput {
  const focusRows = input.brands.filter((brand) => brand.isFocusBrand);
  if (focusRows.length > 1) {
    throw new Error("Sample parser returned multiple focus brands");
  }
  const normalizedNames = new Set<string>();
  for (const brand of input.brands) {
    const normalized = normalizeName(brand.displayName);
    if (normalizedNames.has(normalized)) {
      throw new Error(
        `Sample parser returned duplicate brand ${brand.displayName}`,
      );
    }
    normalizedNames.add(normalized);
  }

  const focusIndex = input.brands.findIndex((brand) => brand.isFocusBrand);
  const focus = focusRows[0];
  if (focus && "queryRole" in focus && focus.queryRole !== null) {
    throw new SampleParserSemanticError([
      `focus brand ${focus.displayName} cannot have query role`,
    ]);
  }
  const mentioned = focus !== undefined;
  const targetObservations =
    focus?.mentionContext.map((point, index) => ({
      observationId: `p${index + 1}`,
      label: conciseLabel(point.text),
      detail: point.text,
      polarity: point.polarity,
      evidenceAnchorIds: [],
    })) ?? [];
  const candidatePositions = new Map<number, number>();
  if (context.questionKind !== "BRAND_DIRECTED") {
    let position = 0;
    input.brands.forEach((brand, index) => {
      if (
        brand.isFocusBrand ||
        ("queryRole" in brand && brand.queryRole === "CANDIDATE")
      ) {
        candidatePositions.set(index, ++position);
      }
    });
  }
  const otherBrands = input.brands.flatMap((brand, index) => {
    if (brand.isFocusBrand) return [];
    if (!("queryRole" in brand) || brand.queryRole === null) {
      throw new SampleParserSemanticError([
        `other brand ${brand.displayName} requires query role`,
      ]);
    }
    const eligible = brand.queryRole === "CANDIDATE";
    return [
      {
        brandMentionId: `b${index + 1}`,
        displayName: brand.displayName,
        observedForms: [brand.displayName],
        role: roleForQueryUse(brand.queryRole, brand.attitude),
        relativePosition: eligible
          ? (candidatePositions.get(index) ?? null)
          : null,
        positionKind: eligible ? ("RECOMMENDATION" as const) : null,
        evidenceAnchorIds: [],
        mentionContext: brand.mentionContext.map((point) => point.text),
      },
    ];
  });
  const common = {
    answerStructure: "MIXED" as const,
    targetDisplayedForms: focus ? [focus.displayName] : [],
    targetObservations,
    otherBrands,
    evidenceAnchors: [],
    cardInterpretation: input.cardInterpretation,
    limitations: [],
  };

  if (context.questionKind === "BRAND_DIRECTED") {
    return {
      family: "BRAND_DIRECTED",
      mentioned,
      position: null,
      semantic: {
        profile: "BRAND_DIRECTED",
        ...common,
        statedIdentity: [],
        positioning: [],
        offerings: [],
        audiences: [],
        contextualTargetPosition: null,
        contextualPositionEvidenceAnchorIds: [],
      },
    };
  }

  return {
    family: "OPEN_DISCOVERY",
    questionKind: context.questionKind,
    mentioned,
    position: focus ? focusIndex + 1 : null,
    semantic: {
      profile: "OPEN_DISCOVERY",
      ...common,
      targetRole: focus
        ? roleForFocusAttitude(focus.attitude)
        : "NOT_MENTIONED",
      recommendationReasons: [],
      conditions: [],
      queryFit: [],
    },
  };
}

function roleForQueryUse(
  queryRole: z.infer<typeof queryRoleSchema>,
  attitude: z.infer<typeof polaritySchema>,
) {
  if (queryRole === "REFERENCE") return "MENTIONED_ONLY" as const;
  if (queryRole === "NOT_APPLICABLE") return "EXCLUDED" as const;
  return attitude === "POSITIVE"
    ? ("RECOMMENDED" as const)
    : ("CONDITIONALLY_RECOMMENDED" as const);
}

function roleForFocusAttitude(attitude: z.infer<typeof polaritySchema>) {
  if (attitude === "POSITIVE") return "RECOMMENDED" as const;
  if (attitude === "NEUTRAL") return "CONDITIONALLY_RECOMMENDED" as const;
  return "EXCLUDED" as const;
}

function conciseLabel(value: string): string {
  const firstClause = value.split(/[。；;，,]/u)[0]?.trim() || value.trim();
  return firstClause.slice(0, 80);
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/gu, " ");
}
