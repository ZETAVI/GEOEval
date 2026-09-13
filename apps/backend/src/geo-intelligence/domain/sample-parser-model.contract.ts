import { z } from "zod";

import type { EvaluationQuestionKind } from "./evaluation.types.js";
import {
  parseSampleParserOutput,
  sampleParserOutputSchema,
  type SampleParserAcceptanceContext,
  type SampleParserOutput,
} from "./sample-parser.contract.js";

export const SAMPLE_PARSER_MODEL_CONTRACT_VERSION =
  "evaluation.sample-parser-model@6";

const boundedText = (maximum: number) => z.string().trim().min(1).max(maximum);
const polaritySchema = z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]);
const contentPointSchema = z
  .object({ text: boundedText(1_200), polarity: polaritySchema })
  .strict();
const brandSchema = z
  .object({
    displayName: boundedText(120),
    isFocusBrand: z.boolean(),
    attitude: polaritySchema,
    mentionContext: z.array(contentPointSchema).max(30),
  })
  .strict();
const sharedOutputShape = {
  brands: z.array(brandSchema).max(100),
  cardInterpretation: boundedText(600),
};
const directedModelOutputSchema = z
  .object({
    ...sharedOutputShape,
    brands: z
      .array(brandSchema.extend({ isFocusBrand: z.literal(true) }))
      .max(1),
  })
  .strict();
const openModelOutputSchema = z.object(sharedOutputShape).strict();

export type SampleParserModelOutput = z.infer<typeof openModelOutputSchema>;

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
      ? directedModelOutputSchema.parse(input)
      : openModelOutputSchema.parse(input);
  return parseSampleParserOutput(
    projectModelOutput(modelOutput, context),
    context,
  );
}

function projectModelOutput(
  input: SampleParserModelOutput,
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

  const focus = focusRows[0];
  const mentioned = focus !== undefined;
  const targetObservations =
    focus?.mentionContext.map((point, index) => ({
      observationId: `p${index + 1}`,
      label: conciseLabel(point.text),
      detail: point.text,
      polarity: point.polarity,
      evidenceAnchorIds: [],
    })) ?? [];
  const otherBrands = input.brands.flatMap((brand, index) =>
    brand.isFocusBrand
      ? []
      : [
          {
            brandMentionId: `b${index + 1}`,
            displayName: brand.displayName,
            observedForms: [brand.displayName],
            role: roleForAttitude(brand.attitude),
            relativePosition:
              context.questionKind === "BRAND_DIRECTED" ? null : index + 1,
            positionKind:
              context.questionKind === "BRAND_DIRECTED"
                ? null
                : ("RECOMMENDATION" as const),
            evidenceAnchorIds: [],
            mentionContext: brand.mentionContext.map((point) => point.text),
          },
        ],
  );
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
    position: focus ? input.brands.indexOf(focus) + 1 : null,
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

function roleForAttitude(attitude: z.infer<typeof polaritySchema>) {
  if (attitude === "POSITIVE") return "RECOMMENDED" as const;
  if (attitude === "NEUTRAL") return "CONDITIONALLY_RECOMMENDED" as const;
  return "EXCLUDED" as const;
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
