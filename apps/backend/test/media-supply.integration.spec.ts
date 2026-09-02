import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import { PostgresMediaSupplyRepository } from "../src/media-supply/infrastructure/postgres-media-supply.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();

describe("Media Supply persistence and projections", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const service = new MediaSupplyService(
    new PostgresMediaSupplyRepository(prisma),
  );
  let administratorId: string;

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => {
    await clearCustomerData(prisma);
    administratorId = (
      await prisma.account.create({
        data: { mobile: "+8613900003301", role: "ADMINISTRATOR" },
      })
    ).id;
  });

  it("lists an explicitly on-shelf platform without requiring stored resources", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    const listed = await service.upsertListing(administratorId, platform.id, {
      status: "ON_SHELF",
      pointPrice: 300,
      reason: "首期上架",
    });

    expect(listed.listing).toMatchObject({
      status: "ON_SHELF",
      pointPrice: 300,
      revision: 1,
    });
    expect(await service.quotePlatform(platform.id)).toEqual({
      platformId: platform.id,
      displayName: "腾讯新闻",
      buyable: true,
      pointPrice: 300,
      listingRevision: 1,
    });
    expect((await service.listCustomerPlatforms({})).items).toHaveLength(1);
    expect((await service.customerPlatform(platform.id)).examples).toEqual([]);
    expect(await service.fulfillmentCandidates(platform.id)).toEqual([]);
  });

  it("separates full, masked, hidden, and administrator-only resource facts", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await service.upsertListing(administratorId, platform.id, {
      status: "ON_SHELF",
      pointPrice: 300,
      reason: "首期上架",
    });
    const source = await service.createSource(administratorId, {
      name: "渠道 A",
      contactName: "张先生",
      contactMethod: "13800000000",
      notes: "内部来源",
      reason: "创建来源",
    });
    await service.createResource(administratorId, {
      platformId: platform.id,
      supplySourceId: source.id,
      resourceName: "优先完整资源",
      publicVisibility: "FULL",
      qualityTier: "HIGH",
      procurementCostFen: 12_300,
      caseUrl: "https://example.com/internal-case",
      publicationNotes: "内部发文说明",
      reason: "创建完整示例",
    });
    await service.createResource(administratorId, {
      platformId: platform.id,
      supplySourceId: source.id,
      resourceName: "六安新周报",
      publicVisibility: "MASKED",
      publicAlias: "六安新***",
      qualityTier: "MEDIUM",
      reason: "创建脱敏示例",
    });
    await service.createResource(administratorId, {
      platformId: platform.id,
      supplySourceId: source.id,
      resourceName: "内部隐藏账号",
      publicVisibility: "HIDDEN",
      qualityTier: "LOW",
      reason: "创建隐藏资源",
    });

    const customer = await service.customerPlatform(platform.id);
    expect(customer.examples.map((item) => item.displayName)).toEqual([
      "优先完整资源",
      "六安新***",
    ]);
    expect(JSON.stringify(customer)).not.toContain("12300");
    expect(JSON.stringify(customer)).not.toContain("张先生");
    expect(JSON.stringify(customer)).not.toContain("内部发文说明");

    const candidates = await service.fulfillmentCandidates(platform.id);
    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatchObject({
      resourceName: "优先完整资源",
      procurementCostFen: 12_300,
      supplySourceName: "渠道 A",
    });
  });

  it("advances only the relevant revisions and rejects a stale listing edit", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    const initialCatalog = await service.catalogRevision();
    const first = await service.upsertListing(administratorId, platform.id, {
      status: "ON_SHELF",
      pointPrice: 300,
      reason: "首期上架",
    });
    expect(BigInt(await service.catalogRevision())).toBeGreaterThan(
      BigInt(initialCatalog),
    );
    const source = await service.createSource(administratorId, {
      name: "渠道 A",
      reason: "创建来源",
    });
    const beforeInternalEdit = await service.catalogRevision();
    await service.updateSource(administratorId, source.id, {
      notes: "仅内部变化",
      reason: "补充内部备注",
    });
    expect(await service.catalogRevision()).toBe(beforeInternalEdit);

    const second = await service.upsertListing(administratorId, platform.id, {
      status: "ON_SHELF",
      pointPrice: 320,
      expectedRevision: first.listing!.revision,
      reason: "调整积分价",
    });
    expect(second.listing!.revision).toBe(2);
    await expect(
      service.upsertListing(administratorId, platform.id, {
        status: "ON_SHELF",
        pointPrice: 350,
        expectedRevision: first.listing!.revision,
        reason: "过期修改",
      }),
    ).rejects.toThrow("销售配置已经变化");
    await expect(
      service.upsertListing(administratorId, platform.id, {
        status: "DRAFT",
        pointPrice: 320,
        expectedRevision: second.listing!.revision,
        reason: "错误返回草稿",
      }),
    ).rejects.toThrow("不能返回该状态");
    expect((await service.quotePlatform(platform.id)).pointPrice).toBe(320);
    expect(
      await prisma.mediaCatalogAudit.count({
        where: { entityType: "LISTING", entityId: platform.id },
      }),
    ).toBe(2);
  });

  it("caps customer examples at fifty in stable quality order", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await service.upsertListing(administratorId, platform.id, {
      status: "ON_SHELF",
      pointPrice: 300,
      reason: "首期上架",
    });
    const source = await service.createSource(administratorId, {
      name: "渠道 A",
      reason: "创建来源",
    });
    await prisma.mediaResource.createMany({
      data: Array.from({ length: 51 }, (_, index) => ({
        platformId: platform.id,
        supplySourceId: source.id,
        resourceName: `资源-${index.toString().padStart(2, "0")}`,
        status: "ACTIVE",
        publicVisibility: "FULL",
        qualityTier: index === 50 ? "HIGH" : "MEDIUM",
      })),
    });

    const examples = (await service.customerPlatform(platform.id)).examples;
    expect(examples).toHaveLength(50);
    expect(examples[0]?.displayName).toBe("资源-50");
  });

  it("filters inactive sources from optional candidates without taking the platform off shelf", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await service.upsertListing(administratorId, platform.id, {
      status: "ON_SHELF",
      pointPrice: 300,
      reason: "首期上架",
    });
    const source = await service.createSource(administratorId, {
      name: "渠道 A",
      reason: "创建来源",
    });
    await service.createResource(administratorId, {
      platformId: platform.id,
      supplySourceId: source.id,
      resourceName: "候选账号",
      reason: "创建候选",
    });
    expect(await service.fulfillmentCandidates(platform.id)).toHaveLength(1);
    await service.updateSource(administratorId, source.id, {
      status: "INACTIVE",
      reason: "暂停来源",
    });
    expect(await service.fulfillmentCandidates(platform.id)).toEqual([]);
    expect((await service.quotePlatform(platform.id)).buyable).toBe(true);
  });

  it("deletes an unused draft but refuses destructive deletion with resource dependents", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await service.upsertListing(administratorId, platform.id, {
      status: "DRAFT",
      pointPrice: null,
      reason: "创建销售草稿",
    });
    await service.deletePlatform(administratorId, platform.id, {
      reason: "删除未使用草稿",
    });
    const audits = await service.listAudits({
      entityType: "PLATFORM",
      entityId: platform.id,
    });
    expect(audits).toHaveLength(2);
    expect(audits[0]).toMatchObject({
      actorAccountId: administratorId,
      action: "DELETE",
      reason: "删除未使用草稿",
      afterState: null,
    });
    expect(audits[1]).toMatchObject({
      actorAccountId: administratorId,
      action: "CREATE",
      reason: "建立平台",
      beforeState: null,
    });

    const dependent = await createTencentPlatform(service, administratorId);
    const source = await service.createSource(administratorId, {
      name: "渠道 A",
      reason: "创建来源",
    });
    await service.createResource(administratorId, {
      platformId: dependent.id,
      supplySourceId: source.id,
      resourceName: "依赖资源",
      reason: "创建依赖",
    });
    await expect(
      service.deletePlatform(administratorId, dependent.id, {
        reason: "尝试删除依赖平台",
      }),
    ).rejects.toThrow("已有业务依赖");
  });

  it("rolls back the entity and audit when the catalog revision write fails", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await service.upsertListing(administratorId, platform.id, {
      status: "ON_SHELF",
      pointPrice: 300,
      reason: "首期上架",
    });
    const auditCount = await prisma.mediaCatalogAudit.count();
    await prisma.mediaCatalogState.delete({ where: { id: "global" } });
    try {
      await expect(
        service.updatePlatform(administratorId, platform.id, {
          description: "不应提交的说明",
          reason: "模拟 revision 失败",
        }),
      ).rejects.toThrow("Media catalog state is missing");
      expect((await service.adminPlatform(platform.id)).description).toBe(
        "腾讯旗下新闻内容平台",
      );
      expect(await prisma.mediaCatalogAudit.count()).toBe(auditCount);
    } finally {
      await prisma.mediaCatalogState.create({
        data: { id: "global", publicRevision: 1n },
      });
    }
  });
});

function createTencentPlatform(
  service: MediaSupplyService,
  administratorId: string,
) {
  return service.createPlatform(administratorId, {
    displayName: "腾讯新闻",
    aliases: ["腾讯网新闻"],
    description: "腾讯旗下新闻内容平台",
    logoUrl: "/media-logos/tencent-news.svg",
    categories: ["PORTAL_MEDIA", "CONTENT_PLATFORM"],
    reason: "建立平台",
  });
}
