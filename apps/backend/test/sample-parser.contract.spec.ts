import { describe, expect, it } from "vitest";

import {
  SAMPLE_PARSER_CONTRACT_VERSION,
  S3_COMPATIBILITY_CONTRACT_VERSION,
  SampleParserSemanticError,
  type SampleParserOutput,
  parseSampleParserOutput,
  parseStoredSampleSemantic,
  sampleParserJsonSchema,
  sampleParserOutputSchema,
} from "../src/geo-intelligence/domain/sample-parser.contract.js";

type OpenParserOutput = Extract<
  SampleParserOutput,
  { family: "OPEN_DISCOVERY" }
>;
type BrandDirectedParserOutput = Extract<
  SampleParserOutput,
  { family: "BRAND_DIRECTED" }
>;

describe("sample parser semantic contract", () => {
  it("exports one strict JSON-representable structural contract", () => {
    expect(SAMPLE_PARSER_CONTRACT_VERSION).toBe("1.0.0");
    expect(sampleParserJsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
    });
    expect(() =>
      sampleParserOutputSchema.parse({
        ...validBrandDirected("星河咖啡值得关注。"),
        unexpected: true,
      }),
    ).toThrow();
  });

  it.each([
    ["ORDERED_LIST", "1. 星河咖啡值得关注。"],
    ["UNORDERED_LIST", "- 星河咖啡值得关注。"],
    ["TABLE", "| 品牌 | 评价 |\n| --- | --- |\n| 星河咖啡 | 值得关注 |"],
    ["HEADINGS", "## 星河咖啡\n值得关注。"],
    ["PARAGRAPHS", "在这些门店中，星河咖啡值得关注。"],
  ] as const)("accepts evidence in %s answers", (structure, answer) => {
    const exactText = answer
      .split("\n")
      .find((line) => line.includes("星河咖啡"))!;
    const output = validOpen(answer, exactText, structure);
    expect(
      parseSampleParserOutput(output, {
        questionKind: "CHARACTERISTIC_ONE",
        companyName: "星河咖啡",
        originalAnswer: answer,
      }),
    ).toMatchObject({ mentioned: true, position: 1 });
  });

  it("keeps direct-question position out of the open recommendation metric", () => {
    const answer = "星河咖啡值得关注。";
    expect(
      parseSampleParserOutput(validBrandDirected(answer), {
        questionKind: "BRAND_DIRECTED",
        companyName: "星河咖啡",
        originalAnswer: answer,
      }),
    ).toMatchObject({ family: "BRAND_DIRECTED", position: null });
    expect(() =>
      parseSampleParserOutput(validBrandDirected(answer), {
        questionKind: "CHARACTERISTIC_ONE",
        companyName: "星河咖啡",
        originalAnswer: answer,
      }),
    ).toThrow(SampleParserSemanticError);
  });

  it("rejects unresolved and incorrectly numbered evidence occurrences", () => {
    const answer = "星河咖啡值得关注。星河咖啡值得关注。";
    const output = validOpen(answer, "星河咖啡值得关注。", "PARAGRAPHS");
    output.semantic.evidenceAnchors[0]!.occurrence = 2;
    expect(() =>
      parseSampleParserOutput(output, {
        questionKind: "CHARACTERISTIC_ONE",
        companyName: "星河咖啡",
        originalAnswer: answer,
      }),
    ).not.toThrow();
    output.semantic.evidenceAnchors[0]!.occurrence = 3;
    expect(() =>
      parseSampleParserOutput(output, {
        questionKind: "CHARACTERISTIC_ONE",
        companyName: "星河咖啡",
        originalAnswer: answer,
      }),
    ).toThrow(SampleParserSemanticError);
  });

  it("rejects inconsistent non-mentions and target duplication as another brand", () => {
    const answer = "星河咖啡值得关注。";
    const output = validOpen(answer, answer, "PARAGRAPHS");
    output.mentioned = false;
    expect(() =>
      parseSampleParserOutput(output, {
        questionKind: "CHARACTERISTIC_ONE",
        companyName: "星河咖啡",
        originalAnswer: answer,
      }),
    ).toThrow(SampleParserSemanticError);

    const duplicated = validOpen(answer, answer, "PARAGRAPHS");
    duplicated.semantic.otherBrands.push({
      brandMentionId: "other-target",
      displayName: "星河咖啡",
      observedForms: ["星河咖啡"],
      role: "COMPARED",
      relativePosition: null,
      positionKind: null,
      evidenceAnchorIds: ["target-mention"],
    });
    expect(() =>
      parseSampleParserOutput(duplicated, {
        questionKind: "CHARACTERISTIC_ONE",
        companyName: "星河咖啡",
        originalAnswer: answer,
      }),
    ).toThrow(SampleParserSemanticError);
  });

  it("accepts multiple target forms and keeps an unfamiliar name as another brand", () => {
    const answer = "星河咖啡（Galaxy Coffee）值得关注；晨光咖啡也进入了候选。";
    const output = validOpen(answer, answer, "PARAGRAPHS");
    output.semantic.targetDisplayedForms.push("Galaxy Coffee");
    output.semantic.evidenceAnchors.push({
      anchorId: "other-brand",
      exactText: "晨光咖啡也进入了候选。",
      occurrence: 1,
      purposes: ["OTHER_BRAND"],
    });
    output.semantic.otherBrands.push({
      brandMentionId: "morning-coffee",
      displayName: "晨光咖啡",
      observedForms: ["晨光咖啡"],
      role: "RECOMMENDED",
      relativePosition: null,
      positionKind: null,
      evidenceAnchorIds: ["other-brand"],
    });
    expect(() =>
      parseSampleParserOutput(output, {
        questionKind: "CHARACTERISTIC_ONE",
        companyName: "星河咖啡",
        originalAnswer: answer,
      }),
    ).not.toThrow();

    const unfamiliarAliasAnswer = "星河优选进入了候选。";
    const unfamiliarAlias = validNonMention();
    unfamiliarAlias.semantic.evidenceAnchors.push({
      anchorId: "unfamiliar-brand",
      exactText: unfamiliarAliasAnswer,
      occurrence: 1,
      purposes: ["OTHER_BRAND"],
    });
    unfamiliarAlias.semantic.otherBrands.push({
      brandMentionId: "unfamiliar-brand-record",
      displayName: "星河优选",
      observedForms: ["星河优选"],
      role: "RECOMMENDED",
      relativePosition: null,
      positionKind: null,
      evidenceAnchorIds: ["unfamiliar-brand"],
    });
    expect(
      parseSampleParserOutput(unfamiliarAlias, {
        questionKind: "INDUSTRY_RECOMMENDATION",
        companyName: "星河咖啡",
        originalAnswer: unfamiliarAliasAnswer,
      }),
    ).toMatchObject({ mentioned: false, position: null });
  });

  it("reads only the explicit S3 compatibility payload under its version", () => {
    expect(
      parseStoredSampleSemantic(S3_COMPATIBILITY_CONTRACT_VERSION, {
        profile: "S3_COMPATIBILITY",
        migratedDescription: null,
        migratedCharacteristics: [],
        migratedSummary: "旧版摘要",
        migratedStructuredEvidence: {},
        highlightUnavailable: true,
      }),
    ).toMatchObject({ profile: "S3_COMPATIBILITY" });
    expect(() => parseStoredSampleSemantic("unknown", {})).toThrow(
      "Unsupported sample semantic contract unknown",
    );
  });
});

