import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { WriterPurposeBrandView } from "../src/brand/domain/brand.types.js";
import type { EvaluationOptimizationGuidanceView } from "../src/geo-intelligence/domain/evaluation-optimization-guidance.view.js";
import {
  WriterContractError,
  buildWriterRequest,
  normalizeWriterResult,
  parseWriterRequest,
} from "../src/geo-optimization/domain/writer.contract.js";
import { DeterministicCoreArticleWriter } from "../src/geo-optimization/infrastructure/deterministic-core-article.writer.js";
import { GeoOptimizationModule } from "../src/geo-optimization/geo-optimization.module.js";

describe("Core Article Writer contract", () => {
  it("builds one minimal request without contacts, report evidence or materials", () => {
    const request = buildWriterRequest(brandFixture(), guidanceFixture());

    expect(request).toMatchObject({
      contractVersion: "geo-optimization.writer-request@1",
      customerProvidedContent: {
        brandName: "星河咖啡",
        flagshipProductOrService: "精品手冲咖啡",
      },
      preparedMaterialDigest: null,
    });
    const serialized = JSON.stringify(request);
    for (const excluded of [
      "contactName",
      "contactMobile",
      "sampleId",
      "evidenceRefs",
      "recommendationIndex",
      "provider",
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("returns the same single title and Markdown body for the same request", async () => {
    const request = buildWriterRequest(brandFixture(), guidanceFixture());
    const writer = new DeterministicCoreArticleWriter();

    const first = await writer.write(request);
    const second = await writer.write(request);

    expect(first).toEqual(second);
    expect(first.title).toContain("星河咖啡");
    expect(first.bodyMarkdown).toContain("## 品牌特点");
    expect(first.bodyMarkdown).toContain("人民币 28–68 元");
    expect(first).toEqual({
      title: expect.any(String),
      bodyMarkdown: expect.any(String),
    });

    const longBrand = brandFixture();
    longBrand.companyName = "长".repeat(200);
    await expect(
      writer.write(buildWriterRequest(longBrand, guidanceFixture())),
    ).resolves.toMatchObject({ title: expect.any(String) });
  });

  it("rejects a changed generation policy instead of silently replaying it", () => {
    const request = buildWriterRequest(brandFixture(), guidanceFixture());
    expect(() =>
      parseWriterRequest({
        ...request,
        generationPolicy: {
          ...request.generationPolicy,
          instruction: `${request.generationPolicy.instruction} changed`,
        },
      }),
    ).toThrow(WriterContractError);
    expect(() =>
      normalizeWriterResult({ title: " ", bodyMarkdown: "正文" }),
    ).toThrow(WriterContractError);
    expect(() => normalizeWriterResult({ title: "标题" })).toThrow(
      WriterContractError,
    );
  });

  it("fails closed for deterministic or unknown production Writer modes", () => {
    const storeLocation = {
      mode: "disabled" as const,
      receiptSigningSecret: "",
      receiptTtlSeconds: 900,
      requestTimeoutMs: 5000,
      amapBaseUrl: "https://restapi.amap.com",
      amapWebServiceKey: "",
    };
    expect(() =>
      GeoOptimizationModule.register({
        writerMode: "deterministic",
        runtimeEnvironment: "production",
        storeLocation,
      }),
    ).toThrow("cannot run in production");
    expect(() =>
      GeoOptimizationModule.register({
        writerMode: "real",
        runtimeEnvironment: "production",
        storeLocation,
      } as never),
    ).toThrow("Unsupported Core Article Writer mode");
    expect(() =>
      GeoOptimizationModule.register({
        writerMode: "disabled",
        runtimeEnvironment: "production",
        storeLocation,
      }),
    ).not.toThrow();
  });
});

function brandFixture(): WriterPurposeBrandView {
  return {
    accountId: randomUUID(),
    brandId: randomUUID(),
    revision: 2,
    writingContextFingerprint: "a".repeat(64),
    companyName: "星河咖啡",
    industry: {
      catalogId: "industry-catalog",
      catalogVersion: "1.0.0",
      primary: { id: "IND-01", label: "本地生活与门店服务" },
      secondary: { id: "IND-01-02", label: "咖啡馆" },
      otherProductOrService: null,
      recommendationSubject: "咖啡馆",
    },
    region: {
      sourceReleaseId: "mca-2024",
      province: { id: "44", label: "广东省" },
      city: {
        id: "4401",
        label: "广州市",
        identityKind: "OFFICIAL_DIVISION",
        officialDivisionId: "4401",
      },
      terminal: {
        id: "440105",
        label: "海珠区",
        officialCode: "440105",
        officialLevel: "COUNTY",
      },
      officialPath: [
        {
          id: "44",
          label: "广东省",
          officialCode: "44",
          officialLevel: "PROVINCE",
        },
        {
          id: "4401",
          label: "广州市",
          officialCode: "4401",
          officialLevel: "PREFECTURE",
        },
        {
          id: "440105",
          label: "海珠区",
          officialCode: "440105",
          officialLevel: "COUNTY",
        },
      ],
    },
    storeLocation: {
      semanticFactId: randomUUID(),
      placeName: "广州塔店",
      formattedAddress: "广东省广州市海珠区阅江西路222号",
      queryLocality: { kind: "BUSINESS_AREA", label: "赤岗" },
    },
    flagshipProductOrService: "精品手冲咖啡",
    characteristics: [
      {
        id: randomUUID(),
        title: "安静办公",
        detail: "提供安静座位与稳定网络",
      },
      { id: randomUUID(), title: "精品手冲", detail: null },
    ],
    articleInformation: {
      price: { mode: "RANGE", minimum: 28, maximum: 68 },
      suitableAudienceContexts: ["需要安静办公的顾客"],
      supplementalBackground: "团队持有专业咖啡师认证",
      desiredPositioning: ["本地精品咖啡代表"],
    },
  };
}

function guidanceFixture(): EvaluationOptimizationGuidanceView {
  return {
    reference: {
      guidanceId: randomUUID(),
      reportId: randomUUID(),
      runId: randomUUID(),
      acceptedAt: new Date("2026-09-06T00:00:00.000Z"),
      evaluationInputFingerprint: "b".repeat(64),
    },
    brandInformationChanged: false,
    customerDirections: [],
    writerGuidance: {
      summary: "强化本地精品咖啡与办公场景认知",
      priorities: [{ label: "本地认知", detail: "持续说明所在区域与核心服务" }],
      writingAngles: [{ label: "办公场景", detail: "突出安静座位和稳定网络" }],
      cautions: ["不要编造未提供的信息"],
    },
  };
}
