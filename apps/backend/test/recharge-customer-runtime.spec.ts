import { describe, expect, it, vi } from "vitest";
import type { RechargeOrder } from "../src/recharge/domain/recharge-order.js";
import type { NativeRecoveryService } from "../src/recharge/application/native-recovery.service.js";
import { RoutedRechargeCustomerRuntime } from "../src/recharge/application/recharge-customer-runtime.js";
import type { RechargeMethod } from "../src/recharge/application/provider-payment.js";

function runtime(method: RechargeMethod) {
  const order = { id: method } as unknown as RechargeOrder;
  return {
    supports: (candidate: RechargeMethod) => candidate === method,
    create: vi.fn(async () => order),
    cancel: vi.fn(async () => null),
    verify: vi.fn(async () => null),
    grantCashier: vi.fn(async () => ({ path: "/cashier", expiresAt: "later" })),
    cashierPage: vi.fn(async () => "<form></form>"),
    onApplicationShutdown: vi.fn(async () => undefined),
  } as unknown as NativeRecoveryService;
}

describe("multi-channel customer recharge routing", () => {
  it("routes creation and existing-order commands by frozen method", async () => {
    const wechat = runtime("WECHAT_NATIVE"),
      alipay = runtime("ALIPAY_PC"),
      routed = new RoutedRechargeCustomerRuntime([alipay, wechat]);

    expect(routed.supports("WECHAT_NATIVE")).toBe(true);
    expect(routed.supports("ALIPAY_PC")).toBe(true);
    await routed.create("account", { method: "WECHAT_NATIVE" });
    await routed.verify("account", "wechat-order", "WECHAT_NATIVE");
    await routed.grantCashier("account", "alipay-order", "ALIPAY_PC");

    expect(wechat.create).toHaveBeenCalledOnce();
    expect(wechat.verify).toHaveBeenCalledWith("account", "wechat-order");
    expect(alipay.grantCashier).toHaveBeenCalledWith("account", "alipay-order");
    expect(alipay.create).not.toHaveBeenCalled();
  });

  it("rejects unknown or duplicate channel routes and disposes every channel", async () => {
    const wechat = runtime("WECHAT_NATIVE"),
      alipay = runtime("ALIPAY_PC"),
      routed = new RoutedRechargeCustomerRuntime([wechat, alipay]);

    expect(() => routed.create("account", { method: "CARD" })).toThrow(
      "INVALID_INPUT",
    );
    expect(() => new RoutedRechargeCustomerRuntime([wechat, wechat])).toThrow(
      "RECHARGE_CHANNEL_DUPLICATE",
    );
    await routed.onApplicationShutdown();
    expect(wechat.onApplicationShutdown).toHaveBeenCalledOnce();
    expect(alipay.onApplicationShutdown).toHaveBeenCalledOnce();
  });
});
