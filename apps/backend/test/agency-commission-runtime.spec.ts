import { describe, it, expect, vi, afterEach } from "vitest";
import { AgencyCommissionRuntime } from "../src/application/agency-commission.runtime.js";
import type { AgencyCommissionService } from "../src/application/agency-commission.service.js";
afterEach(() => vi.useRealTimers());
describe("bounded final accruement worker", () => {
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
    const accrue = vi
      .fn()
      .mockResolvedValueOnce({ kind: "waiting" })
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValue({ kind: "accrued" });
    const runtime = new AgencyCommissionRuntime(
      { candidates, accrue } as unknown as AgencyCommissionService,
      false,
    );
    await runtime.batch();
    await runtime.batch();
    await runtime.batch();
    await runtime.onApplicationShutdown();
    expect(accrue.mock.calls.map((c) => c[0])).toEqual([
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
    const completed = Promise.withResolvers<{ kind: "accrued" }>();
    const candidates = vi.fn().mockResolvedValue([{ orderId: "one" }]);
    const accrue = vi.fn(() => completed.promise);
    const service = {
      candidates,
      accrue,
    } as unknown as AgencyCommissionService;
    const disabled = new AgencyCommissionRuntime(service, false);
    disabled.onModuleInit();
    await vi.advanceTimersByTimeAsync(20000);
    expect(candidates).not.toHaveBeenCalled();
    await disabled.onApplicationShutdown();
    const active = new AgencyCommissionRuntime(service, true);
    active.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(accrue).toHaveBeenCalledTimes(1);
    let stopped = false;
    const shutdown = active.onApplicationShutdown().then(() => {
      stopped = true;
    });
    await Promise.resolve();
    expect(stopped).toBe(false);
    completed.resolve({ kind: "accrued" });
    await shutdown;
    await vi.advanceTimersByTimeAsync(20000);
    expect(accrue).toHaveBeenCalledTimes(1);
  });
});
