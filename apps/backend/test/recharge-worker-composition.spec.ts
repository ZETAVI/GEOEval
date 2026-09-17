import { describe, expect, it, vi } from "vitest";
import { createRechargeRecoveryWork } from "../src/recharge/recharge-worker.module.js";

function recovery(claimed: number, failed: number) {
  return {
    runOrders: vi.fn(async () => ({ claimed, failed })),
    runSettlements: vi.fn(async () => ({
      applied: claimed,
      reviewed: 0,
      failed,
    })),
    onApplicationShutdown: vi.fn(async () => undefined),
  };
}

describe("multi-provider recharge worker composition", () => {
  it("dispatches each provider concurrently and scans shared settlement once", async () => {
    const wechat = recovery(1, 0),
      alipay = recovery(1, 1),
      work = createRechargeRecoveryWork([wechat, alipay]),
      stop = new AbortController().signal;

    await expect(work.runOrders(1, stop)).resolves.toEqual({
      claimed: 2,
      failed: 1,
    });
    expect(wechat.runOrders).toHaveBeenCalledWith(1, stop);
    expect(alipay.runOrders).toHaveBeenCalledWith(1, stop);

    await expect(work.runSettlements(3, stop)).resolves.toEqual({
      applied: 1,
      reviewed: 0,
      failed: 0,
    });
    expect(wechat.runSettlements).toHaveBeenCalledWith(3, stop);
    expect(alipay.runSettlements).not.toHaveBeenCalled();

    await work.dispose();
    expect(wechat.onApplicationShutdown).toHaveBeenCalledOnce();
    expect(alipay.onApplicationShutdown).toHaveBeenCalledOnce();
  });

  it("requires at least one recovery channel", () => {
    expect(() => createRechargeRecoveryWork([])).toThrow(
      "RECHARGE_CHANNELS_REQUIRED",
    );
  });
});
