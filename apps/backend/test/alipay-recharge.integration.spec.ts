import "reflect-metadata";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { INestApplication } from "@nestjs/common";
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
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { RECHARGE_CUSTOMER_RUNTIME } from "../src/recharge/application/customer-recharge.js";
import { NativeRecoveryService } from "../src/recharge/application/native-recovery.service.js";
import { AlipayPaymentAdapter } from "../src/recharge/infrastructure/alipay/alipay-payment.adapter.js";
import { AlipayRechargePaymentGateway } from "../src/recharge/infrastructure/alipay/alipay-recharge.gateway.js";
import { PostgresAdminRechargeQueries } from "../src/recharge/infrastructure/postgres-admin-recharge.queries.js";
import { clearCustomerData } from "./customer-data.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const sdkRequire = createRequire(
  createRequire(import.meta.url).resolve("alipay-sdk"),
);
const urllib = (
  await import(
    pathToFileURL(sdkRequire.resolve("urllib").replace("/commonjs/", "/esm/"))
      .href
  )
).default;
const http = vi.spyOn(urllib, "request");
const merchantKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const alipayKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const apiConfig = loadIntegrationApiConfig();

describe("Alipay PC recharge integration", () => {
  const db = new PrismaService(apiConfig.databaseUrl);
  let app: INestApplication,
    origin: string,
    accountId: string,
    cookie: string,
    runtime: NativeRecoveryService,
    gateway: AlipayRechargePaymentGateway;
  let now: Date;

  function signedResponse(data: Record<string, unknown>, status = 200) {
    const raw = JSON.stringify(data),
      timestamp = String(now.getTime()),
      nonce = "alipay-recharge-integration";
    return {
      status,
      data: raw,
      headers: {
        "alipay-timestamp": timestamp,
        "alipay-nonce": nonce,
        "alipay-signature": sign(
          "RSA-SHA256",
          Buffer.from(`${timestamp}\n${nonce}\n${raw}\n`),
          alipayKeys.privateKey,
        ).toString("base64"),
      },
    };
  }

  function notification(
    order: { merchantOrderNo: string; amountFen: bigint },
    changes: Record<string, string> = {},
  ) {
    const data: Record<string, string> = {
      app_id: "2026000000000099",
      seller_id: "2088000000000099",
      notify_id: `N_${randomUUID()}_${"x".repeat(70)}`,
      notify_time: "2026-09-15 12:00:01",
      notify_type: "trade_status_sync",
      out_trade_no: order.merchantOrderNo,
      trade_no: "20260915000000000099",
      trade_status: "TRADE_SUCCESS",
      total_amount: (Number(order.amountFen) / 100).toFixed(2),
      ...changes,
    };
    const content = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join("&");
    data.sign_type = "RSA2";
    data.sign = sign(
      "RSA-SHA256",
      Buffer.from(content),
      alipayKeys.privateKey,
    ).toString("base64");
    return Buffer.from(new URLSearchParams(data).toString());
  }

  const headers = () => ({
    ...browserMutationHeaders(cookie),
    "x-geoeval-account": accountId,
  });
  const post = (path: string, body: unknown = {}) =>
    fetch(origin + path, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
  const read = (path: string) =>
    fetch(origin + path, {
      headers: { cookie, "x-geoeval-account": accountId },
    });
  async function create() {
    const response = await post("/recharges", {
      amountYuan: 1,
      method: "ALIPAY_PC",
      idempotencyKey: randomUUID(),
    });
    expect(response.status).toBe(200);
    return (await response.json()).order as {
      id: string;
      method: string;
      cashier: null;
    };
  }

  beforeAll(() => db.$connect());
  beforeEach(async () => {
    await clearCustomerData(db);
    http.mockReset().mockRejectedValue(new Error("UNEXPECTED_NETWORK_REQUEST"));
    now = new Date();
    const adapter = new AlipayPaymentAdapter(
      {
        appId: "2026000000000099",
        merchantId: "2088000000000099",
        environment: "sandbox",
        privateKey: merchantKeys.privateKey
          .export({ type: "pkcs8", format: "pem" })
          .toString(),
        verification: {
          mode: "PUBLIC_KEY",
          publicKey: alipayKeys.publicKey
            .export({ type: "spki", format: "pem" })
            .toString(),
        },
        notifyUrl: "https://app.example.test/recharges/providers/alipay/notify",
        returnUrl: "https://app.example.test/recharges",
        timeoutMs: 1200,
      },
      () => now,
    );
    gateway = new AlipayRechargePaymentGateway(adapter);
    app = await createApiApp(apiConfig, false, {
      recharge: {
        merchantId: "2088000000000099",
        appId: "2026000000000099",
        method: "ALIPAY_PC",
        minAmountYuan: 1,
        maxAmountYuan: 100,
        maxActiveOrders: 3,
        paymentWindowSeconds: 600,
      },
      preparation: {
        description: "账户积分充值",
        notifyUrl: "https://app.example.test/recharges/providers/alipay/notify",
        createEnabled: true,
        actionKind: "CASHIER_PAGE",
      },
      channel: {
        provider: "ALIPAY",
        method: "ALIPAY_PC",
        merchantId: "2088000000000099",
        appId: "2026000000000099",
        notifyUrl: "https://app.example.test/recharges/providers/alipay/notify",
        gateway,
      },
      recovery: {
        initiationEnabled: false,
        minimumDispatchWindowMs: 80_000,
        leaseMs: 30_000,
        queryIntervalMs: 1000,
        retryDelayMs: 1000,
        maxFailures: 3,
        slowRetryDelayMs: 60_000,
      },
      verifier: gateway,
      controlled: true,
      shortcutAmounts: [1, 10, 50],
      supportMessage: "请保留充值单号。",
      clock: () => now,
    });
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
    runtime = app.get(RECHARGE_CUSTOMER_RUNTIME);
    accountId = (
      await db.account.create({
        data: { mobile: "+8613900007791", role: "TERMINAL_CUSTOMER" },
      })
    ).id;
    cookie = (await loginWithDevelopmentChallenge(origin, "13900007791"))
      .cookie;
  });
  afterEach(async () => {
    await app?.close();
    await gateway?.dispose?.();
    await clearCustomerData(db);
  });
  afterAll(async () => {
    http.mockRestore();
    await db.$disconnect();
  });

  it("commits a cashier grant before returning a private signed POST page", async () => {
    const order = await create();
    expect(order.method).toBe("ALIPAY_PC");
    expect(order.cashier).toBeNull();
    expect(http).not.toHaveBeenCalled();
    const grant = await post(`/recharges/${order.id}/cashier`);
    expect(grant.status).toBe(200);
    const action = (await grant.json()) as { path: string; expiresAt: string };
    expect(action.path).toBe(`/recharges/${order.id}/cashier-page`);
    const stored = await db.rechargeOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { cashierAttempt: true },
    });
    expect(stored.dispatchState).toBe("MAY_EXIST");
    expect(stored.cashierAttempt?.resultKind).toBe("CASHIER");
    expect(
      (await new PostgresAdminRechargeQueries(db).detail(order.id))?.method,
    ).toBe("ALIPAY_PC");
    const page = await fetch(origin + action.path, { headers: { cookie } });
    expect(page.status).toBe(200);
    expect(page.headers.get("cache-control")).toBe("no-store");
    expect(page.headers.get("referrer-policy")).toBe("no-referrer");
    expect(page.headers.get("content-security-policy")).toContain(
      "form-action https://openapi.alipay.com",
    );
    const html = await page.text();
    expect(html).toContain('method="post"');
    expect(html).toContain("openapi-sandbox.dl.alipaydev.com");
    expect(html).toContain(stored.merchantOrderNo);
    expect(http).not.toHaveBeenCalled();
  });

  it("accepts a signed callback, persists before success ACK and credits once", async () => {
    const created = await create();
    await post(`/recharges/${created.id}/cashier`);
    const order = await db.rechargeOrder.findUniqueOrThrow({
      where: { id: created.id },
    });
    const raw = notification(order);
    for (let i = 0; i < 2; i++) {
      const response = await fetch(
        origin + "/recharges/providers/alipay/notify",
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new Uint8Array(raw),
        },
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("success");
    }
    expect(await db.rechargeNotificationReceipt.count()).toBe(1);
    now = new Date(Math.max(Date.now(), now.getTime()) + 1);
    expect((await runtime.runSettlements(10)).applied).toBe(1);
    expect((await runtime.runSettlements(10)).applied).toBe(0);
    const settled = await db.rechargeOrder.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(settled.status).toBe("SUCCESSFUL");
    expect(settled.paidAt).toBeNull();
    expect(settled.creditConfirmedAt).not.toBeNull();
    expect(
      await db.pointChange.count({ where: { rechargeOrderId: created.id } }),
    ).toBe(1);
    expect(
      (
        await db.pointAccount.findUniqueOrThrow({
          where: { accountId },
        })
      ).fundedBalance,
    ).toBe(10);
  });

  it("accepts later notification metadata after a query already credited the trade", async () => {
    const created = await create();
    await post(`/recharges/${created.id}/cashier`);
    const order = await db.rechargeOrder.findUniqueOrThrow({
      where: { id: created.id },
    });
    const scheduled = await db.rechargeOrder.findUniqueOrThrow({
      where: { id: created.id },
      select: { nativeNextActionAt: true },
    });
    now = new Date(scheduled.nativeNextActionAt!.getTime() + 1);
    http.mockResolvedValueOnce(
      signedResponse({
        out_trade_no: order.merchantOrderNo,
        trade_no: "20260915000000000123",
        trade_status: "TRADE_SUCCESS",
        total_amount: "1.00",
      }),
    );
    expect(await runtime.runOrders(10)).toEqual({ claimed: 1, failed: 0 });
    expect(
      (
        await db.rechargeOperationAttempt.findFirstOrThrow({
          where: { orderId: created.id, kind: "QUERY" },
          orderBy: { generation: "desc" },
        })
      ).resultKind,
    ).toBe("SUCCESS");
    expect((await runtime.runSettlements(10)).applied).toBe(1);
    const credited = await db.rechargeOrder.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(credited.status).toBe("SUCCESSFUL");
    expect(credited.paidAt).toBeNull();

    const raw = notification(order, {
      trade_no: "20260915000000000123",
      gmt_payment: "2026-09-15 12:00:02",
    });
    const response = await fetch(
      origin + "/recharges/providers/alipay/notify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new Uint8Array(raw),
      },
    );
    expect(await response.text()).toBe("success");
    now = new Date(Math.max(Date.now(), now.getTime()) + 1);
    expect((await runtime.runSettlements(10)).applied).toBe(1);
    const reconciled = await db.rechargeOrder.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(reconciled.reviewReason).toBeNull();
    expect(reconciled.status).toBe("SUCCESSFUL");
    expect(
      await db.pointChange.count({ where: { rechargeOrderId: created.id } }),
    ).toBe(1);
  });

  it("ACKs authenticated waiting events without credit and closes after query plus close proof", async () => {
    const created = await create();
    await post(`/recharges/${created.id}/cashier`);
    const order = await db.rechargeOrder.findUniqueOrThrow({
      where: { id: created.id },
    });
    const waiting = notification(order, {
      trade_status: "WAIT_BUYER_PAY",
    });
    const received = await fetch(
      origin + "/recharges/providers/alipay/notify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new Uint8Array(waiting),
      },
    );
    expect(received.status).toBe(200);
    expect(await received.text()).toBe("success");
    expect(
      (await db.rechargeNotificationReceipt.findFirstOrThrow()).processedAt,
    ).not.toBeNull();
    expect((await runtime.runSettlements(10)).applied).toBe(0);

    await post(`/recharges/${created.id}/cancel`);
    http.mockResolvedValueOnce(
      signedResponse({
        out_trade_no: order.merchantOrderNo,
        trade_status: "WAIT_BUYER_PAY",
        total_amount: "1.00",
      }),
    );
    await runtime.runOrders(10);
    http.mockResolvedValueOnce(
      signedResponse({
        out_trade_no: order.merchantOrderNo,
        trade_no: "20260915000000000100",
      }),
    );
    await runtime.runOrders(10);
    expect(
      (await db.rechargeOrder.findUniqueOrThrow({ where: { id: created.id } }))
        .status,
    ).toBe("CLOSED");
  });

  it("rejects altered notification identity and keeps the order unpaid", async () => {
    const created = await create();
    const order = await db.rechargeOrder.findUniqueOrThrow({
      where: { id: created.id },
    });
    const raw = notification(order, { seller_id: "2088000000000001" });
    const response = await fetch(
      origin + "/recharges/providers/alipay/notify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new Uint8Array(raw),
      },
    );
    expect(response.status).toBe(400);
    expect(await db.rechargeNotificationReceipt.count()).toBe(0);
    expect(
      (await db.rechargeOrder.findUniqueOrThrow({ where: { id: created.id } }))
        .status,
    ).toBe("PENDING_PAYMENT");
  });
});
