import { Inject, Injectable } from "@nestjs/common";

import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  MediaSupplyConflictError,
  MediaSupplyNotFoundError,
} from "../domain/media-supply.errors.js";
import type { MediaSupplyRepository } from "../domain/media-supply.repository.js";
import { mediaResourceEffectiveStatus } from "../domain/media-resource-availability.js";
import { normalizeMediaName } from "../domain/media-supply-normalization.js";
import type {
  MediaCatalogAuditView,
  MediaCategory,
  MediaFulfillmentCandidate,
  MediaMutationContext,
  MediaPlatformAdminView,
  MediaPlatformCustomerView,
  MediaPlatformFields,
  MediaPlatformPage,
  MediaPlatformQuote,
  MediaResourceFields,
  MediaResourceBatchItem,
  MediaResourceDeleteOptions,
  MediaResourceDeleteResult,
  MediaResourceView,
  MediaSupplierDetailView,
  MediaSupplierFields,
  MediaSupplierView,
} from "../domain/media-supply.types.js";
import { MEDIA_CATEGORIES } from "../domain/media-supply.types.js";

type Transaction = Prisma.TransactionClient;
type PlatformRecord = Prisma.MediaPlatformGetPayload<{
  include: { categories: true };
}>;
type ResourceRecord = Prisma.MediaResourceGetPayload<{
  include: {
    supplier: {
      include: {
        _count: { select: { resources: true } };
        resources: { select: { platformId: true } };
      };
    };
  };
}>;
type SupplierRecord = Prisma.MediaSupplierGetPayload<{
  include: {
    _count: { select: { resources: true } };
    resources: { select: { platformId: true } };
  };
}>;

