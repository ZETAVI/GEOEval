import { describe, expect, it } from "vitest";

import {
  LEGACY_SAMPLE_PARSER_CONTRACT_VERSION,
  SAMPLE_PARSER_CONTRACT_VERSION,
  S3_COMPATIBILITY_CONTRACT_VERSION,
  SampleParserSemanticError,
  isReadableSampleParserContractVersion,
  parseSampleParserOutput,
  parseStoredSampleSemantic,
} from "../src/geo-intelligence/domain/sample-parser.contract.js";
import {
  SAMPLE_PARSER_MODEL_CONTRACT_VERSION,
  parseAndProjectSampleParserModelOutput,
} from "../src/geo-intelligence/domain/sample-parser-model.contract.js";
import { buildEvaluationHighlightProjection } from "../src/geo-intelligence/domain/evaluation-report.projection.js";
import { buildSampleParserTask } from "../src/geo-intelligence/sample-parser.policy.js";

const context = {
  questionKind: "INDUSTRY_RECOMMENDATION" as const,
  companyName: "青禾咖啡",
  originalAnswer: "山岚咖啡适合外带。青禾咖啡环境安静但价格略高，仍值得考虑。",
};

describe("sample parser semantic contract", () => {
  it("uses the readable brand-record model contract", () => {
    expect(SAMPLE_PARSER_CONTRACT_VERSION).toBe("2.0.0");
    expect(SAMPLE_PARSER_MODEL_CONTRACT_VERSION).toBe(
      "evaluation.sample-parser-model@7",
    );
    const task = buildSampleParserTask({
      companyName: context.companyName,
      primaryIndustry: "餐饮",
      secondaryIndustry: "咖啡",
      region: "广州",
      characteristicOne: "安静",
      characteristicTwo: "适合外带",
      questionKind: context.questionKind,
      question: "附近有哪些咖啡店值得考虑？",
      originalAnswer: "**山岚咖啡**适合外带。",
    });
    expect(task.userContext).toEqual({
      focusBrand: "青禾咖啡",
      question: "附近有哪些咖啡店值得考虑？",
      content: "山岚咖啡适合外带。",
    });
    expect(task.outputContract.jsonSchema).toMatchObject({
      properties: {
        brands: { type: "array" },
        cardInterpretation: { type: "string" },
      },
      additionalProperties: false,
    });
    const directedTask = buildSampleParserTask({
      companyName: context.companyName,
      primaryIndustry: "餐饮",
      secondaryIndustry: "咖啡",
      region: "广州",
      characteristicOne: "安静",
      characteristicTwo: "适合外带",
      questionKind: "BRAND_DIRECTED",
      question: "青禾咖啡怎么样？",
      originalAnswer: "青禾咖啡环境安静。",
    });
    expect(directedTask.systemInstruction).toContain(
      "displayName填写品牌主体名，不使用name或其他字段名",
    );
  });

  it("projects first-appearance order and source-grounded content points", () => {
    const output = parseAndProjectSampleParserModelOutput(
      {
        brands: [
          {
            displayName: "山岚咖啡",
            isFocusBrand: false,
            queryRole: "CANDIDATE",
            attitude: "POSITIVE",
            mentionContext: [{ text: "适合外带。", polarity: "POSITIVE" }],
          },
          {
            displayName: "青禾咖啡",
            isFocusBrand: true,
            queryRole: null,
            attitude: "POSITIVE",
            mentionContext: [
              {
                text: "环境安静但价格略高，仍值得考虑。",
                polarity: "NEUTRAL",
              },
            ],
          },
        ],
        cardInterpretation: "回答将青禾咖啡作为安静但价格略高的选择。",
      },
      context,
    );

    expect(output.mentioned).toBe(true);
    expect(output.position).toBe(2);
    expect(output.semantic.targetDisplayedForms).toEqual(["青禾咖啡"]);
    expect(output.semantic.targetObservations).toEqual([
      expect.objectContaining({
        observationId: "p1",
        detail: "环境安静但价格略高，仍值得考虑。",
        polarity: "NEUTRAL",
        evidenceAnchorIds: [],
      }),
    ]);
    expect(output.semantic.otherBrands).toEqual([
      expect.objectContaining({
        brandMentionId: "b1",
        displayName: "山岚咖啡",
        role: "RECOMMENDED",
        relativePosition: 1,
        mentionContext: ["适合外带。"],
      }),
    ]);
    expect(output.semantic.evidenceAnchors).toEqual([]);
  });

  it("keeps an absent focus brand absent", () => {
    const output = parseAndProjectSampleParserModelOutput(
      {
        brands: [
          {
            displayName: "山岚咖啡",
            isFocusBrand: false,
            queryRole: "CANDIDATE",
            attitude: "POSITIVE",
            mentionContext: [{ text: "适合外带。", polarity: "POSITIVE" }],
          },
        ],
        cardInterpretation: "该回答未提及青禾咖啡。",
      },
      context,
    );
    expect(output.mentioned).toBe(false);
    expect(output.position).toBeNull();
    expect(output.semantic.targetDisplayedForms).toEqual([]);
  });

  it("rejects duplicate subjects and focus leakage", () => {
    expect(() =>
      parseAndProjectSampleParserModelOutput(
        {
          brands: [brand("山岚咖啡", false), brand(" 山岚咖啡 ", false)],
          cardInterpretation: "该回答未提及青禾咖啡。",
        },
        context,
      ),
    ).toThrow("duplicate brand");

    expect(() =>
      parseAndProjectSampleParserModelOutput(
        {
          brands: [brand("青禾咖啡", false)],
          cardInterpretation: "该回答未提及青禾咖啡。",
        },
        context,
      ),
    ).toThrow(SampleParserSemanticError);

    expect(() =>
      parseAndProjectSampleParserModelOutput(
        {
          brands: [
            {
              ...brand("青禾咖啡", true),
              queryRole: "CANDIDATE",
            },
          ],
          cardInterpretation: "回答提及青禾咖啡。",
        },
        context,
      ),
    ).toThrow("cannot have query role");
  });

  it("keeps query use separate from sentiment and candidate order", () => {
    const output = parseAndProjectSampleParserModelOutput(
      {
        brands: [
          {
            displayName: "全聚德",
            isFocusBrand: false,
            queryRole: "NOT_APPLICABLE",
            attitude: "NEUTRAL",
            mentionContext: [
              {
                text: "没有显示在附近设有分店。",
                polarity: "NEUTRAL",
              },
            ],
          },
          {
            displayName: "青禾咖啡",
            isFocusBrand: true,
            queryRole: null,
            attitude: "POSITIVE",
            mentionContext: [{ text: "仍值得考虑。", polarity: "POSITIVE" }],
          },
          {
            displayName: "背景品牌",
            isFocusBrand: false,
            queryRole: "REFERENCE",
            attitude: "POSITIVE",
            mentionContext: [{ text: "只用于环境比较。", polarity: "NEUTRAL" }],
          },
          {
            displayName: "山岚咖啡",
            isFocusBrand: false,
            queryRole: "CANDIDATE",
            attitude: "NEGATIVE",
            mentionContext: [
              { text: "可作为备选但价格偏高。", polarity: "NEGATIVE" },
            ],
          },
        ],
        cardInterpretation: "回答将青禾咖啡作为相关选择。",
      },
      context,
    );

    expect(output.position).toBe(2);
    expect(output.semantic.otherBrands).toEqual([
      expect.objectContaining({
        displayName: "全聚德",
        role: "EXCLUDED",
        relativePosition: null,
        positionKind: null,
      }),
      expect.objectContaining({
        displayName: "背景品牌",
        role: "MENTIONED_ONLY",
        relativePosition: null,
        positionKind: null,
      }),
      expect.objectContaining({
        displayName: "山岚咖啡",
        role: "CONDITIONALLY_RECOMMENDED",
        relativePosition: 2,
        positionKind: "RECOMMENDATION",
      }),
    ]);
  });

  it("normalizes provider enum casing and a mixed overall attitude", () => {
    const output = parseAndProjectSampleParserModelOutput(
      {
        brands: [
          {
            displayName: "青禾咖啡",
            isFocusBrand: true,
            queryRole: null,
            attitude: "positive",
            mentionContext: [{ text: "环境安静。", polarity: "positive" }],
          },
          {
            displayName: "山岚咖啡",
            isFocusBrand: false,
            queryRole: "candidate",
            attitude: "mixed",
            mentionContext: [
              { text: "适合外带但价格略高。", polarity: "neutral" },
            ],
          },
        ],
        cardInterpretation: "回答将青禾咖啡作为相关选择。",
      },
      context,
    );

    expect(output.semantic.targetObservations[0]?.polarity).toBe("POSITIVE");
    expect(output.semantic.otherBrands).toEqual([
      expect.objectContaining({
        displayName: "山岚咖啡",
        role: "CONDITIONALLY_RECOMMENDED",
        relativePosition: 2,
      }),
    ]);
  });

  it("still rejects unknown provider enum values", () => {
    expect(() =>
      parseAndProjectSampleParserModelOutput(
        {
          brands: [
            {
              ...brand("青禾咖啡", true),
              attitude: "mostly-positive",
            },
          ],
          cardInterpretation: "回答提及青禾咖啡。",
        },
        context,
      ),
    ).toThrow();
  });

  it("allows no exact anchor and falls back to the unannotated answer", () => {
    const output = parseAndProjectSampleParserModelOutput(
      {
        brands: [brand("青禾咖啡", true)],
        cardInterpretation: "回答提及青禾咖啡。",
      },
      context,
    );
    expect(
      buildEvaluationHighlightProjection(
        context.originalAnswer,
        output.semantic,
      ),
    ).toEqual({ highlightUnavailable: true, highlights: [] });
  });

  it("still validates any legacy exact anchor that is present", () => {
    const output = legacyOpenOutput();
    expect(parseSampleParserOutput(output, context)).toEqual(output);
    output.semantic.evidenceAnchors[0]!.occurrence = 2;
    expect(() => parseSampleParserOutput(output, context)).toThrow(
      SampleParserSemanticError,
    );
  });

  it("keeps legacy and current stored semantic versions readable", () => {
    const semantic = legacyOpenOutput().semantic;
    expect(
      parseStoredSampleSemantic(
        LEGACY_SAMPLE_PARSER_CONTRACT_VERSION,
        semantic,
      ),
    ).toEqual(semantic);
    expect(
      parseStoredSampleSemantic(SAMPLE_PARSER_CONTRACT_VERSION, semantic),
    ).toEqual(semantic);
    expect(isReadableSampleParserContractVersion("unknown")).toBe(false);
  });

  it("preserves the explicit S3 compatibility decoder", () => {
    expect(
      parseStoredSampleSemantic(S3_COMPATIBILITY_CONTRACT_VERSION, {
        profile: "S3_COMPATIBILITY",
        migratedDescription: null,
        migratedCharacteristics: [],
        migratedSummary: "历史摘要",
        migratedStructuredEvidence: {},
        highlightUnavailable: true,
      }),
    ).toMatchObject({ profile: "S3_COMPATIBILITY" });
  });
});

