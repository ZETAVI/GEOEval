import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { createNativeRecoveryRuntime } from "../src/recharge/native-recovery.runtime.js";
import { PostgresAdminRechargeQueries } from "../src/recharge/infrastructure/postgres-admin-recharge.queries.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { clearCustomerData } from "./customer-data.js";
import {
  loginWithDevelopmentChallenge,
  type HttpSessionFixture,
} from "./identity-http-fixtures.js";
import { rechargeApiFixture } from "./recharge-api.fixture.js";
const config = loadIntegrationApiConfig();
describe("administrator read-only recharge HTTP", () => {
  const db = new PrismaService(config.databaseUrl),
    queryDb = new PrismaService(config.databaseUrl);
  let app: INestApplication,
    origin: string,
    fixture: ReturnType<typeof rechargeApiFixture>,
    runtime: ReturnType<typeof createNativeRecoveryRuntime>,
    now: Date;
  let customer: HttpSessionFixture,
    admin: HttpSessionFixture,
    otherAdmin: HttpSessionFixture,
    operations: HttpSessionFixture,
    agent: HttpSessionFixture;
  const read = (
    path = "",
    session = admin,
    expected: string | undefined = session.account.id,
  ) =>
    fetch(origin + "/admin/recharges" + path, {
      headers: {
        cookie: session.cookie,
        ...(expected ? { "x-geoeval-account": expected } : {}),
      },
    });
  const create = () =>
    runtime.create(customer.account.id, {
      amountYuan: 1,
      method: "WECHAT_NATIVE",
      idempotencyKey: randomUUID(),
    });
  async function pay() {
    now = new Date(Math.max(Date.now(), now.getTime()) + 1);
    await runtime.runOrders(10);
    fixture.setState("SUCCESS");
    now = new Date(now.getTime() + 6000);
    await runtime.runOrders(10);
    await runtime.runSettlements(10);
  }
  async function financialSnapshot() {
    return Promise.all([
      db.rechargeOrder.findMany({ orderBy: { id: "asc" } }),
      db.pointAccount.findMany({ orderBy: { accountId: "asc" } }),
      db.pointChange.findMany({ orderBy: { id: "asc" } }),
      db.rechargeOperationAttempt.findMany({ orderBy: { id: "asc" } }),
      db.rechargeCreditReservation.findMany({
        orderBy: { rechargeOrderId: "asc" },
      }),
      db.rechargeNotificationDelivery.findMany({ orderBy: { orderId: "asc" } }),
    ]);
  }
  beforeAll(async () => {
    await db.$connect();
    await queryDb.$connect();
  });
  beforeEach(async () => {
    await clearCustomerData(db);
    now = new Date();
    fixture = rechargeApiFixture();
    runtime = createNativeRecoveryRuntime({
      ...fixture.configuration,
      prisma: db,
      clock: () => now,
    });
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
    const sessions: HttpSessionFixture[] = [];
    const roles = [
      "TERMINAL_CUSTOMER",
      "ADMINISTRATOR",
      "ADMINISTRATOR",
      "OPERATIONS",
      "AGENT",
    ] as const;
    for (const [i, role] of roles.entries()) {
      const mobile = `1390000780${i}`;
      await db.account.create({ data: { mobile: `+86${mobile}`, role } });
      sessions.push(await loginWithDevelopmentChallenge(origin, mobile));
    }
    [customer, admin, otherAdmin, operations, agent] = sessions as [
      HttpSessionFixture,
      HttpSessionFixture,
      HttpSessionFixture,
      HttpSessionFixture,
      HttpSessionFixture,
    ];
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await app?.close();
    await clearCustomerData(db);
  });
  afterAll(async () => {
    await queryDb.$disconnect();
    await db.$disconnect();
  });
  it("enforces administrator identity before list/detail and offers no mutations", async () => {
    const order = await create();
    expect((await fetch(origin + "/admin/recharges")).status).toBe(401);
    for (const session of [customer, operations, agent])
      for (const path of ["", `/${order.id}`])
        expect((await read(path, session)).status).toBe(403);
    expect((await read("", admin, otherAdmin.account.id)).status).toBe(409);
    expect((await read(`/${order.id}`, admin, "")).status).toBe(409);
    expect((await read(`/${randomUUID()}`)).status).toBe(404);
    const before = await financialSnapshot();
    for (const suffix of ["", "/verify", "/cancel"])
      expect(
        (
          await fetch(origin + `/admin/recharges/${order.id}${suffix}`, {
            method: "POST",
            headers: { cookie: admin.cookie, "x-geoeval-request": "1" },
          })
        ).status,
      ).toBeGreaterThanOrEqual(400);
    expect(await financialSnapshot()).toEqual(before);
    expect(fixture.calls()).toBe(0);
  });
  it("reads inactive customer history without a merchant, with a bounded private projection and no money writes", async () => {
    const order = await create();
    await db.account.update({
      where: { id: customer.account.id },
      data: { status: "INACTIVE" },
    });
    const before = await financialSnapshot();
    const r = await read(`?accountId=${customer.account.id}`);
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect((await r.json()).items).toHaveLength(1);
    const detail = await (await read(`/${order.id}`)).json();
    expect(detail).toMatchObject({
      id: order.id,
      status: "PENDING_PAYMENT",
      paidAt: null,
      ledgerId: null,
      creditedAt: null,
      providerTransactionId: null,
      notificationState: null,
      accountId: customer.account.id,
    });
    expect(Object.keys(detail).sort()).toEqual(
      [
        "id",
        "accountId",
        "accountMobile",
        "amountYuan",
        "points",
        "method",
        "status",
        "createdAt",
        "paymentExpiresAt",
        "paidAt",
        "closedAt",
        "merchantOrderNo",
        "providerTransactionId",
        "ledgerId",
        "creditedPoints",
        "creditedAt",
        "lastQueriedAt",
        "diagnostic",
        "notificationState",
        "notificationDeliveredAt",
      ].sort(),
    );
    expect(await financialSnapshot()).toEqual(before);
    expect(fixture.calls()).toBe(0);
  });
  it("pages tied timestamps without duplicates and binds cursors to actor and filters", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    const orders = [await create(), await create(), await create()];
    vi.useRealTimers();
    const ids = orders
      .map((o) => o.id)
      .sort()
      .reverse();
    const first = await (await read("?limit=1")).json();
    expect(first.items[0].id).toBe(ids[0]);
    const next = await (
      await read(`?limit=1&cursor=${first.nextCursor}`)
    ).json();
    expect(next.items[0].id).toBe(ids[1]);
    const last = await (
      await read(`?limit=1&cursor=${next.nextCursor}`)
    ).json();
    expect(last.items[0].id).toBe(ids[2]);
    expect(last.nextCursor).toBeNull();
    expect(
      (await read(`?status=CLOSED&cursor=${first.nextCursor}`)).status,
    ).toBe(400);
    expect((await read(`?cursor=${first.nextCursor}`, otherAdmin)).status).toBe(
      400,
    );
    for (const query of [
      "?limit=0",
      "?limit=51",
      "?status=PAID",
      "?accountId=broken",
      "?cursor=bad",
      "?createdFrom=2026-09-12T00:00:00Z&createdBefore=2026-09-11T00:00:00Z",
      "?extra=x",
    ])
      expect((await read(query)).status).toBe(400);
    expect(
      (await (await read(`?orderId=${ids[0]}`)).json()).items,
    ).toHaveLength(1);
    expect(
      (await (await read(`?accountId=${admin.account.id}`)).json()).items,
    ).toEqual([]);
    expect(
      (await (await read(`?createdBefore=${now.toISOString()}`)).json()).items,
    ).toEqual([]);
    expect(
      (await (await read(`?createdFrom=${now.toISOString()}`)).json()).items,
    ).toHaveLength(3);
  });
  it("keeps payment and credit times separate, preserves success during notification delay and later review", async () => {
    const order = await create();
    await pay();
    const ledger = await db.pointChange.findFirstOrThrow({
      where: { rechargeOrderId: order.id },
    });
    const initial = await (await read(`/${order.id}`)).json();
    expect(initial).toMatchObject({
      status: "SUCCESSFUL",
      ledgerId: ledger.id,
      creditedPoints: 10,
      creditedAt: ledger.createdAt.toISOString(),
      notificationState: "PENDING",
      notificationDeliveredAt: null,
    });
    expect(initial.paidAt).not.toBe(initial.creditedAt);
    expect(initial.lastQueriedAt).not.toBeNull();
    await db.rechargeOrder.update({
      where: { id: order.id },
      data: { reviewReason: "PAYMENT_CONFLICT" },
    });
    const before = await financialSnapshot();
    const held = await (await read(`/${order.id}`)).json();
    expect(held).toMatchObject({
      status: "SUCCESSFUL",
      ledgerId: ledger.id,
      diagnostic: "付款信息存在冲突",
    });
    expect(await financialSnapshot()).toEqual(before);
  });
  it("distinguishes closed from unconfirmed and hides stale retry notes on terminal orders", async () => {
    const order = await create();
    await runtime.cancel(customer.account.id, order.id);
    const detail = await (await read(`/${order.id}`)).json();
    expect(detail).toMatchObject({
      status: "CLOSED",
      paidAt: null,
      ledgerId: null,
      diagnostic: null,
    });
    expect(detail.closedAt).not.toBeNull();
  });
  it("reads one repeatable read-only snapshot across a concurrent real settlement", async () => {
    const order = await create();
    const transaction = queryDb.$transaction.bind(queryDb);
    vi.spyOn(queryDb, "$transaction").mockImplementationOnce(((work, options) =>
      transaction(async (tx) => {
        const proxy = new Proxy(tx, {
          get(target, key) {
            if (key !== "rechargeOrder") return Reflect.get(target, key);
            return new Proxy(target.rechargeOrder, {
              get(model, method) {
                if (method !== "findUnique") return Reflect.get(model, method);
                return async (args: Parameters<typeof model.findUnique>[0]) => {
                  const settings = await tx.$queryRaw<
                    Array<{ isolation: string; readonly: string }>
                  >`SELECT current_setting('transaction_isolation') as isolation, current_setting('transaction_read_only') as readonly`;
                  expect(settings[0]).toEqual({
                    isolation: "repeatable read",
                    readonly: "on",
                  });
                  await tx.rechargeOrder.findUniqueOrThrow({
                    where: { id: order.id },
                  });
                  await pay();
                  return model.findUnique(args);
                };
              },
            });
          },
        });
        return work(proxy);
      }, options)) as typeof queryDb.$transaction);
    const before = await new PostgresAdminRechargeQueries(queryDb).detail(
      order.id,
    );
    expect(before).toMatchObject({
      status: "PENDING_PAYMENT",
      ledgerId: null,
      notificationState: null,
    });
    const after = await (await read(`/${order.id}`)).json();
    expect(after.status).toBe("SUCCESSFUL");
    expect(after.ledgerId).not.toBeNull();
  });
});
