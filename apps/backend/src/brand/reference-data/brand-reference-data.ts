import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { z } from "zod";

import type { DerivedOfficialRegion } from "../domain/brand.types.js";

import administrativeRegionsDocument from "./administrative-regions.json" with { type: "json" };
import industryCatalogDocument from "./industry-catalog.json" with { type: "json" };

const specialTownshipParentIds = new Set([
  "CN-MCA-PREFECTURE-441900",
  "CN-MCA-PREFECTURE-442000",
  "CN-MCA-PREFECTURE-460400",
  "CN-MCA-PREFECTURE-620200",
]);

const industrySecondarySchema = z.object({
  id: z.string().regex(/^IND-\d{2}-\d{2}$/),
  parentId: z.string().regex(/^IND-\d{2}$/),
  label: z.string().min(1),
  recommendationSubject: z.string().min(1),
  isOther: z.boolean(),
  status: z.enum(["ACTIVE", "DEPRECATED"]),
});

const industryPrimarySchema = z.object({
  id: z.string().regex(/^IND-\d{2}$/),
  label: z.string().min(1),
  secondaryIndustries: z.array(industrySecondarySchema).min(1),
});

const industryCatalogSchema = z.object({
  catalogId: z.literal("industry-catalog"),
  version: z.string().min(1),
  contentHash: z.string().length(64),
  counts: z.object({
    primaryIndustries: z.number().int().positive(),
    secondaryIndustries: z.number().int().positive(),
  }),
  primaryIndustries: z.array(industryPrimarySchema).min(1),
});

const officialRegionSchema = z.object({
  id: z.string().min(1),
  officialCode: z.string().regex(/^\d{6}(?:\d{3})?$/),
  officialLevel: z.enum(["PROVINCE", "PREFECTURE", "COUNTY", "TOWNSHIP"]),
  label: z.string().min(1),
  divisionType: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  status: z.enum(["ACTIVE", "ABOLISHED"]),
  sourceReleaseId: z.literal("mca-administrative-divisions@2025-12-31"),
});

const terminalRegionSchema = officialRegionSchema.extend({
  officialLevel: z.enum(["COUNTY", "TOWNSHIP"]),
});

const cityRegionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  identityKind: z.enum([
    "OFFICIAL_DIVISION",
    "MUNICIPALITY_REPEAT",
    "PROVINCE_DIRECT_GROUP",
  ]),
  officialDivisionId: z.string().min(1).optional(),
  officialDivision: officialRegionSchema.optional(),
  terminalRegions: z.array(terminalRegionSchema).min(1),
});

const provinceRegionSchema = officialRegionSchema.extend({
  officialLevel: z.literal("PROVINCE"),
  parentId: z.null(),
  cities: z.array(cityRegionSchema).min(1),
});

const administrativeRegionsSchema = z.object({
  source: z.object({
    id: z.literal("mca-administrative-divisions@2025-12-31"),
    authority: z.string().min(1),
    asOf: z.string().min(1),
    retrievedAt: z.string().min(1),
    publicationUrl: z.string().url(),
    apiDocumentationUrl: z.string().url(),
    attribution: z.string().min(1),
    counts: z.object({
      provinces: z.number().int().positive(),
      prefectures: z.number().int().positive(),
      counties: z.number().int().positive(),
      townships: z.number().int().positive(),
      presentationCities: z.number().int().positive(),
    }),
    rawSha256: z.string().length(64),
    specialCityRawSha256: z.record(z.string(), z.string().length(64)),
  }),
  contentHash: z.string().length(64),
  provinces: z.array(provinceRegionSchema).min(31),
});

const industryCatalog = industryCatalogSchema.parse(industryCatalogDocument);
const administrativeRegions = administrativeRegionsSchema.parse(
  administrativeRegionsDocument,
);

assertContentHash(
  industryCatalog.contentHash,
  industryCatalog.primaryIndustries,
  "industry catalog",
);
assertContentHash(
  administrativeRegions.contentHash,
  administrativeRegions.provinces,
  "administrative regions",
);
assertIndustryCatalog(
  industryCatalog.primaryIndustries,
  industryCatalog.counts,
);
assertRegionProjection(
  administrativeRegions.provinces,
  administrativeRegions.source.counts,
);

