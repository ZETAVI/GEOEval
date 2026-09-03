import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";

import {
  BRAND_REPOSITORY,
  BrandConcurrentUpdateError,
  BrandStoreLocationReceiptReplayError,
  type BrandRepository,
} from "../domain/brand.repository.js";
import {
  BrandProfileValidationError,
  brandReadiness,
  canonicalCharacteristics,
  evaluationFingerprint,
  normalizeCharacteristics,
  normalizeFlagshipProductOrService,
  normalizeText,
  sameStoreLocationMeaning,
} from "../domain/brand-profile.js";
import type {
  BrandMutationInput,
  BrandProfileFields,
  BrandProfileView,
  BrandStoreLocation,
  BrandStoreLocationWrite,
  BrandView,
  EditableBrandFields,
  EvaluationPurposeBrandView,
  EvaluationReportPurposeBrandView,
  LocationChangeRequest,
} from "../domain/brand.types.js";
import {
  BrandReferenceData,
  BrandReferenceValidationError,
} from "../reference-data/brand-reference-data.js";
import {
  StoreLocationReceiptCodec,
  StoreLocationReceiptError,
  type StoreLocationReceiptPayload,
} from "./store-location-receipt.js";

@Injectable()
export class BrandService {
  constructor(
    @Inject(BRAND_REPOSITORY) private readonly repository: BrandRepository,
    @Inject(BrandReferenceData) private readonly references: BrandReferenceData,
    @Inject(StoreLocationReceiptCodec)
    private readonly receipts: StoreLocationReceiptCodec,
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
    input: BrandMutationInput,
    defaultContactMobile?: string,
  ): Promise<BrandView> {
    const parsed = parseBrandMutation(input);
    if (parsed.locationChange?.action === "REMOVE") {
      throw new BadRequestException("新品牌没有可移除的门店");
    }
    const fields = completeFields({
      ...parsed.fields,
      contactMobile:
        parsed.fields.contactMobile ?? defaultContactMobile ?? null,
    });
    if (!fields.companyName) {
      throw new BadRequestException("请填写公司或店铺名称");
    }
    this.assertIndustrySelection(fields);
    const receipt = parsed.locationChange
      ? this.verifyReceipt(accountId, parsed.locationChange, "NEW_BRAND")
      : null;
    if (
      receipt &&
      (await this.repository.find(accountId, receipt.targetBrandId))
    ) {
      throw new BadRequestException("门店验证凭证已使用，请重新选择门店");
    }
    const storeLocation = receipt
      ? locationFromReceipt(receipt, randomUUID())
      : null;
    let created: BrandProfileView;
    try {
      created = await this.repository.create({
        ...(receipt ? { brandId: receipt.targetBrandId } : {}),
        accountId,
        fields,
        storeLocation,
        evaluationFingerprint: evaluationFingerprint(
          fields,
          asLocation(storeLocation),
        ),
      });
    } catch (error) {
      if (error instanceof BrandStoreLocationReceiptReplayError) {
        throw new BadRequestException("门店验证凭证已使用，请重新选择门店");
      }
      throw error;
    }
    const current = await this.current(accountId);
    return this.presentBrand(created, current?.id === created.id);
  }

