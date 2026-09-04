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
import type { EvaluationBrandSnapshot } from "../src/geo-intelligence/domain/evaluation-brand-snapshot.js";

const companyName = "互动派科技股份有限公司";

describe("evaluation question generation contract", () => {
  it("builds one no-search structured task from the narrow Snapshot v3 Query projection", () => {
    const task = buildEvaluationQuestionGenerationTask({
      companyName,
      recommendationSubject: "营销策划或广告代理公司",
      location: {
        cityLabel: "广州市",
        terminalRegionLabel: "天河区",
        locality: { kind: "BUSINESS_AREA", label: "天河路" },
      },
      flagshipProductOrService: "抖音和小红书广告代理服务",
      characteristics: ["双平台官方广告代理", "从策划到投放的一站式服务"],
    });

    expect(task.userContext).toEqual({
      capabilities: { publicSearch: false },
      companyName,
      recommendationSubject: "营销策划或广告代理公司",
      location: {
        cityLabel: "广州市",
        terminalRegionLabel: "天河区",
        locality: { kind: "BUSINESS_AREA", label: "天河路" },
      },
      flagshipProductOrService: "抖音和小红书广告代理服务",
      characteristics: ["双平台官方广告代理", "从策划到投放的一站式服务"],
    });
    expect(task.outputContract.version).toBe(
      EVALUATION_QUESTION_GENERATION_MODEL_CONTRACT_VERSION,
    );
    expect(task.outputContract.jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      properties: {
        queryTargetName: {},
        brandDirected: {},
        industryRecommendation: {},
        characteristicAngleOne: {},
        characteristicAngleTwo: {},
      },
      required: [
        "queryTargetName",
        "brandDirected",
        "industryRecommendation",
        "characteristicAngleOne",
        "characteristicAngleTwo",
      ],
    });
    expect(task.outputContract.jsonSchema).not.toHaveProperty(
      "properties.candidateGroups",
    );
    expect(evaluationQuestionGenerationModelJsonSchema).not.toHaveProperty(
      "oneOf",
    );

    const instruction = evaluationQuestionGenerationInstructionSnapshot();
    expect(instruction).toMatchObject({
      id: "evaluation.question-generation.profile",
      version: "2.0.0+2.0.0",
    });
    expect(instruction.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(instruction.content).toContain("三个开放问题最重要");
    expect(instruction.content).toContain("不联网");
    expect(instruction.content).not.toContain("candidateGroups");
    expect(instruction.content).not.toContain("selectionNote");
  });

  it("projects only the frozen v3 location, flagship, recommendation subject, and peer characteristics", () => {
    expect(evaluationQuestionGenerationTaskContext(snapshot())).toEqual({
      companyName,
      recommendationSubject: "营销策划或广告代理公司",
      location: {
        cityLabel: "广州市",
        terminalRegionLabel: "天河区",
        locality: { kind: "BUSINESS_AREA", label: "天河路" },
      },
      flagshipProductOrService: "抖音和小红书广告代理服务",
      characteristics: [
        "双平台官方广告代理",
        "从策划到投放的一站式服务",
        "本地项目执行团队",
      ],
    });
  });

  it("projects the four final strings into the fixed business roles", () => {
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
          "我们准备做抖音和小红书推广，广州天河路附近有哪些广告代理公司值得了解？",
      },
      {
        kind: "CHARACTERISTIC_ONE",
        ordinal: 3,
        content:
          "想把抖音和小红书广告交给同一家服务商，广州天河路附近有哪些选择？",
      },
      {
        kind: "CHARACTERISTIC_TWO",
        ordinal: 4,
        content:
          "一个品牌项目需要从策划到投放完整执行，广州天河路附近有哪些公司可以承接？",
      },
    ]);
  });

  it("rejects a direct question that omits the chosen target name", () => {
    const output = validOutput();
    output.brandDirected = "广州这家数字营销公司主要提供哪些服务？";

    expect(() =>
      parseAndProjectEvaluationQuestionModelOutput(output, { companyName }),
    ).toThrowError(EvaluationQuestionGenerationSemanticError);
  });

  it("rejects an open question that forces the target brand name", () => {
    const output = validOutput();
    output.industryRecommendation =
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

  it("rejects candidate and explanation fields removed from model contract v2", () => {
    expect(() =>
      parseAndProjectEvaluationQuestionModelOutput(
        {
          ...validOutput(),
          candidateGroups: [],
          selectionNote: "不应再输出",
        },
        { companyName },
      ),
    ).toThrow();
  });
});

function validOutput() {
  return {
    queryTargetName: "互动派",
    brandDirected:
      "广州互动派这家数字营销公司怎么样，主要提供哪些业务和服务，市场口碑如何？",
    industryRecommendation:
      "我们准备做抖音和小红书推广，广州天河路附近有哪些广告代理公司值得了解？",
    characteristicAngleOne:
      "想把抖音和小红书广告交给同一家服务商，广州天河路附近有哪些选择？",
    characteristicAngleTwo:
      "一个品牌项目需要从策划到投放完整执行，广州天河路附近有哪些公司可以承接？",
  };
}

function snapshot(): EvaluationBrandSnapshot {
  return {
    schemaVersion: "brand-evaluation-snapshot@3",
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
      province: { id: "guangdong", label: "广东省" },
      city: {
        id: "guangzhou",
        label: "广州市",
        identityKind: "OFFICIAL_DIVISION",
        officialDivisionId: "guangzhou",
      },
      terminal: {
        id: "tianhe",
        label: "天河区",
        officialCode: "440106",
        officialLevel: "COUNTY",
      },
      officialPath: [
        {
          id: "guangdong",
          label: "广东省",
          officialCode: "440000",
          officialLevel: "PROVINCE",
        },
        {
          id: "guangzhou",
          label: "广州市",
          officialCode: "440100",
          officialLevel: "PREFECTURE",
        },
        {
          id: "tianhe",
          label: "天河区",
          officialCode: "440106",
          officialLevel: "COUNTY",
        },
      ],
    },
    storeLocation: {
      semanticFactId: "00000000-0000-4000-8000-000000000026",
      placeName: "天河路项目中心",
      formattedAddress: "广东省广州市天河区天河路123号",
      coordinate: {
        longitude: 113.32,
        latitude: 23.13,
        system: "GCJ_02",
      },
      queryLocality: { kind: "BUSINESS_AREA", label: "天河路" },
      source: {
        provider: "AMAP",
        placeId: "fixture-interaction-pie",
        contractVersion: "fixture@1",
        verifiedAt: "2026-09-04T00:00:00.000Z",
      },
    },
    flagshipProductOrService: "抖音和小红书广告代理服务",
    characteristics: [
      "双平台官方广告代理",
      "从策划到投放的一站式服务",
      "本地项目执行团队",
    ],
  };
}