export type IndustryPrimary = z.infer<typeof industryPrimarySchema>;
export type IndustrySecondary = z.infer<typeof industrySecondarySchema>;
export type OfficialRegion = z.infer<typeof officialRegionSchema>;
export type TerminalRegion = z.infer<typeof terminalRegionSchema>;
export type CityRegion = z.infer<typeof cityRegionSchema>;
export type ProvinceRegion = z.infer<typeof provinceRegionSchema>;

export type IndustryReferenceSelection = {
  primaryIndustryId: string | null;
  secondaryIndustryId: string | null;
  otherProductOrService: string | null;
};

export type ResolvedIndustryReferenceSelection = {
  primaryIndustry: IndustryPrimary | null;
  secondaryIndustry: IndustrySecondary | null;
  otherProductOrService: string | null;
};

export class BrandReferenceValidationError extends Error {}

@Injectable()
export class BrandReferenceData {
  industryCatalogView(): {
    catalogId: string;
    version: string;
    contentHash: string;
    primaryIndustries: IndustryPrimary[];
  } {
    return industryCatalog;
  }

  resolveIndustry(
    selection: IndustryReferenceSelection,
    requireActive = false,
  ): ResolvedIndustryReferenceSelection {
    const selectionCount = [
      selection.primaryIndustryId,
      selection.secondaryIndustryId,
    ].filter(Boolean).length;
    if (selectionCount === 1) {
      throw new BrandReferenceValidationError("请完整选择一级行业和二级行业");
    }
    const primaryIndustry = selection.primaryIndustryId
      ? industryCatalog.primaryIndustries.find(
          (candidate) => candidate.id === selection.primaryIndustryId,
        )
      : null;
    if (selection.primaryIndustryId && !primaryIndustry) {
      throw new BrandReferenceValidationError("请选择有效的一级行业");
    }
    const secondaryIndustry = selection.secondaryIndustryId
      ? primaryIndustry?.secondaryIndustries.find(
          (candidate) => candidate.id === selection.secondaryIndustryId,
        )
      : null;
    if (selection.secondaryIndustryId && !secondaryIndustry) {
      throw new BrandReferenceValidationError("请选择当前一级行业下的二级行业");
    }
    if (
      requireActive &&
      secondaryIndustry &&
      secondaryIndustry.status !== "ACTIVE"
    ) {
      throw new BrandReferenceValidationError("所选二级行业已不可用于新资料");
    }
    const otherProductOrService = normalizeOptionalText(
      selection.otherProductOrService,
    );
    if (secondaryIndustry?.isOther) {
      if (
        otherProductOrService &&
        (otherProductOrService.length < 2 ||
          otherProductOrService.length > 60 ||
          ["其他", "其它"].includes(otherProductOrService))
      ) {
        throw new BrandReferenceValidationError(
          "请用 2-60 个字填写具体产品或服务，不能只填写“其他”",
        );
      }
    } else if (otherProductOrService) {
      throw new BrandReferenceValidationError(
        "只有选择“其他”二级行业时才能填写具体产品或服务",
      );
    }
    return {
      primaryIndustry: primaryIndustry ?? null,
      secondaryIndustry: secondaryIndustry ?? null,
      otherProductOrService: secondaryIndustry?.isOther
        ? otherProductOrService
        : null,
    };
  }

  industryProjection(selection: IndustryReferenceSelection) {
    const resolved = this.resolveIndustry(selection, true);
    const { primaryIndustry, secondaryIndustry } = resolved;
    if (
      !primaryIndustry ||
      !secondaryIndustry ||
      (secondaryIndustry.isOther && !resolved.otherProductOrService)
    ) {
      throw new BrandReferenceValidationError("品牌行业资料尚未完整");
    }
    return {
      catalogId: industryCatalog.catalogId,
      catalogVersion: industryCatalog.version,
      primary: { id: primaryIndustry.id, label: primaryIndustry.label },
      secondary: { id: secondaryIndustry.id, label: secondaryIndustry.label },
      otherProductOrService: resolved.otherProductOrService,
      recommendationSubject: secondaryIndustry.isOther
        ? resolved.otherProductOrService!
        : secondaryIndustry.recommendationSubject,
    };
  }