const PLATFORM_INCLUDE = {
  categories: true,
} as const;
const supplierInclude = {
  supplier: {
    include: {
      _count: { select: { resources: true } },
      resources: { select: { platformId: true } },
    },
  },
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
        pointPrice: { gt: 0 },
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
        pointPrice: { gt: 0 },
      },
      include: {
        ...PLATFORM_INCLUDE,
        resources: {
          where: {
            status: "ACTIVE",
            supplier: { status: "ACTIVE" },
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
            normalizedName: normalizeMediaName(fields.displayName),
            displayName: fields.displayName,
            aliases: fields.aliases,
            description: fields.description,
            logoUrl: fields.logoUrl,
            regionScope: fields.regionScope,
            status: fields.status,
            pointPrice: fields.pointPrice,
            categories: {
              create: fields.categories.map((category) => ({ category })),
            },
          },
          include: PLATFORM_INCLUDE,
        });
        if (isPublicPlatform(platform)) await touchCatalog(tx);
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
    expectedRevision?: number,
  ): Promise<MediaPlatformAdminView> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const before = await tx.mediaPlatform.findUnique({
          where: { id: platformId },
          include: PLATFORM_INCLUDE,
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该媒体平台");
        const nextStatus = fields.status ?? before.status;
        const nextPointPrice =
          fields.pointPrice === undefined
            ? before.pointPrice
            : fields.pointPrice;
        if (
          nextStatus === "ACTIVE" &&
          (typeof nextPointPrice !== "number" || nextPointPrice <= 0)
        ) {
          throw new MediaSupplyConflictError("启用前必须设置有效积分价");
        }
        const { categories, ...scalarFields } = fields;
        const publicChanged =
          [
            "displayName",
            "description",
            "logoUrl",
            "regionScope",
            "status",
            "pointPrice",
          ].some((key) => key in scalarFields) || categories !== undefined;
        const updated = await tx.mediaPlatform.updateMany({
          where: {
            id: platformId,
            revision: expectedRevision ?? before.revision,
          },
          data: {
            ...scalarFields,
            ...(fields.displayName
              ? { normalizedName: normalizeMediaName(fields.displayName) }
              : {}),
            revision: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          throw new MediaSupplyConflictError("平台资料已经变化，请刷新后重试");
        }
        if (categories) {
          await tx.mediaPlatformCategory.deleteMany({ where: { platformId } });
          await tx.mediaPlatformCategory.createMany({
            data: categories.map((category) => ({ platformId, category })),
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
    expectedRevision: number,
  ): Promise<void> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        // Serialize deletion with new foreign-key references before checking them.
        await tx.$queryRaw`
          SELECT id FROM media_platforms WHERE id = CAST(${platformId} AS UUID) FOR UPDATE
        `;
        const before = await tx.mediaPlatform.findUnique({
          where: { id: platformId },
          include: {
            ...PLATFORM_INCLUDE,
            _count: { select: { resources: true, publishingScopes: true } },
          },
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该媒体平台");
        if (before._count.publishingScopes > 0) {
          throw new MediaSupplyConflictError(
            "该媒体已有套餐范围引用，不能删除；可停用媒体停止新购买",
          );
        }
        if (before.status === "ACTIVE" || before._count.resources > 0) {
          throw new MediaSupplyConflictError(
            "该平台正在使用或已有业务依赖，请先停用",
          );
        }
        if (before.revision !== expectedRevision) {
          throw new MediaSupplyConflictError("平台资料已经变化，请刷新后重试");
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

  async listSuppliers(): Promise<MediaSupplierView[]> {
    return (
      await this.prisma.mediaSupplier.findMany({
        include: {
          _count: { select: { resources: true } },
          resources: { select: { platformId: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      })
    ).map(mapSupplier);
  }

  async findSupplier(
    supplierId: string,
  ): Promise<MediaSupplierDetailView | undefined> {
    const supplier = await this.prisma.mediaSupplier.findUnique({
      where: { id: supplierId },
      include: {
        _count: { select: { resources: true } },
        resources: {
          include: { platform: true },
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        },
      },
    });
    if (!supplier) return undefined;
    return {
      ...mapSupplier(supplier),
      resources: supplier.resources.map((resource) => ({
        resourceId: resource.id,
        resourceName: resource.resourceName,
        resourceStatus: resource.status,
        effectiveStatus: mediaResourceEffectiveStatus(
          resource.status,
          supplier.status,
        ),
        resourceRevision: resource.revision,
        platformId: resource.platformId,
        platformDisplayName: resource.platform.displayName,
      })),
    };
  }

  createSupplier(
    context: MediaMutationContext,
    fields: MediaSupplierFields,
  ): Promise<MediaSupplierView> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const supplier = await tx.mediaSupplier.create({
          data: {
            ...fields,
            normalizedName: normalizeMediaName(fields.displayName),
          },
          include: {
            _count: { select: { resources: true } },
            resources: { select: { platformId: true } },
          },
        });
        await audit(
          tx,
          context,
          "SUPPLIER",
          supplier.id,
          "CREATE",
          null,
          supplier,
        );
        return mapSupplier(supplier);
      }),
    );
  }

  updateSupplier(
    context: MediaMutationContext,
    supplierId: string,
    fields: Partial<MediaSupplierFields>,
    expectedRevision: number,
  ): Promise<MediaSupplierView> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const before = await tx.mediaSupplier.findUnique({
          where: { id: supplierId },
          include: {
            _count: { select: { resources: true } },
            resources: { select: { platformId: true } },
          },
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该供应商");
        const wasActive = before.status === "ACTIVE";
        const updated = await tx.mediaSupplier.updateMany({
          where: { id: supplierId, revision: expectedRevision },
          data: {
            ...fields,
            ...(fields.displayName
              ? { normalizedName: normalizeMediaName(fields.displayName) }
              : {}),
            revision: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          throw new MediaSupplyConflictError(
            "供应商资料已经变化，请刷新后重试",
          );
        }
        const after = await tx.mediaSupplier.findUniqueOrThrow({
          where: { id: supplierId },
          include: {
            _count: { select: { resources: true } },
            resources: { select: { platformId: true } },
          },
        });
        if ("status" in fields && wasActive !== (after.status === "ACTIVE")) {
          const publicResources = await tx.mediaResource.count({
            where: {
              supplierId,
              status: "ACTIVE",
              publicVisibility: { in: ["FULL", "MASKED"] },
              platform: { status: "ACTIVE", pointPrice: { gt: 0 } },
            },
          });
          if (publicResources > 0) await touchCatalog(tx);
        }
        await audit(
          tx,
          context,
          "SUPPLIER",
          supplierId,
          "UPDATE",
          before,
          after,
        );
        return mapSupplier(after);
      }),
    );
  }

  deleteSupplier(
    context: MediaMutationContext,
    supplierId: string,
    expectedRevision: number,
  ): Promise<void> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const before = await tx.mediaSupplier.findUnique({
          where: { id: supplierId },
          include: { _count: { select: { resources: true } } },
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该供应商");
        if (before.status !== "INACTIVE") {
          throw new MediaSupplyConflictError("请先停用供应商再删除");
        }
        if (before._count.resources > 0) {
          throw new MediaSupplyConflictError("供应商仍有关联资源，不能删除");
        }
        const deleted = await tx.mediaSupplier.deleteMany({
          where: { id: supplierId, revision: expectedRevision },
        });
        if (deleted.count !== 1) {
          throw new MediaSupplyConflictError(
            "供应商资料已经变化，请刷新后重试",
          );
        }
        await audit(
          tx,
          context,
          "SUPPLIER",
          supplierId,
          "DELETE",
          before,
          null,
        );
      }),
    );
  }

  /*
   * Resources remain platform-scoped for maintenance while suppliers are
   * global. Inactive resources are deliberately included for administrators.
   */
  async listResources(platformId: string): Promise<MediaResourceView[]> {
    return (
      await this.prisma.mediaResource.findMany({
        where: { platformId },
        include: supplierInclude,
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
        await assertPlatformAndSupplier(
          tx,
          fields.platformId,
          fields.supplierId,
        );
        assertResourceState(fields);
        const resource = await tx.mediaResource.create({
          data: fields,
          include: supplierInclude,
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
    expectedRevision: number,
  ): Promise<MediaResourceView> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const before = await tx.mediaResource.findUnique({
          where: { id: resourceId },
          include: supplierInclude,
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该媒体资源");
        await assertPlatformAndSupplier(
          tx,
          fields.platformId ?? before.platformId,
          fields.supplierId ?? before.supplierId,
        );
        assertResourceState({ ...before, ...fields });
        const wasPublic = await isPublicResource(tx, before);
        const updated = await tx.mediaResource.updateMany({
          where: { id: resourceId, revision: expectedRevision },
          data: { ...fields, revision: { increment: 1 } },
        });
        if (updated.count !== 1) {
          throw new MediaSupplyConflictError("资源资料已经变化，请刷新后重试");
        }
        const after = await tx.mediaResource.findUniqueOrThrow({
          where: { id: resourceId },
          include: supplierInclude,
        });
        const isPublic = await isPublicResource(tx, after);
        const publicFieldsChanged = [
          "platformId",
          "supplierId",
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

  batchUpdateResourceStatus(
    context: MediaMutationContext,
    items: MediaResourceBatchItem[],
    status: MediaResourceFields["status"],
  ): Promise<MediaResourceView[]> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const ids = items.map((item) => item.resourceId);
        const before = await tx.mediaResource.findMany({
          where: { id: { in: ids } },
          include: supplierInclude,
        });
        if (before.length !== items.length) {
          throw new MediaSupplyNotFoundError(
            "部分媒体资源不存在，请刷新后重试",
          );
        }
        const expected = new Map(
          items.map((item) => [item.resourceId, item.expectedRevision]),
        );
        if (
          before.some(
            (resource) => resource.revision !== expected.get(resource.id),
          )
        ) {
          throw new MediaSupplyConflictError(
            "部分资源资料已经变化，本次批量操作未执行",
          );
        }
        const affectsPublic = (
          await Promise.all(
            before.map((resource) => isPublicResource(tx, resource)),
          )
        ).some(Boolean);
        for (const resource of before) {
          const changed = await tx.mediaResource.updateMany({
            where: { id: resource.id, revision: resource.revision },
            data: { status, revision: { increment: 1 } },
          });
          if (changed.count !== 1) {
            throw new MediaSupplyConflictError(
              "部分资源资料已经变化，本次批量操作未执行",
            );
          }
        }
        const after = await tx.mediaResource.findMany({
          where: { id: { in: ids } },
          include: supplierInclude,
        });
        if (
          affectsPublic ||
          after.some((resource) => resource.status === "ACTIVE")
        ) {
          const nowPublic = (
            await Promise.all(
              after.map((resource) => isPublicResource(tx, resource)),
            )
          ).some(Boolean);
          if (affectsPublic || nowPublic) await touchCatalog(tx);
        }
        const afterById = new Map(
          after.map((resource) => [resource.id, resource]),
        );
        for (const resource of before) {
          await audit(
            tx,
            context,
            "RESOURCE",
            resource.id,
            "BATCH_STATUS_UPDATE",
            resource,
            afterById.get(resource.id),
          );
        }
        return items.map((item) =>
          mapResource(afterById.get(item.resourceId)!),
        );
      }),
    );
  }

  deleteResource(
    context: MediaMutationContext,
    resourceId: string,
    options: MediaResourceDeleteOptions,
  ): Promise<MediaResourceDeleteResult> {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const before = await tx.mediaResource.findUnique({
          where: { id: resourceId },
          include: supplierInclude,
        });
        if (!before) throw new MediaSupplyNotFoundError("未找到该媒体资源");
        if (before.status !== "INACTIVE") {
          throw new MediaSupplyConflictError("请先停用资源再删除");
        }
        if (before.revision !== options.expectedRevision) {
          throw new MediaSupplyConflictError("资源资料已经变化，请刷新后重试");
        }
        const wasPublic = await isPublicResource(tx, before);
        await tx.mediaResource.delete({
          where: { id: resourceId, revision: options.expectedRevision },
        });
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
        let supplierDeleted = false;
        if (options.deleteUnreferencedSupplier) {
          const supplier = await tx.mediaSupplier.findUnique({
            where: { id: before.supplierId },
            include: { _count: { select: { resources: true } } },
          });
          if (!supplier) throw new MediaSupplyNotFoundError("未找到该供应商");
          if (supplier.status !== "INACTIVE") {
            throw new MediaSupplyConflictError("启用中的供应商不能随资源删除");
          }
          if (supplier._count.resources > 0) {
            throw new MediaSupplyConflictError(
              "供应商仍有关联资源，不能同时删除",
            );
          }
          if (supplier.revision !== options.expectedSupplierRevision) {
            throw new MediaSupplyConflictError(
              "供应商资料已经变化，请刷新后重试",
            );
          }
          await tx.mediaSupplier.delete({ where: { id: supplier.id } });
          await audit(
            tx,
            context,
            "SUPPLIER",
            supplier.id,
            "DELETE",
            supplier,
            null,
          );
          supplierDeleted = true;
        }
        return {
          resourceId,
          supplierId: before.supplierId,
          supplierDeleted,
        };
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
    });
    if (!platform) throw new MediaSupplyNotFoundError("未找到该媒体平台");
    return platformQuote(platform);
  }

  async quotePlatforms(platformIds: string[]): Promise<MediaPlatformQuote[]> {
    const platforms = await this.prisma.mediaPlatform.findMany({
      where: { id: { in: platformIds } },
    });
    return platforms.map(platformQuote);
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
        supplier: { status: "ACTIVE" },
      },
      include: { supplier: true },
      orderBy: [{ qualityTier: "asc" }, { id: "asc" }],
    });
    return resources.map((resource) => ({
      resourceId: resource.id,
      resourceName: resource.resourceName,
      accountIdentifier: resource.accountIdentifier,
      accountUrl: resource.accountUrl,
      publicationMode: resource.publicationMode,
      qualityTier: resource.qualityTier,
      supplierId: resource.supplierId,
      supplierName: resource.supplier.displayName,
      contactName: resource.supplier.contactName,
      contactMethod: resource.supplier.contactMethod,
      procurementCostYuan: resource.procurementCostYuan,
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
    pointPrice: platform.pointPrice,
    categories: orderedCategories(platform.categories),
    revision: platform.revision,
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
    pointPrice: platform.pointPrice!,
    revision: platform.revision,
    examples,
  };
}

function mapResource(resource: ResourceRecord): MediaResourceView {
  return {
    id: resource.id,
    platformId: resource.platformId,
    supplierId: resource.supplierId,
    resourceName: resource.resourceName,
    accountIdentifier: resource.accountIdentifier,
    accountUrl: resource.accountUrl,
    publicationMode: resource.publicationMode,
    status: resource.status,
    publicVisibility: resource.publicVisibility,
    publicAlias: resource.publicAlias,
    qualityTier: resource.qualityTier,
    procurementCostYuan: resource.procurementCostYuan,
    caseUrl: resource.caseUrl,
    publicationNotes: resource.publicationNotes,
    supplier: mapSupplier(resource.supplier),
    effectiveStatus: mediaResourceEffectiveStatus(
      resource.status,
      resource.supplier.status,
    ),
    revision: resource.revision,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

function mapSupplier(supplier: SupplierRecord): MediaSupplierView {
  return {
    id: supplier.id,
    normalizedName: supplier.normalizedName,
    displayName: supplier.displayName,
    contactName: supplier.contactName,
    contactMethod: supplier.contactMethod,
    status: supplier.status,
    revision: supplier.revision,
    notes: supplier.notes,
    resourceCount: supplier._count.resources,
    platformCount: new Set(
      supplier.resources.map((resource) => resource.platformId),
    ).size,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
}

function orderedCategories(
  entries: Array<{ category: MediaCategory }>,
): MediaCategory[] {
  const selected = new Set(entries.map((entry) => entry.category));
  return MEDIA_CATEGORIES.filter((category) => selected.has(category));
}

function isPublicPlatform(platform: PlatformRecord): boolean {
  return (
    platform.status === "ACTIVE" &&
    typeof platform.pointPrice === "number" &&
    platform.pointPrice > 0
  );
}

async function isPublicResource(
  tx: Transaction,
  resource: {
    platformId: string;
    supplierId: string;
    status: string;
    publicVisibility: string;
  },
): Promise<boolean> {
  if (resource.status !== "ACTIVE" || resource.publicVisibility === "HIDDEN") {
    return false;
  }
  const [platform, supplier] = await Promise.all([
    tx.mediaPlatform.findUnique({ where: { id: resource.platformId } }),
    tx.mediaSupplier.findUnique({ where: { id: resource.supplierId } }),
  ]);
  return Boolean(
    platform &&
    supplier?.status === "ACTIVE" &&
    platform.status === "ACTIVE" &&
    platform.pointPrice &&
    platform.pointPrice > 0,
  );
}

async function assertPlatformAndSupplier(
  tx: Transaction,
  platformId: string,
  supplierId: string,
): Promise<void> {
  const [platform, supplier] = await Promise.all([
    tx.mediaPlatform.findUnique({
      where: { id: platformId },
      select: { id: true },
    }),
    tx.mediaSupplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    }),
  ]);
  if (!platform) throw new MediaSupplyNotFoundError("未找到该媒体平台");
  if (!supplier) throw new MediaSupplyNotFoundError("未找到该供应商");
}

function assertResourceState(
  resource: Pick<
    MediaResourceFields,
    "publicVisibility" | "publicAlias" | "procurementCostYuan"
  >,
): void {
  if (resource.publicVisibility === "MASKED" && !resource.publicAlias?.trim()) {
    throw new MediaSupplyConflictError("脱敏展示必须填写客户展示名称");
  }
  if (
    resource.procurementCostYuan !== null &&
    (!Number.isInteger(resource.procurementCostYuan) ||
      resource.procurementCostYuan < 0)
  ) {
    throw new MediaSupplyConflictError("采购成本必须是非负整数元");
  }
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

function platformQuote(platform: {
  id: string;
  displayName: string;
  status: string;
  pointPrice: number | null;
  revision: number;
}): MediaPlatformQuote {
  return {
    platformId: platform.id,
    displayName: platform.displayName,
    buyable:
      platform.status === "ACTIVE" &&
      platform.pointPrice !== null &&
      platform.pointPrice > 0,
    pointPrice: platform.pointPrice,
    revision: platform.revision,
  };
}

function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}
