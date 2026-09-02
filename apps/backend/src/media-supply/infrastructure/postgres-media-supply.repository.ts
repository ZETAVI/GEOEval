import { Inject, Injectable } from "@nestjs/common";

import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  MediaSupplyConflictError,
  MediaSupplyNotFoundError,
} from "../domain/media-supply.errors.js";
import type { MediaSupplyRepository } from "../domain/media-supply.repository.js";
import type {
  MediaCatalogAuditView,
  MediaCategory,
  MediaFulfillmentCandidate,
  MediaListingFields,
  MediaMutationContext,
  MediaPlatformAdminView,
  MediaPlatformCustomerView,
  MediaPlatformFields,
  MediaPlatformPage,
  MediaPlatformQuote,
  MediaResourceFields,
  MediaResourceView,
  MediaSupplySourceFields,
  MediaSupplySourceView,
} from "../domain/media-supply.types.js";
import { MEDIA_CATEGORIES } from "../domain/media-supply.types.js";

type Transaction = Prisma.TransactionClient;
type PlatformRecord = Prisma.MediaPlatformGetPayload<{
  include: { categories: true; listing: true };
}>;
type ResourceRecord = Prisma.MediaResourceGetPayload<{
  include: { supplySource: true };
}>;

const PLATFORM_INCLUDE = {
  categories: true,
  listing: true,
} as const;

