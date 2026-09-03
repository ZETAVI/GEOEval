import { createHash } from "node:crypto";

import type {
  BrandProfileFields,
  BrandReadiness,
  BrandStoreLocation,
} from "./brand.types.js";

export class BrandProfileValidationError extends Error {}

const requiredFieldLabels: Array<[keyof BrandProfileFields, string]> = [
  ["primaryIndustryId", "一级行业"],
  ["secondaryIndustryId", "二级行业"],
  ["companyName", "公司或店铺名称"],
  ["contactName", "联系人"],
  ["contactMobile", "手机号"],
];

export function brandReadiness(
  fields: BrandProfileFields,
  requiresOtherProductOrService: boolean,
  storeLocation: BrandStoreLocation | null,
): BrandReadiness {
  const missingFields = requiredFieldLabels.flatMap(([field, label]) =>
    normalizeTextValue(fields[field]) ? [] : [label],
  );
  if (
    requiresOtherProductOrService &&
    !normalizeText(fields.otherProductOrService)
  ) {
    missingFields.splice(2, 0, "具体产品或服务");
  }
  if (!storeLocation) missingFields.push("具体门店");
  if (!normalizeText(fields.flagshipProductOrService)) {
    missingFields.push("主打产品或服务");
  }
  if (fields.characteristics.length < 2) {
    missingFields.push("品牌特色（至少两项）");
  }
  return { readyForEvaluation: missingFields.length === 0, missingFields };
}

export function evaluationFingerprint(
  fields: BrandProfileFields,
  storeLocation: BrandStoreLocation | null,
): string {
  const canonical = {
    scheme: "brand-evaluation-input@3",
    companyName: normalizeText(fields.companyName),
    primaryIndustryId: normalizeText(fields.primaryIndustryId),
    secondaryIndustryId: normalizeText(fields.secondaryIndustryId),
    otherProductOrService: normalizeText(fields.otherProductOrService),
    officialRegionPath:
      storeLocation?.officialRegion.officialPath.map((region) => region.id) ??
      [],
    storeLocationSemanticFactId: storeLocation?.semanticFactId ?? "",
    flagshipProductOrService: normalizeText(fields.flagshipProductOrService),
    characteristics: canonicalCharacteristics(fields.characteristics),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function normalizeFlagshipProductOrService(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized.length < 2 || normalized.length > 80) {
    throw new BrandProfileValidationError("主打产品或服务需为 2-80 个字");
  }
  if (["产品", "服务", "其他", "其它"].includes(normalized)) {
    throw new BrandProfileValidationError("请填写具体的主打产品或服务");
  }
  return normalized;
}

export function normalizeCharacteristics(values: string[]): string[] {
  const normalized = values.map(normalizeText).filter(Boolean);
  if (normalized.length > 6) {
    throw new BrandProfileValidationError("品牌特色最多填写六项");
  }
  for (const value of normalized) {
    if (value.length < 2 || value.length > 120) {
      throw new BrandProfileValidationError("每项品牌特色需为 2-120 个字");
    }
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new BrandProfileValidationError("品牌特色不能重复");
  }
  return normalized;
}

export function canonicalCharacteristics(values: string[]): string[] {
  return [...normalizeCharacteristics(values)].sort();
}

export function sameStoreLocationMeaning(
  current: BrandStoreLocation | null,
  candidate: Pick<BrandStoreLocation, "providerPlaceId" | "queryLocality">,
): boolean {
  return Boolean(
    current &&
    current.providerPlaceId === candidate.providerPlaceId &&
    current.queryLocality.kind === candidate.queryLocality.kind &&
    normalizeText(current.queryLocality.label) ===
      normalizeText(candidate.queryLocality.label),
  );
}

function normalizeTextValue(
  value: BrandProfileFields[keyof BrandProfileFields],
) {
  return Array.isArray(value) ? value.length > 0 : normalizeText(value);
}
