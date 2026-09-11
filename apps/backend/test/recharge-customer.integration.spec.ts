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
import { RECHARGE_CUSTOMER_RUNTIME } from "../src/recharge/application/customer-recharge.js";
import { NativeRecoveryService } from "../src/recharge/application/native-recovery.service.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { rechargeApiFixture } from "./recharge-api.fixture.js";

const config = loadIntegrationApiConfig();
describe("customer recharge HTTP contracts", () => {
  const db = new PrismaService(config.databaseUrl);
  let app: INestApplication,
    origin: string,
    f: ReturnType<typeof rechargeApiFixture>,
    runtime: NativeRecoveryService;
  let accountId: string,
    otherId: string,
    adminId: string,
    cookie: string,
    otherCookie: string,
    adminCookie: string;
  const input = (key = randomUUID()) => ({
    amountYuan: 1,
    method: "WECHAT_NATIVE",
    idempotencyKey: key,
  });
  async function start(enabled = true) {
    app = await createApiApp(config, false, enabled ? f.configuration : null);
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
    runtime = app.get(RECHARGE_CUSTOMER_RUNTIME);
  }
  const headers = (id = accountId, token = cookie) => ({
    ...browserMutationHeaders(token),
    "x-geoeval-account": id,
  });
  const read = (path: string, id = accountId, token = cookie) =>
    fetch(origin + path, {
      headers: { cookie: token, "x-geoeval-account": id },
    });
  const post = (
    path: string,
    body: unknown = {},
    id = accountId,
    token = cookie,
  ) =>
    fetch(origin + path, {
      method: "POST",
      headers: headers(id, token),
      body: JSON.stringify(body),
    });
  async function create() {
    const r = await post("/recharges", input());
    expect(r.status).toBe(200);
    return r.json() as Promise<{ order: { id: string; status: string } }>;
  }
  beforeAll(() => db.$connect());
  beforeEach(async () => {
    await clearCustomerData(db);
    f = rechargeApiFixture();
    await start();
    accountId = (
      await db.account.create({
        data: { mobile: "+8613900007741", role: "TERMINAL_CUSTOMER" },
      })
    ).id;
    otherId = (
      await db.account.create({
        data: { mobile: "+8613900007742", role: "TERMINAL_CUSTOMER" },
      })
    ).id;
    adminId = (
      await db.account.create({
        data: { mobile: "+8613900007743", role: "ADMINISTRATOR" },
      })
    ).id;
    cookie = (await loginWithDevelopmentChallenge(origin, "13900007741"))
      .cookie;
    otherCookie = (await loginWithDevelopmentChallenge(origin, "13900007742"))
      .cookie;
    adminCookie = (await loginWithDevelopmentChallenge(origin, "13900007743"))
      .cookie;
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await app?.close();
    await clearCustomerData(db);
  });
  afterAll(() => db.$disconnect());

  it("requires a current customer, CSRF and matching browser account", async () => {
    expect((await fetch(origin + "/recharges/options")).status).toBe(401);
    expect(
      (await read("/recharges/options", adminId, adminCookie)).status,
    ).toBe(403);
    expect((await post("/recharges", input(), otherId, cookie)).status).toBe(
      409,
    );
    expect(
      (
        await fetch(origin + "/recharges", {
          method: "POST",
          headers: {
            cookie,
            "content-type": "application/json",
            "x-geoeval-account": accountId,
          },
          body: JSON.stringify(input()),
        })
      ).status,
    ).toBe(403);
    expect((await read("/points", otherId, cookie)).status).toBe(409);
    expect(await db.rechargeOrder.count()).toBe(0);
    const response = await read("/recharges/options");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      available: true,
      controlled: true,
      shortcutAmounts: [1, 10, 50],
      pointsPerYuan: 10,
    });
  });
  it("rejects altered amounts and customer-supplied money facts without dispatch", async () => {
    for (const bad of [0, 1.5, "1", 101])
      expect(
        (await post("/recharges", { ...input(), amountYuan: bad })).status,
      ).toBeGreaterThanOrEqual(400);
    expect(
      (await post("/recharges", { ...input(), accountId: otherId })).status,
    ).toBe(400);
    expect(
      (await post("/recharges", { ...input(), status: "SUCCESSFUL" })).status,
    ).toBe(400);
    expect(f.calls()).toBe(0);
    expect(await db.rechargeOrder.count()).toBe(0);
  });
  it("creates locally and replays one order with a private no-store projection", async () => {
    const request = input();
    const a = await post("/recharges", request),
      b = await post("/recharges", request);
    const first = await a.json(),
      second = await b.json();
    expect(first.order.id).toBe(second.order.id);
    expect(f.calls()).toBe(0);
    expect(first.order).toMatchObject({
      amountYuan: 1,
      points: 10,
      status: "PENDING_PAYMENT",
      qr: null,
    });
    expect(Object.keys(first.order).sort()).toEqual(
      [
        "id",
        "amountYuan",
        "points",
        "method",
        "status",
        "createdAt",
        "paymentExpiresAt",
        "paidAt",
        "closedAt",
        "cancelRequested",
        "canCancel",
        "canVerify",
        "supportRequired",
        "qr",
      ].sort(),
    );
    expect(a.headers.get("cache-control")).toBe("no-store");
    expect(
      (await post("/recharges", { ...request, amountYuan: 2 })).status,
    ).toBe(409);
    expect(await db.rechargeOrder.count()).toBe(1);
  });
  it("never returns or mutates another customer's order", async () => {
    const { order } = await create();
    for (const method of ["read", "verify", "cancel"]) {
      const r =
        method === "read"
          ? await read(`/recharges/${order.id}`, otherId, otherCookie)
          : await post(
              `/recharges/${order.id}/${method}`,
              {},
              otherId,
              otherCookie,
            );
      expect(r.status).toBe(404);
    }
    expect(
      (await (await read("/recharges", otherId, otherCookie)).json()).items,
    ).toEqual([]);
    expect(
      (await db.rechargeOrder.findUniqueOrThrow({ where: { id: order.id } }))
        .status,
    ).toBe("PENDING_PAYMENT");
  });
  it("paginates all states after filtering, including identical creation times and cursor scope", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const a = await create();
    await post(`/recharges/${a.order.id}/cancel`);
    const b = await create();
    await post(`/recharges/${b.order.id}/cancel`);
    const c = await create();
    const first = await (await read("/recharges?limit=1&status=CLOSED")).json();
    expect(first.items).toHaveLength(1);
    expect(first.items[0].status).toBe("CLOSED");
    expect(first.nextCursor).toBeTruthy();
    const next = await (
      await read(`/recharges?limit=1&status=CLOSED&cursor=${first.nextCursor}`)
    ).json();
    expect(new Set([first.items[0].id, next.items[0].id])).toEqual(
      new Set([a.order.id, b.order.id]),
    );
    expect(next.nextCursor).toBeNull();
    expect((await read(`/recharges?cursor=${first.nextCursor}`)).status).toBe(
      400,
    );
    expect(
      (
        await read(
          `/recharges?status=CLOSED&cursor=${first.nextCursor}`,
          otherId,
          otherCookie,
        )
      ).status,
    ).toBe(400);
    const all = await (await read("/recharges")).json();
    expect(all.items).toHaveLength(3);
    expect(all.items.some((o: { id: string }) => o.id === c.order.id)).toBe(
      true,
    );
    expect((await read("/recharges?limit=51")).status).toBe(400);
  });
  it("reads QR locally and coalesces repeated verify without increasing gateway rate", async () => {
    const { order } = await create();
    await runtime.runOrders(10);
    expect(f.calls()).toBe(1);
    expect(
      (await (await read(`/recharges/${order.id}`)).json()).order.qr.value,
    ).toContain("CONTROLLED_N2");
    for (let i = 0; i < 4; i++) {
      expect((await post(`/recharges/${order.id}/verify`)).status).toBe(202);
      await runtime.runOrders(10);
    }
    expect(f.calls()).toBe(1);
    expect(
      (await post(`/recharges/${order.id}/verify`, { paid: true })).status,
    ).toBe(400);
  });
  it("keeps cancellation pending until authenticated close, never credits from the button", async () => {
    const { order } = await create();
    await runtime.runOrders(10);
    const accepted = await post(`/recharges/${order.id}/cancel`);
    expect(accepted.status).toBe(202);
    expect(await accepted.json()).toEqual({ accepted: true });
    expect(
      (await (await read(`/recharges/${order.id}`)).json()).order,
    ).toMatchObject({ status: "CONFIRMING", cancelRequested: true, qr: null });
    await runtime.runOrders(10);
    await runtime.runOrders(10);
    expect(
      (await (await read(`/recharges/${order.id}`)).json()).order.status,
    ).toBe("CLOSED");
    expect(await db.pointChange.count()).toBe(0);
  });
  it("accepts signed raw callback before credit and settles once through the same API host", async () => {
    const { order } = await create();
    const o = await db.rechargeOrder.findUniqueOrThrow({
      where: { id: order.id },
    });
    const notification = f.protocol.notification({
      trade: {
        out_trade_no: o.merchantOrderNo,
        transaction_id: o.merchantOrderNo,
      },
    });
    const h = Object.fromEntries(
      Object.entries(notification.headers).map(([key, value]) => [
        key,
        value?.[0] ?? "",
      ]),
    );
    expect(
      (
        await fetch(origin + "/recharges/providers/wechat/notify", {
          method: "POST",
          headers: h,
          body: new Uint8Array(notification.rawBody),
        })
      ).status,
    ).toBe(204);
    expect(
      (await (await read(`/recharges/${order.id}`)).json()).order.status,
    ).toBe("PENDING_PAYMENT");
    expect(await db.pointChange.count()).toBe(0);
    await runtime.runSettlements(10);
    await runtime.runSettlements(10);
    expect(
      (await (await read(`/recharges/${order.id}`)).json()).order.status,
    ).toBe("SUCCESSFUL");
    expect(
      (await db.pointAccount.findUniqueOrThrow({ where: { accountId } }))
        .fundedBalance,
    ).toBe(10);
    expect(await db.pointChange.count({ where: { kind: "RECHARGE" } })).toBe(1);
  });
  it("defaults to unavailable while retaining history and same-request recovery without a merchant", async () => {
    const request = input(),
      result = await (await post("/recharges", request)).json();
    await runtime.runOrders(10);
    const calls = f.calls();
    await app.close();
    await start(false);
    const options = await (await read("/recharges/options")).json();
    expect(options).toMatchObject({
      available: false,
      controlled: false,
      methods: [],
    });
    const recovered = await (await post("/recharges", request)).json();
    expect(recovered.order).toMatchObject({
      id: result.order.id,
      qr: null,
      canCancel: false,
      canVerify: false,
    });
    expect((await post("/recharges", input())).status).toBe(503);
    expect((await post(`/recharges/${result.order.id}/verify`)).status).toBe(
      503,
    );
    expect((await (await read("/recharges")).json()).items).toHaveLength(1);
    expect(
      (
        await fetch(origin + "/recharges/providers/wechat/notify", {
          method: "POST",
        })
      ).status,
    ).toBe(404);
    expect(f.calls()).toBe(calls);
    expect(await db.rechargeOrder.count()).toBe(1);
  });
});
