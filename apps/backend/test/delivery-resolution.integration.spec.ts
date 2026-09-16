import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
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
import { Prisma } from "../src/generated/prisma/client.js";
import { PostgresOperationsIdentityReader } from "../src/identity/infrastructure/postgres-operations-identity-reader.js";
import { PostgresDeliveryAssignmentRepository } from "../src/publication-delivery/infrastructure/postgres-delivery-assignment.repository.js";
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import { PostgresOrderReturnAccess } from "../src/publishing-commerce/infrastructure/postgres-order-return-access.js";
import { FinalOrderSettlementService } from "../src/application/final-order-settlement.service.js";
import { OrderSettlementAccess } from "../src/publishing-commerce/infrastructure/order-settlement-access.js";
import { DeliverySupportAccess } from "../src/publication-delivery/infrastructure/delivery-support-access.js";
import { OrderSettlementRuntime } from "../src/application/order-settlement.runtime.js";
import { commercialTerms } from "../src/publishing-commerce/domain/publishing-order.js";
import { RechargeCoreService } from "../src/recharge/application/recharge-core.service.js";
import { PostgresRechargeRepository } from "../src/recharge/infrastructure/postgres-recharge.repository.js";
import { clearCustomerData } from "./customer-data.js";
import { publishingContextFixture } from "./publishing-context.fixture.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
const processTarget = new URL(config.databaseUrl);
const processPermitted =
  processTarget.hostname === "127.0.0.1" &&
  processTarget.port === "55432" &&
  (processTarget.pathname === "/geoeval_issue100" ||
    (process.env.CI === "true" && processTarget.pathname === "/geoeval"));
