import { createHash } from "node:crypto";

import type { BrandProfileFields, BrandReadiness } from "./brand.types.js";

const requiredFieldLabels: Array<[keyof BrandProfileFields, string]> = [
  ["primaryIndustryId", "一级行业"],
  ["secondaryIndustryId", "二级行业"],
  ["characteristicOne", "品牌特色一"],
  ["characteristicTwo", "品牌特色二"],
  ["companyName", "公司或店铺名称"],
  ["provinceRegionId", "省级地区"],
  ["cityRegionId", "城市"],
  ["terminalRegionId", "终端地区"],
  ["contactName", "联系人"],
  ["contactMobile", "手机号"],
];

export function brandReadiness(
  fields: BrandProfileFields,
  requiresOtherProductOrService: boolean,
): BrandReadiness {
  const missingFields = requiredFieldLabels.flatMap(([field, label]) =>
    normalizeText(fields[field]) ? [] : [label],
  );
  if (
    requiresOtherProductOrService &&
    !normalizeText(fields.otherProductOrService)
  ) {
    missingFields.splice(2, 0, "具体产品或服务");
  }
  return { readyForEvaluation: missingFields.length === 0, missingFields };
}

export function evaluationFingerprint(
  fields: BrandProfileFields,
  officialRegionPath: string[],
): string {
  const canonicalValues = [
    "brand-evaluation-input@2",
    normalizeText(fields.companyName),
    normalizeText(fields.primaryIndustryId),
    normalizeText(fields.secondaryIndustryId),
    normalizeText(fields.otherProductOrService),
    normalizeText(fields.characteristicOne),
    normalizeText(fields.characteristicTwo),
    ...officialRegionPath,
  ];
  return createHash("sha256")
    .update(canonicalValues.join("\u001f"))
    .digest("hex");
}

export function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}