@Injectable()
export class PostgresMediaSupplyRepository implements MediaSupplyRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async catalogRevision(): Promise<string> {
    const state = await this.prisma.mediaCatalogState.findUnique({
      where: { id: "global" },
    });
    if (!state) throw new Error("Media catalog state is missing");
    return state.publicRevision.toString();
  }

  async listCustomerPlatforms(input: {
    category?: MediaCategory;
    limit: number;
    cursor?: string;
  }): Promise<MediaPlatformPage> {
    const platforms = await this.prisma.mediaPlatform.findMany({
      where: {
        status: "ACTIVE",
        listing: { is: { status: "ON_SHELF", pointPrice: { gt: 0 } } },
        ...(input.category
          ? { categories: { some: { category: input.category } } }
          : {}),
      },
      include: PLATFORM_INCLUDE,
      orderBy: { id: "asc" },
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    const hasNext = platforms.length > input.limit;
    const page = hasNext ? platforms.slice(0, input.limit) : platforms;
    return {
      items: page.map((platform) => mapCustomerPlatform(platform, [])),
      nextCursor: hasNext ? page.at(-1)!.id : null,
    };
  }

  async findCustomerPlatform(
    platformId: string,
  ): Promise<MediaPlatformCustomerView | undefined> {
    const platform = await this.prisma.mediaPlatform.findFirst({
      where: {
        id: platformId,
        status: "ACTIVE",
        listing: { is: { status: "ON_SHELF", pointPrice: { gt: 0 } } },
      },
      include: {
        ...PLATFORM_INCLUDE,
        resources: {
          where: {
            status: "ACTIVE",
            publicVisibility: { in: ["FULL", "MASKED"] },
          },
          orderBy: [{ qualityTier: "asc" }, { id: "asc" }],
          take: 50,
        },
      },
    });
    if (!platform) return undefined;
    return mapCustomerPlatform(
      platform,
      platform.resources.map((resource) => ({
        id: resource.id,
        displayName:
          resource.publicVisibility === "FULL"
            ? resource.resourceName
            : resource.publicAlias!,
        publicationMode: resource.publicationMode,
      })),
    );
  }

  async listAdminPlatforms(): Promise<MediaPlatformAdminView[]> {
    return (
      await this.prisma.mediaPlatform.findMany({
        include: PLATFORM_INCLUDE,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      })
    ).map(mapAdminPlatform);
  }

  async findAdminPlatform(
    platformId: string,
  ): Promise<MediaPlatformAdminView | undefined> {
    const platform = await this.prisma.mediaPlatform.findUnique({
      where: { id: platformId },
      include: PLATFORM_INCLUDE,
    });
    return platform ? mapAdminPlatform(platform) : undefined;
  }

  createPlatform(
    context: MediaMutationContext,
    fields: MediaPlatformFields,
  ): Promise<MediaPlatformAdminView> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const platform = await tx.mediaPlatform.create({
          data: {
            normalizedName: normalizePlatformName(fields.displayName),
            displayName: fields.displayName,
            aliases: fields.aliases,
            description: fields.description,
            logoUrl: fields.logoUrl,
            regionScope: fields.regionScope,
            status: fields.status,
            categories: {
              create: fields.categories.map((category) => ({ category })),
            },
          },
          include: PLATFORM_INCLUDE,
        });
        await audit(
          tx,
          context,
          "PLATFORM",
          platform.id,
          "CREATE",
          null,
          platform,
        );
        return mapAdminPlatform(platform);
      }),
    );
  }

  updatePlatform(
    context: MediaMutationContext,
    platformId: string,
    fields: Partial<MediaPlatformFields>,
  ): Promise<MediaPlatformAdminView> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const before = await tx.mediaPlatform.findUnique({
          where: { id: platformId },
          include: PLATFORM_INCLUDE,
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该媒体平台");
        const { categories, ...scalarFields } = fields;
        const quoteVisibleChanged = ["displayName", "status"].some(
          (key) => key in scalarFields,
        );
        const publicChanged =
          [
            "displayName",
            "description",
            "logoUrl",
            "regionScope",
            "status",
          ].some((key) => key in scalarFields) || categories !== undefined;
        if (categories) {
          await tx.mediaPlatformCategory.deleteMany({ where: { platformId } });
        }
        await tx.mediaPlatform.update({
          where: { id: platformId },
          data: {
            ...scalarFields,
            ...(fields.displayName
              ? { normalizedName: normalizePlatformName(fields.displayName) }
              : {}),
            ...(categories
              ? {
                  categories: {
                    create: categories.map((category) => ({ category })),
                  },
                }
              : {}),
          },
        });
        if (before.listing && quoteVisibleChanged) {
          await tx.mediaPlatformListing.update({
            where: { platformId },
            data: { revision: { increment: 1 } },
          });
        }
        const after = await tx.mediaPlatform.findUniqueOrThrow({
          where: { id: platformId },
          include: PLATFORM_INCLUDE,
        });
        if (
          publicChanged &&
          (isPublicPlatform(before) || isPublicPlatform(after))
        ) {
          await touchCatalog(tx);
        }
        await audit(
          tx,
          context,
          "PLATFORM",
          platformId,
          "UPDATE",
          before,
          after,
        );
        return mapAdminPlatform(after);
      }),
    );
  }

  deletePlatform(
    context: MediaMutationContext,
    platformId: string,
  ): Promise<void> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const before = await tx.mediaPlatform.findUnique({
          where: { id: platformId },
          include: {
            ...PLATFORM_INCLUDE,
            _count: { select: { resources: true } },
          },
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该媒体平台");
        if (before.listing || before._count.resources > 0) {
          throw new MediaSupplyConflictError(
            "该平台已有业务依赖，请改为归档或下架",
          );
        }
        await tx.mediaPlatformCategory.deleteMany({ where: { platformId } });
        await tx.mediaPlatform.delete({ where: { id: platformId } });
        await audit(
          tx,
          context,
          "PLATFORM",
          platformId,
          "DELETE",
          before,
          null,
        );
      }),
    );
  }

  upsertListing(
    context: MediaMutationContext,
    platformId: string,
    fields: MediaListingFields,
    expectedRevision?: number,
  ): Promise<MediaPlatformAdminView> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const platform = await tx.mediaPlatform.findUnique({
          where: { id: platformId },
          include: PLATFORM_INCLUDE,
        });
        if (!platform) throw new MediaSupplyNotFoundError("未找到该媒体平台");
        if (fields.status === "ON_SHELF" && platform.status !== "ACTIVE") {
          throw new MediaSupplyConflictError("归档平台不能上架");
        }
        const before = platform.listing;
        if (before && !listingTransitionAllowed(before.status, fields.status)) {
          throw new MediaSupplyConflictError("销售配置不能返回该状态");
        }
        if (!before) {
          if (expectedRevision !== undefined) {
            throw new MediaSupplyConflictError(
              "销售配置已经变化，请刷新后重试",
            );
          }
          await tx.mediaPlatformListing.create({
            data: { platformId, ...fields },
          });
        } else if (expectedRevision !== undefined) {
          const updated = await tx.mediaPlatformListing.updateMany({
            where: { platformId, revision: expectedRevision },
            data: { ...fields, revision: { increment: 1 } },
          });
          if (updated.count !== 1) {
            throw new MediaSupplyConflictError(
              "销售配置已经变化，请刷新后重试",
            );
          }
        } else {
          await tx.mediaPlatformListing.update({
            where: { platformId },
            data: { ...fields, revision: { increment: 1 } },
          });
        }
        const after = await tx.mediaPlatform.findUniqueOrThrow({
          where: { id: platformId },
          include: PLATFORM_INCLUDE,
        });
        if (before?.status === "ON_SHELF" || fields.status === "ON_SHELF") {
          await touchCatalog(tx);
        }
        await audit(
          tx,
          context,
          "LISTING",
          platformId,
          before ? "UPDATE" : "CREATE",
          before,
          after.listing,
        );
        return mapAdminPlatform(after);
      }),
    );
  }

  async listSources(): Promise<MediaSupplySourceView[]> {
    return this.prisma.mediaSupplySource.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    });
  }

  createSource(
    context: MediaMutationContext,
    fields: MediaSupplySourceFields,
  ): Promise<MediaSupplySourceView> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const source = await tx.mediaSupplySource.create({ data: fields });
        await audit(tx, context, "SOURCE", source.id, "CREATE", null, source);
        return source;
      }),
    );
  }

  updateSource(
    context: MediaMutationContext,
    sourceId: string,
    fields: Partial<MediaSupplySourceFields>,
  ): Promise<MediaSupplySourceView> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const before = await tx.mediaSupplySource.findUnique({
          where: { id: sourceId },
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该供给来源");
        const after = await tx.mediaSupplySource.update({
          where: { id: sourceId },
          data: fields,
        });
        await audit(tx, context, "SOURCE", sourceId, "UPDATE", before, after);
        return after;
      }),
    );
  }

  deleteSource(context: MediaMutationContext, sourceId: string): Promise<void> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const before = await tx.mediaSupplySource.findUnique({
          where: { id: sourceId },
          include: { _count: { select: { resources: true } } },
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该供给来源");
        if (before._count.resources > 0) {
          throw new MediaSupplyConflictError("该来源已被资源引用，请改为停用");
        }
        await tx.mediaSupplySource.delete({ where: { id: sourceId } });
        await audit(tx, context, "SOURCE", sourceId, "DELETE", before, null);
      }),
    );
  }

  async listResources(platformId: string): Promise<MediaResourceView[]> {
    return (
      await this.prisma.mediaResource.findMany({
        where: { platformId },
        include: { supplySource: true },
        orderBy: [{ qualityTier: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
      })
    ).map(mapResource);
  }

  createResource(
    context: MediaMutationContext,
    fields: MediaResourceFields,
  ): Promise<MediaResourceView> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        await assertPlatformAndSource(
          tx,
          fields.platformId,
          fields.supplySourceId,
        );
        const resource = await tx.mediaResource.create({
          data: fields,
          include: { supplySource: true },
        });
        if (await isPublicResource(tx, resource)) await touchCatalog(tx);
        await audit(
          tx,
          context,
          "RESOURCE",
          resource.id,
          "CREATE",
          null,
          resource,
        );
        return mapResource(resource);
      }),
    );
  }

  updateResource(
    context: MediaMutationContext,
    resourceId: string,
    fields: Partial<MediaResourceFields>,
  ): Promise<MediaResourceView> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const before = await tx.mediaResource.findUnique({
          where: { id: resourceId },
          include: { supplySource: true },
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该媒体资源");
        await assertPlatformAndSource(
          tx,
          fields.platformId ?? before.platformId,
          fields.supplySourceId ?? before.supplySourceId,
        );
        const wasPublic = await isPublicResource(tx, before);
        const after = await tx.mediaResource.update({
          where: { id: resourceId },
          data: fields,
          include: { supplySource: true },
        });
        const isPublic = await isPublicResource(tx, after);
        const publicFieldsChanged = [
          "platformId",
          "resourceName",
          "publicationMode",
          "status",
          "publicVisibility",
          "publicAlias",
          "qualityTier",
        ].some((key) => key in fields);
        if ((wasPublic || isPublic) && publicFieldsChanged)
          await touchCatalog(tx);
        await audit(
          tx,
          context,
          "RESOURCE",
          resourceId,
          "UPDATE",
          before,
          after,
        );
        return mapResource(after);
      }),
    );
  }

  deleteResource(
    context: MediaMutationContext,
    resourceId: string,
  ): Promise<void> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const before = await tx.mediaResource.findUnique({
          where: { id: resourceId },
          include: { supplySource: true },
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该媒体资源");
        const wasPublic = await isPublicResource(tx, before);
        await tx.mediaResource.delete({ where: { id: resourceId } });
        if (wasPublic) await touchCatalog(tx);
        await audit(
          tx,
          context,
          "RESOURCE",
          resourceId,
          "DELETE",
          before,
          null,
        );
      }),
    );
  }

  async listAudits(input: {
    entityType?: string;
    entityId?: string;
    limit: number;
  }): Promise<MediaCatalogAuditView[]> {
    return this.prisma.mediaCatalogAudit.findMany({
      where: {
        ...(input.entityType ? { entityType: input.entityType } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit,
    });
  }

  async quotePlatform(platformId: string): Promise<MediaPlatformQuote> {
    const platform = await this.prisma.mediaPlatform.findUnique({
      where: { id: platformId },
      include: { listing: true },
    });
    if (!platform) throw new MediaSupplyNotFoundError("未找到该媒体平台");
    const buyable =
      platform.status === "ACTIVE" &&
      platform.listing?.status === "ON_SHELF" &&
      typeof platform.listing.pointPrice === "number" &&
      platform.listing.pointPrice > 0;
    return {
      platformId,
      displayName: platform.displayName,
      buyable,
      pointPrice: platform.listing?.pointPrice ?? null,
      listingRevision: platform.listing?.revision ?? null,
    };
  }

  async fulfillmentCandidates(
    platformId: string,
  ): Promise<MediaFulfillmentCandidate[]> {
    const exists = await this.prisma.mediaPlatform.findUnique({
      where: { id: platformId },
      select: { id: true },
    });
    if (!exists) throw new MediaSupplyNotFoundError("未找到该媒体平台");
    const resources = await this.prisma.mediaResource.findMany({
      where: {
        platformId,
        status: "ACTIVE",
        supplySource: { status: "ACTIVE" },
      },
      include: { supplySource: true },
      orderBy: [{ qualityTier: "asc" }, { id: "asc" }],
    });
    return resources.map((resource) => ({
      resourceId: resource.id,
      resourceName: resource.resourceName,
      accountIdentifier: resource.accountIdentifier,
      accountUrl: resource.accountUrl,
      publicationMode: resource.publicationMode,
      qualityTier: resource.qualityTier,
      supplySourceId: resource.supplySourceId,
      supplySourceName: resource.supplySource.name,
      contactName: resource.supplySource.contactName,
      contactMethod: resource.supplySource.contactMethod,
      procurementCostFen: resource.procurementCostFen,
      caseUrl: resource.caseUrl,
      publicationNotes: resource.publicationNotes,
    }));
  }

  private async withErrors<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof MediaSupplyConflictError ||
        error instanceof MediaSupplyNotFoundError
      ) {
        throw error;
      }
      const code = prismaErrorCode(error);
      if (code === "P2002" || code === "P2003" || code === "P2004") {
        throw new MediaSupplyConflictError(
          code === "P2002"
            ? "媒体数据已经存在"
            : code === "P2003"
              ? "媒体数据已被引用，不能删除"
              : "媒体数据不满足约束",
        );
      }
      if (code === "P2025") {
        throw new MediaSupplyNotFoundError("未找到媒体数据");
      }
      throw error;
    }
  }
}