describe("unified order handling and final system settlement with real PostgreSQL owners", () => {
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
      headers: {
        ...browserMutationHeaders(),
        cookie: cookies[actor]!,
        "x-geoeval-account": ids[actor]!,
      },
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
      reason: "客户可见的协商处理",
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

  it("keeps detail authority and private agreement history in one snapshot across reassignment", async () => {
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    let paused = false;
    // Only pause a real SELECT; transaction isolation and concurrent writes still
    // execute against PostgreSQL. The direct-read path also makes the old leak reproducible.
    const pauseRead = (db: Prisma.TransactionClient) =>
      new Proxy(db, {
        get(target, property) {
          if (property !== "publicationDelivery")
            return Reflect.get(target, property);
          return {
            ...target.publicationDelivery,
            findUnique: async (
              args: Prisma.PublicationDeliveryFindUniqueArgs,
            ) => {
              const row = await target.publicationDelivery.findUnique(args);
              if (!paused) {
                paused = true;
                entered.resolve();
                await release.promise;
              }
              return row;
            },
          };
        },
      });
    const readClient = new Proxy(prisma, {
      get(target, property) {
        if (property === "$transaction")
          return (
            run: (tx: Prisma.TransactionClient) => Promise<unknown>,
            options?: { isolationLevel: Prisma.TransactionIsolationLevel },
          ) => target.$transaction((tx) => run(pauseRead(tx)), options);
        return Reflect.get(pauseRead(target), property);
      },
    });
    const repository = new PostgresDeliveryAssignmentRepository(
      readClient,
      app.get(PostgresOperationsIdentityReader),
    );
    const actor = {
      accountId: ids[2]!,
      role: "OPERATIONS" as const,
      sessionId: randomUUID(),
    };
    const originalRevision = (await current()).revision;
    const pending = repository.detail(actor, orderId);
    try {
      await Promise.race([
        entered.promise,
        pending.then(() => {
          throw new Error("Detail read did not pause");
        }),
      ]);
      expect(
        (
          await action("reassign", 0, {
            expectedRevision: originalRevision,
            idempotencyKey: randomUUID(),
            assigneeAccountId: ids[3],
            reason: "读取期间改派",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await action("resolution", 3, {
            expectedRevision: (await current()).revision,
            idempotencyKey: randomUUID(),
            mode: "CONTINUE",
            points: 100,
            reason: "新责任人私密协商",
          })
        ).status,
      ).toBe(200);
      release.resolve();
      const snapshot = await pending;
      expect(snapshot.revision).toBe(originalRevision);
      expect(
        snapshot.history.every((entry) => entry.revision <= originalRevision),
      ).toBe(true);
      expect(JSON.stringify(snapshot)).not.toContain("新责任人私密协商");
      expect((await http(`/delivery/orders/${orderId}`, 2)).status).toBe(404);
      // A stale administrator claim cannot override Identity's current operations role.
      await expect(
        repository.detail({ ...actor, role: "ADMINISTRATOR" }, orderId),
      ).rejects.toThrow("未找到");
      const nextActor = { ...actor, accountId: ids[3]! };
      await prisma.account.update({
        where: { id: ids[3] },
        data: { status: "INACTIVE" },
      });
      await expect(repository.detail(nextActor, orderId)).rejects.toThrow(
        "当前账号无权",
      );
    } finally {
      release.resolve();
      await pending.catch(() => {});
    }
  });

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
    expect((await action("resolution", 2, request)).status).toBe(403);
  });

  async function mature(points = 100, open = false) {
    expect((await agree(points, "CONTINUE")).response.status).toBe(200);
    const ticket = await prisma.supportTicket.findFirstOrThrow({
      where: { publishingOrderId: orderId },
    });
    if (!open)
      expect(
        (
          await http(`/support/tickets/${ticket.id}/actions`, 2, "POST", {
            action: "RESOLVE",
            expectedRevision: ticket.revision,
            requestId: randomUUID(),
            message: "协商已确认",
          })
        ).status,
      ).toBe(201);
    const ended = new Date(Date.now() - 73 * 3600000);
    await prisma.publicationDelivery.update({
      where: { orderId },
      data: {
        status: "COMPLETED",
        publishedQuantity: 3,
        startedAt: new Date(ended.getTime() - 1000),
        completedAt: ended,
      },
    });
    return ticket;
  }
  const settle = () => app.get(FinalOrderSettlementService).settle(orderId);
  it("waits for the 72 hour window and retires all manual money actions", async () => {
    expect((await agree(100)).response.status).toBe(200);
    expect((await current()).status).toBe("CLOSED");
    expect(await settle()).toEqual({ kind: "waiting" });
    expect((await action("settlement", 0, settlement())).status).toBe(404);
    expect(await returned()).toHaveLength(0);
  });
  it("credits once for an inactive original customer and preserves original sources and immutable ledger", async () => {
    await mature();
    await prisma.account.update({
      where: { id: ids[1] },
      data: { status: "INACTIVE" },
    });
    const results = await Promise.all([settle(), settle()]);
    expect(results[0]).toEqual(results[1]);
    expect(results[0].kind).toBe("settled");
    expect(await returned()).toMatchObject([
      {
        grantedDelta: 33,
        fundedDelta: 67,
        actorKind: "SYSTEM",
        actorAccountId: null,
        idempotencyKey: null,
      },
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
    expect(await prisma.orderSettlement.count()).toBe(1);
    expect((await current()).status).toBe("COMPLETED");
  });
  it("blocks on an admitted open issue after deadline, atomically confirms revised total and then settles", async () => {
    const ticket = await mature(100, true);
    expect(await settle()).toEqual({ kind: "waiting" });
    const response = await action("resolution", 2, {
      expectedRevision: (await current()).revision,
      idempotencyKey: randomUUID(),
      mode: "CONTINUE",
      points: 150,
      reason: "最终约定总额为150积分",
      ticketId: ticket.id,
      expectedTicketRevision: ticket.revision,
      resolveTicket: true,
    });
    expect(response.status).toBe(200);
    expect(await returned()).toHaveLength(0);
    expect(await settle()).toMatchObject({
      kind: "settled",
      receipt: { points: 150, agreementRevision: 2 },
    });
    expect(
      await prisma.supportTicket.findUniqueOrThrow({
        where: { id: ticket.id },
      }),
    ).toMatchObject({ status: "RESOLVED" });
  });
  it("stale ticket confirmation rolls back the agreement and preserves newer customer feedback", async () => {
    const ticket = await mature(100, true);
    const before = await current();
    expect(
      (
        await http(`/support/tickets/${ticket.id}/actions`, 1, "POST", {
          action: "REPLY",
          expectedRevision: ticket.revision,
          requestId: randomUUID(),
          message: "还有未解决的问题",
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await action("resolution", 2, {
          expectedRevision: before.revision,
          idempotencyKey: randomUUID(),
          mode: "CONTINUE",
          points: 0,
          reason: "说明",
          ticketId: ticket.id,
          expectedTicketRevision: ticket.revision,
          resolveTicket: true,
        })
      ).status,
    ).toBe(409);
    expect(await current()).toEqual(before);
    expect(await settle()).toEqual({ kind: "waiting" });
  });
  it("records zero finality without a zero ledger and prevents late agreement changes", async () => {
    await mature(0);
    expect(await settle()).toMatchObject({
      kind: "settled",
      receipt: { points: 0, ledgerId: null },
    });
    expect(await returned()).toHaveLength(0);
    expect((await agree(100, "CONTINUE")).response.status).toBe(409);
    await expect(
      prisma.orderSettlement.update({
        where: { orderId },
        data: { points: 1 },
      }),
    ).rejects.toThrow();
  });
  it("rolls back wallet, ledger, delivery and receipt if credit or final receipt persistence fails", async () => {
    await mature();
    const baseline = await current();
    const wallet = await prisma.pointAccount.findUniqueOrThrow({
      where: { accountId: ids[1]! },
    });
    const commerce = app.get(PostgresOrderReturnAccess),
      bind = commerce.bind.bind(commerce);
    const first = vi
      .spyOn(commerce, "bind")
      .mockImplementation(async (...args) => {
        const bound = await bind(...args);
        return {
          ...bound,
          credit: async (...creditArgs) => {
            await bound.credit(...creditArgs);
            throw new Error("injected after ledger");
          },
        };
      });
    await expect(settle()).rejects.toThrow("injected after ledger");
    first.mockRestore();
    expect(await current()).toEqual(baseline);
    expect(await returned()).toHaveLength(0);
    expect(
      await prisma.pointAccount.findUniqueOrThrow({
        where: { accountId: ids[1]! },
      }),
    ).toEqual(wallet);
    const receipts = app.get(OrderSettlementAccess),
      record = receipts.record.bind(receipts);
    const second = vi
      .spyOn(receipts, "record")
      .mockImplementation(async (...args) => {
        await record(...args);
        throw new Error("injected after receipt");
      });
    await expect(settle()).rejects.toThrow("injected after receipt");
    second.mockRestore();
    expect(await current()).toEqual(baseline);
    expect(await returned()).toHaveLength(0);
    expect(await prisma.orderSettlement.count()).toBe(0);
    expect(
      await prisma.pointAccount.findUniqueOrThrow({
        where: { accountId: ids[1]! },
      }),
    ).toEqual(wallet);
    expect(await settle()).toMatchObject({ kind: "settled" });
  });
  it("serializes finality against a stale agreement writer", async () => {
    await mature();
    const before = await current();
    const access = app.get(DeliverySupportAccess),
      lock = access.lock.bind(access);
    const entered = Promise.withResolvers<void>(),
      release = Promise.withResolvers<void>();
    const spy = vi.spyOn(access, "lock").mockImplementation(async (...args) => {
      const locked = await lock(...args);
      entered.resolve();
      await release.promise;
      return locked;
    });
    const pending = settle();
    await entered.promise;
    const changing = agree(0, "CONTINUE");
    release.resolve();
    try {
      expect(await pending).toMatchObject({ kind: "settled" });
      expect((await changing).response.status).toBe(409);
    } finally {
      release.resolve();
      spy.mockRestore();
    }
    expect((await current()).agreementRevision).toBe(before.agreementRevision);
    expect(await returned()).toHaveLength(1);
  });
  it("a restarted runtime rediscovers a failed eligible order from persisted facts", async () => {
    await mature();
    const service = app.get(FinalOrderSettlementService);
    const fail = vi
      .spyOn(service, "settle")
      .mockRejectedValueOnce(new Error("temporary failure"));
    const first = new OrderSettlementRuntime(service, false);
    await first.batch();
    await first.onApplicationShutdown();
    expect(await returned()).toHaveLength(0);
    fail.mockRestore();
    const restarted = new OrderSettlementRuntime(service, false);
    await restarted.batch();
    await restarted.onApplicationShutdown();
    expect(await returned()).toHaveLength(1);
    expect(await prisma.orderSettlement.count()).toBe(1);
  });

  it.skipIf(!processPermitted)(
    "recovers after a real worker process dies before commit and never repeats a committed return",
    async () => {
      await mature();
      async function start(hold = false) {
        const child = spawn(
          process.execPath,
          ["--import", "tsx", "test/fixtures/order-settlement-process.ts"],
          {
            cwd: process.cwd(),
            env: {
              PATH: process.env.PATH!,
              DATABASE_URL: config.databaseUrl,
              CI: process.env.CI ?? "",
              ORDER_SETTLEMENT_PROCESS_TEST: "1",
              ORDER_SETTLEMENT_TEST_HOLD: hold ? "1" : "0",
            },
            stdio: ["ignore", "pipe", "pipe", "ipc"],
          },
        );
        const events: string[] = [];
        let ended = false;
        let logs = "";
        child.on("message", (m) => events.push((m as { event: string }).event));
        child.stdout.on("data", (d) => (logs += d));
        child.stderr.on("data", (d) => (logs += d));
        const exit = new Promise<void>((resolve, reject) => {
          child.once("exit", () => {
            ended = true;
            resolve();
          });
          child.once("error", reject);
        });
        return {
          child,
          events,
          exit,
          get ended() {
            return ended;
          },
          get logs() {
            return logs;
          },
        };
      }
      async function until(check: () => Promise<boolean> | boolean) {
        for (let i = 0; i < 240; i++) {
          if (await check()) return;
          await delay(25);
        }
        throw new Error("settlement process timeout");
      }
      const first = await start(true);
      try {
        await until(() => first.events.includes("uncommitted") || first.ended);
        expect(first.ended, first.logs).toBe(false);
        expect(await returned()).toHaveLength(0);
      } finally {
        first.child.kill("SIGKILL");
        await first.exit;
      }
      expect(await prisma.orderSettlement.count()).toBe(0);
      for (let i = 0; i < 2; i++) {
        const next = await start();
        try {
          await until(() => next.events.includes("ready") || next.ended);
          expect(next.ended, next.logs).toBe(false);
          await until(async () => (await prisma.orderSettlement.count()) === 1);
        } finally {
          next.child.kill("SIGTERM");
          await next.exit;
        }
      }
      expect(await returned()).toHaveLength(1);
    },
    20000,
  );

  it("shows settlement evidence and order ledgers to administrators without changing money", async () => {
    const ticket = await mature(100, true);
    const path = `/admin/orders/${orderId}/settlement`;
    expect((await http(path, 2)).status).toBe(403);
    expect((await http(path, 1)).status).toBe(403);
    const before = await current();
    const waiting = await (await http(path, 0)).json();
    expect(waiting).toMatchObject({
      orderId,
      accountId: ids[1],
      agreedPoints: 100,
      hasOpenIssue: true,
      windowElapsed: true,
      settledAt: null,
      returnedPoints: null,
    });
    expect(waiting.consumptionLedgerId).toBeTruthy();
    expect(await current()).toEqual(before);
    expect(await returned()).toHaveLength(0);
    expect(
      (
        await http(`/support/tickets/${ticket.id}/actions`, 2, "POST", {
          action: "RESOLVE",
          message: "确认处理完毕",
          expectedRevision: ticket.revision,
          requestId: randomUUID(),
        })
      ).status,
    ).toBe(201);
    await settle();
    const after = await (await http(path, 0)).json();
    expect(after).toMatchObject({
      hasOpenIssue: false,
      returnedPoints: 100,
      returnLedgerId: (await returned())[0]!.id,
    });
    expect(after.settledAt).toBeTruthy();
    const ledger = await (
      await http(`/admin/points/records?referenceId=${orderId}`, 0)
    ).json();
    expect(ledger.items.map((v: { kind: string }) => v.kind).sort()).toEqual([
      "ORDER_RETURN",
      "PUBLISHING_ORDER",
    ]);
    expect((await http("/delivery/orders?scope=ALL&state=ALL", 0)).status).toBe(
      200,
    );
    expect(
      (await http("/delivery/orders?scope=MINE&state=ALL", 2)).status,
    ).toBe(403);
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
        await port.credit(settlement(), 100);
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
    await mature();
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
    await expect(settle()).rejects.toThrow();
    expect(await returned()).toHaveLength(0);
    expect((await current()).status).toBe("COMPLETED");
    await core.cancelUnsent(ids[1]!, recharge.id);
    expect(await settle()).toMatchObject({ kind: "settled" });
  });
});
