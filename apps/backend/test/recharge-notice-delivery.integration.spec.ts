import "reflect-metadata";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { Client } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { NotificationEventHandler } from "../src/notification/application/notification-event.handler.js";
import { PostgresNotificationRepository } from "../src/notification/infrastructure/postgres-notification.repository.js";
import { RechargeCoreService } from "../src/recharge/application/recharge-core.service.js";
import { PostgresRechargeNotificationDeliveries } from "../src/recharge/infrastructure/postgres-recharge-notification-deliveries.js";
import { PostgresRechargeRepository } from "../src/recharge/infrastructure/postgres-recharge.repository.js";
import { WechatPayGateway } from "../src/recharge/infrastructure/wechat/wechat-pay.gateway.js";
import { createRechargeNotificationRuntime } from "../src/recharge/recharge-notification.runtime.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { rechargeApiFixture } from "./recharge-api.fixture.js";

const config = loadIntegrationApiConfig();
const database = new URL(config.databaseUrl);
const permitted =
  database.hostname === "127.0.0.1" &&
  database.port === "55432" &&
  (database.pathname === "/geoeval_issue77_notifications_n4" ||
    (process.env.CI === "true" && database.pathname === "/geoeval"));
type ProcessEvent = {
  event?: "ready" | "materialized" | "completed";
  orderId?: string;
  result?: { delivered: number; reviewed: number; failed: number };
};
type ProcessHandle = {
  child: ChildProcess;
  events: ProcessEvent[];
  logs: string[];
  ended: boolean;
  exit: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
};
async function until<T>(
  read: () => Promise<T> | T,
  accept: (value: T) => boolean,
  timeout = 8000,
): Promise<T> {
  const deadline = Date.now() + timeout;
  do {
    const value = await read();
    if (accept(value)) return value;
    await sleep(20);
  } while (Date.now() < deadline);
  throw new Error("RECHARGE_NOTICE_EXPECTATION_TIMEOUT");
}

