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
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import { FinalOrderSettlementService } from "../src/application/final-order-settlement.service.js";
import { commercialTerms } from "../src/publishing-commerce/domain/publishing-order.js";
import { clearCustomerData } from "./customer-data.js";
import { publishingContextFixture } from "./publishing-context.fixture.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

import { AgencyCommissionService } from "../src/application/agency-commission.service.js";
import { CommissionLedgerAccess } from "../src/agency/infrastructure/commission-ledger-access.js";
import { PostgresCustomerServiceRepository } from "../src/agency/infrastructure/postgres-customer-service.repository.js";
import { PostgresCommissionTermsRepository } from "../src/agency/infrastructure/postgres-commission-terms.repository.js";
const config = loadIntegrationApiConfig();
const processTarget = new URL(config.databaseUrl);
const processPermitted =
  processTarget.hostname === "127.0.0.1" &&
  processTarget.port === "55432" &&
  (processTarget.pathname === "/geoeval_issue100" ||
    (process.env.CI === "true" && processTarget.pathname === "/geoeval"));
describe("commission from final retained funded consumption", () => {
  const prisma = new PrismaService(config.databaseUrl);
  let app: INestApplication,
    origin: string,
    ids: string[],
    cookies: string[],
    orderId: string,
    platformId: string;
  beforeAll(async () => {
    await prisma.$connect();
    app = await createApiApp(
      { ...config, agencyAcquisitionEnabled: true },
      false,
    );
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
      "AGENT",
      "AGENT",
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
    await app
      .get(PostgresCustomerServiceRepository)
      .transfer(ids[0]!, ids[1]!, {
        agentAccountId: ids[4]!,
        expectedRevision: 0,
        reason: "测试归属",
        requestId: randomUUID(),
      });
    await app.get(PostgresCommissionTermsRepository).update(ids[0]!, ids[4]!, {
      enabled: true,
      rateBps: 2000,
      expectedRevision: 0,
      reason: "测试费率",
      requestId: randomUUID(),
    });
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

  const commission = () => app.get(AgencyCommissionService);
  const settled = () => app.get(FinalOrderSettlementService).settle(orderId);
  const detail = (actor = 4) => http(`/agency/commissions/${orderId}`, actor);
  async function end(points = 100, closed = true) {
    expect((await agree(points, "CONTINUE")).response.status).toBe(200);
    const ticket = await prisma.supportTicket.findFirstOrThrow({
      where: { publishingOrderId: orderId },
    });
    expect(
      (
        await http(`/support/tickets/${ticket.id}/actions`, 2, "POST", {
          action: "RESOLVE",
          expectedRevision: ticket.revision,
          requestId: randomUUID(),
          message: "已确认",
        })
      ).status,
    ).toBe(201);
    const past = new Date(Date.now() - 73 * 3600000);
    await prisma.publicationDelivery.update({
      where: { orderId },
      data: closed
        ? {
            status: "CLOSED",
            closedAt: past,
            stoppedAt: past,
            resolutionMode: "TERMINATE",
          }
        : {
            status: "COMPLETED",
            publishedQuantity: 3,
            completedAt: past,
            startedAt: new Date(past.getTime() - 1000),
          },
    });
  }
  it("forecasts shared source allocation and books a closed zero-publication order once", async () => {
    expect(await commission().accrue(orderId)).toBeNull();
    await end();
    const forecast = await (await detail()).json();
    expect(forecast).toMatchObject({
      state: "PENDING",
      originalFundedPoints: 200,
      originalGrantedPoints: 100,
      returnFundedPoints: 67,
      returnGrantedPoints: 33,
      eligibleFundedPoints: 133,
      amountFen: "266",
      returnConfirmed: false,
    });
    expect(await settled()).toMatchObject({ kind: "settled" });
    expect(await commission().candidates(null)).toEqual([{ orderId }]);
    await Promise.all(
      Array.from({ length: 8 }, () => commission().accrue(orderId)),
    );
    expect(await prisma.agencyCommission.count()).toBe(1);
    expect(await commission().candidates(null)).toEqual([]);
    expect(await (await detail()).json()).toMatchObject({
      state: "BOOKED",
      amountFen: "266",
      returnConfirmed: true,
      status: "CLOSED",
    });
    expect(
      await prisma.pointChange.count({ where: { returnedOrderId: orderId } }),
    ).toBe(1);
  });
  it("keeps the order's original agent and rate through migration, repricing and suspension", async () => {
    await app
      .get(PostgresCustomerServiceRepository)
      .transfer(ids[0]!, ids[1]!, {
        agentAccountId: ids[5]!,
        expectedRevision: 1,
        reason: "迁移",
        requestId: randomUUID(),
      });
    await app.get(PostgresCommissionTermsRepository).update(ids[0]!, ids[4]!, {
      enabled: true,
      rateBps: 5000,
      expectedRevision: 1,
      reason: "新费率",
      requestId: randomUUID(),
    });
    expect((await detail(5)).status).toBe(404);
    const historical = await (await detail()).json();
    expect(historical).toMatchObject({ agentId: ids[4], rateBps: 2000 });
    expect(historical).not.toHaveProperty("mobile");
    await prisma.account.update({
      where: { id: ids[4]! },
      data: { status: "INACTIVE" },
    });
    await end(0, false);
    await settled();
    await commission().accrue(orderId);
    expect(
      await prisma.agencyCommission.findUnique({ where: { orderId } }),
    ).toMatchObject({ agentAccountId: ids[4], rateBps: 2000, amountFen: 400n });
    expect([401, 403]).toContain((await detail()).status);
    expect((await detail(0)).status).toBe(200);
  });
  it("records a participating fully-returned order at zero and rejects mutation", async () => {
    await end(300);
    await settled();
    await commission().accrue(orderId);
    expect(await (await detail()).json()).toMatchObject({
      state: "BOOKED",
      amountFen: "0",
      eligibleFundedPoints: 0,
    });
    await expect(
      prisma.agencyCommission.update({
        where: { orderId },
        data: { amountFen: 1n },
      }),
    ).rejects.toThrow(/immutable/);
    await expect(
      prisma.agencyCommission.delete({ where: { orderId } }),
    ).rejects.toThrow(/immutable/);
  });
  it("rejects inconsistent source facts and retries a failed accrual without touching the settled wallet", async () => {
    await end();
    await settled();
    await expect(
      prisma.agencyCommission.create({
        data: {
          orderId,
          agentAccountId: ids[4]!,
          rateBps: 2000,
          fundedPoints: 133,
          amountFen: 999n,
        },
      }),
    ).rejects.toThrow(/final purchase facts/);
    const wallet = await prisma.pointAccount.findUnique({
      where: { accountId: ids[1]! },
    });
    const ledger = app.get(CommissionLedgerAccess),
      real = ledger.record.bind(ledger);
    vi.spyOn(ledger, "record").mockImplementationOnce(async (tx, input) => {
      await real(tx, input);
      throw new Error("injected after ledger write");
    });
    await expect(commission().accrue(orderId)).rejects.toThrow(/injected/);
    expect(await prisma.agencyCommission.count()).toBe(0);
    expect(
      await prisma.pointAccount.findUnique({ where: { accountId: ids[1]! } }),
    ).toEqual(wallet);
    expect(await prisma.orderSettlement.count()).toBe(1);
    await commission().accrue(orderId);
    expect(await prisma.agencyCommission.count()).toBe(1);
  });
  it("enforces role, identity and filter scope without exposing customer data", async () => {
    for (const actor of [1, 2]) expect((await detail(actor)).status).toBe(403);
    expect(
      (await http(`/agency/commissions?agentId=${ids[5]}`, 4)).status,
    ).toBe(403);
    expect(
      (
        await fetch(origin + "/agency/commissions", {
          headers: { cookie: cookies[4]!, "x-geoeval-account": ids[5]! },
        })
      ).status,
    ).toBe(409);
    const list = await http("/agency/commissions", 4);
    expect(list.headers.get("cache-control")).toContain("no-store");
    expect(await list.json()).toMatchObject({
      summary: {
        pendingFen: "400",
        bookedFen: "0",
        pendingCount: 1,
        bookedCount: 0,
      },
    });
    expect(await (await http("/agency/commissions", 5)).json()).toMatchObject({
      items: [],
      summary: { pendingFen: "0" },
    });
    expect((await http("/agency/commissions?cursor=invalid", 4)).status).toBe(
      400,
    );
  });

  async function purchaseAgain(
    enabled: boolean,
    rateBps: number,
    granted = 100,
    funded = 200,
  ) {
    await app.get(PostgresCommissionTermsRepository).update(ids[0]!, ids[4]!, {
      enabled,
      rateBps: enabled ? rateBps : null,
      expectedRevision: 1,
      reason: "新订单费率",
      requestId: randomUUID(),
    });
    await prisma.pointAccount.update({
      where: { accountId: ids[1]! },
      data: { grantedBalance: granted, fundedBalance: funded },
    });
    const context = await publishingContextFixture(app, prisma, ids[1]!);
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
  }
  it.each([
    [true, 0, 100, 200],
    [true, 2000, 300, 0],
    [false, 2000, 100, 200],
  ] as const)(
    "distinguishes enabled %s rate %i on granted %i funded %i",
    async (enabled, rate, granted, funded) => {
      await purchaseAgain(enabled, rate, granted, funded);
      await end(0);
      await settled();
      const entry = await commission().accrue(orderId);
      if (enabled) expect(entry).toMatchObject({ amountFen: 0n });
      else expect(entry).toBeNull();
      expect((await detail()).status).toBe(enabled ? 200 : 404);
    },
  );
  it("paginates deterministically and rejects a cursor when filter scope changes", async () => {
    const old = orderId;
    await purchaseAgain(true, 2000);
    const first = await (await http("/agency/commissions?limit=1", 4)).json();
    expect(first.items[0].orderId).toBe(orderId);
    expect(first.summary.pendingCount).toBe(2);
    const second = await (
      await http(`/agency/commissions?limit=1&cursor=${first.nextCursor}`, 4)
    ).json();
    expect(second.items.map((x: { orderId: string }) => x.orderId)).toEqual([
      old,
    ]);
    expect(second.nextCursor).toBeNull();
    expect(
      (
        await http(
          `/agency/commissions?state=BOOKED&cursor=${first.nextCursor}`,
          4,
        )
      ).status,
    ).toBe(400);
  });
  it.skipIf(!processPermitted)(
    "recovers after a real worker process dies before commit and never repeats a committed commission",
    async () => {
      await end();
      await settled();
      async function start(hold = false) {
        const child = spawn(
          process.execPath,
          ["--import", "tsx", "test/fixtures/agency-commission-process.ts"],
          {
            cwd: process.cwd(),
            env: {
              PATH: process.env.PATH!,
              DATABASE_URL: config.databaseUrl,
              CI: process.env.CI ?? "",
              AGENCY_COMMISSION_PROCESS_TEST: "1",
              AGENCY_COMMISSION_TEST_HOLD: hold ? "1" : "0",
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
        expect(await prisma.agencyCommission.count()).toBe(0);
      } finally {
        first.child.kill("SIGKILL");
        await first.exit;
      }
      expect(await prisma.agencyCommission.count()).toBe(0);
      for (let i = 0; i < 2; i++) {
        const next = await start();
        try {
          await until(() => next.events.includes("ready") || next.ended);
          expect(next.ended, next.logs).toBe(false);
          await until(
            async () => (await prisma.agencyCommission.count()) === 1,
          );
        } finally {
          next.child.kill("SIGTERM");
          await next.exit;
        }
      }
      expect(await prisma.agencyCommission.count()).toBe(1);
      expect(await prisma.orderSettlement.count()).toBe(1);
    },
    20000,
  );
});
