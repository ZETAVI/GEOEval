import { describe, expect, it } from "vitest";

import {
  EVALUATION_QUESTION_GENERATION_MODEL_CONTRACT_VERSION,
  EvaluationQuestionGenerationSemanticError,
  evaluationQuestionGenerationModelJsonSchema,
  parseAndProjectEvaluationQuestionModelOutput,
} from "../src/geo-intelligence/domain/evaluation-question-generation-model.contract.js";
import {
  buildEvaluationQuestionGenerationTask,
  evaluationQuestionGenerationInstructionSnapshot,
  evaluationQuestionGenerationTaskContext,
} from "../src/geo-intelligence/evaluation-question-generation.policy.js";

const companyName = "互动派科技股份有限公司";

describe("evaluation question generation contract", () => {
  it("builds one no-search structured task from resolved brand meaning", () => {
    const task = buildEvaluationQuestionGenerationTask({
      companyName,
      regionLabel: "广东省广州市天河区",
      primaryIndustryLabel: "企业服务与专业服务",
      secondaryIndustryLabel: "营销策划与广告代理",
      recommendationSubject: "营销策划或广告代理公司",
      characteristicOne: "抖音、小红书双平台官方授权一级广告代理",
      characteristicTwo: "从策划到落地执行的一站式数字营销服务",
    });

    expect(task.userContext).toMatchObject({
      capabilities: { publicSearch: false },
      companyName,
      regionLabel: "广东省广州市天河区",
      recommendationSubject: "营销策划或广告代理公司",
    });
    expect(task.outputContract.version).toBe(
      EVALUATION_QUESTION_GENERATION_MODEL_CONTRACT_VERSION,
    );
    expect(task.outputContract.jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      properties: {
        queryTargetName: {},
        candidateGroups: {},
        selectedQuestions: {},
        selectionNote: {},
      },
    });
    expect(evaluationQuestionGenerationModelJsonSchema).not.toHaveProperty(
      "oneOf",
    );

    const instruction = evaluationQuestionGenerationInstructionSnapshot();
    expect(instruction).toMatchObject({
      id: "evaluation.question-generation.profile",
      version: "1.2.0+1.2.0",
    });
    expect(instruction.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(instruction.content).toContain("不联网");
  });

  it("uses the accepted official path for V2 and retains legacy text compatibility", () => {
    expect(
      evaluationQuestionGenerationTaskContext({
        schemaVersion: "brand-evaluation-snapshot@2",
        companyName,
        industry: {
          catalogId: "industry-catalog",
          catalogVersion: "1.0.0",
          primary: { id: "IND-06", label: "企业服务与专业服务" },
          secondary: { id: "IND-06-07", label: "营销策划与广告代理" },
          otherProductOrService: null,
          recommendationSubject: "营销策划或广告代理公司",
        },
        region: {
          sourceReleaseId: "mca-administrative-divisions@2025-12-31",
          province: { id: "beijing", label: "北京市" },
          city: {
            id: "beijing-repeat",
            label: "北京市",
            identityKind: "MUNICIPALITY_REPEAT",
            officialDivisionId: null,
          },
          terminal: {
            id: "chaoyang",
            label: "朝阳区",
            officialCode: "110105",
            officialLevel: "COUNTY",
          },
          officialPath: [
            {
              id: "beijing",
              label: "北京市",
              officialCode: "110000",
              officialLevel: "PROVINCE",
            },
            {
              id: "chaoyang",
              label: "朝阳区",
              officialCode: "110105",
              officialLevel: "COUNTY",
            },
          ],
        },
        characteristicOne: "品牌策略",
        characteristicTwo: "内容与投放执行",
      }),
    ).toMatchObject({
      regionLabel: "北京市朝阳区",
      recommendationSubject: "营销策划或广告代理公司",
    });

    expect(
      evaluationQuestionGenerationTaskContext({
        companyName: "星河咖啡",
        primaryIndustry: "本地生活",
        secondaryIndustry: "咖啡店",
        characteristicOne: "安静办公",
        characteristicTwo: "手冲咖啡",
        province: "广东省",
        city: "广州市",
        district: "天河区",
      }),
    ).toMatchObject({
      regionLabel: "广东省广州市天河区",
      recommendationSubject: "咖啡店",
    });
  });

  it("projects one coherent selected four-question set", () => {
    expect(
      parseAndProjectEvaluationQuestionModelOutput(validOutput(), {
        companyName,
      }),
    ).toEqual([
      {
        kind: "BRAND_DIRECTED",
        ordinal: 1,
        content:
          "广州互动派这家数字营销公司怎么样，主要提供哪些业务和服务，市场口碑如何？",
      },
      {
        kind: "INDUSTRY_RECOMMENDATION",
        ordinal: 2,
        content:
          "广州有哪些值得考虑的营销策划或广告代理公司，选择时可以重点看哪些方面？",
      },
      {
        kind: "CHARACTERISTIC_ONE",
        ordinal: 3,
        content:
          "广州有哪些同时熟悉抖音和小红书广告投放的服务商，各自适合什么需求？",
      },
      {
        kind: "CHARACTERISTIC_TWO",
        ordinal: 4,
        content:
          "广州有哪些能从营销策划到内容制作和投放执行提供一站式服务的公司？",
      },
    ]);
  });

  it("rejects a direct question that omits the chosen target name", () => {
    const output = validOutput();
    output.candidateGroups[0]!.candidates[0] = "这家公司的数字营销服务怎么样？";
    output.selectedQuestions[0]!.content = "这家公司的数字营销服务怎么样？";

    expect(() =>
      parseAndProjectEvaluationQuestionModelOutput(output, { companyName }),
    ).toThrowError(EvaluationQuestionGenerationSemanticError);
  });

  it("rejects an open question that forces the target brand name", () => {
    const output = validOutput();
    output.candidateGroups[1]!.candidates[0] =
      "互动派科技股份有限公司在广州的广告代理公司中值得推荐吗？";
    output.selectedQuestions[1]!.content =
      "互动派科技股份有限公司在广州的广告代理公司中值得推荐吗？";

    expect(() =>
      parseAndProjectEvaluationQuestionModelOutput(output, { companyName }),
    ).toThrowError(/INDUSTRY_RECOMMENDATION contains the target brand name/);
  });

  it("rejects an invented target name outside the full company name", () => {
    const output = validOutput();
    output.queryTargetName = "派互动";

    expect(() =>
      parseAndProjectEvaluationQuestionModelOutput(output, { companyName }),
    ).toThrowError(/queryTargetName is not contained in companyName/);
  });

  it("rejects a selection that is not one of its candidates", () => {
    const output = validOutput();
    output.selectedQuestions[2]!.content =
      "广州有哪些适合品牌长期合作的双平台广告服务商？";

    expect(() =>
      parseAndProjectEvaluationQuestionModelOutput(output, { companyName }),
    ).toThrowError(/CHARACTERISTIC_ONE selected content is not a candidate/);
  });

  it("rejects missing or reordered question roles", () => {
    const output = validOutput();
    [output.selectedQuestions[1], output.selectedQuestions[2]] = [
      output.selectedQuestions[2]!,
      output.selectedQuestions[1]!,
    ];

    expect(() =>
      parseAndProjectEvaluationQuestionModelOutput(output, { companyName }),
    ).toThrowError(
      /selectedQuestions does not contain the required ordered roles/,
    );
  });
});

