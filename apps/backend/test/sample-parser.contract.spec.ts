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
import {
  SAMPLE_PARSER_MODEL_CONTRACT_VERSION,
  parseAndProjectSampleParserModelOutput,
  sampleParserModelJsonSchemaForQuestionKind,
  type SampleParserModelOutput,
} from "../src/geo-intelligence/domain/sample-parser-model.contract.js";
import {
  buildSampleParserTask,
  sampleParserInstructionProfile,
} from "../src/geo-intelligence/sample-parser.policy.js";

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
    expect(SAMPLE_PARSER_MODEL_CONTRACT_VERSION).toBe(
      "evaluation.sample-parser-model@4",
    );
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

  it("sends only the immutable question family's schema to the provider", () => {
    const openTask = buildSampleParserTask({
      companyName: "星河咖啡",
      primaryIndustry: "本地生活",
      secondaryIndustry: "咖啡饮品",
      region: "广东省广州市天河区",
      characteristicOne: "安静办公空间",
      characteristicTwo: "手冲咖啡",
      questionKind: "CHARACTERISTIC_ONE",
      question: "有哪些适合办公的咖啡店？",
      originalAnswer: "星河咖啡适合办公。",
    });
    expect(openTask.outputContract.jsonSchema).toMatchObject({
      properties: {
        family: { const: "OPEN_DISCOVERY" },
      },
    });
    expect(openTask.outputContract.jsonSchema).not.toHaveProperty("oneOf");
    expect(openTask.outputContract.version).toBe(
      SAMPLE_PARSER_MODEL_CONTRACT_VERSION,
    );
    expect(openTask.systemInstruction).toContain(
      "cardInterpretation 面向非专业客户",
    );
    expect(openTask.systemInstruction).toContain(
      "cardInterpretation 写“该回答未提及当前品牌。”",
    );
    expect(sampleParserInstructionProfile("CHARACTERISTIC_ONE")).toBe(
      "evaluation.sample-parser.common@2.2.0+evaluation.sample-parser.open-discovery@2.2.0",
    );
    expect(sampleParserInstructionProfile("BRAND_DIRECTED")).toBe(
      "evaluation.sample-parser.common@2.2.0+evaluation.sample-parser.brand-directed@2.2.0",
    );

    expect(
      sampleParserModelJsonSchemaForQuestionKind("BRAND_DIRECTED"),
    ).toMatchObject({
      properties: {
        family: { const: "BRAND_DIRECTED" },
        semantic: {
          properties: {
            cardInterpretation: {
              description: expect.stringContaining("面向客户"),
            },
          },
        },
      },
    });
  });

  it("projects simple model evidence into stable domain identities and references", () => {
    const answer =
      "云栖咖啡的座位数量较多。\n\n星河咖啡设置了独立办公区域。\n\n林间咖啡以户外空间为主。";
    const targetEvidence = {
      exactText: "星河咖啡设置了独立办公区域。",
      occurrence: 1,
    };
    const output = parseAndProjectSampleParserModelOutput(
      {
        family: "OPEN_DISCOVERY",
        questionKind: "CHARACTERISTIC_ONE",
        mentioned: true,
        position: 2,
        semantic: {
          profile: "OPEN_DISCOVERY",
          answerStructure: "PARAGRAPHS",
          targetDisplayedForms: ["星河咖啡"],
          targetMentionEvidence: [targetEvidence],
          targetPositionEvidence: [targetEvidence],
          targetRole: "CONDITIONALLY_RECOMMENDED",
          targetObservations: [
            {
              category: "QUERY_FIT",
              label: "办公场景匹配",
              detail: "独立办公区域与问题相关。",
              polarity: "POSITIVE",
              evidence: [targetEvidence],
            },
          ],
          otherBrands: [
            {
              displayName: "云栖咖啡",
              observedForms: ["云栖咖啡"],
              role: "COMPARED",
              relativePosition: 1,
              positionKind: "RECOMMENDATION",
              evidence: [
                {
                  exactText: "云栖咖啡的座位数量较多。",
                  occurrence: 1,
                },
              ],
            },
            {
              displayName: "林间咖啡",
              observedForms: ["林间咖啡"],
              role: "COMPARED",
              relativePosition: 3,
              positionKind: "RECOMMENDATION",
              evidence: [
                {
                  exactText: "林间咖啡以户外空间为主。",
                  occurrence: 1,
                },
              ],
            },
          ],
          cardInterpretation: "当前品牌位于第二个候选。",
          limitations: [],
        },
      },
      {
        questionKind: "CHARACTERISTIC_ONE",
        companyName: "星河咖啡",
        originalAnswer: answer,
      },
    );

    expect(output).toMatchObject({
      family: "OPEN_DISCOVERY",
      mentioned: true,
      position: 2,
      semantic: {
        profile: "OPEN_DISCOVERY",
        queryFit: [{ observationId: "o1" }],
        otherBrands: [
          { brandMentionId: "b1", displayName: "云栖咖啡" },
          { brandMentionId: "b2", displayName: "林间咖啡" },
        ],
      },
    });
    if (output.family !== "OPEN_DISCOVERY") throw new Error("wrong family");
    expect(
      output.semantic.evidenceAnchors.find(
        (anchor) => anchor.exactText === targetEvidence.exactText,
      )?.purposes,
    ).toEqual(["TARGET_MENTION", "TARGET_POSITION", "DESCRIPTION"]);
  });

  it("replays a protected non-mention structural fragment with a formal fallback", () => {
    const originalAnswer = "1. 晨光餐厅\n2. 城市餐厅";
    const input: SampleParserModelOutput = {
      family: "OPEN_DISCOVERY",
      questionKind: "INDUSTRY_RECOMMENDATION",
      mentioned: false,
      position: null,
      semantic: {
        profile: "OPEN_DISCOVERY",
        answerStructure: "UNORDERED_LIST",
        targetDisplayedForms: [],
        targetMentionEvidence: [],
        targetPositionEvidence: [],
        targetRole: "NOT_MENTIONED",
        targetObservations: [],
        otherBrands: [],
        cardInterpretation: "}}}",
        limitations: [
          "结果仅反映本次回答。",
          "未核验线下经营情况。",
          "候选顺序不代表长期表现。",
        ],
      },
    };

    const output = parseAndProjectSampleParserModelOutput(input, {
      questionKind: "INDUSTRY_RECOMMENDATION",
      companyName: "星河餐厅",
      originalAnswer,
    });

    expect(output).toMatchObject({
      mentioned: false,
      position: null,
      semantic: {
        cardInterpretation: "该回答未提及当前品牌。",
        targetRole: "NOT_MENTIONED",
      },
    });

    input.semantic.cardInterpretation = "回答有效，但没有明确提及当前品牌。";
    expect(
      parseAndProjectSampleParserModelOutput(input, {
        questionKind: "INDUSTRY_RECOMMENDATION",
        companyName: "星河餐厅",
        originalAnswer,
      }).semantic.cardInterpretation,
    ).toBe("回答有效，但没有明确提及当前品牌。");
  });

  it("falls back from a structural fragment using only accepted mention and position", () => {
    const answer = "1. 星河咖啡值得关注。";
    const input = validOpenModel(answer);
    input.semantic.cardInterpretation = "[]";

    const output = parseAndProjectSampleParserModelOutput(input, {
      questionKind: "CHARACTERISTIC_ONE",
      companyName: "星河咖啡",
      originalAnswer: answer,
    });

    expect(output).toMatchObject({
      mentioned: true,
      position: 1,
      semantic: {
        cardInterpretation: "该回答提及了当前品牌，位于第1个候选位置。",
      },
    });
  });

  it("drops unsupported optional detail and recovers literal target anchors", () => {
    const answer =
      "1. 星河咖啡值得关注。\n2. 晨光咖啡也可比较。\nA品牌与B品牌也可比较。";
    const input = validOpenModel(answer);
    input.semantic.targetMentionEvidence = [];
    input.semantic.targetPositionEvidence = [];
    input.semantic.targetObservations = [
      {
        category: "QUERY_FIT",
        label: "进入候选",
        detail: "回答将品牌列入候选。",
        polarity: "POSITIVE",
        evidence: [{ exactText: "星河咖啡值得关注。", occurrence: 1 }],
      },
      {
        category: "GENERAL",
        label: "无效观察",
        detail: "该观察没有原文依据。",
        polarity: "UNCERTAIN",
        evidence: [{ exactText: "原文中不存在的内容", occurrence: 1 }],
      },
    ];
    input.semantic.otherBrands = [
      {
        displayName: "晨光咖啡",
        observedForms: ["晨光咖啡"],
        role: "COMPARED",
        relativePosition: 2,
        positionKind: null,
        evidence: [{ exactText: "晨光咖啡也可比较。", occurrence: 1 }],
      },
      {
        displayName: "晨光咖啡",
        observedForms: ["晨光咖啡"],
        role: "MENTIONED_ONLY",
        relativePosition: null,
        positionKind: null,
        evidence: [{ exactText: "晨光咖啡也可比较。", occurrence: 1 }],
      },
      {
        displayName: "无依据品牌",
        observedForms: ["无依据品牌"],
        role: "MENTIONED_ONLY",
        relativePosition: null,
        positionKind: null,
        evidence: [{ exactText: "不存在的品牌证据", occurrence: 1 }],
      },
      {
        displayName: ":",
        observedForms: ["A品牌"],
        role: "MENTIONED_ONLY",
        relativePosition: null,
        positionKind: null,
        evidence: [{ exactText: "A品牌与B品牌也可比较。", occurrence: 1 }],
      },
      {
        displayName: ":",
        observedForms: ["B品牌"],
        role: "MENTIONED_ONLY",
        relativePosition: null,
        positionKind: null,
        evidence: [{ exactText: "A品牌与B品牌也可比较。", occurrence: 1 }],
      },
    ];

    const output = parseAndProjectSampleParserModelOutput(input, {
      questionKind: "CHARACTERISTIC_ONE",
      companyName: "星河咖啡",
      originalAnswer: answer,
    });

    expect(output).toMatchObject({ mentioned: true, position: 1 });
    if (output.family !== "OPEN_DISCOVERY") throw new Error("wrong family");
    expect(output.semantic.queryFit).toHaveLength(1);
    expect(output.semantic.targetObservations).toEqual([]);
    expect(output.semantic.otherBrands).toEqual([
      expect.objectContaining({
        displayName: "晨光咖啡",
        relativePosition: null,
        positionKind: null,
      }),
    ]);
    expect(
      output.semantic.evidenceAnchors.some(
        (anchor) =>
          anchor.exactText === "星河咖啡" &&
          anchor.purposes.includes("TARGET_MENTION") &&
          anchor.purposes.includes("TARGET_POSITION"),
      ),
    ).toBe(true);
  });

  it("still rejects a claimed mention without a literal target form", () => {
    const answer = "回答只提到了晨光咖啡。";
    const input = validOpenModel(answer);
    input.semantic.targetDisplayedForms = ["陌生别名"];
    input.semantic.targetMentionEvidence = [
      { exactText: "陌生别名", occurrence: 1 },
    ];
    input.semantic.targetPositionEvidence = [
      { exactText: "陌生别名", occurrence: 1 },
    ];

    expect(() =>
      parseAndProjectSampleParserModelOutput(input, {
        questionKind: "CHARACTERISTIC_ONE",
        companyName: "星河咖啡",
        originalAnswer: answer,
      }),
    ).toThrow();
  });

  it("bounds directed observations per canonical category", () => {
    const answer = "星河咖啡是一家咖啡品牌。";
    const evidence = { exactText: answer, occurrence: 1 };
    const input: SampleParserModelOutput = {
      family: "BRAND_DIRECTED",
      mentioned: true,
      position: null,
      semantic: {
        profile: "BRAND_DIRECTED",
        answerStructure: "PARAGRAPHS",
        targetDisplayedForms: ["星河咖啡"],
        targetMentionEvidence: [evidence],
        otherBrands: [],
        targetObservations: Array.from({ length: 20 }, (_, index) => ({
          category: "IDENTITY" as const,
          label: `品牌身份 ${index + 1}`,
          detail: "回答介绍了品牌身份。",
          polarity: "NEUTRAL" as const,
          evidence: [evidence],
        })),
        contextualTargetPosition: null,
        contextualPositionEvidence: [],
        cardInterpretation: "回答介绍了当前品牌。",
        limitations: [],
      },
    };

    const output = parseAndProjectSampleParserModelOutput(input, {
      questionKind: "BRAND_DIRECTED",
      companyName: "星河咖啡",
      originalAnswer: answer,
    });
    if (output.family !== "BRAND_DIRECTED") throw new Error("wrong family");
    expect(output.semantic.statedIdentity).toHaveLength(12);
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

function validOpenModel(originalAnswer: string): SampleParserModelOutput {
  const targetEvidence = {
    exactText: "星河咖啡值得关注。",
    occurrence: 1,
  };
  return {
    family: "OPEN_DISCOVERY",
    questionKind: "CHARACTERISTIC_ONE",
    mentioned: true,
    position: 1,
    semantic: {
      profile: "OPEN_DISCOVERY",
      answerStructure: "ORDERED_LIST",
      targetDisplayedForms: ["星河咖啡"],
      targetMentionEvidence: [targetEvidence],
      targetPositionEvidence: [targetEvidence],
      targetRole: "RECOMMENDED",
      targetObservations: [],
      otherBrands: [],
      cardInterpretation: originalAnswer.includes("星河咖啡")
        ? "回答将当前品牌列入候选。"
        : "回答声称当前品牌进入候选。",
      limitations: [],
    },
  };
}
