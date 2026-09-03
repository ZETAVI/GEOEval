import { describe, expect, it } from "vitest";

import {
  evaluationBrandQueryContext,
  evaluationBrandTextContext,
  parseEvaluationBrandSnapshot,
} from "../src/geo-intelligence/domain/evaluation-brand-snapshot.js";

describe("evaluation Brand Snapshot v3", () => {
  it("freezes the verified location and exposes a narrow Query handoff", () => {
    const snapshot = parseEvaluationBrandSnapshot(snapshotValue());

    expect(evaluationBrandQueryContext(snapshot)).toEqual({
      companyName: "星河咖啡",
      recommendationSubject: "饮品甜品",
      locality: { kind: "BUSINESS_AREA", label: "赤岗" },
      flagshipProductOrService: "精品手冲咖啡",
      characteristics: ["安静办公", "精品手冲"],
    });
    expect(evaluationBrandTextContext(snapshot)).toMatchObject({
      province: "广东省",
      city: "广州市",
      terminalRegion: "海珠区",
      characteristicOne: "安静办公",
      characteristicTwo: "精品手冲",
    });
  });

  it("rejects v1/v2 and incomplete Store Location snapshots", () => {
    expect(() =>
      parseEvaluationBrandSnapshot({
        companyName: "旧资料",
        characteristicOne: "旧特点一",
        characteristicTwo: "旧特点二",
      }),
    ).toThrow();
    const value = snapshotValue();
    delete (value as { storeLocation?: unknown }).storeLocation;
    expect(() => parseEvaluationBrandSnapshot(value)).toThrow();
  });
});

function snapshotValue() {
  return {
    schemaVersion: "brand-evaluation-snapshot@3",
    companyName: "星河咖啡",
    industry: {
      catalogId: "industry-catalog",
      catalogVersion: "1.0.0",
      primary: { id: "IND-01", label: "本地生活与门店服务" },
      secondary: { id: "IND-01-02", label: "饮品甜品" },
      otherProductOrService: null,
      recommendationSubject: "饮品甜品",
    },
    region: {
      sourceReleaseId: "mca-administrative-divisions@2025-12-31",
      province: { id: "CN-MCA-PROVINCE-440000", label: "广东省" },
      city: {
        id: "CN-MCA-PREFECTURE-440100",
        label: "广州市",
        identityKind: "OFFICIAL_DIVISION",
        officialDivisionId: "CN-MCA-PREFECTURE-440100",
      },
      terminal: {
        id: "CN-MCA-COUNTY-440105",
        label: "海珠区",
        officialCode: "440105",
        officialLevel: "COUNTY",
      },
      officialPath: [
        {
          id: "CN-MCA-PROVINCE-440000",
          label: "广东省",
          officialCode: "440000",
          officialLevel: "PROVINCE",
        },
        {
          id: "CN-MCA-PREFECTURE-440100",
          label: "广州市",
          officialCode: "440100",
          officialLevel: "PREFECTURE",
        },
        {
          id: "CN-MCA-COUNTY-440105",
          label: "海珠区",
          officialCode: "440105",
          officialLevel: "COUNTY",
        },
      ],
    },
    storeLocation: {
      semanticFactId: "00000000-0000-4000-8000-000000000021",
      placeName: "广州塔",
      formattedAddress: "广东省广州市海珠区阅江西路222号",
      coordinate: {
        longitude: 113.324553,
        latitude: 23.106414,
        system: "GCJ_02",
      },
      queryLocality: { kind: "BUSINESS_AREA", label: "赤岗" },
      source: {
        provider: "AMAP",
        placeId: "fixture-guangzhou-tower",
        contractVersion: "fixture@1",
        verifiedAt: "2026-09-03T00:00:00.000Z",
      },
    },
    flagshipProductOrService: "精品手冲咖啡",
    characteristics: ["安静办公", "精品手冲"],
  };
}
