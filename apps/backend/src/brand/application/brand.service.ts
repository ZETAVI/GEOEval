import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";

import {
  BRAND_REPOSITORY,
  type BrandRepository,
} from "../domain/brand.repository.js";
import {
  brandReadiness,
  evaluationFingerprint,
  normalizeText,
} from "../domain/brand-profile.js";
import type {
  BrandProfileFields,
  BrandProfileView,
  BrandView,
  EditableBrandFields,
  EvaluationPurposeBrandView,
  EvaluationReportPurposeBrandView,
} from "../domain/brand.types.js";

@Injectable()
export class BrandService {
  constructor(
    @Inject(BRAND_REPOSITORY) private readonly repository: BrandRepository,
  ) {}

  async list(accountId: string): Promise<BrandView[]> {
    const result = await this.repository.list(accountId);
    return result.brands.map((brand) =>
      presentBrand(brand, brand.id === result.currentBrandId),
    );
  }

  async current(accountId: string): Promise<BrandView | null> {
    const brands = await this.list(accountId);
    return brands.find((brand) => brand.isCurrent) ?? null;
  }

  async create(
    accountId: string,
    input: EditableBrandFields,
    defaultContactMobile?: string,
  ): Promise<BrandView> {
    const parsed = parseBrandMutation(input);
    const fields = completeFields({
      ...parsed,
      contactMobile: parsed.contactMobile ?? defaultContactMobile ?? null,
    });
    if (!fields.companyName) {
      throw new BadRequestException("请填写公司或店铺名称");
    }
    const created = await this.repository.create({
      accountId,
      fields,
      evaluationFingerprint: evaluationFingerprint(fields),
    });
    const current = await this.current(accountId);
    return presentBrand(created, current?.id === created.id);
  }

  async update(
    accountId: string,
    brandId: string,
    input: EditableBrandFields,
  ): Promise<BrandView> {
    const existing = await this.repository.find(accountId, brandId);
    if (!existing) throw new NotFoundException("未找到该品牌");
    const patch = cleanPatch(parseBrandMutation(input));
    const fields = completeFields({ ...existing, ...patch });
    if (!fields.companyName) {
      throw new BadRequestException("公司或店铺名称不能为空");
    }
    const { companyName, ...otherPatch } = patch;
    const repositoryPatch: Partial<BrandProfileFields> = {
      ...otherPatch,
      ...(typeof companyName === "string" ? { companyName } : {}),
    };
    const updated = await this.repository.update({
      accountId,
      brandId,
      fields: repositoryPatch,
      evaluationFingerprint: evaluationFingerprint(fields),
    });
    if (!updated) throw new NotFoundException("未找到该品牌");
    const current = await this.current(accountId);
    return presentBrand(updated, current?.id === updated.id);
  }

  async selectCurrent(accountId: string, brandId: string): Promise<BrandView> {
    const selected = await this.repository.selectCurrent(accountId, brandId);
    if (!selected) throw new NotFoundException("未找到该品牌");
    return presentBrand(selected, true);
  }

  async evaluationPurposeView(
    accountId: string,
    brandId: string,
  ): Promise<EvaluationPurposeBrandView> {
    const brand = await this.repository.find(accountId, brandId);
    if (!brand) throw new NotFoundException("未找到该品牌");
    const readiness = brandReadiness(brand);
    if (!readiness.readyForEvaluation) {
      throw new BadRequestException(
        `请先补全诊断资料：${readiness.missingFields.join("、")}`,
      );
    }
    return {
      accountId,
      brandId,
      inputFingerprint: brand.evaluationFingerprint,
      companyName: brand.companyName,
      primaryIndustry: brand.primaryIndustry!,
      secondaryIndustry: brand.secondaryIndustry!,
      characteristicOne: brand.characteristicOne!,
      characteristicTwo: brand.characteristicTwo!,
      province: brand.province!,
      city: brand.city!,
      district: brand.district!,
    };
  }

  async evaluationReportPurposeView(
    accountId: string,
    brandId: string,
  ): Promise<EvaluationReportPurposeBrandView> {
    const brand = await this.repository.find(accountId, brandId);
    if (!brand) throw new NotFoundException("未找到该品牌");
    return {
      accountId,
      brandId,
      companyName: brand.companyName,
      inputFingerprint: brand.evaluationFingerprint,
    };
  }
}

function cleanPatch(input: EditableBrandFields): EditableBrandFields {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === "string" ? normalizeText(value) || null : value,
    ]),
  ) as EditableBrandFields;
}

const brandMutationSchema = z
  .object({
    companyName: z.string().max(200).nullable().optional(),
    primaryIndustry: z.string().max(100).nullable().optional(),
    secondaryIndustry: z.string().max(100).nullable().optional(),
    characteristicOne: z.string().max(500).nullable().optional(),
    characteristicTwo: z.string().max(500).nullable().optional(),
    province: z.string().max(100).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    district: z.string().max(100).nullable().optional(),
    contactName: z.string().max(100).nullable().optional(),
    contactMobile: z.string().max(20).nullable().optional(),
  })
  .strict();

function parseBrandMutation(input: EditableBrandFields): EditableBrandFields {
  const parsed = brandMutationSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestException("品牌资料格式不正确，请检查后重试");
  }
  return Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  ) as EditableBrandFields;
}

function completeFields(input: EditableBrandFields): BrandProfileFields {
  const cleaned = cleanPatch(input);
  return {
    companyName: normalizeText(cleaned.companyName),
    primaryIndustry: cleaned.primaryIndustry ?? null,
    secondaryIndustry: cleaned.secondaryIndustry ?? null,
    characteristicOne: cleaned.characteristicOne ?? null,
    characteristicTwo: cleaned.characteristicTwo ?? null,
    province: cleaned.province ?? null,
    city: cleaned.city ?? null,
    district: cleaned.district ?? null,
    contactName: cleaned.contactName ?? null,
    contactMobile: cleaned.contactMobile ?? null,
  };
}

function presentBrand(brand: BrandProfileView, isCurrent: boolean): BrandView {
  return { ...brand, ...brandReadiness(brand), isCurrent };
}
