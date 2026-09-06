import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import { PublishingPackageService } from "../src/publishing-commerce/application/publishing-package.service.js";
import { clearCustomerData } from "./customer-data.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
describe("Publishing packages: maintained offer vertical slice", () => {
  const prisma = new PrismaService(config.databaseUrl);
  let app: INestApplication,
    baseUrl: string,
    packages: PublishingPackageService,
    media: MediaSupplyService;
  let adminId: string,
    adminCookie: string,
    customerCookie: string,
    operationsCookie: string;
  beforeAll(async () => {
    await prisma.$connect();
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
    packages = app.get(PublishingPackageService);
    media = app.get(MediaSupplyService);
  });
  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await clearCustomerData(prisma);
    const accounts = await Promise.all([
      prisma.account.create({
        data: { mobile: "+8613900006501", role: "ADMINISTRATOR" },
      }),
      prisma.account.create({
        data: { mobile: "+8613900006502", role: "TERMINAL_CUSTOMER" },
      }),
      prisma.account.create({
        data: { mobile: "+8613900006503", role: "OPERATIONS" },
      }),
    ]);
    adminId = accounts[0].id;
    const sessions = await Promise.all(
      accounts.map((a) => loginWithDevelopmentChallenge(baseUrl, a.mobile)),
    );
    [adminCookie, customerCookie, operationsCookie] = sessions.map(
      (s) => s.cookie,
    ) as [string, string, string];
  });
  function request(
    path: string,
    cookie?: string,
    method = "GET",
    body?: unknown,
  ) {
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...browserMutationHeaders(), ...(cookie ? { cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }
  async function platform(name = "套餐验收媒体") {
    return media.createPlatform(adminId, {
      displayName: name,
      categories: ["PORTAL_MEDIA"],
      status: "ACTIVE",
      pointPrice: 300,
    });
  }
  const fields = (platformId: string) => ({
    name: "本地验收套餐",
    quantity: 3,
    pointPrice: 800,
    status: "ACTIVE" as const,
    platformIds: [platformId],
  });

  it("creates an audited offer over HTTP and exposes only the customer-safe maintained projection", async () => {
    const p = await platform();
    const response = await request(
      "/admin/publishing/packages",
      adminCookie,
      "POST",
      fields(p.id),
    );
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created).toMatchObject({
      revision: 1,
      quantity: 3,
      pointPrice: 800,
    });
    const visible = await (
      await request("/publishing/packages", customerCookie)
    ).json();
    expect(visible).toEqual([
      {
        id: created.id,
        name: created.name,
        quantity: 3,
        pointPrice: 800,
        revision: 1,
        buyable: true,
        scope: [{ platformId: p.id, displayName: p.displayName }],
      },
    ]);
    const audits = await (
      await request(
        `/admin/publishing/packages/${created.id}/audits`,
        adminCookie,
      )
    ).json();
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorAccountId: adminId,
      beforeState: null,
      afterState: { id: created.id, revision: 1 },
    });
    expect(JSON.stringify(visible)).not.toContain(adminId);
  });

  it("enforces role and strict request ownership before mutations", async () => {
    const p = await platform();
    expect((await request("/admin/publishing/packages")).status).toBe(401);
    for (const cookie of [customerCookie, operationsCookie]) {
      expect(
        (
          await request(
            "/admin/publishing/packages",
            cookie,
            "POST",
            fields(p.id),
          )
        ).status,
      ).toBe(403);
      expect((await request("/admin/publishing/packages", cookie)).status).toBe(
        403,
      );
    }
    for (const cookie of [adminCookie, operationsCookie])
      expect((await request("/publishing/packages", cookie)).status).toBe(403);
    for (const injected of [
      { actorAccountId: randomUUID() },
      { accountId: randomUUID() },
      { id: randomUUID() },
      { buyable: true },
    ]) {
      expect(
        (
          await request("/admin/publishing/packages", adminCookie, "POST", {
            ...fields(p.id),
            ...injected,
          })
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await request(
          "/admin/publishing/packages/not-a-uuid",
          adminCookie,
          "PATCH",
          {},
        )
      ).status,
    ).toBe(400);
    expect(await prisma.publishingPackage.count()).toBe(0);
    expect(await prisma.publishingPackageAudit.count()).toBe(0);
  });

  it("rejects decimals, overflow, empty or duplicate scope and normalized duplicate names", async () => {
    const p = await platform();
    const valid = fields(p.id);
    for (const invalid of [
      { pointPrice: 0 },
      { pointPrice: 1.5 },
      { quantity: 2147483648 },
      { quantity: "3" },
      { platformIds: [] },
      { platformIds: [p.id, p.id] },
      { name: "   " },
    ]) {
      expect(
        (
          await request("/admin/publishing/packages", adminCookie, "POST", {
            ...valid,
            ...invalid,
          })
        ).status,
      ).toBe(400);
    }
    const created = await packages.create(adminId, {
      ...valid,
      name: "  ＡＢＣ   套餐  ",
    });
    expect(created.name).toBe("ABC 套餐");
    expect(
      (
        await request("/admin/publishing/packages", adminCookie, "POST", {
          ...valid,
          name: "abc 套餐",
        })
      ).status,
    ).toBe(409);
    expect(await prisma.publishingPackage.count()).toBe(1);
  });

  it("derives availability from current Media Supply facts, not resource counts or package unit pricing", async () => {
    const p = await platform();
    const offer = await packages.create(adminId, fields(p.id));
    expect(await media.fulfillmentCandidates(p.id)).toEqual([]);
    expect((await packages.listCustomer())[0]).toMatchObject({
      buyable: true,
      pointPrice: 800,
    });
    const repriced = await media.updatePlatform(adminId, p.id, {
      pointPrice: 500,
      expectedRevision: p.revision,
      reason: "媒体单价调整",
    });
    expect((await packages.listCustomer())[0]).toMatchObject({
      buyable: true,
      pointPrice: 800,
      revision: offer.revision,
    });
    await media.updatePlatform(adminId, p.id, {
      status: "INACTIVE",
      expectedRevision: repriced.revision,
      reason: "暂时停用",
    });
    expect((await packages.listCustomer())[0]).toMatchObject({
      buyable: false,
      pointPrice: 800,
    });
    await packages.update(adminId, offer.id, {
      ...fields(p.id),
      status: "INACTIVE",
      expectedRevision: 1,
      reason: "停止新购买",
    });
    expect(await packages.listCustomer()).toEqual([]);
    expect(await packages.listAdmin()).toHaveLength(1);
  });

  it("serializes concurrent expected-revision updates with one successful change and matching audit", async () => {
    const p = await platform();
    const offer = await packages.create(adminId, fields(p.id));
    const outcomes = await Promise.all(
      [900, 1000].map((pointPrice) =>
        request(
          `/admin/publishing/packages/${offer.id}`,
          adminCookie,
          "PATCH",
          {
            ...fields(p.id),
            pointPrice,
            expectedRevision: 1,
            reason: "并发更新验收",
          },
        ),
      ),
    );
    expect(outcomes.map((r) => r.status).sort()).toEqual([200, 409]);
    const current = (await packages.listAdmin())[0]!;
    const audits = await packages.audits(offer.id);
    expect(current.revision).toBe(2);
    expect(audits).toHaveLength(2);
    expect(
      audits.find((a) => a.afterState.revision === 2)?.afterState.pointPrice,
    ).toBe(current.pointPrice);
    expect(
      audits.find((a) => a.afterState.revision === 1)?.afterState.pointPrice,
    ).toBe(800);
  });

  it("rolls scope removal, revision and audit back when a replacement platform does not exist", async () => {
    const p = await platform();
    const offer = await packages.create(adminId, fields(p.id));
    await expect(
      packages.update(adminId, offer.id, {
        ...fields(randomUUID()),
        expectedRevision: 1,
        reason: "验证事务回滚",
      }),
    ).rejects.toThrow("所选媒体已不存在");
    expect((await packages.listAdmin())[0]).toEqual(offer);
    expect(await packages.audits(offer.id)).toHaveLength(1);
  });

  it("blocks deletion through the existing Media owner while allowing inactive reference maintenance", async () => {
    const p = await platform();
    const replacement = await platform("可替换范围媒体");
    const offer = await packages.create(adminId, {
      ...fields(p.id),
      status: "INACTIVE",
    });
    const stopped = await media.updatePlatform(adminId, p.id, {
      status: "INACTIVE",
      expectedRevision: p.revision,
      reason: "测试停用",
    });
    await expect(
      media.deletePlatform(adminId, p.id, {
        expectedRevision: stopped.revision,
        reason: "已有套餐引用",
      }),
    ).rejects.toThrow("已有套餐范围引用");
    expect((await media.adminPlatform(p.id)).categories).toEqual([
      "PORTAL_MEDIA",
    ]);
    await packages.update(adminId, offer.id, {
      ...fields(replacement.id),
      status: "INACTIVE",
      expectedRevision: 1,
      reason: "移除当前范围引用",
    });
    await media.deletePlatform(adminId, p.id, {
      expectedRevision: stopped.revision,
      reason: "范围已移除",
    });
    expect(
      (await packages.audits(offer.id)).some((a) =>
        a.afterState.platformIds.includes(p.id),
      ),
    ).toBe(true);
  });

  it("cannot both delete a media identity and create a package referencing it concurrently", async () => {
    const p = await platform();
    const inactive = await media.updatePlatform(adminId, p.id, {
      status: "INACTIVE",
      expectedRevision: p.revision,
      reason: "并发依赖验收",
    });
    const results = await Promise.allSettled([
      packages.create(adminId, { ...fields(p.id), status: "INACTIVE" }),
      media.deletePlatform(adminId, p.id, {
        expectedRevision: inactive.revision,
        reason: "并发删除验收",
      }),
    ]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(
      1,
    );
    const remaining = await prisma.publishingPackagePlatform.count({
      where: { platformId: p.id },
    });
    expect(remaining).toBe(
      await prisma.mediaPlatform.count({ where: { id: p.id } }),
    );
  });

  it("declares OpenAPI bodies and UUID route parameters and retains database numeric constraints", async () => {
    const document = await (await fetch(`${baseUrl}/openapi-json`)).json();
    expect(
      document.paths["/admin/publishing/packages"].post.requestBody,
    ).toBeDefined();
    expect(
      document.paths["/admin/publishing/packages/{packageId}"].patch.parameters,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "packageId",
          in: "path",
          required: true,
        }),
      ]),
    );
    await expect(
      prisma.publishingPackage.create({
        data: {
          name: "非法数量",
          normalizedName: "非法数量",
          quantity: 0,
          pointPrice: 800,
        },
      }),
    ).rejects.toThrow();
    expect(await prisma.publishingPackage.count()).toBe(0);
  });
});
