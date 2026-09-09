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
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import { PostgresOrderReturnAccess } from "../src/publishing-commerce/infrastructure/postgres-order-return-access.js";
import { PostgresDeliveryResolutionRepository } from "../src/publication-delivery/infrastructure/postgres-delivery-resolution.repository.js";
import { commercialTerms } from "../src/publishing-commerce/domain/publishing-order.js";
import { RechargeCoreService } from "../src/recharge/application/recharge-core.service.js";
import { PostgresRechargeRepository } from "../src/recharge/infrastructure/postgres-recharge.repository.js";
import { clearCustomerData } from "./customer-data.js";
import { publishingContextFixture } from "./publishing-context.fixture.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
describe("manual delivery resolution with real HTTP and atomic PostgreSQL owners", () => {
  const prisma = new PrismaService(config.databaseUrl);
  let app: INestApplication, origin: string;
  let ids: string[], cookies: string[], orderId: string, platformId: string;
  beforeAll(async () => {
    await prisma.$connect();
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearCustomerData(prisma);
    const roles = [
      "ADMINISTRATOR",
      "TERMINAL_CUSTOMER",
      "OPERATIONS",
      "OPERATIONS",
      "ADMINISTRATOR",
    ] as const;
    const accounts = await Promise.all(
      roles.map((role, index) =>
        prisma.account.create({
          data: { role, mobile: `+861390009730${index}` },
        }),
      ),
    );
    ids = accounts.map((a) => a.id);
    cookies = await Promise.all(
      accounts.map(
        async (a) =>
          (await loginWithDevelopmentChallenge(origin, a.mobile)).cookie,
      ),
    );
    const context = await publishingContextFixture(app, prisma, ids[1]!);
    const media = await app.get(MediaSupplyService).createPlatform(ids[0]!, {
      displayName: "原购买媒体C",
      categories: ["PORTAL_MEDIA"],
      status: "ACTIVE",
      pointPrice: 100,
    });
    platformId = media.id;
    await app.get(PointAccountService).adjust(ids[1]!, ids[0]!, {
      amount: 100,
      reason: "测试赠送",
      idempotencyKey: randomUUID(),
    });
    // Synthetic pre-existing funded balance; this is not recharge/provider acceptance evidence.
    await prisma.pointAccount.update({
      where: { accountId: ids[1]! },
      data: { fundedBalance: 200 },
    });
    expect(
      (
        await http(
          `/publishing/brands/${context.brand.id}/selection`,
          1,
          "PUT",
          {
            expectedRevision: 0,
            articleId: context.article.id,
            articleRevision: context.article.revision,
            intent: { mode: "PRECISE", lines: [{ platformId, quantity: 3 }] },
          },
        )
      ).status,
    ).toBe(200);
    const ws = await (await http("/publishing/workspace", 1)).json();
    const bought = await http("/publishing/orders", 1, "POST", {
      idempotencyKey: randomUUID(),
      brandId: context.brand.id,
      articleId: context.article.id,
      articleRevision: context.article.revision,
      selectionRevision: ws.selection.revision,
      acceptedTerms: commercialTerms(ws.quote),
    });
    expect(bought.status).toBe(200);
    orderId = (await bought.json()).id;
    expect(
      (
        await action("claim", 2, {
          expectedRevision: 1,
          idempotencyKey: randomUUID(),
        })
      ).status,
    ).toBe(200);
  });
  function http(path: string, actor: number, method = "GET", body?: unknown) {
    return fetch(origin + path, {
      method,
      headers: { ...browserMutationHeaders(), cookie: cookies[actor]! },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  function action(path: string, actor: number, body: object) {
    return http(`/delivery/orders/${orderId}/${path}`, actor, "POST", body);
  }
  const current = () =>
    prisma.publicationDelivery.findUniqueOrThrow({ where: { orderId } });
  async function agree(
    points: number,
    mode: "CONTINUE" | "TERMINATE" = "TERMINATE",
    actor = 2,
  ) {
    const request = {
      expectedRevision: (await current()).revision,
      idempotencyKey: randomUUID(),
      mode,
      points,
      reason: "内部协商原因不应泄露",
    };
    return { request, response: await action("resolution", actor, request) };
  }
  async function publish(
    slot: number,
    target = platformId,
    correction = false,
  ) {
    const d = await current();
    const item = await prisma.publicationWorkItem.findUnique({
      where: { orderId_slot: { orderId, slot } },
    });
    return action(`work/${slot}`, 2, {
      action: correction ? "CORRECT_RESULT" : "RECORD_RESULT",
      expectedRevision: d.revision,
      expectedItemRevision: item?.revision ?? 0,
      idempotencyKey: randomUUID(),
      platformId: target,
      result: {
        title: correction ? "纠正标题" : `发布标题${slot}`,
        url: `https://example.com/${orderId}/${slot}`,
        publishedAt: new Date(Date.now() - 1000).toISOString(),
        internalChannel: "内部供应商",
        internalNote: "内部备注",
      },
      ...(correction ? { reason: "纠正标题" } : {}),
    });
  }
  const settlement = (revision = 1) => ({
    expectedAgreementRevision: revision,
    idempotencyKey: randomUUID(),
  });
  const returned = () =>
    prisma.pointChange.findMany({ where: { kind: "ORDER_RETURN" } });

  it("zero closes 2/3 with retained history, no ledger, safe customer results, closed history and replay", async () => {
    expect((await publish(1)).status).toBe(200);
    expect((await publish(2)).status).toBe(200);
    const { request, response } = await agree(0);
    expect(response.status).toBe(200);
    const receipt = await response.json();
    expect((await current()).status).toBe("CLOSED");
    expect(await returned()).toHaveLength(0);
    await expect(
      prisma.publicationDelivery.update({
        where: { orderId },
        data: { status: "PUBLISHING", stoppedAt: null, closedAt: null },
      }),
    ).rejects.toThrow();
    expect(await (await action("resolution", 2, request)).json()).toEqual(
      receipt,
    );
    expect((await action("resolution", 3, request)).status).toBe(409);
    expect(
      (await action("resolution", 2, { ...request, points: 1 })).status,
    ).toBe(409);
    expect((await publish(3)).status).toBe(409);
    expect((await publish(1, platformId, true)).status).toBe(200);
    expect((await current()).status).toBe("CLOSED");
    expect((await current()).publishedQuantity).toBe(2);
    const result = await (
      await http(`/publishing/orders/${orderId}/results`, 1)
    ).json();
    expect(result).toMatchObject({
      status: "CLOSED",
      publishedQuantity: 2,
      quantity: 3,
      delayed: false,
      resolution: { agreedPoints: 0, returnedPoints: null, stopped: true },
    });
    expect(result.items[2].state).toBe("STOPPED");
    expect(JSON.stringify(result)).not.toContain("内部");
    const active = await (
      await http("/delivery/orders?scope=MINE&state=ACTIVE", 2)
    ).json();
    expect(active.items).toHaveLength(0);
    const closed = await (
      await http("/delivery/orders?scope=MINE&state=CLOSED", 2)
    ).json();
    expect(closed.items).toHaveLength(1);
    const queue = await (
      await http("/delivery/orders?scope=ALL&state=PENDING_RETURN", 0)
    ).json();
    expect(queue.items).toHaveLength(0);
    expect(
      (
        await action("reassign", 0, {
          expectedRevision: (await current()).revision,
          idempotencyKey: randomUUID(),
          assigneeAccountId: ids[3],
          reason: "关闭后纠正责任",
        })
      ).status,
    ).toBe(200);
    expect((await current()).status).toBe("CLOSED");
    expect(await (await action("resolution", 2, request)).json()).toEqual(
      receipt,
    );
  });

  it("Completed compensation remains visible and credits once, including an inactive original customer", async () => {
    expect((await agree(100, "CONTINUE")).response.status).toBe(200);
    const waiting = await (
      await http("/delivery/orders?scope=ALL&state=PENDING_RETURN", 0)
    ).json();
    expect(waiting.items[0].resolution.eligible).toBe(false);
    expect((await action("settlement", 0, settlement())).status).toBe(409);
    for (let slot = 1; slot <= 3; slot++)
      expect((await publish(slot)).status).toBe(200);
    const ready = await (
      await http("/delivery/orders?scope=ALL&state=PENDING_RETURN", 0)
    ).json();
    expect(ready.items[0].status).toBe("COMPLETED");
    expect(ready.items[0].resolution.eligible).toBe(true);
    await prisma.account.update({
      where: { id: ids[1]! },
      data: { status: "INACTIVE" },
    });
    const request = settlement();
    const response = await action("settlement", 0, request);
    expect(response.status).toBe(200);
    const receipt = await response.json();
    expect((await current()).status).toBe("COMPLETED");
    expect(await (await action("settlement", 0, request)).json()).toEqual(
      receipt,
    );
    expect((await action("settlement", 0, settlement())).status).toBe(409);
    expect((await action("settlement", 4, request)).status).toBe(409);
    expect(await returned()).toMatchObject([
      { grantedDelta: 33, fundedDelta: 67, actorAccountId: ids[0] },
    ]);
    const ledger = (await returned())[0]!;
    await expect(
      prisma.pointChange.update({
        where: { id: ledger.id },
        data: { returnRequest: {} },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.pointChange.delete({ where: { id: ledger.id } }),
    ).rejects.toThrow();
    expect(
      await prisma.pointAccount.findUniqueOrThrow({
        where: { accountId: ids[1]! },
      }),
    ).toMatchObject({ grantedBalance: 33, fundedBalance: 67 });
    expect(
      (
        await (
          await http("/delivery/orders?scope=ALL&state=PENDING_RETURN", 0)
        ).json()
      ).items,
    ).toHaveLength(0);
  });

  it("rolls back balance, ledger and terminal/audit writes after either owner fails", async () => {
    expect((await agree(100)).response.status).toBe(200);
    const baseline = await current();
    const wallet = await prisma.pointAccount.findUniqueOrThrow({
      where: { accountId: ids[1]! },
    });
    const commerce = app.get(PostgresOrderReturnAccess),
      originalBind = commerce.bind.bind(commerce);
    const first = vi
      .spyOn(commerce, "bind")
      .mockImplementation(async (...args) => {
        const bound = await originalBind(...args);
        return {
          ...bound,
          credit: async (...creditArgs) => {
            await bound.credit(...creditArgs);
            throw new Error("injected after ledger");
          },
        };
      });
    const request = settlement();
    expect((await action("settlement", 0, request)).status).toBe(500);
    first.mockRestore();
    expect(await current()).toEqual(baseline);
    expect(await returned()).toHaveLength(0);
    expect(
      await prisma.pointAccount.findUniqueOrThrow({
        where: { accountId: ids[1]! },
      }),
    ).toEqual(wallet);
    const delivery = app.get(PostgresDeliveryResolutionRepository),
      originalPrepare = delivery.prepareSettlement.bind(delivery);
    const second = vi
      .spyOn(delivery, "prepareSettlement")
      .mockImplementation(async (...args) => {
        const bound = await originalPrepare(...args);
        return {
          ...bound,
          complete: async (...completeArgs) => {
            await bound.complete(...completeArgs);
            throw new Error("injected after delivery audit");
          },
        };
      });
    expect((await action("settlement", 0, request)).status).toBe(500);
    second.mockRestore();
    expect(await current()).toEqual(baseline);
    expect(await returned()).toHaveLength(0);
    expect((await action("settlement", 0, request)).status).toBe(200);
    expect((await current()).status).toBe("CLOSED");
  });

  it("serializes administrator settlement against an operator changing the agreement to zero", async () => {
    expect((await agree(100)).response.status).toBe(200);
    const before = await current();
    const delivery = app.get(PostgresDeliveryResolutionRepository),
      prepare = delivery.prepareSettlement.bind(delivery);
    let signal!: () => void, release!: () => void;
    const locked = new Promise<void>((r) => {
        signal = r;
      }),
      proceed = new Promise<void>((r) => {
        release = r;
      });
    const spy = vi
      .spyOn(delivery, "prepareSettlement")
      .mockImplementation(async (...args) => {
        const bound = await prepare(...args);
        signal();
        await proceed;
        return bound;
      });
    const paying = action("settlement", 0, settlement());
    await locked;
    const closing = action("resolution", 2, {
      expectedRevision: before.revision,
      idempotencyKey: randomUUID(),
      mode: "TERMINATE",
      points: 0,
      reason: "新协商改零",
    });
    release();
    const [paid, closed] = await Promise.all([paying, closing]);
    spy.mockRestore();
    expect(paid.status).toBe(200);
    expect(closed.status).toBe(409);
    expect(await returned()).toHaveLength(1);
    expect((await current()).agreedReturnPoints).toBe(100);
  });

  it("an explicit zero revision wins before stale administrator settlement without erasing history", async () => {
    expect((await agree(100)).response.status).toBe(200);
    const old = settlement();
    expect((await agree(0)).response.status).toBe(200);
    expect((await action("settlement", 0, old)).status).toBe(409);
    expect(await returned()).toHaveLength(0);
    const history = await prisma.publicationDeliveryAudit.findMany({
      where: { orderId },
      orderBy: { revision: "desc" },
    });
    expect(history[0]?.beforeResolution).toMatchObject({
      agreedReturnPoints: 100,
    });
    expect(history[0]?.afterResolution).toMatchObject({
      agreedReturnPoints: 0,
      status: "CLOSED",
    });
  });

  it("precise replacement keeps the original purchase and recovers an old successful target request", async () => {
    const supply = app.get(MediaSupplyService);
    const d = await supply.createPlatform(ids[0]!, {
      displayName: "协商媒体D",
      categories: ["PORTAL_MEDIA"],
      status: "ACTIVE",
      pointPrice: 80,
    });
    const e = await supply.createPlatform(ids[0]!, {
      displayName: "再次协商媒体E",
      categories: ["PORTAL_MEDIA"],
      status: "ACTIVE",
      pointPrice: 70,
    });
    const request = {
      action: "REPLACE_TARGET",
      platformId: d.id,
      expectedRevision: (await current()).revision,
      expectedItemRevision: 0,
      idempotencyKey: randomUUID(),
      reason: "协商C换D",
    };
    const response = await action("work/1", 2, request);
    expect(response.status).toBe(200);
    const receipt = await response.json();
    const item = await prisma.publicationWorkItem.findUniqueOrThrow({
      where: { orderId_slot: { orderId, slot: 1 } },
    });
    expect(
      (
        await action("work/1", 2, {
          ...request,
          platformId: e.id,
          expectedRevision: (await current()).revision,
          expectedItemRevision: item.revision,
          idempotencyKey: randomUUID(),
          reason: "协商D换E",
        })
      ).status,
    ).toBe(200);
    expect(await (await action("work/1", 2, request)).json()).toEqual(receipt);
    expect((await current()).publishedQuantity).toBe(0);
    expect((await publish(1, d.id)).status).toBe(400);
    expect((await publish(1, e.id)).status).toBe(200);
    const customer = await (
      await http(`/publishing/orders/${orderId}/results`, 1)
    ).json();
    expect(customer.items[0]).toMatchObject({
      purchasedTargetName: "原购买媒体C",
      targetName: "再次协商媒体E",
    });
    expect(
      (
        await prisma.publishingOrder.findUniqueOrThrow({
          where: { id: orderId },
        })
      ).agreement,
    ).toMatchObject({ lines: [{ platformId }] });
    expect(
      (
        await action("work/1", 2, {
          ...request,
          expectedRevision: (await current()).revision,
          expectedItemRevision: 3,
          idempotencyKey: randomUUID(),
        })
      ).status,
    ).toBe(409);
  });

  it("rolls back zero closure if its audit cannot be saved", async () => {
    const baseline = await current();
    await prisma.$executeRawUnsafe(
      "CREATE FUNCTION issue73_reject_zero_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.request->>'action'='SAVE_RESOLUTION' THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$",
    );
    await prisma.$executeRawUnsafe(
      "CREATE TRIGGER issue73_reject_zero_audit BEFORE INSERT ON publication_delivery_audits FOR EACH ROW EXECUTE FUNCTION issue73_reject_zero_audit()",
    );
    try {
      expect((await agree(0)).response.status).toBe(500);
      expect(await current()).toEqual(baseline);
      expect(await returned()).toHaveLength(0);
    } finally {
      await prisma.$executeRawUnsafe(
        "DROP TRIGGER issue73_reject_zero_audit ON publication_delivery_audits",
      );
      await prisma.$executeRawUnsafe(
        "DROP FUNCTION issue73_reject_zero_audit()",
      );
    }
  });

  it("requires an actual Delivery settlement even if the internal credit port is misused", async () => {
    await prisma.publicationDeliveryAudit.deleteMany({ where: { orderId } });
    await prisma.publicationDelivery.delete({ where: { orderId } });
    await expect(
      prisma.$transaction(async (tx) => {
        const port = await app.get(PostgresOrderReturnAccess).bind(tx, orderId);
        await port.credit(ids[0]!, settlement(), 100);
      }),
    ).rejects.toThrow();
    expect(await returned()).toHaveLength(0);
    expect(
      await prisma.pointAccount.findUniqueOrThrow({
        where: { accountId: ids[1]! },
      }),
    ).toMatchObject({ grantedBalance: 0, fundedBalance: 0 });
  });

  it("uses the locked C1 reservation snapshot and can recover after unsent reservation release", async () => {
    expect((await agree(100)).response.status).toBe(200);
    await prisma.pointAccount.update({
      where: { accountId: ids[1]! },
      data: { revision: 2_147_483_646 },
    });
    const core = new RechargeCoreService(
      new PostgresRechargeRepository(prisma),
      {
        merchantId: "1234567890",
        appId: "wxIssue73",
        minAmountYuan: 1,
        maxAmountYuan: 1,
        maxActiveOrders: 1,
        paymentWindowSeconds: 600,
      },
    );
    const recharge = await core.create(ids[1]!, {
      amountYuan: 1,
      method: "WECHAT_NATIVE",
      idempotencyKey: randomUUID(),
    });
    const request = settlement();
    expect((await action("settlement", 0, request)).status).toBe(409);
    expect(await returned()).toHaveLength(0);
    expect((await current()).status).toBe("EXCEPTION_HANDLING");
    await core.cancelUnsent(ids[1]!, recharge.id);
    expect((await action("settlement", 0, request)).status).toBe(200);
  });
});
