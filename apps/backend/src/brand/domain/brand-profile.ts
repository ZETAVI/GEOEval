import { createHash, randomUUID } from "node:crypto";

import type {
  BrandArticleInformation,
  BrandArticleInformationReadiness,
  BrandCharacteristic,
  BrandCharacteristicMutation,
  BrandProfileFields,
  BrandReadiness,
  BrandStoreLocation,
} from "./brand.types.js";

export class BrandProfileValidationError extends Error {}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const EMPTY_ARTICLE_INFORMATION: BrandArticleInformation = {
  price: null,
  suitableAudienceContexts: [],
  supplementalBackground: null,
  desiredPositioning: [],
};

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

export function articleInformationReadiness(
  fields: BrandProfileFields,
  evaluation: BrandReadiness,
): BrandArticleInformationReadiness {
  const missingFields = evaluation.readyForEvaluation
    ? []
    : ["请先补全诊断资料"];
  if (!fields.articleInformation.price) missingFields.push("价格信息");
  if (fields.articleInformation.suitableAudienceContexts.length === 0) {
    missingFields.push("适用客户与场景");
  }
  return {
    readyForArticleGeneration: missingFields.length === 0,
    articleInformationMissingFields: missingFields,
  };
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

export function normalizeCharacteristics(
  values: BrandCharacteristicMutation[],
  current: BrandCharacteristic[] = [],
): BrandCharacteristic[] {
  const currentById = new Map(current.map((item) => [item.id, item]));
  const normalized = values.map((value) => {
    const title = normalizeText(value.title);
    const detail = normalizeText(value.detail) || null;
    if (!title) {
      throw new BrandProfileValidationError("每项品牌特色需为 2-120 个字");
    }
    if (value.id && !uuidPattern.test(value.id)) {
      throw new BrandProfileValidationError("品牌特色标识格式不正确");
    }
    if (value.id && !currentById.has(value.id)) {
      throw new BrandProfileValidationError("品牌特色标识无效，请刷新后重试");
    }
    return {
      id: value.id ?? randomUUID(),
      title,
      detail,
    };
  });
  if (normalized.length > 6) {
    throw new BrandProfileValidationError("品牌特色最多填写六项");
  }
  for (const value of normalized) {
    if (value.title.length < 2 || value.title.length > 120) {
      throw new BrandProfileValidationError("每项品牌特色需为 2-120 个字");
    }
    if (
      value.detail &&
      (value.detail.length < 2 || value.detail.length > 1000)
    ) {
      throw new BrandProfileValidationError("品牌特色详情需为 2-1000 个字");
    }
  }
  if (
    new Set(normalized.map((value) => value.title)).size !== normalized.length
  ) {
    throw new BrandProfileValidationError("品牌特色不能重复");
  }
  if (new Set(normalized.map((value) => value.id)).size !== normalized.length) {
    throw new BrandProfileValidationError("品牌特色标识不能重复");
  }
  return normalized;
}

export function canonicalCharacteristics(
  values: BrandCharacteristic[],
): string[] {
  return values.map((value) => value.title).sort();
}

export function normalizeArticleInformation(
  value: BrandArticleInformation | null | undefined,
): BrandArticleInformation {
  const price = normalizePrice(value?.price ?? null);
  return {
    price,
    suitableAudienceContexts: normalizeDistinctItems(
      value?.suitableAudienceContexts ?? [],
      "适用客户与场景",
    ),
    supplementalBackground: normalizeBoundedOptionalText(
      value?.supplementalBackground,
      2000,
      "品牌补充背景",
    ),
    desiredPositioning: normalizeDistinctItems(
      value?.desiredPositioning ?? [],
      "期望品牌认知",
    ),
  };
}

export function writingContextFingerprint(
  evaluationInputFingerprint: string,
  characteristics: BrandCharacteristic[],
  articleInformation: BrandArticleInformation,
): string {
  const normalizedArticleInformation =
    normalizeArticleInformation(articleInformation);
  const canonical = {
    scheme: "brand-writing-context@1",
    evaluationFingerprint: evaluationInputFingerprint,
    characteristicDetails: characteristics
      .filter((item) => item.detail)
      .map((item) => ({ title: item.title, detail: item.detail! }))
      .sort((left, right) => {
        const leftKey = `${left.title}\u0000${left.detail}`;
        const rightKey = `${right.title}\u0000${right.detail}`;
        return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
      }),
    articleInformation: {
      ...normalizedArticleInformation,
      suitableAudienceContexts: [
        ...normalizedArticleInformation.suitableAudienceContexts,
      ].sort(),
      desiredPositioning: [
        ...normalizedArticleInformation.desiredPositioning,
      ].sort(),
    },
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
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

function normalizeTextValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" ? Boolean(normalizeText(value)) : false;
}

function normalizePrice(
  value: BrandArticleInformation["price"],
): BrandArticleInformation["price"] {
  if (!value || value.mode === "NEGOTIABLE") return value;
  if (
    !Number.isInteger(value.minimum) ||
    !Number.isInteger(value.maximum) ||
    value.minimum <= 0 ||
    value.maximum <= 0
  ) {
    throw new BrandProfileValidationError("价格区间必须使用人民币正整数");
  }
  if (value.maximum < value.minimum) {
    throw new BrandProfileValidationError("最高价不能低于最低价");
  }
  return value;
}

function normalizeDistinctItems(values: string[], label: string): string[] {
  const normalized = values.map(normalizeText).filter(Boolean);
  if (normalized.length > 5) {
    throw new BrandProfileValidationError(`${label}最多填写五项`);
  }
  if (normalized.some((value) => value.length < 2 || value.length > 80)) {
    throw new BrandProfileValidationError(`${label}每项需为 2-80 个字`);
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new BrandProfileValidationError(`${label}不能重复`);
  }
  return normalized;
}

function normalizeBoundedOptionalText(
  value: string | null | undefined,
  maximum: number,
  label: string,
): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized.length > maximum) {
    throw new BrandProfileValidationError(`${label}最多 ${maximum} 个字`);
  }
  return normalized;
}
