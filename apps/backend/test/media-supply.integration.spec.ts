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
    const source = await service.createSource(administratorId, {
      name: "渠道 A",
      contactName: "张先生",
      contactMethod: "13800000000",
      notes: "内部来源",
      reason: "创建来源",
    });
    const fullResource = await service.createResource(administratorId, {
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
    const updatedFullResource = await service.updateResource(
      administratorId,
      fullResource.id,
      {
        publicationNotes: "更新后的内部发文说明",
        reason: "更新说明",
      },
    );
    expect(updatedFullResource).toMatchObject({
      resourceName: "优先完整资源",
      procurementCostFen: 12_300,
      publicVisibility: "FULL",
      publicationNotes: "更新后的内部发文说明",
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

  it("advances the platform revision, rejects stale edits, and stops orders when disabled", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    const initialCatalog = await service.catalogRevision();
    const first = await activatePlatform(service, administratorId, platform);
    expect(BigInt(await service.catalogRevision())).toBeGreaterThan(
      BigInt(initialCatalog),
    );
    const source = await service.createSource(administratorId, {
      name: "渠道 A",
      contactName: "张先生",
      contactMethod: "13800000000",
      reason: "创建来源",
    });
    const beforeInternalEdit = await service.catalogRevision();
    await service.updateSource(administratorId, source.id, {
      notes: "仅内部变化",
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

  it("filters inactive sources from optional candidates without disabling the platform", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await activatePlatform(service, administratorId, platform);
    const source = await service.createSource(administratorId, {
      name: "渠道 A",
      contactName: "张先生",
      contactMethod: "13800000000",
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
    expect((await service.listSources())[0]).toMatchObject({
      status: "INACTIVE",
      contactName: "张先生",
      contactMethod: "13800000000",
    });
    expect(await service.fulfillmentCandidates(platform.id)).toEqual([]);
    expect((await service.quotePlatform(platform.id)).buyable).toBe(true);
  });

  it("deletes an unused inactive platform but refuses deletion with resource dependents", async () => {
    const platform = await createTencentPlatform(service, administratorId);
    await service.deletePlatform(administratorId, platform.id, {
      reason: "删除未使用平台",
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
    reason: "建立平台",
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
