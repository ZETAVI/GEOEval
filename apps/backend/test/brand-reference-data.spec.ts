import { describe, expect, it } from "vitest";

import { evaluationFingerprint } from "../src/brand/domain/brand-profile.js";
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

  it("validates complete industry and region parent-child paths", () => {
    const resolved = references.resolve({
      ...selection(),
      secondaryIndustryId: "IND-01-02",
    });
    expect(resolved.primaryIndustry?.label).toBe("本地生活与门店服务");
    expect(resolved.secondaryIndustry?.label).toBe("饮品甜品");
    expect(resolved.terminalRegion?.label).toBe("天河区");

    expect(() =>
      references.resolve({
        ...selection(),
        secondaryIndustryId: "IND-07-01",
      }),
    ).toThrow(BrandReferenceValidationError);

    expect(() =>
      references.resolve({
        ...selection(),
        secondaryIndustryId: null,
      }),
    ).toThrow("请完整选择一级行业和二级行业");

    expect(() =>
      references.resolve({
        ...selection(),
        terminalRegionId: null,
      }),
    ).toThrow("请完整选择省级地区、城市和终端地区");
  });

  it("accepts a bounded concrete Other phrase and rejects a generic value", () => {
    const other = references.evaluationProjection({
      ...selection(),
      secondaryIndustryId: "IND-01-99",
      otherProductOrService: "商用咖啡机租赁服务",
    });
    expect(other.industry.recommendationSubject).toBe("商用咖啡机租赁服务");

    expect(() =>
      references.resolve({
        ...selection(),
        secondaryIndustryId: "IND-01-99",
        otherProductOrService: "其他",
      }),
    ).toThrow("不能只填写“其他”");
  });

  it("keeps three controls for municipalities, direct counties, and special cities", () => {
    const beijingProvince = references
      .provinceOptions()
      .find((item) => item.label === "北京市")!;
    const beijingCity = references.cityOptions(beijingProvince.id)[0]!;
    expect(beijingCity).toMatchObject({
      label: "北京市",
      identityKind: "MUNICIPALITY_REPEAT",
    });
    expect(
      references
        .terminalOptions(beijingProvince.id, beijingCity.id)
        .some((item) => item.label === "朝阳区"),
    ).toBe(true);

    const hainan = references
      .provinceOptions()
      .find((item) => item.label === "海南省")!;
    expect(references.cityOptions(hainan.id)).toContainEqual(
      expect.objectContaining({
        label: "省直辖县级行政区划",
        identityKind: "PROVINCE_DIRECT_GROUP",
      }),
    );

    const guangdong = references
      .provinceOptions()
      .find((item) => item.label === "广东省")!;
    const dongguan = references
      .cityOptions(guangdong.id)
      .find((item) => item.label === "东莞市")!;
    expect(guangdong).toMatchObject({
      parentId: null,
      status: "ACTIVE",
      sourceReleaseId: "mca-administrative-divisions@2025-12-31",
    });
    expect(dongguan.officialDivision).toMatchObject({
      officialCode: "441900",
      parentId: guangdong.id,
      status: "ACTIVE",
    });
    const dongguanTerminals = references.terminalOptions(
      guangdong.id,
      dongguan.id,
    );
    expect(dongguanTerminals).toHaveLength(32);
    expect(dongguanTerminals).toContainEqual(
      expect.objectContaining({
        label: "莞城街道",
        officialLevel: "TOWNSHIP",
        parentId: dongguan.id,
        sourceReleaseId: "mca-administrative-divisions@2025-12-31",
      }),
    );
  });

  it("fingerprints stable identities but excludes display and source versions", () => {
    const fields = {
      companyName: "星河咖啡",
      primaryIndustryId: "IND-01",
      secondaryIndustryId: "IND-01-02",
      otherProductOrService: null,
      characteristicOne: "安静办公",
      characteristicTwo: "精品手冲",
      provinceRegionId: "CN-MCA-PROVINCE-440000",
      cityRegionId: "CN-MCA-PREFECTURE-440100",
      terminalRegionId: "CN-MCA-COUNTY-440106",
      contactName: "林先生",
      contactMobile: "+8613900000101",
    };
    const path = references.semanticRegionPath(fields);
    const first = evaluationFingerprint(fields, path);
    expect(first).toBe(
      "fd5dde70fd57277b22a0be405ec5e9db56f6a277dcb740bfbe78f6fb19f16997",
    );
    const second = evaluationFingerprint(fields, [...path]);
    expect(second).toBe(first);
    expect(
      evaluationFingerprint(
        {
          ...fields,
          contactName: "另一位联系人",
          contactMobile: "13900000000",
        },
        path,
      ),
    ).toBe(first);
    expect(
      evaluationFingerprint(
        { ...fields, secondaryIndustryId: "IND-01-01" },
        path,
      ),
    ).not.toBe(first);
    expect(
      evaluationFingerprint({ ...fields, companyName: "星河咖啡二店" }, path),
    ).not.toBe(first);
    expect(
      evaluationFingerprint(
        { ...fields, characteristicOne: "适合朋友聚会" },
        path,
      ),
    ).not.toBe(first);

    const beijingPath = references.semanticRegionPath({
      ...selection(),
      provinceRegionId: "CN-MCA-PROVINCE-110000",
      cityRegionId: "CN-MCA-VIEW-MUNICIPALITY-110000",
      terminalRegionId: "CN-MCA-COUNTY-110105",
    });
    expect(beijingPath).toEqual([
      "CN-MCA-PROVINCE-110000",
      "CN-MCA-COUNTY-110105",
    ]);
  });
});

function selection() {
  return {
    primaryIndustryId: "IND-01",
    secondaryIndustryId: "IND-01-02",
    otherProductOrService: null,
    provinceRegionId: "CN-MCA-PROVINCE-440000",
    cityRegionId: "CN-MCA-PREFECTURE-440100",
    terminalRegionId: "CN-MCA-COUNTY-440106",
  };
}
