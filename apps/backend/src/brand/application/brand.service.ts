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
import {
  BrandReferenceData,
  BrandReferenceValidationError,
} from "../reference-data/brand-reference-data.js";

@Injectable()
export class BrandService {
  constructor(
    @Inject(BRAND_REPOSITORY) private readonly repository: BrandRepository,
    @Inject(BrandReferenceData) private readonly references: BrandReferenceData,
  ) {}

  async list(accountId: string): Promise<BrandView[]> {
    const result = await this.repository.list(accountId);
    return result.brands.map((brand) =>
      this.presentBrand(brand, brand.id === result.currentBrandId),
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
    this.assertReferenceSelection(fields);
    const created = await this.repository.create({
      accountId,
      fields,
      evaluationFingerprint: this.fingerprint(fields),
    });
    const current = await this.current(accountId);
    return this.presentBrand(created, current?.id === created.id);
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
    this.assertReferenceSelection(fields);
    const { companyName, ...otherPatch } = patch;
    const repositoryPatch: Partial<BrandProfileFields> = {
      ...otherPatch,
      ...(typeof companyName === "string" ? { companyName } : {}),
    };
    const updated = await this.repository.update({
      accountId,
      brandId,
      fields: repositoryPatch,
      evaluationFingerprint: this.fingerprint(fields),
    });
    if (!updated) throw new NotFoundException("未找到该品牌");
    const current = await this.current(accountId);
    return this.presentBrand(updated, current?.id === updated.id);
  }

  async selectCurrent(accountId: string, brandId: string): Promise<BrandView> {
    const selected = await this.repository.selectCurrent(accountId, brandId);
    if (!selected) throw new NotFoundException("未找到该品牌");
    return this.presentBrand(selected, true);
  }

  async evaluationPurposeView(
    accountId: string,
    brandId: string,
  ): Promise<EvaluationPurposeBrandView> {
    const brand = await this.repository.find(accountId, brandId);
    if (!brand) throw new NotFoundException("未找到该品牌");
    const resolved = this.resolveReferenceSelection(brand);
    const readiness = brandReadiness(
      brand,
      resolved.secondaryIndustry?.isOther ?? false,
    );
    if (!readiness.readyForEvaluation) {
      throw new BadRequestException(
        `请先补全诊断资料：${readiness.missingFields.join("、")}`,
      );
    }
    const projection = this.references.evaluationProjection(brand);
    return {
      accountId,
      brandId,
      inputFingerprint: brand.evaluationFingerprint,
      companyName: brand.companyName,
      ...projection,
      characteristicOne: brand.characteristicOne!,
      characteristicTwo: brand.characteristicTwo!,
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

  private fingerprint(fields: BrandProfileFields): string {
    return evaluationFingerprint(
      fields,
      this.references.semanticRegionPath(fields),
    );
  }

  private assertReferenceSelection(fields: BrandProfileFields): void {
    this.resolveReferenceSelection(fields, true);
  }

  private resolveReferenceSelection(
    fields: BrandProfileFields,
    requireActive = false,
  ) {
    try {
      return this.references.resolve(fields, requireActive);
    } catch (error) {
      if (error instanceof BrandReferenceValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private presentBrand(brand: BrandProfileView, isCurrent: boolean): BrandView {
    const resolved = this.resolveReferenceSelection(brand);
    return {
      ...brand,
      ...brandReadiness(brand, resolved.secondaryIndustry?.isOther ?? false),
      primaryIndustryLabel: resolved.primaryIndustry?.label ?? null,
      secondaryIndustryLabel: resolved.secondaryIndustry?.label ?? null,
      provinceRegionLabel: resolved.province?.label ?? null,
      cityRegionLabel: resolved.city?.label ?? null,
      terminalRegionLabel: resolved.terminalRegion?.label ?? null,
      terminalRegionLevel:
        resolved.terminalRegion?.officialLevel === "COUNTY" ||
        resolved.terminalRegion?.officialLevel === "TOWNSHIP"
          ? resolved.terminalRegion.officialLevel
          : null,
      isCurrent,
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
    primaryIndustryId: z.string().max(100).nullable().optional(),
    secondaryIndustryId: z.string().max(100).nullable().optional(),
    otherProductOrService: z.string().max(60).nullable().optional(),
    characteristicOne: z.string().max(500).nullable().optional(),
    characteristicTwo: z.string().max(500).nullable().optional(),
    provinceRegionId: z.string().max(100).nullable().optional(),
    cityRegionId: z.string().max(100).nullable().optional(),
    terminalRegionId: z.string().max(100).nullable().optional(),
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
    primaryIndustryId: cleaned.primaryIndustryId ?? null,
    secondaryIndustryId: cleaned.secondaryIndustryId ?? null,
    otherProductOrService: cleaned.otherProductOrService ?? null,
    characteristicOne: cleaned.characteristicOne ?? null,
    characteristicTwo: cleaned.characteristicTwo ?? null,
    provinceRegionId: cleaned.provinceRegionId ?? null,
    cityRegionId: cleaned.cityRegionId ?? null,
    terminalRegionId: cleaned.terminalRegionId ?? null,
    contactName: cleaned.contactName ?? null,
    contactMobile: cleaned.contactMobile ?? null,
  };
}
