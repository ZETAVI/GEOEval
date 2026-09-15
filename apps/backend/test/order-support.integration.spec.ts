import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import { commercialTerms } from "../src/publishing-commerce/domain/publishing-order.js";
import { clearCustomerData } from "./customer-data.js";
import { publishingContextFixture } from "./publishing-context.fixture.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import {
  ORDER_APPEAL_WINDOW_MS,
  requireOrderSupportAdmission,
} from "../src/publication-delivery/domain/order-support.js";
const config = loadIntegrationApiConfig();
describe("order support admission and inherited responsibility", () => {
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
    await clearCustomerData(prisma);
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
          data: { role, mobile: `+861390001071${index}` },
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

  const support = (
    path: string,
    actor: number,
    method = "GET",
    body?: unknown,
  ) =>
    fetch(origin + "/support/tickets" + path, {
      method,
      headers: {
        ...browserMutationHeaders(cookies[actor]!),
        "x-geoeval-account": ids[actor]!,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const input = (key = randomUUID()) => ({
    subject: "订单问题",
    message: "请协助查看发布进度",
    publishingOrderId: orderId,
    requestId: key,
  });
  async function create(actor = 1, body = input()) {
    const response = await support("", actor, "POST", body);
    expect(response.status, await response.clone().text()).toBe(201);
    return response.json() as Promise<{ ticketId: string; revision: number }>;
  }
  async function resolve(id: string, actor = 2) {
    const detail = await (await support(`/${id}`, actor)).json();
    const response = await support(`/${id}/actions`, actor, "POST", {
      action: "RESOLVE",
      message: "已沟通处理",
      expectedRevision: detail.revision,
      requestId: randomUUID(),
    });
    expect(response.status, await response.clone().text()).toBe(201);
  }
  async function publish(slot: number, correction = false) {
    const d = await current();
    const item = await prisma.publicationWorkItem.findUnique({
      where: { orderId_slot: { orderId, slot } },
    });
    return action(`work/${slot}`, 2, {
      action: correction ? "CORRECT_RESULT" : "RECORD_RESULT",
      expectedRevision: d.revision,
      expectedItemRevision: item?.revision ?? 0,
      idempotencyKey: randomUUID(),
      platformId,
      result: {
        title: "已发布",
        url: `https://example.com/${orderId}/${slot}`,
        publishedAt: new Date(Date.now() - 1000).toISOString(),
        internalChannel: "内部",
        internalNote: "不向工单复制",
      },
      ...(correction ? { reason: "修正结果" } : {}),
    });
  }
  async function complete() {
    for (let i = 1; i <= 3; i++) expect((await publish(i)).status).toBe(200);
    return current();
  }
  // Seed a historical first completion in the same initial terminal transition, never overwrite an end.
  const seedEnd = (time: Date) =>
    prisma.publicationDelivery.update({
      where: { orderId },
      data: {
        status: "COMPLETED",
        publishedQuantity: 3,
        startedAt: new Date(time.getTime() - 1000),
        completedAt: time,
      },
    });
  it("continues one open order conversation without copying the assignee or touching money", async () => {
    const baseline = await prisma.pointChange.count();
    const one = await create();
    const two = await create();
    expect(two.ticketId).toBe(one.ticketId);
    expect(
      await prisma.supportTicket.findUnique({ where: { id: one.ticketId } }),
    ).toMatchObject({
      assigneeAccountId: null,
      postEndAppeal: false,
      revision: 2,
    });
    expect((await (await support("?scope=pool", 2)).json()).items).toHaveLength(
      0,
    );
    expect(
      (await (await support("?scope=mine", 2)).json()).items[0],
    ).toMatchObject({ kind: "ORDER", mine: true, publishingOrderId: orderId });
    await resolve(one.ticketId);
    expect((await create()).ticketId).not.toBe(one.ticketId);
    expect(await prisma.pointChange.count()).toBe(baseline);
  });
  it("moves access with the order, revokes old requests, and forbids independent claim/release", async () => {
    const ticket = await create();
    expect(
      (
        await support(`/${ticket.ticketId}/actions`, 2, "POST", {
          action: "CLAIM",
          expectedRevision: 1,
          requestId: randomUUID(),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await support(`/${ticket.ticketId}/actions`, 0, "POST", {
          action: "RELEASE",
          message: "不能另行改派工单",
          expectedRevision: 1,
          requestId: randomUUID(),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await action("reassign", 0, {
          expectedRevision: (await current()).revision,
          idempotencyKey: randomUUID(),
          assigneeAccountId: ids[3],
          reason: "订单交接",
        })
      ).status,
    ).toBe(200);
    expect((await support(`/${ticket.ticketId}`, 2)).status).toBe(404);
    expect((await support(`/${ticket.ticketId}`, 3)).status).toBe(200);
    expect((await (await support("?scope=mine", 2)).json()).items).toHaveLength(
      0,
    );
    expect((await (await support("?scope=mine", 3)).json()).items[0].id).toBe(
      ticket.ticketId,
    );
    await resolve(ticket.ticketId, 3);
    expect((await current()).assigneeAccountId).toBe(ids[3]);
  });
  it("records first completion from real publishing and never resets it on correction", async () => {
    const before = new Date();
    const completed = await complete();
    expect(completed.completedAt!.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect((await publish(1, true)).status).toBe(200);
    expect((await current()).completedAt).toEqual(completed.completedAt);
    await expect(
      prisma.publicationDelivery.update({
        where: { orderId },
        data: {
          completedAt: new Date(completed.completedAt!.getTime() + 1000),
        },
      }),
    ).rejects.toThrow();
    const page = await (
      await support(`?publishingOrderId=${orderId}`, 1)
    ).json();
    expect(page.order.canCreate).toBe(true);
    expect(
      new Date(page.order.appealUntil).getTime() -
        new Date(page.order.endedAt).getTime(),
    ).toBe(ORDER_APPEAL_WINDOW_MS);
  });
  it("accepts one customer appeal, replays after resolution, and does not restore its chance", async () => {
    await complete();
    const body = input();
    const ticket = await create(1, body);
    expect(
      (
        await prisma.supportTicket.findUniqueOrThrow({
          where: { id: ticket.ticketId },
        })
      ).postEndAppeal,
    ).toBe(true);
    await resolve(ticket.ticketId);
    expect(await create(1, body)).toEqual(ticket);
    expect((await support("", 1, "POST", input())).status).toBe(409);
    const page = await (
      await support(`?publishingOrderId=${orderId}`, 1)
    ).json();
    expect(page.order.canCreate).toBe(false);
    expect(page.order.reason).toContain("一次售后");
  });
  it("uses the same opportunity after closure and keeps the first closure time", async () => {
    expect(
      (
        await action("resolution", 2, {
          mode: "TERMINATE",
          points: 0,
          reason: "停止剩余发布",
          expectedRevision: (await current()).revision,
          idempotencyKey: randomUUID(),
        })
      ).status,
    ).toBe(200);
    const closed = (await current()).closedAt;
    const ticket = await create();
    expect(
      (
        await prisma.supportTicket.findUniqueOrThrow({
          where: { id: ticket.ticketId },
        })
      ).postEndAppeal,
    ).toBe(true);
    await resolve(ticket.ticketId);
    expect((await current()).closedAt).toEqual(closed);
    await expect(
      prisma.publicationDelivery.update({
        where: { orderId },
        data: { closedAt: new Date(closed!.getTime() + 1000) },
      }),
    ).rejects.toThrow();
  });
  it("does not spend the customer's chance on proactive operations contact", async () => {
    await complete();
    const proactive = await create(2);
    expect(
      (
        await prisma.supportTicket.findUniqueOrThrow({
          where: { id: proactive.ticketId },
        })
      ).postEndAppeal,
    ).toBe(false);
    await resolve(proactive.ticketId);
    const customer = await create();
    expect(
      (
        await prisma.supportTicket.findUniqueOrThrow({
          where: { id: customer.ticketId },
        })
      ).postEndAppeal,
    ).toBe(true);
  });
  it("keeps admitted work after the deadline while rejecting a new late order issue", async () => {
    const ticket = await create();
    await seedEnd(new Date(Date.now() - ORDER_APPEAL_WINDOW_MS - 1000));
    expect((await create()).ticketId).toBe(ticket.ticketId);
    await resolve(ticket.ticketId);
    expect((await support("", 1, "POST", input())).status).toBe(409);
    expect(
      (
        await support("", 1, "POST", {
          subject: "普通咨询",
          message: "其他产品问题",
          requestId: randomUUID(),
        })
      ).status,
    ).toBe(201);
  });
  it("serializes two new post-end requests into one admitted ticket", async () => {
    await complete();
    const results = await Promise.all([create(), create()]);
    expect(results[0].ticketId).toBe(results[1].ticketId);
    expect(
      await prisma.supportTicket.count({
        where: { publishingOrderId: orderId, postEndAppeal: true },
      }),
    ).toBe(1);
  });
  it("checks the actual database clock after waiting for the order lock", async () => {
    const deadline = new Date(Date.now() + 2000);
    await seedEnd(new Date(deadline.getTime() - ORDER_APPEAL_WINDOW_MS));
    let unlock!: () => void, locked!: () => void;
    const gate = new Promise<void>((r) => (unlock = r)),
      ready = new Promise<void>((r) => (locked = r));
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT order_id FROM publication_deliveries WHERE order_id=${orderId}::uuid FOR UPDATE`;
        locked();
        await gate;
      },
      { timeout: 5000 },
    );
    await ready;
    const request = support("", 1, "POST", input());
    try {
      let waiting = false;
      for (let i = 0; i < 40; i++) {
        const rows = await prisma.$queryRaw<
          Array<{ n: bigint }>
        >`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%publication_deliveries%'`;
        if (Number(rows[0]!.n) > 0) {
          waiting = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 10));
      }
      expect(waiting).toBe(true);
      expect(Date.now()).toBeLessThan(deadline.getTime());
      await new Promise((r) =>
        setTimeout(r, Math.max(0, deadline.getTime() - Date.now() + 30)),
      );
    } finally {
      unlock();
      await holder;
    }
    expect((await request).status).toBe(409);
    expect(await prisma.supportTicket.count()).toBe(0);
  });
  it("does not expose another customer's order or allow ordinary staff to create unowned work", async () => {
    const other = await prisma.account.create({
      data: { mobile: "+8613900010799" },
    });
    const session = await loginWithDevelopmentChallenge(origin, other.mobile);
    const response = await fetch(origin + "/support/tickets", {
      method: "POST",
      headers: {
        ...browserMutationHeaders(session.cookie),
        "x-geoeval-account": other.id,
      },
      body: JSON.stringify(input()),
    });
    expect(response.status).toBe(404);
    expect((await support("", 3, "POST", input())).status).toBe(404);
    expect(
      (
        await support("", 1, "POST", {
          ...input(),
          rechargeOrderId: randomUUID(),
        })
      ).status,
    ).toBe(400);
  });
});
describe("order appeal boundary decisions", () => {
  it("accepts before but not at the exact 72-hour cutoff, with no natural-day rounding", () => {
    const completedAt = new Date("2026-09-15T10:23:45.678Z"),
      row = { status: "COMPLETED" as const, completedAt, closedAt: null },
      deadline = completedAt.getTime() + ORDER_APPEAL_WINDOW_MS;
    expect(
      requireOrderSupportAdmission(row, new Date(deadline - 1), true, false),
    ).toBe(true);
    expect(() =>
      requireOrderSupportAdmission(row, new Date(deadline), true, false),
    ).toThrow("72 小时");
    expect(() =>
      requireOrderSupportAdmission(
        { ...row, completedAt: null },
        new Date(),
        true,
        false,
      ),
    ).toThrow("结束时间待核对");
  });
});