function validOpen(
  answer: string,
  exactText: string,
  answerStructure:
    "ORDERED_LIST" | "UNORDERED_LIST" | "TABLE" | "HEADINGS" | "PARAGRAPHS",
): OpenParserOutput {
  return {
    family: "OPEN_DISCOVERY" as const,
    questionKind: "CHARACTERISTIC_ONE" as const,
    mentioned: true,
    position: 1,
    semantic: {
      profile: "OPEN_DISCOVERY" as const,
      answerStructure,
      targetDisplayedForms: ["星河咖啡"],
      targetObservations: [
        {
          observationId: "target-visible",
          label: "进入候选",
          detail: "回答提到了当前品牌。",
          polarity: "NEUTRAL" as const,
          evidenceAnchorIds: ["target-mention"],
        },
      ],
      otherBrands: [],
      evidenceAnchors: [
        {
          anchorId: "target-mention",
          exactText,
          occurrence: 1,
          purposes: ["TARGET_MENTION", "TARGET_POSITION"] as Array<
            "TARGET_MENTION" | "TARGET_POSITION"
          >,
        },
      ],
      cardInterpretation: "回答将当前品牌列入候选。",
      limitations: [],
      targetRole: "RECOMMENDED" as const,
      recommendationReasons: [],
      conditions: [],
      queryFit: [],
    },
  };
}

function validBrandDirected(answer: string): BrandDirectedParserOutput {
  return {
    family: "BRAND_DIRECTED" as const,
    mentioned: true,
    position: null,
    semantic: {
      profile: "BRAND_DIRECTED" as const,
      answerStructure: "PARAGRAPHS" as const,
      targetDisplayedForms: ["星河咖啡"],
      targetObservations: [],
      otherBrands: [],
      evidenceAnchors: [
        {
          anchorId: "target-mention",
          exactText: answer,
          occurrence: 1,
          purposes: ["TARGET_MENTION"] as ["TARGET_MENTION"],
        },
      ],
      cardInterpretation: "回答介绍了当前品牌。",
      limitations: [],
      statedIdentity: [],
      positioning: [],
      offerings: [],
      audiences: [],
      contextualTargetPosition: null,
      contextualPositionEvidenceAnchorIds: [],
    },
  };
}

function validNonMention(): OpenParserOutput {
  return {
    family: "OPEN_DISCOVERY" as const,
    questionKind: "INDUSTRY_RECOMMENDATION" as const,
    mentioned: false,
    position: null,
    semantic: {
      profile: "OPEN_DISCOVERY" as const,
      answerStructure: "PARAGRAPHS" as const,
      targetDisplayedForms: [],
      targetObservations: [],
      otherBrands: [],
      evidenceAnchors: [],
      cardInterpretation: "回答没有提及当前品牌。",
      limitations: [],
      targetRole: "NOT_MENTIONED" as const,
      recommendationReasons: [],
      conditions: [],
      queryFit: [],
    },
  };
}
