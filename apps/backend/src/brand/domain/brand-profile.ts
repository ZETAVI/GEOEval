import { createHash } from "node:crypto";

import type { BrandProfileFields, BrandReadiness } from "./brand.types.js";

const evaluationFieldLabels: Array<[keyof BrandProfileFields, string]> = [
  ["primaryIndustry", "一级行业"],
  ["secondaryIndustry", "二级行业"],
  ["characteristicOne", "品牌特色一"],
  ["characteristicTwo", "品牌特色二"],
  ["companyName", "公司或店铺名称"],
  ["province", "省份"],
  ["city", "城市"],
  ["district", "区县"],
  ["contactName", "联系人"],
  ["contactMobile", "手机号"],
];

export function brandReadiness(fields: BrandProfileFields): BrandReadiness {
  const missingFields = evaluationFieldLabels.flatMap(([field, label]) =>
    normalizeText(fields[field]) ? [] : [label],
  );
  return { readyForEvaluation: missingFields.length === 0, missingFields };
}

export function evaluationFingerprint(fields: BrandProfileFields): string {
  const evaluationContext = {
    companyName: normalizeText(fields.companyName),
    primaryIndustry: normalizeText(fields.primaryIndustry),
    secondaryIndustry: normalizeText(fields.secondaryIndustry),
    characteristicOne: normalizeText(fields.characteristicOne),
    characteristicTwo: normalizeText(fields.characteristicTwo),
    province: normalizeText(fields.province),
    city: normalizeText(fields.city),
    district: normalizeText(fields.district),
  };
  return createHash("sha256")
    .update(JSON.stringify(evaluationContext))
    .digest("hex");
}

export function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}