  deriveOfficialRegion(input: {
    adcode: string;
    towncode: string | null;
  }): DerivedOfficialRegion {
    const matches: Array<{
      province: ProvinceRegion;
      city: CityRegion;
      terminal: TerminalRegion;
    }> = [];
    for (const province of administrativeRegions.provinces.filter(
      (candidate) => candidate.status === "ACTIVE",
    )) {
      for (const city of province.cities.filter(isCityActive)) {
        for (const terminal of city.terminalRegions.filter(
          (candidate) => candidate.status === "ACTIVE",
        )) {
          const countyMatch =
            terminal.officialLevel === "COUNTY" &&
            terminal.officialCode === input.adcode;
          const townshipMatch =
            terminal.officialLevel === "TOWNSHIP" &&
            city.officialDivision?.officialCode === input.adcode &&
            Boolean(input.towncode) &&
            input.towncode === `${terminal.officialCode}000`;
          if (countyMatch || townshipMatch) {
            matches.push({ province, city, terminal });
          }
        }
      }
    }
    if (matches.length !== 1) {
      throw new BrandReferenceValidationError(
        "该门店暂时无法映射到唯一的行政地区，请重新选择具体门店",
      );
    }
    return this.regionProjection(matches[0]!);
  }

  private findOfficialRegion(id: string): OfficialRegion | undefined {
    for (const province of administrativeRegions.provinces) {
      if (province.id === id) return province;
      for (const city of province.cities) {
        if (city.officialDivision?.id === id) return city.officialDivision;
        const terminal = city.terminalRegions.find(
          (candidate) => candidate.id === id,
        );
        if (terminal) return terminal;
      }
    }
    return undefined;
  }

  private regionProjection(input: {
    province: ProvinceRegion;
    city: CityRegion;
    terminal: TerminalRegion;
  }): DerivedOfficialRegion {
    const officialCity = input.city.officialDivisionId
      ? this.findOfficialRegion(input.city.officialDivisionId)
      : undefined;
    const officialPath = [input.province, officialCity, input.terminal]
      .filter((value): value is ProvinceRegion | OfficialRegion =>
        Boolean(value),
      )
      .filter(
        (value, index, values) =>
          values.findIndex((item) => item.id === value.id) === index,
      )
      .map(publicOfficialRegion);
    return {
      sourceReleaseId: administrativeRegions.source.id,
      province: { id: input.province.id, label: input.province.label },
      city: {
        id: input.city.id,
        label: input.city.label,
        identityKind: input.city.identityKind,
        officialDivisionId: input.city.officialDivisionId ?? null,
      },
      terminal: {
        ...publicOfficialRegion(input.terminal),
        officialLevel: input.terminal.officialLevel,
      },
      officialPath,
    };
  }
}

function publicOfficialRegion<T extends OfficialRegion>(
  region: T,
): {
  id: string;
  label: string;
  officialCode: string;
  officialLevel: T["officialLevel"];
} {
  return {
    id: region.id,
    label: region.label,
    officialCode: region.officialCode,
    officialLevel: region.officialLevel,
  };
}

function normalizeOptionalText(value: string | null): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  return normalized || null;
}

function assertContentHash(
  expected: string,
  value: unknown,
  name: string,
): void {
  const actual = createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
  if (expected !== actual) throw new Error(`${name} content hash mismatch`);
}

function assertIndustryCatalog(
  primaries: IndustryPrimary[],
  expectedCounts: {
    primaryIndustries: number;
    secondaryIndustries: number;
  },
): void {
  const ids = new Set<string>();
  const secondaries = primaries.flatMap((primary) => {
    if (ids.has(primary.id))
      throw new Error(`Duplicate industry ID ${primary.id}`);
    ids.add(primary.id);
    const others = primary.secondaryIndustries.filter(
      (secondary) => secondary.isOther,
    );
    if (others.length !== 1)
      throw new Error(`${primary.id} must own exactly one Other`);
    if (others[0]?.id !== `${primary.id}-99` || others[0].status !== "ACTIVE") {
      throw new Error(`${primary.id} must own its active -99 Other`);
    }
    for (const secondary of primary.secondaryIndustries) {
      if (secondary.parentId !== primary.id) {
        throw new Error(
          `${secondary.id} has invalid parent ${secondary.parentId}`,
        );
      }
    }
    return primary.secondaryIndustries;
  });
  if (
    primaries.length !== expectedCounts.primaryIndustries ||
    secondaries.length !== expectedCounts.secondaryIndustries
  ) {
    throw new Error("Industry catalog counts do not match its manifest");
  }
  for (const secondary of secondaries) {
    if (ids.has(secondary.id))
      throw new Error(`Duplicate industry ID ${secondary.id}`);
    ids.add(secondary.id);
  }
}