describe.skipIf(!permitted)("isolated durable recharge success notices", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const control = new Client({ connectionString: config.databaseUrl });
  const f = rechargeApiFixture();
  const core = new RechargeCoreService(
    new PostgresRechargeRepository(prisma),
    f.configuration.recharge,
  );
  const messages = new PostgresNotificationRepository(prisma);
  const notifications = new NotificationEventHandler(messages);
  const deliveries = new PostgresRechargeNotificationDeliveries(prisma);
  const runtime = createRechargeNotificationRuntime(prisma, notifications, 100);
  const children: ProcessHandle[] = [];
  let accountId: string;

  const create = () =>
    core.create(accountId, {
      amountYuan: 1,
      method: "WECHAT_NATIVE",
      idempotencyKey: randomUUID(),
    });
  async function successful() {
    const order = await create();
    const gateway = new WechatPayGateway(f.protocol.config(), async () =>
      f.protocol.response(
        f.protocol.trade({
          out_trade_no: order.merchantOrderNo,
          transaction_id: order.merchantOrderNo,
          success_time: new Date().toISOString(),
          amount: {
            total: order.amountFen,
            currency: "CNY",
            payer_total: order.amountFen,
            payer_currency: "CNY",
          },
        }),
      ),
    );
    const observed = await gateway.query(order);
    if (!observed.ok || observed.value.state !== "SUCCESS")
      throw new Error("SIGNED_TEST_QUERY_REQUIRED");
    expect(
      await core.applyAuthenticatedQuery(
        order.id,
        observed.value.facts,
        observed.value.proof,
      ),
    ).toMatchObject({ kind: "APPLIED" });
    return { order, observation: observed.value };
  }
  const delivery = (orderId: string) =>
    prisma.rechargeNotificationDelivery.findUniqueOrThrow({
      where: { orderId },
    });
  const message = (orderId: string) =>
    prisma.notification.findUniqueOrThrow({
      where: { sourceEventId: orderId },
    });
  async function financialSnapshot() {
    return {
      wallet: await prisma.pointAccount.findUniqueOrThrow({
        where: { accountId },
      }),
      orders: await prisma.rechargeOrder.findMany({ orderBy: { id: "asc" } }),
      ledger: await prisma.pointChange.findMany({ orderBy: { id: "asc" } }),
      reservations: await prisma.rechargeCreditReservation.findMany({
        orderBy: { rechargeOrderId: "asc" },
      }),
    };
  }
  async function start(mode: "complete" | "hold-after-publish") {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "test/fixtures/recharge-notice-process.ts"],
      {
        cwd: process.cwd(),
        env: {
          PATH: process.env.PATH ?? "",
          TMPDIR: tmpdir(),
          DATABASE_URL: config.databaseUrl,
          NODE_ENV: "test",
          CI: process.env.CI ?? "",
          RECHARGE_NOTICE_PROCESS_TEST: "1",
          RECHARGE_NOTICE_TEST_MODE: mode,
        },
        stdio: ["ignore", "pipe", "pipe", "ipc"],
      },
    );
    const handle: ProcessHandle = {
      child,
      events: [],
      logs: [],
      ended: false,
      exit: Promise.resolve({ code: null, signal: null }),
    };
    handle.exit = new Promise((resolve, reject) => {
      child.once("exit", (code, signal) => {
        handle.ended = true;
        resolve({ code, signal });
      });
      child.once("error", reject);
    });
    child.on("message", (event) => handle.events.push(event as ProcessEvent));
    child.stdout!.on("data", (data) => handle.logs.push(data.toString()));
    child.stderr!.on("data", (data) => handle.logs.push(data.toString()));
    children.push(handle);
    await until(
      () => handle,
      (h) => h.events.some((e) => e.event === "ready") || h.ended,
    );
    expect(handle.events, handle.logs.join("")).toContainEqual({
      event: "ready",
    });
    return handle;
  }
  async function kill(handle: ProcessHandle) {
    handle.child.kill("SIGKILL");
    await until(() => handle.ended, Boolean);
    return handle.exit;
  }
  beforeAll(async () => {
    await prisma.$connect();
    await control.connect();
  });
  beforeEach(async () => {
    await clearCustomerData(prisma);
    accountId = (
      await prisma.account.create({
        data: { mobile: "+8613900007791", role: "TERMINAL_CUSTOMER" },
      })
    ).id;
  });
  afterEach(async () => {
    for (const child of children.splice(0)) if (!child.ended) await kill(child);
    vi.restoreAllMocks();
    await control.query(
      "DROP TRIGGER IF EXISTS issue77_notice_ack_failure ON recharge_notification_deliveries",
    );
    await control.query("DROP FUNCTION IF EXISTS issue77_notice_ack_failure()");
    await clearCustomerData(prisma);
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await control.end();
  });

  it("co-commits one obligation and concurrent replay retains one read message", async () => {
    const { order, observation } = await successful();
    const pending = await delivery(order.id);
    expect(pending).toMatchObject({
      deliveredAt: null,
      failureCount: 0,
      lastError: null,
      nextAttemptAt: expect.any(Date),
    });
    await Promise.all([
      core.applyAuthenticatedQuery(
        order.id,
        observation.facts,
        observation.proof,
      ),
      runtime.run(1),
      createRechargeNotificationRuntime(prisma, notifications, 100).run(1),
    ]);
    expect(await prisma.rechargeNotificationDelivery.count()).toBe(1);
    expect(await prisma.notification.count()).toBe(1);
    expect(await prisma.pointChange.count()).toBe(1);
    const stored = await message(order.id);
    expect(stored).toMatchObject({
      recipientAccountId: accountId,
      kind: "RECHARGE_SUCCESSFUL",
      target: { kind: "RECHARGE_ORDER", rechargeOrderId: order.id },
      occurredAt: pending.createdAt,
    });
    await messages.markRead(accountId, stored.id);
    const read = await message(order.id);
    await notifications.publishRecharge({
      orderId: order.id,
      recipientAccountId: accountId,
      points: 10,
      occurredAt: pending.createdAt,
    });
    expect(await message(order.id)).toEqual(read);
    expect((await delivery(order.id)).deliveredAt).not.toBeNull();
  });

  it("defers a temporary failure so the next item advances without changing money", async () => {
    const first = (await successful()).order;
    const second = (await successful()).order;
    await prisma.rechargeNotificationDelivery.update({
      where: { orderId: first.id },
      data: { nextAttemptAt: new Date(Date.now() - 1000) },
    });
    const before = await financialSnapshot();
    const publish = notifications.publishRecharge.bind(notifications);
    vi.spyOn(notifications, "publishRecharge").mockImplementation(
      async (notice) => {
        if (notice.orderId === first.id)
          throw new Error("CONTROLLED_TEMPORARY");
        await publish(notice);
      },
    );
    expect(await runtime.run(1)).toEqual({
      delivered: 0,
      reviewed: 0,
      failed: 1,
    });
    expect(await delivery(first.id)).toMatchObject({
      deliveredAt: null,
      lastError: "TEMPORARY",
      failureCount: 1,
    });
    expect(await runtime.run(1)).toEqual({
      delivered: 1,
      reviewed: 0,
      failed: 0,
    });
    expect((await delivery(second.id)).deliveredAt).not.toBeNull();
    expect(await financialSnapshot()).toEqual(before);
  });

  it("recovers a database ACK failure without replacing the materialized read notice", async () => {
    const { order } = await successful();
    const before = await financialSnapshot();
    await control.query(
      "CREATE FUNCTION issue77_notice_ack_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'CONTROLLED_ACK_FAILURE'; END; $$",
    );
    await control.query(
      "CREATE TRIGGER issue77_notice_ack_failure BEFORE UPDATE ON recharge_notification_deliveries FOR EACH ROW WHEN (NEW.delivered_at IS NOT NULL) EXECUTE FUNCTION issue77_notice_ack_failure()",
    );
    expect(await runtime.run(1)).toEqual({
      delivered: 0,
      reviewed: 0,
      failed: 1,
    });
    const stored = await message(order.id);
    await messages.markRead(accountId, stored.id);
    const read = await message(order.id);
    expect(await delivery(order.id)).toMatchObject({
      deliveredAt: null,
      lastError: "TEMPORARY",
      failureCount: 1,
    });
    await control.query(
      "DROP TRIGGER issue77_notice_ack_failure ON recharge_notification_deliveries",
    );
    await until(
      () => deliveries.due(1),
      (rows) => rows.length === 1,
    );
    expect(await runtime.run(1)).toEqual({
      delivered: 1,
      reviewed: 0,
      failed: 0,
    });
    expect(await message(order.id)).toEqual(read);
    expect(await financialSnapshot()).toEqual(before);
  });

  it("retains a source conflict separately and never regresses a delivered item on late failure", async () => {
    const conflict = (await successful()).order;
    const valid = (await successful()).order;
    const before = await financialSnapshot();
    await messages.materialize({
      recipientAccountId: accountId,
      sourceEventId: conflict.id,
      kind: "RECHARGE_SUCCESSFUL",
      title: "已有消息",
      summary: "受控身份冲突",
      target: { kind: "RECHARGE_ORDER", rechargeOrderId: valid.id },
      occurredAt: (await delivery(conflict.id)).createdAt,
    });
    const original = await message(conflict.id);
    expect(await runtime.run(100)).toEqual({
      delivered: 1,
      reviewed: 1,
      failed: 0,
    });
    expect(await delivery(conflict.id)).toMatchObject({
      nextAttemptAt: null,
      deliveredAt: null,
      lastError: "SOURCE_CONFLICT",
      failureCount: 1,
    });
    expect(await deliveries.due(100)).toEqual([]);
    const delivered = await delivery(valid.id);
    await Promise.all([
      deliveries.failed(valid.id, "TEMPORARY", 100),
      deliveries.failed(valid.id, "SOURCE_CONFLICT", 100),
      deliveries.delivered(valid.id),
    ]);
    expect(await delivery(valid.id)).toEqual(delivered);
    await deliveries.failed(conflict.id, "TEMPORARY", 100);
    await deliveries.delivered(conflict.id);
    expect((await delivery(conflict.id)).lastError).toBe("SOURCE_CONFLICT");
    expect(await message(conflict.id)).toEqual(original);
    expect(await financialSnapshot()).toEqual(before);
  });

  it("rejects missing, unsettled, rewritten, and impossible delivery rows in PostgreSQL", async () => {
    const pending = await create();
    const closed = await create();
    await core.cancelUnsent(accountId, closed.id);
    const { order } = await successful();
    for (const id of [randomUUID(), pending.id, closed.id])
      await expect(
        control.query(
          "INSERT INTO recharge_notification_deliveries(order_id) VALUES ($1)",
          [id],
        ),
      ).rejects.toThrow();
    const original = await delivery(order.id);
    for (const change of [
      "order_id = gen_random_uuid()",
      "created_at = created_at + interval '1 second'",
      "failure_count = -1",
      "last_error = 'RAW_PRIVATE_ERROR'",
      "next_attempt_at = NULL, last_error = NULL",
      "last_error = 'SOURCE_CONFLICT'",
      "delivered_at = CURRENT_TIMESTAMP",
    ])
      await expect(
        control.query(
          `UPDATE recharge_notification_deliveries SET ${change} WHERE order_id = $1`,
          [order.id],
        ),
      ).rejects.toThrow();
    await expect(
      control.query(
        "DELETE FROM recharge_notification_deliveries WHERE order_id = $1",
        [order.id],
      ),
    ).rejects.toThrow();
    expect(await delivery(order.id)).toEqual(original);
    await runtime.run(1);
    await expect(
      control.query(
        "UPDATE recharge_notification_deliveries SET delivered_at = NULL, next_attempt_at = CURRENT_TIMESTAMP WHERE order_id = $1",
        [order.id],
      ),
    ).rejects.toThrow();
  });

  it("survives SIGKILL after materialization before ACK and resumes the same read notice", async () => {
    const { order } = await successful();
    const before = await financialSnapshot();
    const first = await start("hold-after-publish");
    await until(
      () => first.events,
      (events) =>
        events.some(
          (event) =>
            event.event === "materialized" && event.orderId === order.id,
        ),
    );
    expect(first.ended, first.logs.join("")).toBe(false);
    expect((await delivery(order.id)).deliveredAt).toBeNull();
    const stored = await message(order.id);
    await messages.markRead(accountId, stored.id);
    const read = await message(order.id);
    expect(read.readAt).not.toBeNull();
    expect(await kill(first)).toEqual({ code: null, signal: "SIGKILL" });
    expect((await delivery(order.id)).deliveredAt).toBeNull();
    const replacement = await start("complete");
    await until(() => replacement.ended, Boolean);
    expect(await replacement.exit, replacement.logs.join("")).toEqual({
      code: 0,
      signal: null,
    });
    expect(replacement.events).toContainEqual({
      event: "completed",
      result: { delivered: 1, reviewed: 0, failed: 0 },
    });
    expect((await delivery(order.id)).deliveredAt).not.toBeNull();
    expect(await prisma.notification.count()).toBe(1);
    expect(await message(order.id)).toEqual(read);
    expect(await financialSnapshot()).toEqual(before);
  }, 20_000);
});