function mapAdminPlatform(platform: PlatformRecord): MediaPlatformAdminView {
  return {
    id: platform.id,
    normalizedName: platform.normalizedName,
    displayName: platform.displayName,
    aliases: platform.aliases,
    description: platform.description,
    logoUrl: platform.logoUrl,
    regionScope: platform.regionScope,
    status: platform.status,
    categories: orderedCategories(platform.categories),
    listing: platform.listing
      ? {
          status: platform.listing.status,
          pointPrice: platform.listing.pointPrice,
          revision: platform.listing.revision,
          createdAt: platform.listing.createdAt,
          updatedAt: platform.listing.updatedAt,
        }
      : null,
    createdAt: platform.createdAt,
    updatedAt: platform.updatedAt,
  };
}

function mapCustomerPlatform(
  platform: PlatformRecord,
  examples: MediaPlatformCustomerView["examples"],
): MediaPlatformCustomerView {
  return {
    id: platform.id,
    displayName: platform.displayName,
    description: platform.description,
    logoUrl: platform.logoUrl,
    regionScope: platform.regionScope,
    categories: orderedCategories(platform.categories),
    pointPrice: platform.listing!.pointPrice!,
    listingRevision: platform.listing!.revision,
    examples,
  };
}

function mapResource(resource: ResourceRecord): MediaResourceView {
  return {
    id: resource.id,
    platformId: resource.platformId,
    supplySourceId: resource.supplySourceId,
    resourceName: resource.resourceName,
    accountIdentifier: resource.accountIdentifier,
    accountUrl: resource.accountUrl,
    publicationMode: resource.publicationMode,
    status: resource.status,
    publicVisibility: resource.publicVisibility,
    publicAlias: resource.publicAlias,
    qualityTier: resource.qualityTier,
    procurementCostFen: resource.procurementCostFen,
    caseUrl: resource.caseUrl,
    publicationNotes: resource.publicationNotes,
    source: resource.supplySource,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

function normalizePlatformName(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}

function orderedCategories(
  entries: Array<{ category: MediaCategory }>,
): MediaCategory[] {
  const selected = new Set(entries.map((entry) => entry.category));
  return MEDIA_CATEGORIES.filter((category) => selected.has(category));
}

function listingTransitionAllowed(
  from: MediaListingFields["status"],
  to: MediaListingFields["status"],
): boolean {
  const allowed: Record<
    MediaListingFields["status"],
    MediaListingFields["status"][]
  > = {
    DRAFT: ["DRAFT", "ON_SHELF", "OFF_SHELF"],
    ON_SHELF: ["ON_SHELF", "PAUSED", "OFF_SHELF"],
    PAUSED: ["PAUSED", "ON_SHELF", "OFF_SHELF"],
    OFF_SHELF: ["OFF_SHELF", "ON_SHELF"],
  };
  return allowed[from].includes(to);
}

function isPublicPlatform(platform: PlatformRecord): boolean {
  return (
    platform.status === "ACTIVE" &&
    platform.listing?.status === "ON_SHELF" &&
    typeof platform.listing.pointPrice === "number" &&
    platform.listing.pointPrice > 0
  );
}

async function isPublicResource(
  tx: Transaction,
  resource: { platformId: string; status: string; publicVisibility: string },
): Promise<boolean> {
  if (resource.status !== "ACTIVE" || resource.publicVisibility === "HIDDEN") {
    return false;
  }
  const platform = await tx.mediaPlatform.findUnique({
    where: { id: resource.platformId },
    include: { listing: true },
  });
  return Boolean(
    platform &&
    platform.status === "ACTIVE" &&
    platform.listing?.status === "ON_SHELF" &&
    platform.listing.pointPrice &&
    platform.listing.pointPrice > 0,
  );
}

async function assertPlatformAndSource(
  tx: Transaction,
  platformId: string,
  sourceId: string,
): Promise<void> {
  const [platform, source] = await Promise.all([
    tx.mediaPlatform.findUnique({
      where: { id: platformId },
      select: { id: true },
    }),
    tx.mediaSupplySource.findUnique({
      where: { id: sourceId },
      select: { id: true },
    }),
  ]);
  if (!platform) throw new MediaSupplyNotFoundError("未找到该媒体平台");
  if (!source) throw new MediaSupplyNotFoundError("未找到该供给来源");
}

async function touchCatalog(tx: Transaction): Promise<void> {
  const updated = await tx.mediaCatalogState.updateMany({
    where: { id: "global" },
    data: { publicRevision: { increment: 1 } },
  });
  if (updated.count !== 1) throw new Error("Media catalog state is missing");
}

async function audit(
  tx: Transaction,
  context: MediaMutationContext,
  entityType: string,
  entityId: string,
  action: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await tx.mediaCatalogAudit.create({
    data: {
      actorAccountId: context.actorAccountId,
      entityType,
      entityId,
      action,
      reason: context.reason,
      ...(before === null ? {} : { beforeState: toJson(before) }),
      ...(after === null ? {} : { afterState: toJson(after) }),
    },
  });
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}