function validOutput() {
  return {
    queryTargetName: "互动派",
    candidateGroups: [
      {
        kind: "BRAND_DIRECTED" as const,
        candidates: [
          "广州互动派这家数字营销公司怎么样，主要提供哪些业务和服务，市场口碑如何？",
          "广州互动派主要提供哪些数字营销服务，整体表现怎么样？",
        ],
      },
      {
        kind: "INDUSTRY_RECOMMENDATION" as const,
        candidates: [
          "广州有哪些值得考虑的营销策划或广告代理公司，选择时可以重点看哪些方面？",
          "在广州选择数字营销服务商时，有哪些公司值得了解？",
        ],
      },
      {
        kind: "CHARACTERISTIC_ONE" as const,
        candidates: [
          "广州有哪些同时熟悉抖音和小红书广告投放的服务商，各自适合什么需求？",
          "想同时做抖音和小红书推广，广州有哪些广告服务商值得考虑？",
        ],
      },
      {
        kind: "CHARACTERISTIC_TWO" as const,
        candidates: [
          "广州有哪些能从营销策划到内容制作和投放执行提供一站式服务的公司？",
          "需要完整数字营销方案时，广州有哪些公司可以提供策划和落地执行？",
        ],
      },
    ],
    selectedQuestions: [
      {
        kind: "BRAND_DIRECTED" as const,
        content:
          "广州互动派这家数字营销公司怎么样，主要提供哪些业务和服务，市场口碑如何？",
      },
      {
        kind: "INDUSTRY_RECOMMENDATION" as const,
        content:
          "广州有哪些值得考虑的营销策划或广告代理公司，选择时可以重点看哪些方面？",
      },
      {
        kind: "CHARACTERISTIC_ONE" as const,
        content:
          "广州有哪些同时熟悉抖音和小红书广告投放的服务商，各自适合什么需求？",
      },
      {
        kind: "CHARACTERISTIC_TWO" as const,
        content:
          "广州有哪些能从营销策划到内容制作和投放执行提供一站式服务的公司？",
      },
    ],
    selectionNote:
      "四问分别覆盖品牌现状、行业选择、双平台投放需求和一站式执行需求。",
  };
}
