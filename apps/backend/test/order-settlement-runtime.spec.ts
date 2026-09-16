import { describe, it, expect, vi, afterEach } from "vitest";
import { OrderSettlementRuntime } from "../src/application/order-settlement.runtime.js";
import type { FinalOrderSettlementService } from "../src/application/final-order-settlement.service.js";
afterEach(() => vi.useRealTimers());
describe("bounded final settlement worker", () => {
  it("advances past unresolved and failed orders, then wraps the cursor", async () => {
    const candidates = vi
      .fn()
      .mockResolvedValueOnce([
        { orderId: "waiting" },
        { orderId: "failed" },
        { orderId: "eligible" },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValue([]);
    const settle = vi
      .fn()
      .mockResolvedValueOnce({ kind: "waiting" })
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValue({ kind: "settled" });
    const runtime = new OrderSettlementRuntime(
      { candidates, settle } as unknown as FinalOrderSettlementService,
      false,
    );
    await runtime.batch();
    await runtime.batch();
    await runtime.batch();
    await runtime.onApplicationShutdown();
    expect(settle.mock.calls.map((c) => c[0])).toEqual([
      "waiting",
      "failed",
      "eligible",
    ]);
    expect(candidates.mock.calls.map((c) => c[0])).toEqual([
      null,
      "eligible",
      null,
    ]);
  });
  it("does not start when disabled, and waits for its active transaction on shutdown", async () => {
    vi.useFakeTimers();
    const completed = Promise.withResolvers<{ kind: "settled" }>();
    const candidates = vi.fn().mockResolvedValue([{ orderId: "one" }]);
    const settle = vi.fn(() => completed.promise);
    const service = {
      candidates,
      settle,
    } as unknown as FinalOrderSettlementService;
    const disabled = new OrderSettlementRuntime(service, false);
    disabled.onModuleInit();
    await vi.advanceTimersByTimeAsync(20000);
    expect(candidates).not.toHaveBeenCalled();
    await disabled.onApplicationShutdown();
    const active = new OrderSettlementRuntime(service, true);
    active.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(settle).toHaveBeenCalledTimes(1);
    let stopped = false;
    const shutdown = active.onApplicationShutdown().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);
    completed.resolve({ kind: "settled" });
    await shutdown;
    await vi.advanceTimersByTimeAsync(20000);
    expect(settle).toHaveBeenCalledTimes(1);
  });
});
