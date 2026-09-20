import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { NativeCheckoutSnapshot } from "../src/recharge/application/native-recovery.js";
import { runWechatPrepayCloseAcceptance } from "../src/recharge/application/wechat-recharge-acceptance.js";
import type { RechargeOrder } from "../src/recharge/domain/recharge-order.js";
import { parseWechatRechargeAcceptanceOptions } from "../src/recharge/wechat-recharge-acceptance.options.js";

const accountId = randomUUID(),
  idempotencyKey = randomUUID(),
  order: RechargeOrder = {
    id: randomUUID(),
    accountId,
    idempotencyKey,
    amountYuan: 1,
    amountFen: 100,
    fundedPoints: 10,
    provider: "WECHAT",
    merchantId: "1117725778",
    appId: "wx0402876c556f2029",
    merchantOrderNo: randomUUID().replaceAll("-", ""),
    method: "WECHAT_NATIVE",
    status: "PENDING_PAYMENT",
    dispatchState: "UNSENT",
    expiresAt: "2026-09-20T12:15:00.000Z",
    createdAt: "2026-09-20T12:00:00.000Z",
    paidAt: null,
    creditConfirmedAt: null,
    closedAt: null,
    ledgerId: null,
    reviewReason: null,
  };

function snapshot(
  status: RechargeOrder["status"],
  qr: boolean,
): NativeCheckoutSnapshot {
  return {
    order: {
      ...order,
      status,
      dispatchState: qr ? "MAY_EXIST" : order.dispatchState,
    },
    cancelRequested: status === "CONFIRMING" || status === "CLOSED",
    canCancel: status === "PENDING_PAYMENT",
    qr: qr
      ? {
          value: "weixin://wxpay/bizpayurl/up?pr=CONTROLLED_ACCEPTANCE",
          expiresAt: order.expiresAt,
        }
      : null,
    cashier: null,
    nextActionAt: null,
    reviewRequired: false,
  };
}

describe("controlled persisted WeChat prepay-close acceptance", () => {
  it("keeps the CLI mode outside the strict acceptance request", () => {
    expect(
      parseWechatRechargeAcceptanceOptions([
        "prepay-close",
        "--account-id",
        accountId,
        "--idempotency-key",
        idempotencyKey,
      ]),
    ).toEqual({
      mode: "prepay-close",
      request: { accountId, idempotencyKey },
    });
  });

  it("uses one exact persisted order and never returns its QR", async () => {
    let phase = 0;
    const runtime = {
      create: vi.fn(async () => order),
      read: vi.fn(async () =>
        phase === 0
          ? snapshot("PENDING_PAYMENT", false)
          : phase === 1
            ? snapshot("PENDING_PAYMENT", true)
            : phase < 4
              ? snapshot("CONFIRMING", false)
              : snapshot("CLOSED", false),
      ),
      runOrder: vi.fn(async () => {
        phase++;
        return { claimed: 1, failed: 0 };
      }),
      cancel: vi.fn(async () => {
        phase = 2;
        return snapshot("CONFIRMING", false);
      }),
    };

    const evidence = await runWechatPrepayCloseAcceptance(runtime, {
      accountId,
      idempotencyKey,
    });

    expect(runtime.create).toHaveBeenCalledWith(accountId, {
      amountYuan: 1,
      idempotencyKey,
      method: "WECHAT_NATIVE",
    });
    expect(runtime.runOrder).toHaveBeenCalledTimes(3);
    expect(runtime.runOrder).toHaveBeenCalledWith(order.id);
    expect(runtime.cancel).toHaveBeenCalledWith(accountId, order.id);
    expect(evidence).toEqual({
      orderId: order.id,
      merchantOrderNo: order.merchantOrderNo,
      amountYuan: 1,
      fundedPoints: 10,
      status: "CLOSED",
      provider: "WECHAT",
      method: "WECHAT_NATIVE",
      qrResponseVerified: true,
      drivenOperations: 3,
    });
    expect(JSON.stringify(evidence)).not.toContain("weixin://");
  });

  it("leaves an uncertain persisted order for normal recovery", async () => {
    const runtime = {
      create: vi.fn(async () => order),
      read: vi.fn(async () => snapshot("PENDING_PAYMENT", false)),
      runOrder: vi.fn(async () => ({ claimed: 0, failed: 0 })),
      cancel: vi.fn(),
    };
    await expect(
      runWechatPrepayCloseAcceptance(runtime, { accountId, idempotencyKey }),
    ).rejects.toThrow("RECHARGE_ACCEPTANCE_RECOVERY_REQUIRED");
    expect(runtime.cancel).not.toHaveBeenCalled();
  });

  it("publishes a one-yuan, path-only production profile", () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../.."),
      environment = readFileSync(
        resolve(root, "deploy/recharge-acceptance/wechat.env.example"),
        "utf8",
      );
    expect(environment).toContain("RECHARGE_WECHAT_ACTIVATION=live");
    expect(environment).toContain("RECHARGE_MIN_AMOUNT_YUAN=1");
    expect(environment).toContain("RECHARGE_MAX_AMOUNT_YUAN=1");
    expect(environment).toContain("RECHARGE_SHORTCUT_AMOUNTS=1");
    expect(environment).toContain(
      "RECHARGE_WECHAT_NOTIFY_URL=https://app.geohdp.com/recharges/providers/wechat/notify",
    );
    expect(environment).toContain(
      "RECHARGE_WECHAT_PRIVATE_KEY_FILE=/opt/geoeval/shared/secrets/wechat/merchant_private_key.pem",
    );
    expect(environment).not.toMatch(/BEGIN (?:RSA )?(?:PRIVATE|PUBLIC) KEY/);
    expect(environment).not.toMatch(/API_V3_KEY=[A-Za-z0-9]{32}/);
  });
});
