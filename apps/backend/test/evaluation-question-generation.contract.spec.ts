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
      id: "evaluation.question-generation.common",
      version: "1.0.0",
    });
    expect(instruction.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(instruction.content).toContain("不联网");
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
          "互动派科技股份有限公司的数字营销服务怎么样，有哪些主要特点和需要注意的地方？",
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

  it("rejects a direct question that omits the exact company name", () => {
    const output = validOutput();
    output.candidateGroups[0]!.candidates[0] = "这家公司的数字营销服务怎么样？";
    output.selectedQuestions[0]!.content = "这家公司的数字营销服务怎么样？";

    expect(() =>
      parseAndProjectEvaluationQuestionModelOutput(output, { companyName }),
    ).toThrowError(EvaluationQuestionGenerationSemanticError);
  });

  it("rejects an open question that forces the exact company name", () => {
    const output = validOutput();
    output.candidateGroups[1]!.candidates[0] =
      "互动派科技股份有限公司在广州的广告代理公司中值得推荐吗？";
    output.selectedQuestions[1]!.content =
      "互动派科技股份有限公司在广州的广告代理公司中值得推荐吗？";

    expect(() =>
      parseAndProjectEvaluationQuestionModelOutput(output, { companyName }),
    ).toThrowError(/INDUSTRY_RECOMMENDATION contains the exact company name/);
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
    candidateGroups: [
      {
        kind: "BRAND_DIRECTED" as const,
        candidates: [
          "互动派科技股份有限公司的数字营销服务怎么样，有哪些主要特点和需要注意的地方？",
          "互动派科技股份有限公司主要提供哪些营销服务，适合哪些企业？",
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
          "互动派科技股份有限公司的数字营销服务怎么样，有哪些主要特点和需要注意的地方？",
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
