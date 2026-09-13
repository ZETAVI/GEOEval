import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import { PostgresMediaSupplyRepository } from "../src/media-supply/infrastructure/postgres-media-supply.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();

describe("Media Supply persistence and projections", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const repository = new PostgresMediaSupplyRepository(prisma);
  const service = new MediaSupplyService(repository);
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

  it("lists an enabled priced platform without requiring stored resources", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    const enabled = await activatePlatform(service, administratorId, platform);

    expect(enabled).toMatchObject({
      status: "ACTIVE",
      pointPrice: 300,
      revision: 2,
    });
    expect(await service.quotePlatform(platform.id)).toEqual({
      platformId: platform.id,
      displayName: "腾讯新闻",
      buyable: true,
      pointPrice: 300,
      revision: 2,
    });
    expect((await service.listCustomerPlatforms({})).items).toHaveLength(1);
    expect((await service.customerPlatform(platform.id)).examples).toEqual([]);
    expect(await service.fulfillmentCandidates(platform.id)).toEqual([]);
  });

  it("separates full, masked, hidden, and administrator-only resource facts", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await activatePlatform(service, administratorId, platform);
    const supplier = await service.createSupplier(administratorId, {
      displayName: "渠道 A",
      contactName: "张先生",
      contactMethod: "13800000000",
      status: "ACTIVE",
      notes: "内部来源",
    });
    const fullResource = await service.createResource(administratorId, {
      platformId: platform.id,
      supplierId: supplier.id,
      resourceName: "优先完整资源",
      publicVisibility: "FULL",
      qualityTier: "HIGH",
      procurementCostYuan: 123,
      caseUrl: "https://example.com/internal-case",
      publicationNotes: "内部发文说明",
    });
    const updatedFullResource = await service.updateResource(
      administratorId,
      fullResource.id,
      {
        publicationNotes: "更新后的内部发文说明",
        expectedRevision: fullResource.revision,
        reason: "更新说明",
      },
    );
    expect(updatedFullResource).toMatchObject({
      resourceName: "优先完整资源",
      procurementCostYuan: 123,
      publicVisibility: "FULL",
      publicationNotes: "更新后的内部发文说明",
    });
    await service.createResource(administratorId, {
      platformId: platform.id,
      supplierId: supplier.id,
      resourceName: "六安新周报",
      publicVisibility: "MASKED",
      publicAlias: "六安新***",
      qualityTier: "MEDIUM",
    });
    await service.createResource(administratorId, {
      platformId: platform.id,
      supplierId: supplier.id,
      resourceName: "内部隐藏账号",
      publicVisibility: "HIDDEN",
      qualityTier: "LOW",
    });

    const customer = await service.customerPlatform(platform.id);
    expect(customer).toEqual({
      id: platform.id,
      displayName: "腾讯新闻",
      description: "腾讯旗下新闻内容平台",
      logoUrl: "/media-logos/tencent-news.svg",
      regionScope: "DOMESTIC",
      categories: ["PORTAL_MEDIA", "CONTENT_PLATFORM"],
      pointPrice: 300,
      revision: 2,
      examples: [
        {
          id: fullResource.id,
          displayName: "优先完整资源",
          publicationMode: "FIRST_PUBLISH",
        },
        {
          id: expect.any(String),
          displayName: "六安新***",
          publicationMode: "FIRST_PUBLISH",
        },
      ],
    });

    const candidates = await service.fulfillmentCandidates(platform.id);
    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toMatchObject({
      resourceName: "优先完整资源",
      procurementCostYuan: 123,
      supplierName: "渠道 A",
    });
  });

  it("advances the platform revision, rejects stale edits, and stops orders when disabled", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    const initialCatalog = await service.catalogRevision();
    const first = await activatePlatform(service, administratorId, platform);
    expect(BigInt(await service.catalogRevision())).toBeGreaterThan(
      BigInt(initialCatalog),
    );
    const supplier = await service.createSupplier(administratorId, {
      displayName: "渠道 A",
      contactName: "张先生",
      contactMethod: "13800000000",
      status: "ACTIVE",
    });
    const beforeInternalEdit = await service.catalogRevision();
    await service.updateSupplier(administratorId, supplier.id, {
      notes: "仅内部变化",
      expectedRevision: supplier.revision,
      reason: "补充内部备注",
    });
    expect(await service.catalogRevision()).toBe(beforeInternalEdit);

    const second = await service.updatePlatform(administratorId, platform.id, {
      pointPrice: 320,
      expectedRevision: first.revision,
      reason: "调整积分价",
    });
    expect(second.revision).toBe(3);
    await expect(
      service.updatePlatform(administratorId, platform.id, {
        pointPrice: 350,
        expectedRevision: first.revision,
        reason: "过期修改",
      }),
    ).rejects.toThrow("平台资料已经变化");
    const stopped = await service.updatePlatform(administratorId, platform.id, {
      status: "INACTIVE",
      expectedRevision: second.revision,
      reason: "停止接单",
    });
    expect(stopped).toMatchObject({ status: "INACTIVE", revision: 4 });
    expect(await service.quotePlatform(platform.id)).toMatchObject({
      buyable: false,
      pointPrice: 320,
      revision: 4,
    });
    expect(
      await prisma.mediaCatalogAudit.count({
        where: { entityType: "PLATFORM", entityId: platform.id },
      }),
    ).toBe(4);
  });

  it("caps customer examples at fifty in stable quality order", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await activatePlatform(service, administratorId, platform);
    const supplier = await service.createSupplier(administratorId, {
      displayName: "渠道 A",
      status: "ACTIVE",
    });
    await prisma.mediaResource.createMany({
      data: Array.from({ length: 51 }, (_, index) => ({
        platformId: platform.id,
        supplierId: supplier.id,
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

  it("advances catalog freshness when a visible resource changes supplier availability", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await activatePlatform(service, administratorId, platform);
    const activeSupplier = await service.createSupplier(administratorId, {
      displayName: "可用供应商",
      status: "ACTIVE",
    });
    const inactiveSupplier = await service.createSupplier(administratorId, {
      displayName: "停用供应商",
    });
    const resource = await service.createResource(administratorId, {
      platformId: platform.id,
      supplierId: activeSupplier.id,
      resourceName: "客户可见资源",
      publicVisibility: "FULL",
    });
    const before = await service.catalogRevision();
    const moved = await service.updateResource(administratorId, resource.id, {
      supplierId: inactiveSupplier.id,
      expectedRevision: resource.revision,
      reason: "更换当前供应商",
    });
    expect(moved.effectiveStatus).toBe("SUPPLIER_INACTIVE");
    expect(BigInt(await service.catalogRevision())).toBeGreaterThan(
      BigInt(before),
    );
    expect((await service.customerPlatform(platform.id)).examples).toEqual([]);
  });

  it("derives supplier inactivity without disabling the platform or overriding resource state", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await activatePlatform(service, administratorId, platform);
    const supplier = await service.createSupplier(administratorId, {
      displayName: "渠道 A",
      contactName: "张先生",
      contactMethod: "13800000000",
      status: "ACTIVE",
    });
    const resource = await service.createResource(administratorId, {
      platformId: platform.id,
      supplierId: supplier.id,
      resourceName: "候选账号",
      publicVisibility: "FULL",
    });
    expect(await service.fulfillmentCandidates(platform.id)).toHaveLength(1);
    const stoppedSupplier = await service.updateSupplier(
      administratorId,
      supplier.id,
      {
        status: "INACTIVE",
        expectedRevision: supplier.revision,
        reason: "暂停来源",
      },
    );
    expect((await service.listSuppliers())[0]).toMatchObject({
      status: "INACTIVE",
      contactName: "张先生",
      contactMethod: "13800000000",
    });
    expect(await service.fulfillmentCandidates(platform.id)).toEqual([]);
    expect((await service.customerPlatform(platform.id)).examples).toEqual([]);
    expect((await service.listResources(platform.id))[0]).toMatchObject({
      effectiveStatus: "SUPPLIER_INACTIVE",
      status: "ACTIVE",
    });
    const stoppedResource = await service.updateResource(
      administratorId,
      resource.id,
      {
        status: "INACTIVE",
        expectedRevision: resource.revision,
        reason: "停用资源",
      },
    );
    await service.updateSupplier(administratorId, supplier.id, {
      status: "ACTIVE",
      expectedRevision: stoppedSupplier.revision,
      reason: "恢复供应商",
    });
    expect((await service.listResources(platform.id))[0]).toMatchObject({
      status: "INACTIVE",
      effectiveStatus: "RESOURCE_INACTIVE",
      revision: stoppedResource.revision,
    });
    expect((await service.quotePlatform(platform.id)).buyable).toBe(true);
  });

  it("deletes an unused inactive platform but refuses deletion with resource dependents", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await service.deletePlatform(administratorId, platform.id, {
      reason: "删除未使用平台",
      expectedRevision: platform.revision,
    });
    const audits = await service.listAudits({
      entityType: "PLATFORM",
      entityId: platform.id,
    });
    expect(audits).toHaveLength(2);
    expect(audits[0]).toMatchObject({
      actorAccountId: administratorId,
      action: "DELETE",
      reason: "删除未使用平台",
      afterState: null,
    });
    expect(audits[1]).toMatchObject({
      actorAccountId: administratorId,
      action: "CREATE",
      reason: "创建媒体平台",
      beforeState: null,
    });

    const dependent = await createTencentPlatform(service, administratorId);
    const supplier = await service.createSupplier(administratorId, {
      displayName: "渠道 A",
    });
    await service.createResource(administratorId, {
      platformId: dependent.id,
      supplierId: supplier.id,
      resourceName: "依赖资源",
    });
    await expect(
      service.deletePlatform(administratorId, dependent.id, {
        reason: "尝试删除依赖平台",
        expectedRevision: dependent.revision,
      }),
    ).rejects.toThrow("已有业务依赖");
  });

  it("applies resource status batches atomically with one revision per resource", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    const supplier = await service.createSupplier(administratorId, {
      displayName: "批量供应商",
      status: "ACTIVE",
    });
    const first = await service.createResource(administratorId, {
      platformId: platform.id,
      supplierId: supplier.id,
      resourceName: "批量资源一",
    });
    const second = await service.createResource(administratorId, {
      platformId: platform.id,
      supplierId: supplier.id,
      resourceName: "批量资源二",
    });

    await expect(
      service.batchUpdateResourceStatus(administratorId, {
        status: "INACTIVE",
        reason: "模拟过期批量修改",
        items: [
          { resourceId: first.id, expectedRevision: first.revision },
          { resourceId: second.id, expectedRevision: 99 },
        ],
      }),
    ).rejects.toThrow("本次批量操作未执行");
    expect(await service.listResources(platform.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: first.id,
          status: "ACTIVE",
          revision: 1,
        }),
        expect.objectContaining({
          id: second.id,
          status: "ACTIVE",
          revision: 1,
        }),
      ]),
    );

    const changed = await service.batchUpdateResourceStatus(administratorId, {
      status: "INACTIVE",
      reason: "批量停用",
      items: [
        { resourceId: first.id, expectedRevision: first.revision },
        { resourceId: second.id, expectedRevision: second.revision },
      ],
    });
    expect(changed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "INACTIVE", revision: 2 }),
      ]),
    );
    expect(
      await prisma.mediaCatalogAudit.count({
        where: { action: "BATCH_STATUS_UPDATE" },
      }),
    ).toBe(2);
  });

  it("guards deletion and can atomically remove the last inactive supplier", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    const supplier = await service.createSupplier(administratorId, {
      displayName: "待清理供应商",
      status: "ACTIVE",
    });
    const resource = await service.createResource(administratorId, {
      platformId: platform.id,
      supplierId: supplier.id,
      resourceName: "待清理资源",
    });
    await expect(
      service.deleteResource(administratorId, resource.id, {
        reason: "不应删除可用资源",
        expectedRevision: resource.revision,
      }),
    ).rejects.toThrow("先停用资源");
    const inactiveResource = await service.updateResource(
      administratorId,
      resource.id,
      {
        status: "INACTIVE",
        expectedRevision: resource.revision,
        reason: "准备清理",
      },
    );
    const inactiveSupplier = await service.updateSupplier(
      administratorId,
      supplier.id,
      {
        status: "INACTIVE",
        expectedRevision: supplier.revision,
        reason: "准备清理",
      },
    );
    const result = await service.deleteResource(administratorId, resource.id, {
      reason: "清理无用数据",
      expectedRevision: inactiveResource.revision,
      deleteUnreferencedSupplier: true,
      expectedSupplierRevision: inactiveSupplier.revision,
    });
    expect(result).toEqual({
      resourceId: resource.id,
      supplierId: supplier.id,
      supplierDeleted: true,
    });
    expect(await service.listSuppliers()).toEqual([]);
    expect(
      await prisma.mediaCatalogAudit.count({
        where: {
          action: "DELETE",
          entityType: { in: ["RESOURCE", "SUPPLIER"] },
        },
      }),
    ).toBe(2);
  });

  it("rolls back entity and revision when the audit write fails", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    const enabled = await activatePlatform(service, administratorId, platform);
    const auditCount = await prisma.mediaCatalogAudit.count();
    const revision = await service.catalogRevision();
    await expect(
      repository.updatePlatform(
        { actorAccountId: randomUUID(), reason: "模拟审计失败" },
        platform.id,
        { description: "不应提交的说明" },
        enabled.revision,
      ),
    ).rejects.toThrow();
    expect((await service.adminPlatform(platform.id)).description).toBe(
      "腾讯旗下新闻内容平台",
    );
    expect(await service.catalogRevision()).toBe(revision);
    expect(await prisma.mediaCatalogAudit.count()).toBe(auditCount);
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
  });
}

function activatePlatform(
  service: MediaSupplyService,
  administratorId: string,
  platform: { id: string; revision: number },
) {
  return service.updatePlatform(administratorId, platform.id, {
    status: "ACTIVE",
    pointPrice: 300,
    expectedRevision: platform.revision,
    reason: "启用平台",
  });
}
