import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import type { RechargePaymentGateway } from "../src/recharge/application/provider-payment.js";
import type { RechargeChannelConfiguration } from "../src/recharge/recharge-api.module.js";
import { clearCustomerData } from "./customer-data.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { rechargeApiFixture } from "./recharge-api.fixture.js";

const config = loadIntegrationApiConfig();

describe("dual-provider recharge API composition", () => {
  const db = new PrismaService(config.databaseUrl);
  let app: INestApplication, origin: string, accountId: string, cookie: string;

  beforeAll(() => db.$connect());
  beforeEach(async () => {
    await clearCustomerData(db);
    const wechat = rechargeApiFixture();
    const alipayGateway: RechargePaymentGateway = {
      provider: "ALIPAY",
      method: "ALIPAY_PC",
      actionKind: "CASHIER_PAGE",
      prepareCashier: () => ({
        ok: true,
        value: {
          kind: "CASHIER_PAGE",
          html: '<form method="post"></form>',
          paymentExpiresAt: new Date(Date.now() + 600_000).toISOString(),
        },
      }),
      query: async () => ({
        ok: false,
        error: { kind: "UNRESOLVED", code: "TRANSPORT" },
      }),
      close: async () => ({
        ok: false,
        error: { kind: "UNRESOLVED", code: "TRANSPORT" },
      }),
      verifyNotification: () => ({
        ok: false,
        error: { kind: "INVALID_NOTIFICATION", code: "AUTH_SIGNATURE" },
      }),
    };
    const alipay: RechargeChannelConfiguration = {
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
        description: "受控积分充值测试",
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
        gateway: alipayGateway,
      },
      recovery: {
        initiationEnabled: false,
        minimumDispatchWindowMs: 80_000,
        leaseMs: 30_000,
        queryIntervalMs: 5_000,
        retryDelayMs: 10_000,
        maxFailures: 3,
        slowRetryDelayMs: 60_000,
      },
      verifier: alipayGateway,
    };
    const wechatVerifyOnly: RechargeChannelConfiguration = {
      ...wechat.configuration,
      preparation: {
        ...wechat.configuration.preparation,
        createEnabled: false,
      },
      recovery: {
        ...wechat.configuration.recovery,
        initiationEnabled: false,
      },
    };
    app = await createApiApp(config, false, {
      channels: [wechatVerifyOnly, alipay],
      controlled: true,
      shortcutAmounts: [1, 10, 50],
      supportMessage: "请保留充值单号。",
    });
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
    accountId = (
      await db.account.create({
        data: { mobile: "+8613900007792", role: "TERMINAL_CUSTOMER" },
      })
    ).id;
    cookie = (await loginWithDevelopmentChallenge(origin, "13900007792"))
      .cookie;
  });
  afterEach(async () => {
    await app?.close();
    await clearCustomerData(db);
  });
  afterAll(() => db.$disconnect());

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

  it("keeps verify-only WeChat recovery configured without accepting new WeChat orders", async () => {
    const options = await fetch(origin + "/recharges/options", {
      headers: { cookie, "x-geoeval-account": accountId },
    });
    expect(await options.json()).toMatchObject({
      available: true,
      methods: ["ALIPAY_PC"],
    });

    const create = async (method: "WECHAT_NATIVE" | "ALIPAY_PC") => {
      const response = await post("/recharges", {
        amountYuan: 1,
        method,
        idempotencyKey: randomUUID(),
      });
      expect(response.status).toBe(200);
      return (await response.json()).order as { id: string; method: string };
    };
    const alipay = await create("ALIPAY_PC");
    expect(alipay.method).toBe("ALIPAY_PC");

    const blocked = await post("/recharges", {
      amountYuan: 1,
      method: "WECHAT_NATIVE",
      idempotencyKey: randomUUID(),
    });
    expect(blocked.status).toBe(503);
    expect(
      await db.rechargeOrder.count({ where: { method: "WECHAT_NATIVE" } }),
    ).toBe(0);

    const cashier = await post(`/recharges/${alipay.id}/cashier`);
    expect(cashier.status).toBe(200);
    expect(await cashier.json()).toMatchObject({
      path: `/recharges/${alipay.id}/cashier-page`,
    });
  });

  it("registers both provider callback routes", async () => {
    const wechat = await fetch(origin + "/recharges/providers/wechat/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const alipay = await fetch(origin + "/recharges/providers/alipay/notify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "x=1",
    });
    expect(wechat.status).not.toBe(404);
    expect(alipay.status).not.toBe(404);
  });
});
