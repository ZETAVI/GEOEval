import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { GeoOptimizationService } from "../src/geo-optimization/application/geo-optimization.service.js";
import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import { PublishingPackageService } from "../src/publishing-commerce/application/publishing-package.service.js";
import {
  publishingIntentSchema,
  quoteSelection,
  type PublishingSelection,
} from "../src/publishing-commerce/domain/publishing-selection.js";
import { clearCustomerData } from "./customer-data.js";
import { publishingContextFixture } from "./publishing-context.fixture.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
describe("Publishing selection and quote vertical slice", () => {
  const prisma = new PrismaService(config.databaseUrl);
  let app: INestApplication,
    url: string,
    media: MediaSupplyService,
    packages: PublishingPackageService,
    articles: GeoOptimizationService;
  let customerId: string,
    otherId: string,
    adminId: string,
    customerCookie: string,
    otherCookie: string,
    adminCookie: string;
  let context: Awaited<ReturnType<typeof publishingContextFixture>>,
    offer: Awaited<ReturnType<PublishingPackageService["create"]>>;
  let first: Awaited<ReturnType<MediaSupplyService["createPlatform"]>>,
    second: typeof first;
  beforeAll(async () => {
    await prisma.$connect();
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    url = await app.getUrl();
    media = app.get(MediaSupplyService);
    packages = app.get(PublishingPackageService);
    articles = app.get(GeoOptimizationService);
  });
  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await clearCustomerData(prisma);
    const accounts = await Promise.all([
      prisma.account.create({
        data: { mobile: "+8613900006521", role: "ADMINISTRATOR" },
      }),
      prisma.account.create({ data: { mobile: "+8613900006522" } }),
      prisma.account.create({ data: { mobile: "+8613900006523" } }),
    ]);
    [adminId, customerId, otherId] = accounts.map((item) => item.id) as [
      string,
      string,
      string,
    ];
    [adminCookie, customerCookie, otherCookie] = (
      await Promise.all(
        accounts.map((item) => loginWithDevelopmentChallenge(url, item.mobile)),
      )
    ).map((item) => item.cookie) as [string, string, string];
    context = await publishingContextFixture(app, prisma, customerId);
    first = await media.createPlatform(adminId, {
      displayName: "门户媒体甲",
      categories: ["PORTAL_MEDIA"],
      status: "ACTIVE",
      pointPrice: 200,
    });
    second = await media.createPlatform(adminId, {
      displayName: "本地媒体乙",
      categories: ["LOCAL_MEDIA"],
      status: "ACTIVE",
      pointPrice: 150,
    });
    offer = await packages.create(adminId, {
      name: "本地曝光套餐",
      quantity: 3,
      pointPrice: 800,
      status: "ACTIVE",
      platformIds: [first.id],
    });
  });
  function request(
    path: string,
    cookie?: string,
    method = "GET",
    body?: unknown,
  ) {
    return fetch(`${url}${path}`, {
      method,
      headers: { ...browserMutationHeaders(), ...(cookie ? { cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }
  function command(expectedRevision = 0) {
    return {
      expectedRevision,
      articleId: context.article.id,
      articleRevision: context.article.revision,
      intent: { mode: "RANDOM", packageId: offer.id },
    };
  }
  function save(
    body: unknown = command(),
    cookie = customerCookie,
    brandId = context.brand.id,
  ) {
    return request(
      `/publishing/brands/${brandId}/selection`,
      cookie,
      "PUT",
      body,
    );
  }
  async function workspace(cookie = customerCookie) {
    const result = await request("/publishing/workspace", cookie);
    expect(result.status).toBe(200);
    return result.json();
  }

  it("shows an intentional no-brand state without inventing a selection, wallet or quote", async () => {
    expect(await workspace(otherCookie)).toEqual({
      brand: null,
      article: null,
      selection: null,
      quote: null,
      balance: 0,
    });
    expect(await prisma.publishingSelection.count()).toBe(0);
    expect(await prisma.pointAccount.count()).toBe(0);
  });
  it("saves a random intention and returns a server quote with shortage but no financial effect", async () => {
    const response = await save();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      brandId: context.brand.id,
      revision: 1,
      intent: { mode: "RANDOM", packageId: offer.id },
    });
    const state = await workspace();
    expect(state).toMatchObject({
      balance: 0,
      article: { id: context.article.id },
      quote: {
        totalPoints: 800,
        quantity: 3,
        shortfall: 800,
        suggestedRechargeYuan: 80,
        problems: [],
        scope: [{ platformId: first.id, displayName: first.displayName }],
      },
    });
    for (const forbidden of [
      "accountId",
      "actorAccountId",
      "fundedBalance",
      "internalNote",
      "procurement",
      "sourceGenerationId",
      "bodyMarkdown",
      "writingContextFingerprint",
    ])
      expect(JSON.stringify(state)).not.toContain(forbidden);
    expect(await prisma.pointAccount.count()).toBe(0);
    expect(await prisma.pointChange.count()).toBe(0);
  });
  it("enforces role, account/current-brand ownership, strict bodies and normalized unique media", async () => {
    expect((await request("/publishing/workspace")).status).toBe(401);
    expect((await request("/publishing/workspace", adminCookie)).status).toBe(
      403,
    );
    expect((await save(command(), otherCookie)).status).toBe(404);
    expect((await save(command(), adminCookie)).status).toBe(403);
    for (const body of [
      { ...command(), accountId: otherId },
      { ...command(), totalPoints: 1 },
      { ...command(), articleRevision: 0 },
      {
        ...command(),
        intent: { mode: "RANDOM", packageId: offer.id, lines: [] },
      },
      {
        ...command(),
        intent: {
          mode: "PRECISE",
          lines: [
            { platformId: first.id, quantity: 1 },
            { platformId: first.id.toUpperCase(), quantity: 1 },
          ],
        },
      },
    ])
      expect((await save(body)).status).toBe(400);
    expect((await save({ ...command(), articleId: randomUUID() })).status).toBe(
      409,
    );
    expect(await prisma.publishingSelection.count()).toBe(0);
  });
  it("serializes concurrent first saves and conditional updates without silent overwrite", async () => {
    const firstSaves = await Promise.all([save(), save()]);
    expect(firstSaves.map((r) => r.status).sort()).toEqual([200, 409]);
    const updates = await Promise.all([
      save(command(1)),
      save({
        ...command(1),
        intent: {
          mode: "PRECISE",
          lines: [{ platformId: first.id, quantity: 2 }],
        },
      }),
    ]);
    expect(updates.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await workspace()).selection.revision).toBe(2);
    expect(await prisma.publishingSelection.count()).toBe(1);
  });
  it("retains the selection through article edits and requires explicit rebinding to a newly confirmed revision", async () => {
    expect((await save()).status).toBe(200);
    const article = await articles.saveArticle({
      accountId: customerId,
      brandId: context.brand.id,
      articleId: context.article.id,
      expectedRevision: 1,
      title: "修改后的核心文章",
      bodyMarkdown: "保存新的文章内容",
    });
    expect((await workspace()).quote.problems).toContain("ARTICLE_UNCONFIRMED");
    expect((await save(command(1))).status).toBe(409);
    await articles.confirmArticle({
      accountId: customerId,
      brandId: context.brand.id,
      articleId: article.id,
      expectedRevision: article.revision,
    });
    const before = await workspace();
    expect(before.selection.articleRevision).toBe(1);
    expect(before.quote.problems).toContain("ARTICLE_CHANGED");
    expect(
      (await save({ ...command(1), articleRevision: article.revision })).status,
    ).toBe(200);
    expect((await workspace()).quote.problems).toEqual([]);
    expect((await workspace()).selection.articleRevision).toBe(2);
  });
  it("keeps brand selections isolated when switching current brand and never moves saved work", async () => {
    expect((await save()).status).toBe(200);
    const next = await publishingContextFixture(
      app,
      prisma,
      customerId,
      "第二家咖啡店",
    );
    expect((await workspace()).brand.id).toBe(next.brand.id);
    expect((await workspace()).selection).toBeNull();
    expect((await save()).status).toBe(404);
    expect(
      (
        await request(
          `/brands/${context.brand.id}/current`,
          customerCookie,
          "PUT",
        )
      ).status,
    ).toBe(200);
    expect((await workspace()).selection.brandId).toBe(context.brand.id);
    expect((await workspace(otherCookie)).selection).toBeNull();
  });
  it("recomputes precise prices while preserving intent and leaves random total independent of unit price", async () => {
    expect((await save()).status).toBe(200);
    await media.updatePlatform(adminId, first.id, {
      expectedRevision: first.revision,
      pointPrice: 230,
      reason: "价格调整",
    });
    expect((await workspace()).quote.totalPoints).toBe(800);
    expect(
      (
        await save({
          ...command(1),
          intent: {
            mode: "PRECISE",
            lines: [
              { platformId: second.id, quantity: 2 },
              { platformId: first.id, quantity: 3 },
            ],
          },
        })
      ).status,
    ).toBe(200);
    expect((await workspace()).quote).toMatchObject({
      totalPoints: 990,
      quantity: 5,
      shortfall: 990,
    });
    await media.updatePlatform(adminId, second.id, {
      expectedRevision: second.revision,
      pointPrice: 180,
      reason: "价格调整",
    });
    const state = await workspace();
    expect(state.quote.totalPoints).toBe(1050);
    expect(state.selection.revision).toBe(2);
    expect(await prisma.pointChange.count()).toBe(0);
  });
  it("retains unavailable or deleted unpaid targets and rejects new unavailable saves without rewriting intent", async () => {
    const precise = {
      ...command(),
      intent: {
        mode: "PRECISE",
        lines: [{ platformId: second.id, quantity: 2 }],
      },
    };
    expect((await save(precise)).status).toBe(200);
    const inactive = await media.updatePlatform(adminId, second.id, {
      expectedRevision: second.revision,
      status: "INACTIVE",
      reason: "暂停",
    });
    expect((await workspace()).quote.problems).toContain("OFFER_UNAVAILABLE");
    await media.deletePlatform(adminId, second.id, {
      expectedRevision: inactive.revision,
      reason: "移除未使用媒体",
    });
    const state = await workspace();
    expect(state.selection.intent.lines[0].platformId).toBe(second.id);
    expect(state.quote.totalPoints).toBeNull();
    expect(state.quote.lines[0].available).toBe(false);
    expect((await save({ ...precise, expectedRevision: 1 })).status).toBe(409);
    expect((await workspace()).selection.revision).toBe(1);
  });
  it("rejects fractional/overflow quantities and cannot manufacture a low total", async () => {
    for (const quantity of [0, 1.5, -2, 2147483647, 2147483648])
      expect(
        (
          await save({
            ...command(),
            intent: {
              mode: "PRECISE",
              lines: [{ platformId: first.id, quantity }],
            },
          })
        ).status,
      ).toBe(400);
    const normalized = publishingIntentSchema.parse({
      mode: "PRECISE",
      lines: [{ platformId: second.id.toUpperCase(), quantity: 1 }],
    });
    expect(normalized).toMatchObject({ lines: [{ platformId: second.id }] });
    const selection: PublishingSelection = {
      ...command(),
      brandId: context.brand.id,
      revision: 1,
      intent: {
        mode: "PRECISE",
        lines: [{ platformId: first.id, quantity: 2147483647 }],
      },
    };
    expect(
      quoteSelection(
        selection,
        context.article,
        null,
        [
          {
            platformId: first.id,
            displayName: "A",
            pointPrice: 2147483647,
            buyable: true,
            revision: 1,
          },
        ],
        0,
      ).problems,
    ).toContain("TOTAL_OUT_OF_RANGE");
    expect(await prisma.publishingSelection.count()).toBe(0);
  });
  it("enforces article/account/brand identity in the database and exposes complete OpenAPI variants", async () => {
    await expect(
      prisma.publishingSelection.create({
        data: {
          brandId: context.brand.id,
          accountId: otherId,
          articleId: context.article.id,
          articleRevision: 1,
          intent: command().intent,
        },
      }),
    ).rejects.toThrow();
    const response = await request("/openapi.json");
    expect(response.status).toBe(404);
    const { readFile } = await import("node:fs/promises");
    const schema = JSON.parse(
      await readFile(new URL("../openapi.json", import.meta.url), "utf8"),
    );
    expect(
      schema.components.schemas.RandomPublishingIntent.properties.mode.enum,
    ).toEqual(["RANDOM"]);
    expect(
      schema.components.schemas.PrecisePublishingIntent.properties.lines.items
        .$ref,
    ).toContain("PrecisePublishingLine");
    expect(
      schema.paths["/publishing/brands/{brandId}/selection"].put.requestBody,
    ).toBeDefined();
  });
});
