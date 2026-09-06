import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  BrandConcurrentUpdateError,
  type BrandRepository,
  BrandStoreLocationReceiptReplayError,
} from "../domain/brand.repository.js";
import type {
  BrandArticleInformation,
  BrandCharacteristic,
  BrandProfileFields,
  BrandProfileView,
  BrandStoreLocation,
  BrandStoreLocationWrite,
  OfficialRegionNode,
} from "../domain/brand.types.js";
import {
  normalizeArticleInformation,
  normalizeCharacteristics,
} from "../domain/brand-profile.js";

const includeStoreLocation = { storeLocation: true } as const;
type BrandRow = Prisma.BrandProfileGetPayload<{
  include: typeof includeStoreLocation;
}>;
type StoreLocationRow = NonNullable<BrandRow["storeLocation"]>;

@Injectable()
export class PostgresBrandRepository implements BrandRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(accountId: string): Promise<{
    brands: BrandProfileView[];
    currentBrandId: string | null;
  }> {
    const [brands, context] = await Promise.all([
      this.prisma.brandProfile.findMany({
        where: { accountId, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        include: includeStoreLocation,
      }),
      this.prisma.brandContext.findUnique({ where: { accountId } }),
    ]);
    return {
      brands: brands.map(mapBrand),
      currentBrandId: context?.currentBrandId ?? null,
    };
  }

  async find(
    accountId: string,
    brandId: string,
  ): Promise<BrandProfileView | undefined> {
    const row = await this.prisma.brandProfile.findFirst({
      where: { id: brandId, accountId, status: "ACTIVE" },
      include: includeStoreLocation,
    });
    return row ? mapBrand(row) : undefined;
  }

  async create(input: {
    brandId?: string;
    accountId: string;
    fields: BrandProfileFields;
    storeLocation: BrandStoreLocationWrite | null;
    evaluationFingerprint: string;
    writingContextFingerprint: string;
  }): Promise<BrandProfileView> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const brand = await transaction.brandProfile.create({
          data: {
            ...(input.brandId ? { id: input.brandId } : {}),
            accountId: input.accountId,
            ...profileData(input.fields),
            evaluationFingerprint: input.evaluationFingerprint,
            writingContextFingerprint: input.writingContextFingerprint,
          },
        });
        if (input.storeLocation) {
          await transaction.brandStoreLocation.create({
            data: {
              brandId: brand.id,
              ...locationData(input.storeLocation, input.accountId),
            },
          });
        }
        await transaction.brandContext.upsert({
          where: { accountId: input.accountId },
          create: { accountId: input.accountId, currentBrandId: brand.id },
          update: {},
        });
        await transaction.brandContext.updateMany({
          where: { accountId: input.accountId, currentBrandId: null },
          data: { currentBrandId: brand.id },
        });
        return mapBrand(
          await transaction.brandProfile.findUniqueOrThrow({
            where: { id: brand.id },
            include: includeStoreLocation,
          }),
        );
      });
    } catch (error) {
      if (isUniqueViolation(error) && input.storeLocation) {
        throw new BrandStoreLocationReceiptReplayError();
      }
      throw error;
    }
  }

  async update(input: {
    accountId: string;
    brandId: string;
    expectedRevision: number;
    fields: BrandProfileFields;
    storeLocation: BrandStoreLocationWrite | null;
    evaluationFingerprint: string;
    writingContextFingerprint: string;
  }): Promise<BrandProfileView | undefined> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const owned = await transaction.$queryRaw<
          Array<{ id: string; revision: number }>
        >`
          SELECT "id", "revision"
          FROM "brand_profiles"
          WHERE "id" = CAST(${input.brandId} AS UUID)
            AND "account_id" = CAST(${input.accountId} AS UUID)
            AND "status" = 'ACTIVE'
          FOR UPDATE
        `;
        if (owned.length === 0) return undefined;
        if (owned[0]!.revision !== input.expectedRevision) {
          throw new BrandConcurrentUpdateError();
        }
        if (input.storeLocation) {
          await transaction.brandStoreLocation.upsert({
            where: { brandId: input.brandId },
            create: {
              brandId: input.brandId,
              ...locationData(input.storeLocation, input.accountId),
            },
            update: locationData(input.storeLocation, input.accountId),
          });
        } else {
          await transaction.brandStoreLocation.deleteMany({
            where: { brandId: input.brandId, accountId: input.accountId },
          });
        }
        const brand = await transaction.brandProfile.update({
          where: { id: input.brandId },
          data: {
            ...profileData(input.fields),
            evaluationFingerprint: input.evaluationFingerprint,
            writingContextFingerprint: input.writingContextFingerprint,
            revision: { increment: 1 },
          },
          include: includeStoreLocation,
        });
        return mapBrand(brand);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BrandStoreLocationReceiptReplayError();
      }
      throw error;
    }
  }

  async selectCurrent(
    accountId: string,
    brandId: string,
  ): Promise<BrandProfileView | undefined> {
    return this.prisma.$transaction(async (transaction) => {
      const brand = await transaction.brandProfile.findFirst({
        where: { id: brandId, accountId, status: "ACTIVE" },
        include: includeStoreLocation,
      });
      if (!brand) return undefined;
      await transaction.brandContext.upsert({
        where: { accountId },
        create: { accountId, currentBrandId: brandId },
        update: { currentBrandId: brandId },
      });
      return mapBrand(brand);
    });
  }
}