  async update(
    accountId: string,
    brandId: string,
    input: BrandMutationInput,
  ): Promise<BrandView> {
    const existing = await this.repository.find(accountId, brandId);
    if (!existing) throw new NotFoundException("未找到该品牌");
    const parsed = parseBrandMutation(input);
    const fields = completeFields({ ...existing, ...parsed.fields });
    if (!fields.companyName) {
      throw new BadRequestException("公司或店铺名称不能为空");
    }
    this.assertIndustrySelection(fields);
    const storeLocation = this.nextLocation(
      accountId,
      brandId,
      existing.storeLocation,
      parsed.locationChange,
    );
    let updated: BrandProfileView | undefined;
    try {
      updated = await this.repository.update({
        accountId,
        brandId,
        expectedLocationVerificationId:
          existing.storeLocation?.verificationId ?? null,
        fields,
        storeLocation,
        evaluationFingerprint: evaluationFingerprint(
          fields,
          asLocation(storeLocation),
        ),
      });
    } catch (error) {
      if (error instanceof BrandConcurrentUpdateError) {
        throw new ConflictException("品牌资料已被更新，请刷新后重试");
      }
      if (error instanceof BrandStoreLocationReceiptReplayError) {
        throw new BadRequestException("门店验证凭证已使用，请重新选择门店");
      }
      throw error;
    }
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
    const resolved = this.resolveIndustrySelection(brand);
    const readiness = brandReadiness(
      brand,
      resolved.secondaryIndustry?.isOther ?? false,
      brand.storeLocation,
    );
    if (!readiness.readyForEvaluation || !brand.storeLocation) {
      throw new BadRequestException(
        `请先补全诊断资料：${readiness.missingFields.join("、")}`,
      );
    }
    const industry = this.references.industryProjection(brand);
    return {
      accountId,
      brandId,
      inputFingerprint: brand.evaluationFingerprint,
      companyName: brand.companyName,
      industry,
      region: brand.storeLocation.officialRegion,
      storeLocation: {
        semanticFactId: brand.storeLocation.semanticFactId,
        placeName: brand.storeLocation.placeName,
        formattedAddress: brand.storeLocation.formattedAddress,
        coordinate: brand.storeLocation.coordinate,
        queryLocality: brand.storeLocation.queryLocality,
        source: {
          provider: brand.storeLocation.provider,
          placeId: brand.storeLocation.providerPlaceId,
          contractVersion: brand.storeLocation.providerContractVersion,
          verifiedAt: brand.storeLocation.verifiedAt,
        },
      },
      flagshipProductOrService: brand.flagshipProductOrService!,
      characteristics: canonicalCharacteristics(brand.characteristics),
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

  private nextLocation(
    accountId: string,
    brandId: string,
    current: BrandStoreLocation | null,
    change: LocationChangeRequest | undefined,
  ): BrandStoreLocationWrite | null {
    if (!change) return current ? toLocationWrite(current) : null;
    if (change.action === "REMOVE") return null;
    const receipt = this.verifyReceipt(
      accountId,
      change,
      "EXISTING_BRAND",
      brandId,
    );
    if (current?.verificationId === receipt.verificationId) {
      throw new BadRequestException("门店验证凭证已使用，请重新选择门店");
    }
    if (current && receipt.issuedAt <= current.receiptIssuedAt.getTime()) {
      throw new BadRequestException("门店验证凭证已过期，请重新选择门店");
    }
    const candidate = {
      providerPlaceId: receipt.evidence.providerPlaceId,
      queryLocality: receipt.queryLocality,
    };
    const semanticFactId = sameStoreLocationMeaning(current, candidate)
      ? current!.semanticFactId
      : randomUUID();
    return locationFromReceipt(receipt, semanticFactId);
  }

  private verifyReceipt(
    accountId: string,
    change: Extract<LocationChangeRequest, { action: "REPLACE" }>,
    targetKind: StoreLocationReceiptPayload["targetKind"],
    targetBrandId?: string,
  ) {
    let payload: StoreLocationReceiptPayload;
    try {
      payload = this.receipts.verify(change.verificationReceipt);
    } catch (error) {
      if (error instanceof StoreLocationReceiptError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
    if (
      payload.accountId !== accountId ||
      payload.targetKind !== targetKind ||
      (targetBrandId && payload.targetBrandId !== targetBrandId)
    ) {
      throw new BadRequestException("门店验证凭证不属于当前品牌");
    }
    return payload;
  }

  private assertIndustrySelection(fields: BrandProfileFields): void {
    this.resolveIndustrySelection(fields, true);
  }

  private resolveIndustrySelection(
    fields: BrandProfileFields,
    requireActive = false,
  ) {
    try {
      return this.references.resolveIndustry(fields, requireActive);
    } catch (error) {
      if (error instanceof BrandReferenceValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private presentBrand(brand: BrandProfileView, isCurrent: boolean): BrandView {
    const resolved = this.resolveIndustrySelection(brand);
    return {
      ...brand,
      ...brandReadiness(
        brand,
        resolved.secondaryIndustry?.isOther ?? false,
        brand.storeLocation,
      ),
      primaryIndustryLabel: resolved.primaryIndustry?.label ?? null,
      secondaryIndustryLabel: resolved.secondaryIndustry?.label ?? null,
      isCurrent,
    };
  }
}

function parseBrandMutation(input: BrandMutationInput): {
  fields: EditableBrandFields;
  locationChange?: LocationChangeRequest;
} {
  const parsed = brandMutationSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestException("品牌资料格式不正确，请检查后重试");
  }
  try {
    const fields = cleanPatch(parsed.data);
    return {
      fields,
      ...(parsed.data.locationChange
        ? { locationChange: parsed.data.locationChange }
        : {}),
    };
  } catch (error) {
    if (error instanceof BrandProfileValidationError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}

function cleanPatch(
  input: z.infer<typeof brandMutationSchema>,
): EditableBrandFields {
  const result: EditableBrandFields = {};
  if (input.companyName !== undefined) {
    result.companyName = normalizeText(input.companyName) || null;
  }
  for (const field of [
    "primaryIndustryId",
    "secondaryIndustryId",
    "otherProductOrService",
    "contactName",
    "contactMobile",
  ] as const) {
    if (input[field] !== undefined) {
      result[field] = normalizeText(input[field]) || null;
    }
  }
  if (input.flagshipProductOrService !== undefined) {
    result.flagshipProductOrService = normalizeFlagshipProductOrService(
      input.flagshipProductOrService,
    );
  }
  if (input.characteristics !== undefined) {
    result.characteristics = normalizeCharacteristics(input.characteristics);
  }
  return result;
}

const brandMutationSchema = z
  .object({
    companyName: z.string().max(200).nullable().optional(),
    primaryIndustryId: z.string().max(100).nullable().optional(),
    secondaryIndustryId: z.string().max(100).nullable().optional(),
    otherProductOrService: z.string().max(60).nullable().optional(),
    flagshipProductOrService: z.string().max(80).nullable().optional(),
    characteristics: z.array(z.string().max(120)).max(6).optional(),
    contactName: z.string().max(100).nullable().optional(),
    contactMobile: z.string().max(20).nullable().optional(),
    locationChange: z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("REMOVE") }).strict(),
        z
          .object({
            action: z.literal("REPLACE"),
            verificationReceipt: z.string().min(1).max(20_000),
          })
          .strict(),
      ])
      .optional(),
  })
  .strict();

function completeFields(input: EditableBrandFields): BrandProfileFields {
  return {
    companyName: normalizeText(input.companyName),
    primaryIndustryId: normalizeText(input.primaryIndustryId) || null,
    secondaryIndustryId: normalizeText(input.secondaryIndustryId) || null,
    otherProductOrService: normalizeText(input.otherProductOrService) || null,
    flagshipProductOrService: normalizeFlagshipProductOrService(
      input.flagshipProductOrService,
    ),
    characteristics: normalizeCharacteristics(input.characteristics ?? []),
    contactName: normalizeText(input.contactName) || null,
    contactMobile: normalizeText(input.contactMobile) || null,
  };
}

function locationFromReceipt(
  payload: StoreLocationReceiptPayload,
  semanticFactId: string,
): BrandStoreLocationWrite {
  return {
    semanticFactId,
    verificationId: payload.verificationId,
    receiptIssuedAt: new Date(payload.issuedAt),
    searchInput: payload.searchInput,
    provider: "AMAP",
    providerPlaceId: payload.evidence.providerPlaceId,
    providerContractVersion: payload.evidence.providerContractVersion,
    verifiedAt: new Date(payload.evidence.verifiedAt),
    placeName: payload.evidence.placeName,
    formattedAddress: payload.evidence.formattedAddress,
    provinceName: payload.evidence.provinceName,
    cityName: payload.evidence.cityName,
    districtName: payload.evidence.districtName,
    townshipName: payload.evidence.townshipName,
    providerAdcode: payload.evidence.adcode,
    providerTowncode: payload.evidence.towncode,
    officialRegion: payload.officialRegion,
    coordinate: payload.evidence.coordinate,
    queryLocality: payload.queryLocality,
  };
}

function toLocationWrite(
  location: BrandStoreLocation,
): BrandStoreLocationWrite {
  const {
    id: _id,
    brandId: _brandId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...write
  } = location;
  return write;
}

function asLocation(
  location: BrandStoreLocationWrite | null,
): BrandStoreLocation | null {
  return location
    ? {
        ...location,
        id: "pending",
        brandId: "pending",
        createdAt: location.verifiedAt,
        updatedAt: location.verifiedAt,
      }
    : null;
}
