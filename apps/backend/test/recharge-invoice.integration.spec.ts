import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { NotificationEventHandler } from "../src/notification/application/notification-event.handler.js";
import { createNativeRecoveryRuntime } from "../src/recharge/native-recovery.runtime.js";
import { clearCustomerData } from "./customer-data.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { rechargeApiFixture } from "./recharge-api.fixture.js";

const config = loadIntegrationApiConfig();

describe("recharge invoice customer and operations lifecycle", () => {
  const db = new PrismaService(config.databaseUrl);
  let app: INestApplication;
  let origin: string;
  let ids: string[];
  let cookies: string[];
  let fixture: ReturnType<typeof rechargeApiFixture>;
  let runtime: ReturnType<typeof createNativeRecoveryRuntime>;
  let now: Date;

  beforeAll(async () => {
    await db.$connect();
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    await db.$disconnect();
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
    const roles = [
      "TERMINAL_CUSTOMER",
      "TERMINAL_CUSTOMER",
      "OPERATIONS",
      "OPERATIONS",
      "ADMINISTRATOR",
      "AGENT",
    ] as const;
    const accounts = await Promise.all(
      roles.map((role, index) =>
        db.account.create({
          data: { role, mobile: `+861390011090${index}` },
        }),
      ),
    );
    ids = accounts.map((account) => account.id);
    cookies = await Promise.all(
      accounts.map(
        async (account) =>
          (await loginWithDevelopmentChallenge(origin, account.mobile)).cookie,
      ),
    );
  });

  function http(path: string, actor: number, method = "GET", body?: unknown) {
    return fetch(origin + path, {
      method,
      headers: {
        ...(method === "GET" ? {} : browserMutationHeaders()),
        cookie: cookies[actor]!,
        "x-geoeval-account": ids[actor]!,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  async function successfulOrder(owner = 0, amountYuan = 5) {
    const order = await runtime.create(ids[owner]!, {
      amountYuan,
      method: "WECHAT_NATIVE",
      idempotencyKey: randomUUID(),
    });
    now = new Date(Math.max(Date.now(), now.getTime()) + 1);
    await runtime.runOrders(10);
    fixture.setState("SUCCESS");
    now = new Date(now.getTime() + 6_000);
    await runtime.runOrders(10);
    await runtime.runSettlements(10);
    return db.rechargeOrder.findUniqueOrThrow({ where: { id: order.id } });
  }

  function application(requestId = randomUUID()) {
    return {
      requestId,
      buyerType: "ENTERPRISE",
      title: "互动派科技股份有限公司",
      taxNumber: "91440101773316648W",
      email: "3892016@qq.com",
      confirmedAccurate: true,
    } as const;
  }

  async function apply(orderId: string, request = application()) {
    return http(`/recharges/${orderId}/invoice`, 0, "POST", request);
  }

  it("accepts only one explicit application for the customer's successful unambiguous CNY recharge", async () => {
    const order = await successfulOrder();
    const request = application();
    const first = await apply(order.id, request);
    const replay = await apply(order.id, request);
    expect(first.status, await first.clone().text()).toBe(200);
    expect(replay.status).toBe(200);
    const created = await replay.json();
    expect(created).toMatchObject({
      rechargeOrderId: order.id,
      amountFen: "500",
      status: "PROCESSING",
      revision: 1,
      submission: {
        buyerType: "ENTERPRISE",
        title: "互动派科技股份有限公司",
        taxNumber: "91440101773316648W",
        email: "3892016@qq.com",
        revision: 1,
      },
    });
    expect(await db.rechargeInvoiceRequest.count()).toBe(1);
    expect(await db.rechargeInvoiceSubmission.count()).toBe(1);
    expect(await db.rechargeInvoiceAudit.count()).toBe(1);
    const summaries = await http(
      `/recharge-invoices/order-summaries?orderIds=${order.id}`,
      0,
    );
    expect(summaries.status, await summaries.clone().text()).toBe(200);
    expect(await summaries.json()).toMatchObject({
      items: [{ id: created.id, rechargeOrderId: order.id }],
    });
    expect(
      await (
        await http(`/recharge-invoices/order-summaries?orderIds=${order.id}`, 1)
      ).json(),
    ).toEqual({ items: [] });
    expect((await apply(order.id, application(randomUUID()))).status).toBe(409);
    expect(
      (
        await http(`/recharges/${order.id}/invoice`, 0, "POST", {
          ...application(randomUUID()),
          telephone: "020-38891740",
        })
      ).status,
    ).toBe(400);
  });

  it("serializes concurrent application attempts to one request", async () => {
    const order = await successfulOrder();
    const attempts = await Promise.all([
      apply(order.id, application(randomUUID())),
      apply(order.id, application(randomUUID())),
    ]);
    expect(attempts.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(await db.rechargeInvoiceRequest.count()).toBe(1);
    expect(await db.rechargeInvoiceSubmission.count()).toBe(1);
  });

  it("does not leak another customer's order and blocks unsettled orders", async () => {
    const other = await successfulOrder(1);
    expect((await apply(other.id)).status).toBe(404);
    const pending = await runtime.create(ids[0]!, {
      amountYuan: 5,
      method: "WECHAT_NATIVE",
      idempotencyKey: randomUUID(),
    });
    expect((await apply(pending.id)).status).toBe(409);
    expect(await db.rechargeInvoiceRequest.count()).toBe(0);
  });

  it("keeps one request and immutable submission revisions through correction", async () => {
    const order = await successfulOrder();
    const invoice = await (await apply(order.id)).json();
    const claim = await http(
      `/operations/recharge-invoices/${invoice.id}/actions`,
      2,
      "POST",
      {
        action: "CLAIM",
        requestId: randomUUID(),
        expectedRevision: 1,
      },
    );
    expect(claim.status).toBe(200);
    const correction = await http(
      `/operations/recharge-invoices/${invoice.id}/actions`,
      2,
      "POST",
      {
        action: "REQUEST_CORRECTION",
        requestId: randomUUID(),
        expectedRevision: 2,
        reasonCode: "NAME_TAX_MISMATCH",
        note: "请按营业执照核对",
      },
    );
    expect(correction.status, await correction.clone().text()).toBe(200);
    expect(await correction.json()).toMatchObject({
      status: "NEEDS_CORRECTION",
      revision: 3,
      assignee: { accountId: ids[2] },
    });
    expect(
      (
        await http(
          `/operations/recharge-invoices/${invoice.id}/actions`,
          3,
          "POST",
          {
            action: "COMPLETE",
            requestId: randomUUID(),
            expectedRevision: 3,
            invoiceNumber: "INV-NOT-ALLOWED",
            issuedOn: "2026-09-17",
            confirmedSent: true,
          },
        )
      ).status,
    ).toBe(403);
    const resubmitted = await http(
      `/recharge-invoices/${invoice.id}/resubmit`,
      0,
      "POST",
      {
        ...application(randomUUID()),
        expectedRevision: 3,
        title: "互动派科技股份有限公司（修正）",
      },
    );
    expect(resubmitted.status, await resubmitted.clone().text()).toBe(200);
    expect(await resubmitted.json()).toMatchObject({
      id: invoice.id,
      status: "PROCESSING",
      revision: 4,
      submission: { revision: 2, title: "互动派科技股份有限公司（修正）" },
    });
    expect(await db.rechargeInvoiceRequest.count()).toBe(1);
    expect(
      await db.rechargeInvoiceSubmission.findMany({
        where: { requestId: invoice.id },
        orderBy: { revision: "asc" },
        select: { revision: true, title: true },
      }),
    ).toEqual([
      { revision: 1, title: "互动派科技股份有限公司" },
      { revision: 2, title: "互动派科技股份有限公司（修正）" },
    ]);
    expect(
      (
        await http(`/recharge-invoices/${invoice.id}/resubmit`, 0, "POST", {
          ...application(randomUUID()),
          expectedRevision: 3,
        })
      ).status,
    ).toBe(409);
  });

  it("allows one atomic claim and materializes bounded correction and issued notifications", async () => {
    const order = await successfulOrder();
    const invoice = await (await apply(order.id)).json();
    const claim = (actor: number) =>
      http(
        `/operations/recharge-invoices/${invoice.id}/actions`,
        actor,
        "POST",
        {
          action: "CLAIM",
          requestId: randomUUID(),
          expectedRevision: 1,
        },
      );
    const claims = await Promise.all([claim(2), claim(3)]);
    expect(claims.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    const current = await db.rechargeInvoiceRequest.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    const assignee = current.assigneeAccountId === ids[2] ? 2 : 3;
    const correctionKey = randomUUID();
    expect(
      (
        await http(
          `/operations/recharge-invoices/${invoice.id}/actions`,
          assignee,
          "POST",
          {
            action: "REQUEST_CORRECTION",
            requestId: correctionKey,
            expectedRevision: 2,
            reasonCode: "EMAIL_INVALID",
          },
        )
      ).status,
    ).toBe(200);
    const correctionEvent = await db.productOutboxEvent.findFirstOrThrow({
      where: { eventType: "recharge.invoice.needs_correction" },
    });
    await app.get(NotificationEventHandler).handle({
      ...correctionEvent,
      payload: correctionEvent.payload as Record<string, unknown>,
    });
    expect(await db.notification.findFirst()).toMatchObject({
      recipientAccountId: ids[0],
      kind: "RECHARGE_INVOICE_NEEDS_CORRECTION",
    });
    const corrected = await http(
      `/recharge-invoices/${invoice.id}/resubmit`,
      0,
      "POST",
      { ...application(randomUUID()), expectedRevision: 3 },
    );
    expect(corrected.status).toBe(200);
    const completed = await http(
      `/operations/recharge-invoices/${invoice.id}/actions`,
      assignee,
      "POST",
      {
        action: "COMPLETE",
        requestId: randomUUID(),
        expectedRevision: 4,
        invoiceNumber: "044002600111",
        issuedOn: "2026-09-17",
        confirmedSent: true,
      },
    );
    expect(completed.status, await completed.clone().text()).toBe(200);
    expect(await completed.json()).toMatchObject({
      status: "ISSUED",
      issued: {
        invoiceNumber: "044002600111",
        issuedOn: "2026-09-17",
      },
    });
    const issuedEvent = await db.productOutboxEvent.findFirstOrThrow({
      where: { eventType: "recharge.invoice.issued" },
    });
    await app.get(NotificationEventHandler).handle({
      ...issuedEvent,
      payload: issuedEvent.payload as Record<string, unknown>,
    });
    await app.get(NotificationEventHandler).handle({
      ...issuedEvent,
      payload: issuedEvent.payload as Record<string, unknown>,
    });
    expect(
      await db.notification.count({ where: { sourceEventId: issuedEvent.id } }),
    ).toBe(1);
  });

  it("gives administrators explicit assignment and takeover power without agent access", async () => {
    const order = await successfulOrder();
    const invoice = await (await apply(order.id)).json();
    expect((await http("/operations/recharge-invoices", 5)).status).toBe(403);
    const assigned = await http(
      `/admin/recharge-invoices/${invoice.id}/actions`,
      4,
      "POST",
      {
        action: "ASSIGN",
        requestId: randomUUID(),
        expectedRevision: 1,
        assigneeAccountId: ids[2],
      },
    );
    expect(assigned.status).toBe(200);
    expect(await assigned.json()).toMatchObject({
      revision: 2,
      assignee: { accountId: ids[2], role: "OPERATIONS" },
    });
    const takeover = await http(
      `/admin/recharge-invoices/${invoice.id}/actions`,
      4,
      "POST",
      {
        action: "TAKE_OVER",
        requestId: randomUUID(),
        expectedRevision: 2,
      },
    );
    expect(takeover.status).toBe(200);
    expect(await takeover.json()).toMatchObject({
      revision: 3,
      assignee: { accountId: ids[4], role: "ADMINISTRATOR" },
    });
    const completed = await http(
      `/admin/recharge-invoices/${invoice.id}/actions`,
      4,
      "POST",
      {
        action: "COMPLETE",
        requestId: randomUUID(),
        expectedRevision: 3,
        invoiceNumber: "ADMIN-TAKEOVER-1",
        issuedOn: "2026-09-17",
        confirmedSent: true,
      },
    );
    expect(completed.status, await completed.clone().text()).toBe(200);
    const detail = await http(`/admin/recharge-invoices/${invoice.id}`, 4);
    expect(detail.status).toBe(200);
    expect(
      (await detail.json()).audit.map(
        (item: { action: string }) => item.action,
      ),
    ).toEqual([
      "APPLICATION_SUBMITTED",
      "REQUEST_ASSIGNED",
      "REQUEST_TAKEN_OVER",
      "REQUEST_ISSUED",
    ]);
  });
});
