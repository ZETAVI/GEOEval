import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SafeTelemetry } from "../../infrastructure/telemetry.js";

import {
  BRAND_REPOSITORY,
  type BrandRepository,
} from "../domain/brand.repository.js";
import {
  STORE_LOCATION_PROVIDER,
  StoreLocationProviderError,
  type StoreLocationProvider,
} from "../domain/store-location.provider.js";
import {
  BrandReferenceData,
  BrandReferenceValidationError,
} from "../reference-data/brand-reference-data.js";
import { normalizeText } from "../domain/brand-profile.js";
import {
  StoreLocationReceiptCodec,
  type StoreLocationCandidate,
} from "./store-location-receipt.js";

export type StoreLocationVerificationView = {
  targetBrandId: string;
  verificationReceipt: string;
  expiresAt: Date;
  locationPreview: {
    placeName: string;
    formattedAddress: string;
    coordinate: { longitude: number; latitude: number; system: "GCJ_02" };
    officialRegion: ReturnType<BrandReferenceData["deriveOfficialRegion"]>;
  };
  localityCandidates: StoreLocationCandidate[];
};

@Injectable()
export class StoreLocationVerificationService {
  constructor(
    @Inject(BRAND_REPOSITORY) private readonly repository: BrandRepository,
    @Inject(STORE_LOCATION_PROVIDER)
    private readonly provider: StoreLocationProvider,
    @Inject(BrandReferenceData) private readonly references: BrandReferenceData,
    @Inject(StoreLocationReceiptCodec)
    private readonly receipts: StoreLocationReceiptCodec,
    @Inject(SafeTelemetry) private readonly telemetry: SafeTelemetry,
  ) {}

  async verify(
    accountId: string,
    input: { brandId?: string; searchInput: string; providerPlaceId: string },
  ): Promise<StoreLocationVerificationView> {
    const operationId = randomUUID();
    const startedAt = Date.now();
    let outcome = "UNEXPECTED_FAILURE";
    try {
      const result = await this.resolveVerification(accountId, input);
      outcome = "SUCCESS";
      return result;
    } catch (error) {
      outcome = verificationOutcome(error);
      throw error;
    } finally {
      await this.telemetry.export({
        name: "brand.store_location.verification",
        correlationId: operationId,
        attributes: {
          provider: "AMAP",
          outcome,
          durationMs: String(Date.now() - startedAt),
        },
      });
    }
  }

  private async resolveVerification(
    accountId: string,
    input: { brandId?: string; searchInput: string; providerPlaceId: string },
  ): Promise<StoreLocationVerificationView> {
    if (typeof input.searchInput !== "string") {
      throw new BadRequestException("请填写具体店名或地址");
    }
    const searchInput = normalizeText(input.searchInput);
    if (searchInput.length < 2 || searchInput.length > 200) {
      throw new BadRequestException("请用 2-200 个字填写具体店名或地址");
    }
    if (
      input.brandId !== undefined &&
      (typeof input.brandId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          input.brandId,
        ))
    ) {
      throw new BadRequestException("品牌标识无效，请刷新后重试");
    }
    if (
      typeof input.providerPlaceId !== "string" ||
      !input.providerPlaceId.trim() ||
      input.providerPlaceId.trim().length > 120
    ) {
      throw new BadRequestException("门店选择无效，请重新搜索");
    }
    const targetBrandId = input.brandId ?? randomUUID();
    if (
      input.brandId &&
      !(await this.repository.find(accountId, input.brandId))
    ) {
      throw new NotFoundException("未找到该品牌");
    }
    let evidence;
    try {
      evidence = await this.provider.resolveSelectedPlace({
        providerPlaceId: input.providerPlaceId.trim(),
      });
    } catch (error) {
      if (
        error instanceof StoreLocationProviderError &&
        error.code === "PLACE_NOT_FOUND"
      ) {
        throw new BadRequestException(error.message, { cause: error });
      }
      throw new ServiceUnavailableException("位置服务暂时不可用，请稍后重试", {
        cause: error,
      });
    }
    let officialRegion;
    try {
      officialRegion = this.references.deriveOfficialRegion({
        adcode: evidence.adcode,
        towncode: evidence.towncode,
      });
    } catch (error) {
      if (error instanceof BrandReferenceValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
    const localityCandidates = createLocalityCandidates(
      evidence.businessAreaLabels,
      evidence.formattedAddress,
      evidence.placeName,
    );
    const issued = this.receipts.issue({
      verificationId: randomUUID(),
      accountId,
      targetBrandId,
      targetKind: input.brandId ? "EXISTING_BRAND" : "NEW_BRAND",
      searchInput,
      evidence: {
        providerPlaceId: evidence.providerPlaceId,
        placeName: evidence.placeName,
        formattedAddress: evidence.formattedAddress,
        coordinate: evidence.coordinate,
        provinceName: evidence.provinceName,
        cityName: evidence.cityName,
        districtName: evidence.districtName,
        townshipName: evidence.townshipName,
        adcode: evidence.adcode,
        towncode: evidence.towncode,
        providerContractVersion: evidence.providerContractVersion,
        verifiedAt: evidence.verifiedAt.toISOString(),
      },
      officialRegion,
      localityCandidates,
    });
    return {
      targetBrandId,
      ...issued,
      locationPreview: {
        placeName: evidence.placeName,
        formattedAddress: evidence.formattedAddress,
        coordinate: evidence.coordinate,
        officialRegion,
      },
      localityCandidates,
    };
  }
}

function verificationOutcome(error: unknown): string {
  const providerCause =
    error instanceof Error &&
    "cause" in error &&
    error.cause instanceof StoreLocationProviderError
      ? error.cause
      : null;
  if (providerCause) return providerCause.code;
  if (error instanceof NotFoundException) return "BRAND_NOT_FOUND";
  if (error instanceof BadRequestException) return "INPUT_OR_MAPPING_REJECTED";
  if (error instanceof ServiceUnavailableException)
    return "PROVIDER_UNAVAILABLE";
  return "UNEXPECTED_FAILURE";
}

function createLocalityCandidates(
  businessAreaLabels: string[],
  formattedAddress: string,
  placeName: string,
): StoreLocationCandidate[] {
  const labels = [
    ...new Set(businessAreaLabels.map(normalizeText).filter(Boolean)),
  ].slice(0, 10);
  if (labels.length > 0) {
    return labels.map((label, index) => ({
      id: `business-area-${index + 1}`,
      kind: "BUSINESS_AREA",
      label,
    }));
  }
  return [
    {
      id: "address-locality-1",
      kind: "ADDRESS_LOCALITY",
      label: normalizeText(formattedAddress) || normalizeText(placeName),
    },
  ];
}
