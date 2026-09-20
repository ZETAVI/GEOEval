import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  prepareAlipayPaymentAcceptance,
  reconcileAlipayPaymentAcceptance,
} from "../src/recharge/application/alipay-recharge-acceptance.js";
import type { NativeCheckoutSnapshot } from "../src/recharge/application/native-recovery.js";
import type { RechargeOrder } from "../src/recharge/domain/recharge-order.js";
import { parseAlipayRechargeAcceptanceOptions } from "../src/recharge/alipay-recharge-acceptance.options.js";

const accountId = randomUUID(),
  idempotencyKey = randomUUID(),
  orderId = randomUUID(),
  expiresAt = "2026-09-20T12:15:00.000Z",
  order: RechargeOrder = {
    id: orderId,
    accountId,
    idempotencyKey,
    amountYuan: 1,
    amountFen: 100,
    fundedPoints: 10,
    provider: "ALIPAY",
    merchantId: "2088000000000099",
    appId: "2026000000000099",
    merchantOrderNo: randomUUID().replaceAll("-", ""),
    method: "ALIPAY_PC",
    status: "PENDING_PAYMENT",
    dispatchState: "MAY_EXIST",
    expiresAt,
    createdAt: "2026-09-20T12:00:00.000Z",
    paidAt: null,
    creditConfirmedAt: null,
    closedAt: null,
    ledgerId: null,
    reviewReason: null,
  };

function snapshot(
  status: RechargeOrder["status"],
  input: { ledgerId?: string; reviewRequired?: boolean } = {},
): NativeCheckoutSnapshot {
  return {
    order: {
      ...order,
      status,
      paidAt: status === "SUCCESSFUL" ? "2026-09-20T12:05:00.000Z" : null,
      creditConfirmedAt:
        status === "SUCCESSFUL" ? "2026-09-20T12:05:01.000Z" : null,
      ledgerId: input.ledgerId ?? null,
    },
    cancelRequested: false,
    canCancel: status === "PENDING_PAYMENT",
    qr: null,
    cashier:
      status === "PENDING_PAYMENT" || status === "CONFIRMING"
        ? { path: `/recharges/${orderId}/cashier-page`, expiresAt }
        : null,
    nextActionAt: null,
    reviewRequired: input.reviewRequired ?? false,
  };
}

function runtime(read: () => Promise<NativeCheckoutSnapshot>) {
  return {
    create: vi.fn(async () => order),
    read: vi.fn(read),
    grantCashier: vi.fn(async () => ({
      path: `/recharges/${orderId}/cashier-page`,
      expiresAt,
    })),
    cashierPage: vi.fn(
      async () =>
        '<form method="post" action="https://openapi.alipay.com/gateway.do"></form>',
    ),
    verify: vi.fn(async () => snapshot("PENDING_PAYMENT")),
    runOrder: vi.fn(async () => ({ claimed: 0, failed: 0 })),
    runSettlements: vi.fn(async () => ({
      applied: 0,
      reviewed: 0,
      failed: 0,
    })),
  };
}

describe("controlled persisted Alipay acceptance", () => {
  it("parses strict prepare and reconcile commands", () => {
    expect(
      parseAlipayRechargeAcceptanceOptions([
        "prepare",
        "--account-id",
        accountId,
        "--idempotency-key",
        idempotencyKey,
        "--cashier-file",
        "/run/geoeval-alipay-acceptance/one-yuan.html",
      ]),
    ).toEqual({
      mode: "prepare",
      accountId,
      idempotencyKey,
      cashierFile: "/run/geoeval-alipay-acceptance/one-yuan.html",
    });
    expect(
      parseAlipayRechargeAcceptanceOptions([
        "reconcile",
        "--account-id",
        accountId,
        "--order-id",
        orderId,
      ]),
    ).toEqual({ mode: "reconcile", accountId, orderId });
    expect(() =>
      parseAlipayRechargeAcceptanceOptions([
        "prepare",
        "--account-id",
        accountId,
        "--idempotency-key",
        idempotencyKey,
        "--cashier-file",
        "/tmp/public.html",
      ]),
    ).toThrow();
  });

  it("creates one normal order and returns cashier HTML outside its evidence", async () => {
    const value = runtime(async () => snapshot("PENDING_PAYMENT"));
    const result = await prepareAlipayPaymentAcceptance(value, {
      accountId,
      idempotencyKey,
    });

    expect(value.create).toHaveBeenCalledWith(accountId, {
      amountYuan: 1,
      idempotencyKey,
      method: "ALIPAY_PC",
    });
    expect(value.grantCashier).toHaveBeenCalledWith(accountId, orderId);
    expect(value.cashierPage).toHaveBeenCalledWith(accountId, orderId);
    expect(result.cashierHtml).toContain("https://openapi.alipay.com");
    expect(result.evidence).toMatchObject({
      orderId,
      amountYuan: 1,
      fundedPoints: 10,
      provider: "ALIPAY",
      method: "ALIPAY_PC",
      status: "PENDING_PAYMENT",
      cashierPrepared: true,
    });
    expect(JSON.stringify(result.evidence)).not.toContain("<form");
  });

  it("settles an authenticated callback before making another provider call", async () => {
    let paid = false;
    const value = runtime(async () =>
      paid
        ? snapshot("SUCCESSFUL", { ledgerId: randomUUID() })
        : snapshot("PENDING_PAYMENT"),
    );
    value.runSettlements.mockImplementationOnce(async () => {
      paid = true;
      return { applied: 1, reviewed: 0, failed: 0 };
    });

    const result = await reconcileAlipayPaymentAcceptance(value, {
      accountId,
      orderId,
    });

    expect(result).toMatchObject({
      orderId,
      status: "SUCCESSFUL",
      settlements: { applied: 1, reviewed: 0, failed: 0 },
      providerWork: { claimed: 0, failed: 0 },
    });
    expect(result.ledgerId).toBeTruthy();
    expect(value.verify).not.toHaveBeenCalled();
    expect(value.runOrder).not.toHaveBeenCalled();
  });

  it("keeps an unresolved payment on the same pending order", async () => {
    const value = runtime(async () => snapshot("PENDING_PAYMENT"));
    const result = await reconcileAlipayPaymentAcceptance(value, {
      accountId,
      orderId,
    });

    expect(result).toMatchObject({
      orderId,
      status: "PENDING_PAYMENT",
      ledgerId: null,
      providerWork: { claimed: 0, failed: 0 },
      settlements: { applied: 0, reviewed: 0, failed: 0 },
    });
    expect(value.verify).toHaveBeenCalledWith(accountId, orderId);
    expect(value.runOrder).toHaveBeenCalledWith(orderId);
  });

  it("publishes a one-yuan, path-only production profile", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../.."),
      environment = readFileSync(
        resolve(root, "deploy/recharge-acceptance/alipay.env.example"),
        "utf8",
      );
    expect(environment).toContain("RECHARGE_ALIPAY_ACTIVATION=live");
    expect(environment).toContain("RECHARGE_MIN_AMOUNT_YUAN=1");
    expect(environment).toContain("RECHARGE_MAX_AMOUNT_YUAN=1");
    expect(environment).toContain(
      "RECHARGE_ALIPAY_NOTIFY_URL=https://app.geohdp.com/recharges/providers/alipay/notify",
    );
    expect(environment).toContain(
      "RECHARGE_ALIPAY_PRIVATE_KEY_FILE=/run/geoeval-alipay-acceptance/app_private_key.pem",
    );
    expect(environment).not.toMatch(/BEGIN (?:RSA )?(?:PRIVATE|PUBLIC) KEY/);
  });
});
