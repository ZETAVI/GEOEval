import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { GeoOptimizationService } from "../src/geo-optimization/application/geo-optimization.service.js";
import { PostgresArticlePurchaseReaderFactory } from "../src/geo-optimization/infrastructure/postgres-article-purchase-reader.js";
import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import { PostgresMediaPurchaseReaderFactory } from "../src/media-supply/infrastructure/postgres-media-purchase-reader.js";
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { PublishingPackageService } from "../src/publishing-commerce/application/publishing-package.service.js";
import {
  commercialTerms,
  spendPoints,
  type SubmitPurchase,
} from "../src/publishing-commerce/domain/publishing-order.js";
import { MAX_POINTS } from "../src/publishing-commerce/domain/point-account.js";
import { clearCustomerData } from "./customer-data.js";
import { publishingContextFixture } from "./publishing-context.fixture.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
describe("publishing purchase atomicity and owned pending orders", () => {
  const prisma = new PrismaService(config.databaseUrl);
  let app: INestApplication,
    url: string,
    media: MediaSupplyService,
    points: PointAccountService,
    packages: PublishingPackageService;
  let adminId: string,
    customerId: string,
    customerCookie: string,
    otherCookie: string,
    adminCookie: string;
  let context: Awaited<ReturnType<typeof publishingContextFixture>>;
  let platform: Awaited<ReturnType<MediaSupplyService["createPlatform"]>>;
  let offer: Awaited<ReturnType<PublishingPackageService["create"]>>;
  beforeAll(async () => {
    await prisma.$connect();
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    url = await app.getUrl();
    media = app.get(MediaSupplyService);
    points = app.get(PointAccountService);
    packages = app.get(PublishingPackageService);
  });
  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await clearCustomerData(prisma);
    const accounts = await Promise.all([
      prisma.account.create({
        data: { mobile: "+8613900006541", role: "ADMINISTRATOR" },
      }),
      prisma.account.create({ data: { mobile: "+8613900006542" } }),
      prisma.account.create({ data: { mobile: "+8613900006543" } }),
    ]);
    adminId = accounts[0]!.id;
    customerId = accounts[1]!.id;
    [adminCookie, customerCookie, otherCookie] = (
      await Promise.all(
        accounts.map((a) => loginWithDevelopmentChallenge(url, a.mobile)),
      )
    ).map((s) => s.cookie) as [string, string, string];
    context = await publishingContextFixture(app, prisma, customerId);
    platform = await media.createPlatform(adminId, {
      displayName: "订单测试媒体",
      categories: ["PORTAL_MEDIA"],
      status: "ACTIVE",
      pointPrice: 200,
    });
    offer = await packages.create(adminId, {
      name: "订单套餐",
      quantity: 3,
      pointPrice: 800,
      status: "ACTIVE",
      platformIds: [platform.id],
    });
  });
  function http(
    path: string,
    cookie = customerCookie,
    method = "GET",
    body?: unknown,
  ) {
    return fetch(`${url}${path}`, {
      method,
      headers: { ...browserMutationHeaders(), cookie },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function grant(amount = 2000, key = randomUUID()) {
    const response = await http(
      `/admin/points/accounts/${customerId}/adjustments`,
      adminCookie,
      "POST",
      { amount, reason: "订单验收赠送", idempotencyKey: key },
    );
    expect(response.status).toBe(200);
  }
  async function select(
    mode: "RANDOM" | "PRECISE" = "RANDOM",
    revision = 0,
  ): Promise<SubmitPurchase> {
    const result = await http(
      `/publishing/brands/${context.brand.id}/selection`,
      customerCookie,
      "PUT",
      {
        expectedRevision: revision,
        articleId: context.article.id,
        articleRevision: context.article.revision,
        intent:
          mode === "RANDOM"
            ? { mode, packageId: offer.id }
            : { mode, lines: [{ platformId: platform.id, quantity: 2 }] },
      },
    );
    expect(result.status).toBe(200);
    const workspace = await (await http("/publishing/workspace")).json();
    return {
      idempotencyKey: randomUUID(),
      brandId: context.brand.id,
      articleId: context.article.id,
      articleRevision: context.article.revision,
      selectionRevision: workspace.selection.revision,
      acceptedTerms: commercialTerms(workspace.quote),
    };
  }
  function purchase(input: unknown, cookie = customerCookie) {
    return http("/publishing/orders", cookie, "POST", input);
  }
  async function unchanged(balance = 2000) {
    expect(await prisma.publishingOrder.count()).toBe(0);
    expect(
      await prisma.pointChange.count({ where: { kind: "PUBLISHING_ORDER" } }),
    ).toBe(0);
    expect(await points.customerBalance(customerId)).toMatchObject({ balance });
    expect(
      await prisma.publishingSelection.findUnique({
        where: { brandId: context.brand.id },
      }),
    ).toMatchObject({ revision: 1 });
  }
  async function editArticle() {
    return app.get(GeoOptimizationService).saveArticle({
      accountId: customerId,
      brandId: context.brand.id,
      articleId: context.article.id,
      expectedRevision: context.article.revision,
      title: "后来编辑的标题",
      bodyMarkdown: "后来编辑的正文，不得改变购买快照。",
    });
  }

  it.each(["RANDOM", "PRECISE"] as const)(
    "commits %s agreement, negative ledger and consumed monotonic selection together",
    async (mode) => {
      await grant();
      const input = await select(mode);
      const response = await purchase(input);
      expect(response.status).toBe(200);
      const order = await response.json();
      expect(order).toMatchObject({
        status: "PENDING_HANDLING",
        title: context.article.title,
        bodyMarkdown: context.article.bodyMarkdown,
        agreement: input.acceptedTerms,
      });
      expect(order.number).toMatch(/^GEO-\d{8,}$/);
      const ledger = await prisma.pointChange.findUniqueOrThrow({
        where: { publishingOrderId: order.id },
      });
      expect(ledger).toMatchObject({
        kind: "PUBLISHING_ORDER",
        sequence: 2,
        accountId: customerId,
        grantedDelta: -input.acceptedTerms.totalPoints,
        fundedDelta: 0,
        balanceAfter: 2000 - input.acceptedTerms.totalPoints,
      });
      const state = await (await http("/publishing/workspace")).json();
      expect(state).toMatchObject({
        selectionRevision: 2,
        selection: null,
        quote: null,
        balance: ledger.balanceAfter,
      });
      const next = await select(mode, 2);
      expect(next.selectionRevision).toBe(3);
      expect(
        (await purchase({ ...input, idempotencyKey: randomUUID() })).status,
      ).toBe(409);
      await editArticle();
      expect(
        await (await http(`/publishing/orders/${order.id}`)).json(),
      ).toEqual(order);
      expect((await purchase(input)).status).toBe(200);
      expect(await prisma.publishingOrder.count()).toBe(1);
      const history = await (await http("/points/changes")).json();
      expect(history.items[0]).toMatchObject({
        publishingOrderId: order.id,
        amount: -input.acceptedTerms.totalPoints,
      });
      for (const privateField of [
        "accountId",
        "actorAccountId",
        "grantedDelta",
        "fundedDelta",
        "idempotencyKey",
        "submissionRequest",
      ]) {
        expect(order).not.toHaveProperty(privateField);
        expect(history.items[0]).not.toHaveProperty(privateField);
      }
    },
  );
  it("serializes concurrent same-key retries and rejects conflicting or different-key duplicate purchases", async () => {
    await grant();
    const input = await select();
    const responses = await Promise.all([
      purchase(input),
      purchase(input),
      purchase({ ...input, idempotencyKey: randomUUID() }),
    ]);
    const successes = responses.filter((r) => r.status === 200);
    // Either key may acquire the account lock first, but only one purchase is allowed.
    expect(successes.length).toBeGreaterThanOrEqual(1);
    expect(await prisma.publishingOrder.count()).toBe(1);
    expect(await points.customerBalance(customerId)).toEqual({
      balance: 1200,
      revision: 2,
    });
    const stored = await prisma.publishingOrder.findFirstOrThrow();
    const original = stored.submissionRequest as unknown as SubmitPurchase;
    expect((await purchase(original)).status).toBe(200);
    expect(
      (
        await purchase({
          ...original,
          acceptedTerms: { ...original.acceptedTerms, totalPoints: 1 },
        })
      ).status,
    ).toBe(409);
  });
  it("rejects shortage, stale articles, quotes and unavailable media without a partial charge", async () => {
    const input = await select();
    expect((await purchase(input)).status).toBe(409);
    await unchanged(0);
    await grant();
    expect(
      (
        await purchase({
          ...input,
          acceptedTerms: { ...input.acceptedTerms, totalPoints: 1 },
        })
      ).status,
    ).toBe(409);
    await unchanged();
    await media.updatePlatform(adminId, platform.id, {
      expectedRevision: platform.revision,
      displayName: "更新后的媒体名称",
      reason: "测试更新",
    });
    expect(await (await purchase(input)).json()).toMatchObject({
      code: "QUOTE_CHANGED",
    });
    await unchanged();
    await editArticle();
    expect(await (await purchase(input)).json()).toMatchObject({
      code: "ARTICLE_CHANGED",
    });
    await unchanged();
  });
  it("does not turn an unavailable or changed precise price into an accepted purchase", async () => {
    await grant();
    const input = await select("PRECISE");
    const updated = await media.updatePlatform(adminId, platform.id, {
      expectedRevision: platform.revision,
      pointPrice: 250,
      reason: "测试调价",
    });
    expect(await (await purchase(input)).json()).toMatchObject({
      code: "QUOTE_CHANGED",
    });
    await unchanged();
    await media.updatePlatform(adminId, platform.id, {
      expectedRevision: updated.revision,
      status: "INACTIVE",
      reason: "测试下架",
    });
    expect(await (await purchase(input)).json()).toMatchObject({
      code: "OFFER_UNAVAILABLE",
    });
    await unchanged();
  });
  it("rolls back a debited wallet if order persistence fails, and safely retries the original key", async () => {
    await grant();
    const input = await select();
    // Test-database fault injection, not a production endpoint or repository bypass.
    await prisma.$executeRawUnsafe(
      "CREATE FUNCTION issue65_fail_order() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'controlled order write failure'; END $$",
    );
    await prisma.$executeRawUnsafe(
      "CREATE TRIGGER issue65_fail_order BEFORE INSERT ON publishing_orders FOR EACH ROW EXECUTE FUNCTION issue65_fail_order()",
    );
    try {
      expect((await purchase(input)).status).toBe(500);
      await unchanged();
    } finally {
      await prisma.$executeRawUnsafe(
        "DROP TRIGGER issue65_fail_order ON publishing_orders",
      );
      await prisma.$executeRawUnsafe("DROP FUNCTION issue65_fail_order()");
    }
    expect((await purchase(input)).status).toBe(200);
  });
  it("holds the article read on the purchasing transaction while an actual edit waits", async () => {
    await grant();
    const input = await select();
    const readers = app.get(PostgresArticlePurchaseReaderFactory),
      bind = readers.bind.bind(readers);
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const read = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const spy = vi.spyOn(readers, "bind").mockImplementation((tx) => {
      const reader = bind(tx);
      return {
        confirmed: async (key) => {
          const article = await reader.confirmed(key);
          entered();
          await gate;
          return article;
        },
      };
    });
    let pendingEdit: ReturnType<typeof editArticle> | undefined;
    const buying = purchase(input);
    try {
      await read;
      pendingEdit = editArticle();
      await vi.waitFor(
        async () => {
          const locks = await prisma.$queryRaw<
            Array<{ count: bigint }>
          >`SELECT COUNT(*) AS count FROM pg_stat_activity WHERE datname=current_database() AND cardinality(pg_blocking_pids(pid))>0`;
          expect(Number(locks[0]!.count)).toBeGreaterThan(0);
        },
        { timeout: 2000 },
      );
      release();
      const response = await buying;
      expect(response.status).toBe(200);
      const order = await response.json();
      await pendingEdit;
      expect(order.title).toBe(context.article.title);
      expect(
        (
          await prisma.coreArticle.findUniqueOrThrow({
            where: { id: context.article.id },
          })
        ).title,
      ).toBe("后来编辑的标题");
    } finally {
      release();
      spy.mockRestore();
      await Promise.allSettled([buying, ...(pendingEdit ? [pendingEdit] : [])]);
    }
  });
  it("isolates orders by customer, paginates deterministically, and rejects identity or origin overrides", async () => {
    await grant();
    const input = await select();
    for (const extra of [
      { accountId: adminId },
      { fundedDelta: 0 },
      { status: "PENDING_HANDLING" },
    ])
      expect((await purchase({ ...input, ...extra })).status).toBe(400);
    expect((await purchase(input, otherCookie)).status).toBe(409);
    expect((await purchase(input, adminCookie)).status).toBe(403);
    const first = await (await purchase(input)).json();
    const second = await (await purchase(await select("PRECISE", 2))).json();
    const page = await (await http("/publishing/orders?limit=1")).json();
    expect(page.items.map((i: { id: string }) => i.id)).toEqual([second.id]);
    expect(page.items[0]).not.toHaveProperty("bodyMarkdown");
    const older = await (
      await http(
        `/publishing/orders?limit=1&beforeNumber=${page.nextBeforeNumber}`,
      )
    ).json();
    expect(older.items.map((i: { id: string }) => i.id)).toEqual([first.id]);
    expect(older.nextBeforeNumber).toBeNull();
    expect(
      await (await http("/publishing/orders", otherCookie)).json(),
    ).toEqual({ items: [], nextBeforeNumber: null });
    expect(
      (await http(`/publishing/orders/${first.id}`, otherCookie)).status,
    ).toBe(404);
    expect((await http("/publishing/orders", adminCookie)).status).toBe(403);
    expect((await http("/publishing/orders?accountId=x")).status).toBe(400);
  });
  it("locks precise media prices on the same purchase connection and preserves the paid identity", async () => {
    await grant();
    const input = await select("PRECISE");
    const readers = app.get(PostgresMediaPurchaseReaderFactory),
      bind = readers.bind.bind(readers);
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const read = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const spy = vi.spyOn(readers, "bind").mockImplementation((tx) => {
      const reader = bind(tx);
      return {
        platforms: async (ids) => {
          const rows = await reader.platforms(ids);
          entered();
          await gate;
          return rows;
        },
      };
    });
    const buying = purchase(input);
    let editing: ReturnType<MediaSupplyService["updatePlatform"]> | undefined;
    try {
      await read;
      editing = media.updatePlatform(adminId, platform.id, {
        expectedRevision: platform.revision,
        pointPrice: 275,
        reason: "并发调价",
      });
      await vi.waitFor(
        async () => {
          const locks = await prisma.$queryRaw<
            Array<{ count: bigint }>
          >`SELECT COUNT(*) AS count FROM pg_stat_activity WHERE datname=current_database() AND cardinality(pg_blocking_pids(pid))>0`;
          expect(Number(locks[0]!.count)).toBeGreaterThan(0);
        },
        { timeout: 2000 },
      );
      release();
      const response = await buying;
      expect(response.status).toBe(200);
      const order = await response.json(),
        changed = await editing;
      expect(order.agreement.lines[0].unitPoints).toBe(200);
      expect(changed.pointPrice).toBe(275);
      const inactive = await media.updatePlatform(adminId, platform.id, {
        expectedRevision: changed.revision,
        status: "INACTIVE",
        reason: "停用待删",
      });
      await expect(
        media.deletePlatform(adminId, platform.id, {
          expectedRevision: inactive.revision,
          reason: "尝试删除已购媒体",
        }),
      ).rejects.toThrow("已购订单");
      await expect(
        prisma.mediaPlatform.delete({ where: { id: platform.id } }),
      ).rejects.toThrow();
      expect(
        await (await http(`/publishing/orders/${order.id}`)).json(),
      ).toEqual(order);
    } finally {
      release();
      spy.mockRestore();
      await Promise.allSettled([buying, ...(editing ? [editing] : [])]);
    }
  });
  it("serializes random package repricing with the frozen agreement", async () => {
    await grant();
    const input = await select();
    const readers = app.get(PostgresMediaPurchaseReaderFactory),
      bind = readers.bind.bind(readers);
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const read = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const spy = vi.spyOn(readers, "bind").mockImplementation((tx) => {
      const reader = bind(tx);
      return {
        platforms: async (ids) => {
          const rows = await reader.platforms(ids);
          entered();
          await gate;
          return rows;
        },
      };
    });
    const buying = purchase(input);
    let editing: ReturnType<PublishingPackageService["update"]> | undefined;
    try {
      await read;
      editing = packages.update(adminId, offer.id, {
        expectedRevision: offer.revision,
        name: offer.name,
        quantity: offer.quantity,
        pointPrice: 900,
        status: offer.status,
        platformIds: offer.platformIds,
        reason: "并发套餐调价",
      });
      await vi.waitFor(
        async () => {
          const locks = await prisma.$queryRaw<
            Array<{ count: bigint }>
          >`SELECT COUNT(*) AS count FROM pg_stat_activity WHERE datname=current_database() AND cardinality(pg_blocking_pids(pid))>0`;
          expect(Number(locks[0]!.count)).toBeGreaterThan(0);
        },
        { timeout: 2000 },
      );
      release();
      const response = await buying;
      expect(response.status).toBe(200);
      expect((await response.json()).agreement.totalPoints).toBe(800);
      expect((await editing).pointPrice).toBe(900);
      expect((await purchase(input)).status).toBe(200);
    } finally {
      release();
      spy.mockRestore();
      await Promise.allSettled([buying, ...(editing ? [editing] : [])]);
    }
  });
  it("uses both point origins internally without exposing a funded-credit command", async () => {
    await grant(100);
    // Controlled future-funded balance fixture only, never an exposed credit path.
    await prisma.pointAccount.update({
      where: { accountId: customerId },
      data: { fundedBalance: 500 },
    });
    const input = await select("PRECISE"),
      response = await purchase(input);
    expect(response.status).toBe(200);
    const order = await response.json();
    expect(
      await prisma.pointChange.findUniqueOrThrow({
        where: { publishingOrderId: order.id },
      }),
    ).toMatchObject({
      grantedDelta: -100,
      fundedDelta: -300,
      balanceAfter: 200,
    });
    expect(await points.customerBalance(customerId)).toEqual({
      balance: 200,
      revision: 2,
    });
  });
  it("serializes two Brands purchasing against one shared balance without overdrawing", async () => {
    await grant(600);
    const first = await select("PRECISE");
    context = await publishingContextFixture(
      app,
      prisma,
      customerId,
      "第二个品牌",
    );
    const second = await select("PRECISE");
    const outcomes = await Promise.all([purchase(first), purchase(second)]);
    expect(outcomes.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await prisma.publishingOrder.count()).toBe(1);
    expect(
      await prisma.pointChange.count({ where: { kind: "PUBLISHING_ORDER" } }),
    ).toBe(1);
    expect(await points.customerBalance(customerId)).toEqual({
      balance: 200,
      revision: 2,
    });
    const choices = await prisma.publishingSelection.findMany();
    expect(choices.filter((row) => row.intent !== null)).toHaveLength(1);
  });
  it("does not reuse an admin adjustment key as a purchase key", async () => {
    const key = randomUUID();
    await grant(2000, key);
    const input = await select();
    expect(
      await (await purchase({ ...input, idempotencyKey: key })).json(),
    ).toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await unchanged();
  });
});
describe("points spending policy", () => {
  it("spends granted first, retains funded origin, and checks bounds", () => {
    expect(
      spendPoints(
        { grantedBalance: 100, fundedBalance: 500, revision: 2 },
        300,
      ),
    ).toEqual({
      grantedDelta: -100,
      fundedDelta: -200,
      balance: { grantedBalance: 0, fundedBalance: 300, revision: 3 },
    });
    for (const total of [0, -1, 1.5, MAX_POINTS + 1, 601])
      expect(() =>
        spendPoints(
          { grantedBalance: 100, fundedBalance: 500, revision: 2 },
          total,
        ),
      ).toThrow();
    expect(() =>
      spendPoints(
        { grantedBalance: 100, fundedBalance: 0, revision: MAX_POINTS },
        1,
      ),
    ).toThrow();
  });
});
