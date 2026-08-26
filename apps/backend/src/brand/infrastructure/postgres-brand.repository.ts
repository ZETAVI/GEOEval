import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/prisma.service.js";
import type { BrandRepository } from "../domain/brand.repository.js";
import type {
  BrandProfileFields,
  BrandProfileView,
} from "../domain/brand.types.js";

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
      }),
      this.prisma.brandContext.findUnique({ where: { accountId } }),
    ]);
    return { brands, currentBrandId: context?.currentBrandId ?? null };
  }

  async find(
    accountId: string,
    brandId: string,
  ): Promise<BrandProfileView | undefined> {
    return (
      (await this.prisma.brandProfile.findFirst({
        where: { id: brandId, accountId, status: "ACTIVE" },
      })) ?? undefined
    );
  }

  async create(input: {
    accountId: string;
    fields: BrandProfileFields;
    evaluationFingerprint: string;
  }): Promise<BrandProfileView> {
    return this.prisma.$transaction(async (transaction) => {
      const brand = await transaction.brandProfile.create({
        data: {
          accountId: input.accountId,
          ...input.fields,
          evaluationFingerprint: input.evaluationFingerprint,
        },
      });
      const context = await transaction.brandContext.findUnique({
        where: { accountId: input.accountId },
      });
      if (!context) {
        await transaction.brandContext.create({
          data: { accountId: input.accountId, currentBrandId: brand.id },
        });
      } else if (!context.currentBrandId) {
        await transaction.brandContext.update({
          where: { accountId: input.accountId },
          data: { currentBrandId: brand.id },
        });
      }
      return brand;
    });
  }

  async update(input: {
    accountId: string;
    brandId: string;
    fields: Partial<BrandProfileFields>;
    evaluationFingerprint: string;
  }): Promise<BrandProfileView | undefined> {
    return this.prisma.$transaction(async (transaction) => {
      const owned = await transaction.brandProfile.findFirst({
        where: {
          id: input.brandId,
          accountId: input.accountId,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!owned) return undefined;
      return transaction.brandProfile.update({
        where: { id: input.brandId },
        data: {
          ...input.fields,
          evaluationFingerprint: input.evaluationFingerprint,
        },
      });
    });
  }

  async selectCurrent(
    accountId: string,
    brandId: string,
  ): Promise<BrandProfileView | undefined> {
    return this.prisma.$transaction(async (transaction) => {
      const brand = await transaction.brandProfile.findFirst({
        where: { id: brandId, accountId, status: "ACTIVE" },
      });
      if (!brand) return undefined;
      await transaction.brandContext.upsert({
        where: { accountId },
        create: { accountId, currentBrandId: brandId },
        update: { currentBrandId: brandId },
      });
      return brand;
    });
  }
}