function brand(displayName: string, isFocusBrand: boolean) {
  return {
    displayName,
    isFocusBrand,
    queryRole: isFocusBrand ? null : ("CANDIDATE" as const),
    attitude: "POSITIVE" as const,
    mentionContext: [
      {
        text: `${displayName}被作为相关选择介绍。`,
        polarity: "POSITIVE" as const,
      },
    ],
  };
}

function legacyOpenOutput() {
  return {
    family: "OPEN_DISCOVERY" as const,
    questionKind: "INDUSTRY_RECOMMENDATION" as const,
    mentioned: true,
    position: 2,
    semantic: {
      profile: "OPEN_DISCOVERY" as const,
      answerStructure: "PARAGRAPHS" as const,
      targetDisplayedForms: ["青禾咖啡"],
      targetObservations: [],
      otherBrands: [],
      evidenceAnchors: [
        {
          anchorId: "target",
          exactText: "青禾咖啡",
          occurrence: 1,
          purposes: ["TARGET_MENTION" as const, "TARGET_POSITION" as const],
        },
      ],
      cardInterpretation: "回答提及青禾咖啡。",
      limitations: [],
      targetRole: "RECOMMENDED" as const,
      recommendationReasons: [],
      conditions: [],
      queryFit: [],
    },
  };
}
