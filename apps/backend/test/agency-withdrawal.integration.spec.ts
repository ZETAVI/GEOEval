import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import { FinalOrderSettlementService } from "../src/application/final-order-settlement.service.js";
import { AgencyCommissionService } from "../src/application/agency-commission.service.js";
import { PostgresCustomerServiceRepository } from "../src/agency/infrastructure/postgres-customer-service.repository.js";
import { PostgresCommissionTermsRepository } from "../src/agency/infrastructure/postgres-commission-terms.repository.js";
import { NotificationEventHandler } from "../src/notification/application/notification-event.handler.js";
import { commercialTerms } from "../src/publishing-commerce/domain/publishing-order.js";
import { clearCustomerData } from "./customer-data.js";
import { publishingContextFixture } from "./publishing-context.fixture.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const key = "7a".repeat(32);
const config = {
  ...loadIntegrationApiConfig(),
  agencyAcquisitionEnabled: true,
  agencyWithdrawal: { enabled: true, encryptionKeyHex: key },
};

describe("agency withdrawal from immutable booked commission", () => {
  const prisma = new PrismaService(config.databaseUrl);
  let app: INestApplication;
  let origin: string;
  let ids: string[];
  let cookies: string[];
  let orderId: string;

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
    await clearCustomerData(prisma);
    const roles = [
      "ADMINISTRATOR",
      "TERMINAL_CUSTOMER",
      "OPERATIONS",
      "AGENT",
      "AGENT",
      "ADMINISTRATOR",
    ] as const;
    const accounts = await Promise.all(
      roles.map((role, index) =>
        prisma.account.create({
          data: { role, mobile: `+861390011600${index}` },
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
    await createBookedCommission();
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

  async function createBookedCommission() {
    await app
      .get(PostgresCustomerServiceRepository)
      .transfer(ids[0]!, ids[1]!, {
        agentAccountId: ids[3]!,
        expectedRevision: 0,
        reason: "提现验收归属",
        requestId: randomUUID(),
      });
    await app.get(PostgresCommissionTermsRepository).update(ids[0]!, ids[3]!, {
      enabled: true,
      rateBps: 5000,
      expectedRevision: 0,
      reason: "提现验收费率",
      requestId: randomUUID(),
    });
    const context = await publishingContextFixture(app, prisma, ids[1]!);
    const media = await app.get(MediaSupplyService).createPlatform(ids[0]!, {
      displayName: "提现验收媒体",
      categories: ["PORTAL_MEDIA"],
      status: "ACTIVE",
      pointPrice: 100,
    });
    await app.get(PointAccountService).adjust(ids[1]!, ids[0]!, {
      amount: 100,
      reason: "提现验收赠送",
      idempotencyKey: randomUUID(),
    });
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
            intent: {
              mode: "PRECISE",
              lines: [{ platformId: media.id, quantity: 3 }],
            },
          },
        )
      ).status,
    ).toBe(200);
    const workspace = await (await http("/publishing/workspace", 1)).json();
    const purchase = await http("/publishing/orders", 1, "POST", {
      idempotencyKey: randomUUID(),
      brandId: context.brand.id,
      articleId: context.article.id,
      articleRevision: context.article.revision,
      selectionRevision: workspace.selection.revision,
      acceptedTerms: commercialTerms(workspace.quote),
    });
    expect(purchase.status).toBe(200);
    orderId = (await purchase.json()).id;
    expect(
      (
        await http(`/delivery/orders/${orderId}/claim`, 2, "POST", {
          expectedRevision: 1,
          idempotencyKey: randomUUID(),
        })
      ).status,
    ).toBe(200);
    const delivery = await prisma.publicationDelivery.findUniqueOrThrow({
      where: { orderId },
    });
    expect(
      (
        await http(`/delivery/orders/${orderId}/resolution`, 2, "POST", {
          expectedRevision: delivery.revision,
          idempotencyKey: randomUUID(),
          mode: "CONTINUE",
          points: 0,
          reason: "无需退点",
        })
      ).status,
    ).toBe(200);
    const ticket = await prisma.supportTicket.findFirstOrThrow({
      where: { publishingOrderId: orderId },
    });
    expect(
      (
        await http(`/support/tickets/${ticket.id}/actions`, 2, "POST", {
          action: "RESOLVE",
          expectedRevision: ticket.revision,
          requestId: randomUUID(),
          message: "处理完成",
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
    expect(
      await app.get(FinalOrderSettlementService).settle(orderId),
    ).toMatchObject({ kind: "settled" });
    await app.get(AgencyCommissionService).accrue(orderId);
    expect(
      await prisma.agencyCommission.findUniqueOrThrow({ where: { orderId } }),
    ).toMatchObject({ agentAccountId: ids[3], amountFen: 1000n });
  }

  async function configure() {
    const policyResponse = await http(
      "/admin/agency-withdrawals/policy",
      0,
      "PUT",
      {
        expectedRevision: 0,
        requestId: randomUUID(),
        minimumFen: "100",
        reason: "首期最低提现金额",
      },
    );
    expect(policyResponse.status, await policyResponse.text()).toBe(200);
    const profile = {
      expectedRevision: 0,
      requestId: randomUUID(),
      recipientType: "INDIVIDUAL",
      accountName: "林代理",
      accountNumber: "6222021234567890",
      bankName: "示例银行",
      openingBranch: "广州天河支行",
      contactMobile: "+8613900116003",
      consentVersion: "agency-payout-v1",
      sensitiveDataConsent: true,
    };
    const response = await http(
      "/agency/withdrawals/payout-profile",
      3,
      "PUT",
      profile,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      maskedAccountNumber: "**** **** **** 7890",
      openingBranch: "广州天河支行",
      revision: 1,
    });
    return profile;
  }

  it("serializes the first global policy write across administrators", async () => {
    const request = (actor: number, minimumFen: string) =>
      http("/admin/agency-withdrawals/policy", actor, "PUT", {
        expectedRevision: 0,
        requestId: randomUUID(),
        minimumFen,
        reason: "并发设置最低提现金额",
      });
    const responses = await Promise.all([request(0, "100"), request(5, "200")]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(await prisma.agencyWithdrawalPolicy.count()).toBe(1);
  });

  async function submit(amountFen = "600") {
    const response = await http("/agency/withdrawals", 3, "POST", {
      requestId: randomUUID(),
      amountFen,
    });
    return { response, body: await response.json() };
  }

  async function command(
    id: string,
    actor: number,
    body: Record<string, unknown>,
  ) {
    const root =
      actor === 0 ? "/admin/agency-withdrawals" : "/agency/withdrawals";
    const response = await http(`${root}/${id}/actions`, actor, "POST", body);
    return { response, body: await response.json() };
  }

  it("derives amounts, encrypts one current profile, withdraws terminally and creates a new request", async () => {
    await configure();
    expect(
      await (await http("/agency/withdrawals/summary", 3)).json(),
    ).toMatchObject({
      bookedFen: "1000",
      availableFen: "1000",
      processingFen: "0",
      withdrawnFen: "0",
      minimumFen: "100",
      profileConfigured: true,
      enabled: true,
    });
    const first = await submit();
    expect(first.response.status).toBe(201);
    expect(first.body).toMatchObject({
      amountFen: "600",
      status: "PENDING_REVIEW",
      revision: 1,
    });
    expect(
      await (await http("/agency/withdrawals/summary", 3)).json(),
    ).toMatchObject({ availableFen: "400", processingFen: "600" });
    const withdrawn = await command(first.body.id, 3, {
      action: "WITHDRAW",
      expectedRevision: 1,
      requestId: randomUUID(),
    });
    expect(withdrawn.body).toMatchObject({ status: "WITHDRAWN", revision: 2 });
    expect(
      await (await http("/agency/withdrawals/summary", 3)).json(),
    ).toMatchObject({ availableFen: "1000", processingFen: "0" });
    const second = await submit();
    expect(second.response.status).toBe(201);
    expect(second.body.id).not.toBe(first.body.id);
    const stored = await prisma.agencyPayoutProfile.findUniqueOrThrow({
      where: { agentAccountId: ids[3]! },
    });
    expect(stored.accountNumberCiphertext).not.toContain("6222021234567890");
    expect(
      JSON.stringify(await prisma.agencyWithdrawalAudit.findMany()),
    ).not.toContain("6222021234567890");
  });

  it("serializes concurrent submissions and never over-reserves", async () => {
    await configure();
    const attempts = await Promise.all([
      http("/agency/withdrawals", 3, "POST", {
        requestId: randomUUID(),
        amountFen: "600",
      }),
      http("/agency/withdrawals", 3, "POST", {
        requestId: randomUUID(),
        amountFen: "600",
      }),
    ]);
    expect(attempts.map((r) => r.status).sort()).toEqual([201, 400]);
    expect(await prisma.agencyWithdrawalRequest.count()).toBe(1);
    expect(
      await prisma.agencyWithdrawalAudit.count({
        where: { action: "REQUEST_SUBMITTED" },
      }),
    ).toBe(1);
  });

  it("keeps unknown payment reserved, keeps bank time internal, and emits a safe result event", async () => {
    await configure();
    const created = await submit();
    const paying = await command(created.body.id, 0, {
      action: "APPROVE",
      expectedRevision: 1,
      requestId: randomUUID(),
    });
    expect(paying.body).toMatchObject({ status: "PAYING", revision: 2 });
    const cannotWithdraw = await command(created.body.id, 3, {
      action: "WITHDRAW",
      expectedRevision: 2,
      requestId: randomUUID(),
    });
    expect(cannotWithdraw.response.status).toBe(409);
    expect(
      await (await http("/agency/withdrawals/summary", 3)).json(),
    ).toMatchObject({ availableFen: "400", processingFen: "600" });
    const completed = await command(created.body.id, 0, {
      action: "COMPLETE",
      expectedRevision: 2,
      requestId: randomUUID(),
      bankTransactionReference: "BANK-20260916-001",
      externalPaidAt: "2026-09-16T02:00:00.000Z",
      note: "线下转账已核对",
    });
    expect(completed.body).toMatchObject({
      status: "COMPLETED",
      amountFen: "600",
      bankTransactionReference: "BANK-20260916-001",
      externalPaidAt: "2026-09-16T02:00:00.000Z",
    });
    const agentDetail = await (
      await http(`/agency/withdrawals/${created.body.id}`, 3)
    ).json();
    expect(agentDetail).toMatchObject({
      bankTransactionReference: "BANK-20260916-001",
      externalPaidAt: null,
    });
    const agentPage = await (await http("/agency/withdrawals", 3)).json();
    expect(agentPage.items[0]).toMatchObject({ externalPaidAt: null });
    const adminDetail = await (
      await http(`/admin/agency-withdrawals/${created.body.id}`, 0)
    ).json();
    expect(adminDetail.externalPaidAt).toBe("2026-09-16T02:00:00.000Z");
    const adminPage = await (
      await http("/admin/agency-withdrawals", 0)
    ).json();
    expect(adminPage.items[0].externalPaidAt).toBe(
      "2026-09-16T02:00:00.000Z",
    );
    expect(
      await (await http("/agency/withdrawals/summary", 3)).json(),
    ).toMatchObject({
      availableFen: "400",
      processingFen: "0",
      withdrawnFen: "600",
    });
    const event = await prisma.productOutboxEvent.findFirstOrThrow({
      where: { aggregateId: created.body.id },
    });
    expect(JSON.stringify(event.payload)).not.toMatch(/622202|BANK-/);
    await app.get(NotificationEventHandler).handle({
      id: event.id,
      eventType: event.eventType,
      payload: event.payload as Record<string, unknown>,
      correlationId: event.correlationId,
      createdAt: event.createdAt,
    });
    const notice = await prisma.notification.findUniqueOrThrow({
      where: { sourceEventId: event.id },
    });
    expect(notice).toMatchObject({
      recipientAccountId: ids[3],
      kind: "AGENCY_WITHDRAWAL_COMPLETED",
    });
    expect(
      `${notice.title}${notice.summary}${JSON.stringify(notice.target)}`,
    ).not.toMatch(/622202|BANK-/);
    await expect(
      prisma.agencyWithdrawalRequest.delete({ where: { id: created.body.id } }),
    ).rejects.toThrow(/immutable/);
  });

  it("releases rejected and failed requests but never reopens them", async () => {
    await configure();
    const rejected = await submit();
    expect(
      (
        await command(rejected.body.id, 0, {
          action: "REJECT",
          expectedRevision: 1,
          requestId: randomUUID(),
          reason: "收款信息无法核对",
        })
      ).body,
    ).toMatchObject({ status: "REJECTED" });
    expect(
      await (await http("/agency/withdrawals/summary", 3)).json(),
    ).toMatchObject({ availableFen: "1000" });
    const failed = await submit();
    await command(failed.body.id, 0, {
      action: "APPROVE",
      expectedRevision: 1,
      requestId: randomUUID(),
    });
    expect(
      (
        await command(failed.body.id, 0, {
          action: "PAYMENT_FAILED",
          expectedRevision: 2,
          requestId: randomUUID(),
          reason: "银行明确退回",
        })
      ).body,
    ).toMatchObject({ status: "PAYMENT_FAILED" });
    expect(
      await (await http("/agency/withdrawals/summary", 3)).json(),
    ).toMatchObject({ availableFen: "1000" });
    expect(
      (
        await command(failed.body.id, 0, {
          action: "APPROVE",
          expectedRevision: 3,
          requestId: randomUUID(),
        })
      ).response.status,
    ).toBe(409);
  });

  it("freezes snapshots, audits explicit reveal and enforces role and suspension boundaries", async () => {
    const profile = await configure();
    const created = await submit();
    await http("/agency/withdrawals/payout-profile", 3, "PUT", {
      ...profile,
      expectedRevision: 1,
      requestId: randomUUID(),
      accountNumber: "6222029999990001",
      openingBranch: "广州珠江支行",
    });
    const detail = await (
      await http(`/agency/withdrawals/${created.body.id}`, 3)
    ).json();
    expect(detail.payout).toMatchObject({
      maskedAccountNumber: "**** **** **** 7890",
      openingBranch: "广州天河支行",
    });
    expect(detail).not.toHaveProperty("payoutAccountNumberCiphertext");
    const reveal = await http(
      `/admin/agency-withdrawals/${created.body.id}/reveal-payout`,
      0,
      "POST",
      {
        requestId: randomUUID(),
        reason: "执行线下付款",
      },
    );
    expect(reveal.status).toBe(201);
    expect(await reveal.json()).toMatchObject({
      accountNumber: "6222021234567890",
      openingBranch: "广州天河支行",
    });
    expect(
      await prisma.agencyWithdrawalAudit.count({
        where: { action: "PAYOUT_REVEALED" },
      }),
    ).toBe(1);
    expect((await http("/admin/agency-withdrawals", 2)).status).toBe(403);
    expect((await http("/agency/withdrawals", 4)).status).toBe(200);
    expect(
      (await http(`/agency/withdrawals/${created.body.id}`, 4)).status,
    ).toBe(404);
    await prisma.account.update({
      where: { id: ids[3]! },
      data: { status: "INACTIVE" },
    });
    expect([401, 403]).toContain(
      (await http("/agency/withdrawals/summary", 3)).status,
    );
    expect(
      (await http(`/admin/agency-withdrawals/${created.body.id}`, 0)).status,
    ).toBe(200);
  });
});