function assertRegionProjection(
  provinces: ProvinceRegion[],
  expectedCounts: {
    provinces: number;
    prefectures: number;
    counties: number;
    townships: number;
    presentationCities: number;
  },
): void {
  const ids = new Set<string>();
  const actualCounts = {
    provinces: provinces.length,
    prefectures: 0,
    counties: 0,
    townships: 0,
    presentationCities: 0,
  };
  const activeProvinceCount = provinces.filter(
    (province) => province.status === "ACTIVE",
  ).length;
  if (activeProvinceCount !== 31) {
    throw new Error(
      `Expected 31 active mainland provinces, got ${activeProvinceCount}`,
    );
  }
  for (const province of provinces) {
    assertUnique(ids, province.id);
    assertOfficialIdentity(province);
    if (province.parentId !== null) {
      throw new Error(`${province.id} must not have an official parent`);
    }
    for (const city of province.cities) {
      assertUnique(ids, city.id);
      if (city.identityKind === "OFFICIAL_DIVISION") {
        actualCounts.prefectures += 1;
        if (
          city.officialDivisionId !== city.id ||
          city.officialDivision?.id !== city.id ||
          city.officialDivision.parentId !== province.id ||
          city.officialDivision.officialLevel !== "PREFECTURE"
        ) {
          throw new Error(`${city.id} has an invalid official city identity`);
        }
        assertOfficialIdentity(city.officialDivision);
        if (city.label !== city.officialDivision.label) {
          throw new Error(`${city.id} has inconsistent official display text`);
        }
      } else if (city.identityKind === "MUNICIPALITY_REPEAT") {
        actualCounts.presentationCities += 1;
        if (
          city.id !== `CN-MCA-VIEW-MUNICIPALITY-${province.officialCode}` ||
          city.label !== province.label ||
          city.officialDivisionId !== province.id ||
          city.officialDivision
        ) {
          throw new Error(`${city.id} has an invalid municipality projection`);
        }
      } else if (city.officialDivisionId || city.officialDivision) {
        throw new Error(`${city.id} has an invalid direct-county projection`);
      } else {
        actualCounts.presentationCities += 1;
        if (
          city.id !== `CN-MCA-VIEW-DIRECT-${province.officialCode}` ||
          city.label !== "省直辖县级行政区划"
        ) {
          throw new Error(`${city.id} has invalid direct-county presentation`);
        }
      }
      for (const terminal of city.terminalRegions) {
        assertUnique(ids, terminal.id);
        assertOfficialIdentity(terminal);
        if (terminal.officialLevel === "COUNTY") actualCounts.counties += 1;
        if (terminal.officialLevel === "TOWNSHIP") actualCounts.townships += 1;
        const expectedParentId = city.officialDivisionId ?? province.id;
        if (terminal.parentId !== expectedParentId) {
          throw new Error(
            `${terminal.id} has invalid parent ${terminal.parentId}`,
          );
        }
        if (
          terminal.officialLevel === "TOWNSHIP" &&
          !specialTownshipParentIds.has(terminal.parentId)
        ) {
          throw new Error(`${terminal.id} has an unapproved township parent`);
        }
      }
    }
  }
  if (JSON.stringify(actualCounts) !== JSON.stringify(expectedCounts)) {
    throw new Error(
      "Administrative-region source counts do not match projection",
    );
  }
}

function assertOfficialIdentity(region: OfficialRegion): void {
  const expectedId = `CN-MCA-${region.officialLevel}-${region.officialCode}`;
  if (region.id !== expectedId) {
    throw new Error(
      `${region.id} does not match official identity ${expectedId}`,
    );
  }
}

function isCityActive(city: CityRegion): boolean {
  return city.officialDivision
    ? city.officialDivision.status === "ACTIVE"
    : city.terminalRegions.some((terminal) => terminal.status === "ACTIVE");
}

function assertUnique(ids: Set<string>, id: string): void {
  if (ids.has(id)) throw new Error(`Duplicate region ID ${id}`);
  ids.add(id);
}
