import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, writeFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { ModulesContainer } from "@nestjs/core";
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
import { createNativeRecoveryRuntime } from "../src/recharge/native-recovery.runtime.js";
import {
  createRechargeWorkerApp,
  RechargeWorkerModule,
} from "../src/recharge/recharge-worker.module.js";
import { RechargeWorkerRuntime } from "../src/recharge/recharge-worker.runtime.js";
import { PrismaNotificationInbox } from "../src/recharge/infrastructure/prisma-notification-inbox.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { rechargeApiFixture } from "./recharge-api.fixture.js";

const config = loadIntegrationApiConfig(),
  database = new URL(config.databaseUrl);
const permitted =
  database.hostname === "127.0.0.1" &&
  database.port === "55432" &&
  (database.pathname === "/geoeval_issue77_worker_n3" ||
    database.pathname === "/geoeval_issue77_notifications_n4" ||
    database.pathname === "/geoeval_issue77_recovery_r1" ||
    (process.env.CI === "true" && database.pathname === "/geoeval"));
type Provider = {
  initiationEnabled: boolean;
  release: boolean;
  orders: Record<string, { amount: number; state: string; paidAt?: string }>;
};
type ProcessHandle = {
  child: ChildProcess;
  events: Array<{
    event?: string;
    operation?: string;
    merchantOrderNo?: string;
  }>;
  logs: string[];
  exit: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  ended: boolean;
};
async function until<T>(
  read: () => Promise<T> | T,
  accept: (v: T) => boolean,
  timeout = 8000,
): Promise<T> {
  const start = Date.now();
  do {
    const value = await read();
    if (accept(value)) return value;
    await sleep(25);
  } while (Date.now() - start < timeout);
  throw new Error("RECHARGE_PROCESS_EXPECTATION_TIMEOUT");
}