function profileData(fields: BrandProfileFields) {
  return {
    companyName: fields.companyName,
    primaryIndustryId: fields.primaryIndustryId,
    secondaryIndustryId: fields.secondaryIndustryId,
    otherProductOrService: fields.otherProductOrService,
    flagshipProductOrService: fields.flagshipProductOrService,
    characteristics: fields.characteristics as Prisma.InputJsonValue,
    articleInformation: fields.articleInformation as Prisma.InputJsonValue,
    contactName: fields.contactName,
    contactMobile: fields.contactMobile,
  };
}

function locationData(location: BrandStoreLocationWrite, accountId: string) {
  return {
    accountId,
    semanticFactId: location.semanticFactId,
    verificationId: location.verificationId,
    receiptIssuedAt: location.receiptIssuedAt,
    searchInput: location.searchInput,
    provider: location.provider,
    providerPlaceId: location.providerPlaceId,
    providerContractVersion: location.providerContractVersion,
    verifiedAt: location.verifiedAt,
    placeName: location.placeName,
    formattedAddress: location.formattedAddress,
    provinceName: location.provinceName,
    cityName: location.cityName,
    districtName: location.districtName,
    townshipName: location.townshipName,
    providerAdcode: location.providerAdcode,
    providerTowncode: location.providerTowncode,
    officialProvinceRegionId: location.officialRegion.province.id,
    officialCityRegionId: location.officialRegion.city.id,
    officialTerminalRegionId: location.officialRegion.terminal.id,
    officialRegionPath: location.officialRegion
      .officialPath as Prisma.InputJsonValue,
    officialRegionSourceReleaseId: location.officialRegion.sourceReleaseId,
    longitude: location.coordinate.longitude,
    latitude: location.coordinate.latitude,
    coordinateSystem: location.coordinate.system,
    queryLocalityKind: location.queryLocality.kind,
    queryLocalityLabel: location.queryLocality.label,
  };
}

