import { describe, expect, it } from "vitest";

import {
  canonicalCharacteristics,
  evaluationFingerprint,
} from "../src/brand/domain/brand-profile.js";
import type { BrandStoreLocation } from "../src/brand/domain/brand.types.js";
import {
  BrandReferenceData,
  BrandReferenceValidationError,
} from "../src/brand/reference-data/brand-reference-data.js";

const references = new BrandReferenceData();

describe("Brand Knowledge executable reference data", () => {
  it("owns the approved 13/199 industry catalog with one Other per primary", () => {
    const catalog = references.industryCatalogView();
    expect(catalog.primaryIndustries).toHaveLength(13);
    expect(
      catalog.primaryIndustries.flatMap(
        (primary) => primary.secondaryIndustries,
      ),
    ).toHaveLength(199);
    for (const primary of catalog.primaryIndustries) {
      expect(
        primary.secondaryIndustries.filter((item) => item.isOther),
      ).toHaveLength(1);
    }
  });

  it("validates complete industry parent-child paths", () => {
    const resolved = references.resolveIndustry({
      ...selection(),
      secondaryIndustryId: "IND-01-02",
    });
    expect(resolved.primaryIndustry?.label).toBe("本地生活与门店服务");
    expect(resolved.secondaryIndustry?.label).toBe("饮品甜品");

    expect(() =>
      references.resolveIndustry({
        ...selection(),
        secondaryIndustryId: "IND-07-01",
      }),
    ).toThrow(BrandReferenceValidationError);

    expect(() =>
      references.resolveIndustry({
        ...selection(),
        secondaryIndustryId: null,
      }),
    ).toThrow("请完整选择一级行业和二级行业");
  });

  it("accepts a bounded concrete Other phrase and rejects a generic value", () => {
    const other = references.industryProjection({
      ...selection(),
      secondaryIndustryId: "IND-01-99",
      otherProductOrService: "商用咖啡机租赁服务",
    });
    expect(other.recommendationSubject).toBe("商用咖啡机租赁服务");

    expect(() =>
      references.resolveIndustry({
        ...selection(),
        secondaryIndustryId: "IND-01-99",
        otherProductOrService: "其他",
      }),
    ).toThrow("不能只填写“其他”");
  });

  it("derives variable-depth municipality and province-direct paths without customer selectors", () => {
    expect(
      references.deriveOfficialRegion({ adcode: "110105", towncode: null }),
    ).toMatchObject({
      province: { label: "北京市" },
      city: {
        label: "北京市",
        identityKind: "MUNICIPALITY_REPEAT",
      },
      terminal: { label: "朝阳区", officialLevel: "COUNTY" },
    });
    expect(
      references.deriveOfficialRegion({ adcode: "469001", towncode: null }),
    ).toMatchObject({
      province: { label: "海南省" },
      city: {
        label: "省直辖县级行政区划",
        identityKind: "PROVINCE_DIRECT_GROUP",
      },
      terminal: { label: "五指山市", officialLevel: "COUNTY" },
    });
  });

  it("derives an exact official path from verified provider codes", () => {
    expect(
      references.deriveOfficialRegion({ adcode: "440106", towncode: null }),
    ).toMatchObject({
      province: { id: "CN-MCA-PROVINCE-440000", label: "广东省" },
      city: { id: "CN-MCA-PREFECTURE-440100", label: "广州市" },
      terminal: {
        id: "CN-MCA-COUNTY-440106",
        label: "天河区",
        officialLevel: "COUNTY",
      },
    });
    expect(
      references.deriveOfficialRegion({
        adcode: "441900",
        towncode: "441900006000",
      }),
    ).toMatchObject({
      city: { id: "CN-MCA-PREFECTURE-441900", label: "东莞市" },
      terminal: { label: "莞城街道", officialLevel: "TOWNSHIP" },
    });
    expect(() =>
      references.deriveOfficialRegion({ adcode: "000000", towncode: null }),
    ).toThrow("无法映射到唯一的行政地区");
  });

  it("fingerprints stable semantic identities without characteristic priority", () => {
    const fields = {
      companyName: "星河咖啡",
      primaryIndustryId: "IND-01",
      secondaryIndustryId: "IND-01-02",
      otherProductOrService: null,
      flagshipProductOrService: "精品手冲咖啡",
      characteristics: [
        {
          id: "00000000-0000-4000-8000-000000000301",
          title: "安静办公",
          detail: null,
        },
        {
          id: "00000000-0000-4000-8000-000000000302",
          title: "精品手冲",
          detail: null,
        },
      ],
      contactName: "林先生",
      contactMobile: "+8613900000101",
    };
    const storeLocation = location();
    const first = evaluationFingerprint(fields, storeLocation);
    expect(first).toBe(
      "c1eed39e527b9fe0a8d4a2ff88bac42b821fdfbb09c3c6ce12c2dddd6d56ef22",
    );
    const second = evaluationFingerprint(
      { ...fields, characteristics: [...fields.characteristics].reverse() },
      storeLocation,
    );
    expect(second).toBe(first);
    expect(canonicalCharacteristics(fields.characteristics)).toEqual([
      "安静办公",
      "精品手冲",
    ]);
    expect(
      evaluationFingerprint(
        {
          ...fields,
          contactName: "另一位联系人",
          contactMobile: "13900000000",
        },
        storeLocation,
      ),
    ).toBe(first);
    expect(
      evaluationFingerprint(
        { ...fields, secondaryIndustryId: "IND-01-01" },
        storeLocation,
      ),
    ).not.toBe(first);
    expect(
      evaluationFingerprint(
        { ...fields, companyName: "星河咖啡二店" },
        storeLocation,
      ),
    ).not.toBe(first);
    expect(
      evaluationFingerprint(
        {
          ...fields,
          characteristics: [
            { ...fields.characteristics[0]!, title: "适合朋友聚会" },
            fields.characteristics[1]!,
          ],
        },
        storeLocation,
      ),
    ).not.toBe(first);
    expect(
      evaluationFingerprint(fields, {
        ...storeLocation,
        semanticFactId: "00000000-0000-4000-8000-000000000202",
      }),
    ).not.toBe(first);
  });
});

function selection() {
  return {
    primaryIndustryId: "IND-01",
    secondaryIndustryId: "IND-01-02",
    otherProductOrService: null,
  };
}

function location(): BrandStoreLocation {
  const now = new Date("2026-09-03T00:00:00.000Z");
  return {
    id: "00000000-0000-4000-8000-000000000001",
    brandId: "00000000-0000-4000-8000-000000000002",
    semanticFactId: "00000000-0000-4000-8000-000000000201",
    verificationId: "00000000-0000-4000-8000-000000000203",
    receiptIssuedAt: now,
    searchInput: "星河咖啡",
    provider: "AMAP",
    providerPlaceId: "fixture-guangzhou-tower",
    providerContractVersion: "fixture@1",
    verifiedAt: now,
    placeName: "星河咖啡",
    formattedAddress: "广东省广州市天河区测试路1号",
    provinceName: "广东省",
    cityName: "广州市",
    districtName: "天河区",
    townshipName: null,
    providerAdcode: "440106",
    providerTowncode: null,
    officialRegion: references.deriveOfficialRegion({
      adcode: "440106",
      towncode: null,
    }),
    coordinate: { longitude: 113.32452, latitude: 23.10647, system: "GCJ_02" },
    queryLocality: { kind: "BUSINESS_AREA", label: "珠江新城" },
    createdAt: now,
    updatedAt: now,
  };
}