describe.skipIf(!permitted)(
  "isolated resident Recharge process and persistence",
  () => {
    const prisma = new PrismaService(config.databaseUrl),
      f = rechargeApiFixture();
    const runtime = createNativeRecoveryRuntime({ ...f.configuration, prisma });
    const inbox = new PrismaNotificationInbox(prisma);
    const children: ProcessHandle[] = [];
    let directory: string, file: string, accountId: string;
    const write = async (state: Provider) => {
      await writeFile(file + ".parent", JSON.stringify(state));
      await rename(file + ".parent", file);
    };
    const read = async (): Promise<Provider> =>
      JSON.parse(await readFile(file, "utf8"));
    async function start(mode = "complete") {
      const child = spawn(
        process.execPath,
        ["--import", "tsx", "test/fixtures/recharge-worker-process.ts"],
        {
          cwd: process.cwd(),
          env: {
            PATH: process.env.PATH ?? "",
            TMPDIR: tmpdir(),
            DATABASE_URL: config.databaseUrl,
            NODE_ENV: "test",
            CI: process.env.CI ?? "",
            RECHARGE_PROCESS_TEST: "1",
            RECHARGE_TEST_FILE: file,
            RECHARGE_TEST_MODE: mode,
          },
          stdio: ["ignore", "pipe", "pipe", "ipc"],
        },
      );
      const h: ProcessHandle = {
        child,
        events: [],
        logs: [],
        ended: false,
        exit: Promise.resolve({ code: null, signal: null }),
      };
      h.exit = new Promise((resolve, reject) => {
        child.once("exit", (code, signal) => {
          h.ended = true;
          resolve({ code, signal });
        });
        child.once("error", reject);
      });
      child.on("message", (m) =>
        h.events.push(m as ProcessHandle["events"][number]),
      );
      child.stdout!.on("data", (d) => h.logs.push(d.toString()));
      child.stderr!.on("data", (d) => h.logs.push(d.toString()));
      children.push(h);
      await until(
        () => h.events,
        (e) => e.some((v) => v.event === "ready") || h.ended,
      );
      expect(h.ended, h.logs.join("")).toBe(false);
      return h;
    }
    async function stop(h: ProcessHandle, signal: NodeJS.Signals = "SIGTERM") {
      h.child.kill(signal);
      await until(() => h.ended, Boolean);
      return h.exit;
    }
    const create = () =>
      runtime.create(accountId, {
        amountYuan: 1,
        method: "WECHAT_NATIVE",
        idempotencyKey: randomUUID(),
      });
    async function notify(id: string) {
      const order = await prisma.rechargeOrder.findUniqueOrThrow({
        where: { id },
      });
      const provider = await read();
      const paidAt =
        order.paidAt?.toISOString() ??
        provider.orders[order.merchantOrderNo]?.paidAt ??
        new Date().toISOString();
      provider.orders[order.merchantOrderNo] = {
        amount: Number(order.amountFen),
        state: "SUCCESS",
        paidAt,
      };
      await write(provider);
      const raw = f.protocol.notification({
        envelope: { id: randomUUID() },
        trade: {
          out_trade_no: order.merchantOrderNo,
          transaction_id: order.merchantOrderNo,
          success_time: paidAt,
          amount: {
            total: Number(order.amountFen),
            currency: "CNY",
            payer_total: Number(order.amountFen),
            payer_currency: "CNY",
          },
        },
      });
      const verified = await f.gateway.verifyNotification(raw);
      if (!verified.ok) throw new Error("TEST_NOTIFICATION_INVALID");
      await inbox.accept(verified.value);
    }
    beforeAll(async () => prisma.$connect());
    beforeEach(async () => {
      await clearCustomerData(prisma);
      directory = await mkdtemp(join(tmpdir(), "geoeval-recharge-worker-"));
      file = join(directory, "provider.json");
      await write({ initiationEnabled: true, release: false, orders: {} });
      accountId = (
        await prisma.account.create({
          data: { mobile: "+8613900007761", role: "TERMINAL_CUSTOMER" },
        })
      ).id;
    });
    afterEach(async () => {
      for (const h of children.splice(0))
        if (!h.ended) await stop(h, "SIGKILL");
      await clearCustomerData(prisma);
      await rm(directory, { recursive: true, force: true });
      vi.restoreAllMocks();
    });
    afterAll(async () => prisma.$disconnect());
    it("mounts no customer/Identity/AI/Redis modules and drains before Prisma disconnect", async () => {
      const app = await createRechargeWorkerApp(
        {
          databaseUrl: config.databaseUrl,
          runtimeEnvironment: "test",
          controlled: true,
          native: f.configuration,
          scheduling: {
            orderIntervalMs: 100,
            settlementIntervalMs: 100,
            failureIntervalMs: 200,
            drainWarningMs: 200,
          },
        },
        { handleSignals: false },
      );
      const worker = app.get(RechargeWorkerRuntime),
        db = app.get(PrismaService),
        names = [...app.get(ModulesContainer).values()].map(
          (m) => m.metatype.name,
        );
      expect(names).toEqual(
        expect.arrayContaining(["RechargeWorkerModule", "PersistenceModule"]),
      );
      expect(names.join(" ")).not.toMatch(
        /Identity|Commerce|Media|BackgroundWork|Foundation|ApiModule|Notification|Telemetry/,
      );
      expect(
        [...app.get(ModulesContainer).values()].flatMap((m) => [
          ...m.controllers,
        ]),
      ).toHaveLength(0);
      const close = db.onApplicationShutdown.bind(db);
      let atClose: string | undefined;
      vi.spyOn(db, "onApplicationShutdown").mockImplementation(async () => {
        atClose = worker.snapshot().phase;
        await close();
      });
      try {
        expect(worker.snapshot().phase).toBe("running");
      } finally {
        await app.close();
      }
      expect(atClose).toBe("stopped");
      expect(() =>
        RechargeWorkerModule.register({
          databaseUrl: config.databaseUrl,
          runtimeEnvironment: "production",
          controlled: true,
          native: f.configuration,
          scheduling: {
            orderIntervalMs: 100,
            settlementIntervalMs: 100,
            failureIntervalMs: 200,
            drainWarningMs: 200,
          },
        }),
      ).toThrow("CONTROLLED_RECHARGE_IN_PRODUCTION");
    });
    it("opt-in mounts only Notification application and drives its durable lane", async () => {
      const app = await createRechargeWorkerApp(
        {
          databaseUrl: config.databaseUrl,
          runtimeEnvironment: "test",
          controlled: true,
          native: f.configuration,
          notifications: { retryDelayMs: 100 },
          scheduling: {
            orderIntervalMs: 100,
            settlementIntervalMs: 100,
            notificationIntervalMs: 100,
            failureIntervalMs: 200,
            drainWarningMs: 200,
          },
        },
        { handleSignals: false },
      );
      try {
        const names = [...app.get(ModulesContainer).values()].map(
          (m) => m.metatype.name,
        );
        expect(names).toContain("NotificationApplicationModule");
        expect(names.join(" ")).not.toMatch(
          /Identity|Media|BackgroundWork|ApiModule|Telemetry/,
        );
        expect(
          [...app.get(ModulesContainer).values()].flatMap((m) => [
            ...m.controllers,
          ]),
        ).toHaveLength(0);
        await until(
          () =>
            app.get(RechargeWorkerRuntime).snapshot().notifications
              ?.lastFinishedAt,
          Boolean,
        );
        expect(
          app.get(RechargeWorkerRuntime).snapshot().notifications?.result,
        ).toEqual({ delivered: 0, reviewed: 0, failed: 0 });
      } finally {
        await app.close();
      }
    });
    it("recovers the same order after SIGKILL between provider receipt and local result commit", async () => {
      const order = await create();
      const first = await start("hold-initiate");
      await until(
        () => first.events,
        (e) => e.some((v) => v.operation === "INITIATE"),
      );
      const before = await prisma.rechargeOrder.findUniqueOrThrow({
        where: { id: order.id },
      });
      expect(before.dispatchState).toBe("MAY_EXIST");
      expect(before.nativeLeaseId).not.toBeNull();
      expect((await stop(first, "SIGKILL")).signal).toBe("SIGKILL");
      const provider = await read();
      provider.initiationEnabled = false;
      provider.orders[before.merchantOrderNo]!.state = "SUCCESS";
      provider.orders[before.merchantOrderNo]!.paidAt =
        new Date().toISOString();
      await write(provider);
      const second = await start();
      await until(
        () =>
          prisma.rechargeOrder.findUniqueOrThrow({ where: { id: order.id } }),
        (o) => o.status === "SUCCESSFUL",
      );
      await notify(order.id);
      const receipt = await until(
        () =>
          prisma.rechargeNotificationReceipt.findFirst({
            select: {
              processedAt: true,
              reviewReason: true,
              appliedRechargeOrderId: true,
            },
          }),
        (r) => !!r && (!!r.processedAt || !!r.reviewReason),
      );
      expect(receipt).toMatchObject({
        reviewReason: null,
        appliedRechargeOrderId: order.id,
      });
      expect(second.events.some((e) => e.operation === "INITIATE")).toBe(false);
      expect(
        second.events.some(
          (e) =>
            e.operation === "QUERY" &&
            e.merchantOrderNo === before.merchantOrderNo,
        ),
      ).toBe(true);
      expect(await prisma.rechargeOrder.count()).toBe(1);
      expect(
        await prisma.pointChange.count({ where: { kind: "RECHARGE" } }),
      ).toBe(1);
      expect(
        await prisma.pointAccount.findUniqueOrThrow({ where: { accountId } }),
      ).toMatchObject({
        fundedBalance: 10,
        reservedFundedPoints: 0,
        revision: 1,
      });
      expect((await stop(second)).signal).toBe("SIGTERM");
    }, 15000);
    it("preserves a slow retry through SIGKILL and a replacement process settles the same order", async () => {
      const order = await create();
      const first = await start("transient-query");
      const held = await until(
        () =>
          prisma.rechargeOrder.findUniqueOrThrow({ where: { id: order.id } }),
        (row) => row.nativeReviewReason === "SLOW_RETRY",
      );
      expect(held.nativeFailureCount).toBe(3);
      expect((await stop(first, "SIGKILL")).signal).toBe("SIGKILL");
      const provider = await read();
      provider.release = true;
      provider.orders[held.merchantOrderNo]!.state = "SUCCESS";
      provider.orders[held.merchantOrderNo]!.paidAt = new Date().toISOString();
      await write(provider);
      const second = await start("transient-query");
      const restarted = await prisma.rechargeOrder.findUniqueOrThrow({
        where: { id: order.id },
      });
      expect(restarted.nativeNextActionAt).toEqual(held.nativeNextActionAt);
      expect(restarted.nativeFailureCount).toBe(3);
      await until(
        () =>
          prisma.rechargeOrder.findUniqueOrThrow({ where: { id: order.id } }),
        (row) => row.status === "SUCCESSFUL",
      );
      expect(second.events.some((e) => e.operation === "INITIATE")).toBe(false);
      expect(
        await prisma.pointChange.count({ where: { kind: "RECHARGE" } }),
      ).toBe(1);
      expect(
        await prisma.pointAccount.findUniqueOrThrow({ where: { accountId } }),
      ).toMatchObject({
        fundedBalance: 10,
        reservedFundedPoints: 0,
        revision: 1,
      });
      await stop(second);
    }, 20000);

    it("credits during a slow query, drains SIGTERM without claiming more, then closes old work with initiation disabled", async () => {
      const first = await create(),
        paid = await create();
      await runtime.runOrders(10);
      const rows = await prisma.rechargeOrder.findMany();
      await write({
        initiationEnabled: false,
        release: false,
        orders: Object.fromEntries(
          rows.map((o) => [
            o.merchantOrderNo,
            { amount: Number(o.amountFen), state: "NOTPAY" },
          ]),
        ),
      });
      await runtime.cancel(accountId, first.id);
      const process = await start("hold-query");
      await until(
        () => process.events,
        (e) => e.some((v) => v.operation === "QUERY"),
      );
      await notify(paid.id);
      await until(
        () =>
          prisma.rechargeOrder.findUniqueOrThrow({ where: { id: paid.id } }),
        (o) => o.status === "SUCCESSFUL",
      );
      expect(
        (
          await prisma.rechargeOrder.findUniqueOrThrow({
            where: { id: first.id },
          })
        ).status,
      ).toBe("CONFIRMING");
      process.child.kill("SIGTERM");
      await until(
        () => process.logs.join(""),
        (v) => v.includes('"kind":"DRAIN_PENDING"'),
      );
      expect(process.ended).toBe(false);
      expect(
        process.events.filter((e) => e.operation === "QUERY"),
      ).toHaveLength(1);
      const state = await read();
      state.release = true;
      await write(state);
      await until(() => process.ended, Boolean);
      expect(process.logs.join("")).toContain('"kind":"STOPPED"');
      const waiting = await prisma.rechargeOrder.findUniqueOrThrow({
        where: { id: first.id },
      });
      expect(waiting.status).toBe("CONFIRMING");
      expect(waiting.nativeNextOperation).toBe("CLOSE");
      expect(waiting.nativeLeaseId).toBeNull();
      const unsent = await create();
      const restarted = await start();
      await until(
        () =>
          prisma.rechargeOrder.findUniqueOrThrow({ where: { id: first.id } }),
        (o) => o.status === "CLOSED",
      );
      await sleep(250);
      expect(restarted.events.some((e) => e.operation === "INITIATE")).toBe(
        false,
      );
      expect(
        (
          await prisma.rechargeOrder.findUniqueOrThrow({
            where: { id: unsent.id },
          })
        ).dispatchState,
      ).toBe("UNSENT");
      expect(
        await prisma.pointAccount.findUniqueOrThrow({ where: { accountId } }),
      ).toMatchObject({
        fundedBalance: 10,
        reservedFundedPoints: 10,
        revision: 1,
      });
      expect(await prisma.pointChange.count()).toBe(1);
      await stop(restarted);
    }, 15000);
  },
);