function mapBrand(row: BrandRow): BrandProfileView {
  return {
    id: row.id,
    accountId: row.accountId,
    status: row.status,
    companyName: row.companyName,
    primaryIndustryId: row.primaryIndustryId,
    secondaryIndustryId: row.secondaryIndustryId,
    otherProductOrService: row.otherProductOrService,
    flagshipProductOrService: row.flagshipProductOrService,
    characteristics: parseCharacteristics(row.characteristics),
    articleInformation: parseArticleInformation(row.articleInformation),
    contactName: row.contactName,
    contactMobile: row.contactMobile,
    evaluationFingerprint: row.evaluationFingerprint,
    writingContextFingerprint: row.writingContextFingerprint,
    revision: row.revision,
    storeLocation: row.storeLocation
      ? mapStoreLocation(row.storeLocation)
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapStoreLocation(row: StoreLocationRow): BrandStoreLocation {
  const officialPath = parseOfficialPath(row.officialRegionPath);
  const province = officialPath.find(
    (region) => region.id === row.officialProvinceRegionId,
  );
  const terminal = officialPath.find(
    (region) => region.id === row.officialTerminalRegionId,
  );
  if (!province || !terminal) {
    throw new Error("Stored official region path is inconsistent");
  }
  const city = cityProjection(row.officialCityRegionId, province, officialPath);
  if (
    terminal.officialLevel !== "COUNTY" &&
    terminal.officialLevel !== "TOWNSHIP"
  ) {
    throw new Error("Stored terminal region level is invalid");
  }
  return {
    id: row.id,
    brandId: row.brandId,
    semanticFactId: row.semanticFactId,
    verificationId: row.verificationId,
    receiptIssuedAt: row.receiptIssuedAt,
    searchInput: row.searchInput,
    provider: row.provider,
    providerPlaceId: row.providerPlaceId,
    providerContractVersion: row.providerContractVersion,
    verifiedAt: row.verifiedAt,
    placeName: row.placeName,
    formattedAddress: row.formattedAddress,
    provinceName: row.provinceName,
    cityName: row.cityName,
    districtName: row.districtName,
    townshipName: row.townshipName,
    providerAdcode: row.providerAdcode,
    providerTowncode: row.providerTowncode,
    officialRegion: {
      sourceReleaseId: row.officialRegionSourceReleaseId,
      province: { id: province.id, label: province.label },
      city,
      terminal: { ...terminal, officialLevel: terminal.officialLevel },
      officialPath,
    },
    coordinate: {
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
      system: "GCJ_02",
    },
    queryLocality: {
      kind: row.queryLocalityKind,
      label: row.queryLocalityLabel,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseCharacteristics(value: Prisma.JsonValue): BrandCharacteristic[] {
  if (!Array.isArray(value)) {
    throw new Error("Stored Brand characteristics are invalid");
  }
  const parsed = value.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      !hasExactKeys(item, ["id", "title", "detail"]) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      (item.detail !== null && typeof item.detail !== "string")
    ) {
      throw new Error("Stored Brand characteristic item is invalid");
    }
    return { id: item.id, title: item.title, detail: item.detail };
  });
  try {
    const normalized = normalizeCharacteristics(parsed, parsed);
    if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      throw new Error("Stored Brand characteristics are not normalized");
    }
    return normalized;
  } catch {
    throw new Error("Stored Brand characteristics are invalid");
  }
}

function parseArticleInformation(
  value: Prisma.JsonValue,
): BrandArticleInformation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Stored Brand Article Information is invalid");
  }
  const price = value.price;
  if (
    !hasExactKeys(value, [
      "price",
      "suitableAudienceContexts",
      "supplementalBackground",
      "desiredPositioning",
    ])
  ) {
    throw new Error("Stored Brand Article Information is invalid");
  }
  const validPrice =
    price === null ||
    (typeof price === "object" &&
      !Array.isArray(price) &&
      ((price.mode === "NEGOTIABLE" && hasExactKeys(price, ["mode"])) ||
        (price.mode === "RANGE" &&
          hasExactKeys(price, ["mode", "minimum", "maximum"]) &&
          typeof price.minimum === "number" &&
          typeof price.maximum === "number")));
  if (
    !validPrice ||
    !Array.isArray(value.suitableAudienceContexts) ||
    value.suitableAudienceContexts.some((item) => typeof item !== "string") ||
    (value.supplementalBackground !== null &&
      typeof value.supplementalBackground !== "string") ||
    !Array.isArray(value.desiredPositioning) ||
    value.desiredPositioning.some((item) => typeof item !== "string")
  ) {
    throw new Error("Stored Brand Article Information is invalid");
  }
  const parsed = {
    price: price as BrandArticleInformation["price"],
    suitableAudienceContexts: value.suitableAudienceContexts as string[],
    supplementalBackground: value.supplementalBackground,
    desiredPositioning: value.desiredPositioning as string[],
  };
  try {
    const normalized = normalizeArticleInformation(parsed);
    if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      throw new Error("Stored Brand Article Information is not normalized");
    }
    return normalized;
  } catch {
    throw new Error("Stored Brand Article Information is invalid");
  }
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function parseOfficialPath(value: Prisma.JsonValue): OfficialRegionNode[] {
  if (!Array.isArray(value)) {
    throw new Error("Stored official region path is invalid");
  }
  return value.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      typeof item.id !== "string" ||
      typeof item.label !== "string" ||
      typeof item.officialCode !== "string" ||
      !["PROVINCE", "PREFECTURE", "COUNTY", "TOWNSHIP"].includes(
        String(item.officialLevel),
      )
    ) {
      throw new Error("Stored official region path item is invalid");
    }
    return {
      id: item.id,
      label: item.label,
      officialCode: item.officialCode,
      officialLevel: item.officialLevel as OfficialRegionNode["officialLevel"],
    };
  });
}

function cityProjection(
  cityId: string,
  province: OfficialRegionNode,
  path: OfficialRegionNode[],
): BrandStoreLocation["officialRegion"]["city"] {
  if (cityId.startsWith("CN-MCA-VIEW-MUNICIPALITY-")) {
    return {
      id: cityId,
      label: province.label,
      identityKind: "MUNICIPALITY_REPEAT",
      officialDivisionId: province.id,
    };
  }
  if (cityId.startsWith("CN-MCA-VIEW-DIRECT-")) {
    return {
      id: cityId,
      label: "省直辖县级行政区划",
      identityKind: "PROVINCE_DIRECT_GROUP",
      officialDivisionId: null,
    };
  }
  const officialCity = path.find((region) => region.id === cityId);
  if (!officialCity) throw new Error("Stored official city is invalid");
  return {
    id: cityId,
    label: officialCity.label,
    identityKind: "OFFICIAL_DIVISION",
    officialDivisionId: officialCity.id,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
