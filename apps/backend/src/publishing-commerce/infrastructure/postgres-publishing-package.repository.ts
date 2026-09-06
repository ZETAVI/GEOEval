import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  PackageConflictError,
  PackageNotFoundError,
  type PublishingPackageFields,
  type PublishingPackageRepository,
  type PublishingPackageView,
  type PublishingPackageAuditView,
} from "../domain/publishing-package.js";

const includeScope = { platforms: { orderBy: { platformId: "asc" as const } } };
type StoredPackage = Prisma.PublishingPackageGetPayload<{
  include: typeof includeScope;
}>;

@Injectable()
export class PostgresPublishingPackageRepository implements PublishingPackageRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async find(id: string) {
    const row = await this.prisma.publishingPackage.findUnique({
      where: { id },
      include: includeScope,
    });
    return row ? present(row) : null;
  }

  async list(onlyActive: boolean): Promise<PublishingPackageView[]> {
    const rows = await this.prisma.publishingPackage.findMany({
      where: onlyActive ? { status: "ACTIVE" } : {},
      include: includeScope,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
    return rows.map(present);
  }

  create(actorAccountId: string, fields: PublishingPackageFields) {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const { platformIds, ...values } = fields;
        const row = await tx.publishingPackage.create({
          data: {
            ...values,
            normalizedName: fields.name.toLocaleLowerCase("en-US"),
            platforms: {
              create: platformIds.map((platformId) => ({ platformId })),
            },
          },
          include: includeScope,
        });
        const after = present(row);
        await tx.publishingPackageAudit.create({
          data: {
            packageId: row.id,
            actorAccountId,
            reason: "创建发布套餐",
            afterState: after,
          },
        });
        return after;
      }),
    );
  }

  update(
    actorAccountId: string,
    id: string,
    fields: PublishingPackageFields,
    expectedRevision: number,
    reason: string,
  ) {
    return this.withErrors(() =>
      this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM publishing_packages WHERE id = CAST(${id} AS UUID) FOR UPDATE
      `;
        if (!locked.length) throw new PackageNotFoundError("未找到该发布套餐");
        const before = present(
          await tx.publishingPackage.findUniqueOrThrow({
            where: { id },
            include: includeScope,
          }),
        );
        if (before.revision !== expectedRevision)
          throw new PackageConflictError(
            "套餐已经变化，请重新加载并确认后保存",
          );
        const { platformIds, ...values } = fields;
        await tx.publishingPackagePlatform.deleteMany({
          where: { packageId: id },
        });
        const row = await tx.publishingPackage.update({
          where: { id },
          data: {
            ...values,
            normalizedName: fields.name.toLocaleLowerCase("en-US"),
            revision: { increment: 1 },
            platforms: {
              create: platformIds.map((platformId) => ({ platformId })),
            },
          },
          include: includeScope,
        });
        const after = present(row);
        await tx.publishingPackageAudit.create({
          data: {
            packageId: id,
            actorAccountId,
            reason,
            beforeState: before,
            afterState: after,
          },
        });
        return after;
      }),
    );
  }

  async audits(id: string): Promise<PublishingPackageAuditView[]> {
    if (
      !(await this.prisma.publishingPackage.findUnique({
        where: { id },
        select: { id: true },
      }))
    )
      throw new PackageNotFoundError("未找到该发布套餐");
    const rows = await this.prisma.publishingPackageAudit.findMany({
      where: { packageId: id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      actorAccountId: row.actorAccountId,
      reason: row.reason,
      createdAt: row.createdAt,
      beforeState: row.beforeState as PublishingPackageView | null,
      afterState: row.afterState as PublishingPackageView,
    }));
  }

  private async withErrors<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? error.code
          : undefined;
      if (code === "P2002")
        throw new PackageConflictError("同名套餐已存在，请查看现有套餐");
      if (code === "P2003")
        throw new PackageConflictError(
          "所选媒体已不存在，请刷新媒体范围后重试",
        );
      throw error;
    }
  }
}

function present(row: StoredPackage): PublishingPackageView {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    pointPrice: row.pointPrice,
    status: row.status,
    revision: row.revision,
    platformIds: row.platforms.map((item) => item.platformId),
  };
}
