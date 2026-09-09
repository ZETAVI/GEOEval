import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RechargeWorkerRuntime,
  type RechargeWorkerEvent,
} from "../src/recharge/recharge-worker.runtime.js";
import { NativeRecoveryService } from "../src/recharge/application/native-recovery.service.js";
import type {
  NativeRecoveryRepository,
  NativeChannel,
} from "../src/recharge/application/native-recovery.js";
import type { RechargeCoreService } from "../src/recharge/application/recharge-core.service.js";

const policy = {
  orderIntervalMs: 100,
  settlementIntervalMs: 100,
  failureIntervalMs: 500,
  drainWarningMs: 200,
};
const workers: RechargeWorkerRuntime[] = [];
afterEach(async () => {
  await Promise.all(workers.splice(0).map((w) => w.stop()));
  vi.useRealTimers();
});
function fixture(orders = vi.fn(async () => ({ claimed: 0, failed: 0 }))) {
  vi.useFakeTimers();
  const settlements = vi.fn(async () => ({
    applied: 0,
    reviewed: 0,
    failed: 0,
  }));
  const events: RechargeWorkerEvent[] = [];
  const w = new RechargeWorkerRuntime(
    { runOrders: orders, runSettlements: settlements },
    policy,
    (e) => events.push(e),
  );
  workers.push(w);
  return { w, orders, settlements, events };
}
describe("resident Recharge scheduling and drain", () => {
  it("never overlaps an order call while settlement continues independently", async () => {
    let release!: (r: { claimed: number; failed: number }) => void;
    const f = fixture(
      vi.fn(
        () =>
          new Promise((r) => {
            release = r;
          }),
      ),
    );
    f.w.onApplicationBootstrap();
    f.w.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.orders).toHaveBeenCalledTimes(1);
    expect(f.settlements.mock.calls.length).toBeGreaterThan(5);
    expect(f.orders).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    expect(f.w.snapshot().orders.inFlight).toBe(true);
    const stop = f.w.stop();
    release({ claimed: 1, failed: 0 });
    await stop;
    expect(f.w.snapshot().phase).toBe("stopped");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("backs off failures without exporting errors and reports one recovery", async () => {
    const orders = vi
      .fn()
      .mockRejectedValueOnce(new Error("private-key merchant secret-url"))
      .mockResolvedValueOnce({ claimed: 0, failed: 1 })
      .mockResolvedValue({ claimed: 1, failed: 0 });
    const f = fixture(orders);
    f.w.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(499);
    expect(orders).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(501);
    expect(orders).toHaveBeenCalledTimes(3);
    expect(f.events.filter((e) => e.kind === "LANE_FAILED")).toHaveLength(1);
    expect(f.events.filter((e) => e.kind === "LANE_RECOVERED")).toHaveLength(1);
    expect(
      JSON.stringify(f.w.snapshot()) + JSON.stringify(f.events),
    ).not.toMatch(/private-key|merchant|secret-url/);
    const snapshot = f.w.snapshot();
    snapshot.orders.result!.claimed = 999;
    expect(f.w.snapshot().orders.result?.claimed).toBe(1);
  });
  it("retains unresolved drain after warning; repeated stop neither detaches nor restarts work", async () => {
    let release!: (r: { claimed: number; failed: number }) => void;
    const f = fixture(
      vi.fn(
        () =>
          new Promise((r) => {
            release = r;
          }),
      ),
    );
    f.w.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    let drained = false;
    const stop = f.w.stop();
    void stop.then(() => {
      drained = true;
    });
    expect(f.w.stop()).toBe(stop);
    f.w.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(1000);
    expect(drained).toBe(false);
    expect(f.w.snapshot().phase).toBe("stopping");
    expect(f.events.filter((e) => e.kind === "DRAIN_PENDING")).toHaveLength(1);
    expect(f.orders).toHaveBeenCalledTimes(1);
    release({ claimed: 1, failed: 0 });
    await stop;
    expect(f.events.at(-1)?.kind).toBe("STOPPED");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("reports review work separately and a broken diagnostic sink does not stop scheduling", async () => {
    const f = fixture();
    f.settlements.mockResolvedValueOnce({ applied: 0, reviewed: 1, failed: 0 });
    f.w.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    expect(f.events).toContainEqual({
      kind: "REVIEW_REQUIRED",
      lane: "settlements",
      count: 1,
    });
    expect(f.w.snapshot().settlements.consecutiveFailures).toBe(0);
    const w = new RechargeWorkerRuntime(
      { runOrders: f.orders, runSettlements: f.settlements },
      policy,
      () => {
        throw new Error("sink");
      },
    );
    workers.push(w);
    w.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(200);
    expect(w.snapshot().orders.lastFinishedAt).not.toBeNull();
  });
  it("rejects unsafe or silently defaulted scheduler policy", () => {
    const work = {
      runOrders: async () => ({ claimed: 0, failed: 0 }),
      runSettlements: async () => ({ applied: 0, reviewed: 0, failed: 0 }),
    };
    for (const p of [
      { ...policy, orderIntervalMs: 0 },
      { ...policy, orderIntervalMs: 101, failureIntervalMs: 100 },
      { ...policy, drainWarningMs: 0 },
      {},
    ])
      expect(
        () => new RechargeWorkerRuntime(work, p as typeof policy),
      ).toThrow();
  });
});

describe("Native stop signal fences only future work", () => {
  const p = {
    initiationEnabled: true,
    minimumDispatchWindowMs: 80_000,
    leaseMs: 30_000,
    queryIntervalMs: 1000,
    retryDelayMs: 1000,
    maxFailures: 3,
  };
  function runtime(
    repo: Partial<NativeRecoveryRepository>,
    channel: Partial<NativeChannel> = {},
  ) {
    return new NativeRecoveryService(
      {} as RechargeCoreService,
      repo as NativeRecoveryRepository,
      channel as NativeChannel,
      p,
    );
  }
  it("does not even scan when already stopped, nor claim after a stopped scan resolves", async () => {
    const abort = new AbortController();
    let release!: (ids: string[]) => void;
    const dueOrderIds = vi.fn(
        () =>
          new Promise<string[]>((r) => {
            release = r;
          }),
      ),
      claim = vi.fn();
    const service = runtime({ dueOrderIds, claim });
    const running = service.runOrders(10, abort.signal);
    abort.abort();
    release(["one", "two"]);
    expect(await running).toEqual({ claimed: 0, failed: 0 });
    expect(claim).not.toHaveBeenCalled();
    await service.runOrders(10, abort.signal);
    await service.runSettlements(10, abort.signal);
    expect(dueOrderIds).toHaveBeenCalledTimes(1);
  });
  it("finishes a begun claim/result commit after stop without claiming the next order", async () => {
    const abort = new AbortController(),
      complete = vi.fn(async () => {});
    const claim = vi.fn(async () => {
      abort.abort();
      return { id: "attempt", orderId: "one", kind: "QUERY", order: {} };
    });
    const gateway = {
      query: vi.fn(async () => ({
        ok: false,
        error: { kind: "UNRESOLVED", code: "TRANSPORT" },
      })),
    };
    const service = runtime(
      {
        dueOrderIds: async () => ["one", "two"],
        claim: claim as never,
        complete,
      },
      { gateway: gateway as never },
    );
    expect(await service.runOrders(10, abort.signal)).toEqual({
      claimed: 1,
      failed: 0,
    });
    expect(claim).toHaveBeenCalledTimes(1);
    expect(gateway.query).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it("does not settle a scan result that arrives after stop", async () => {
    const abort = new AbortController(),
      settleQuery = vi.fn();
    const service = runtime({
      dueSettlements: async () => {
        abort.abort();
        return [{ kind: "QUERY", attemptId: "one" }];
      },
      settleQuery,
    });
    expect(await service.runSettlements(10, abort.signal)).toEqual({
      applied: 0,
      reviewed: 0,
      failed: 0,
    });
    expect(settleQuery).not.toHaveBeenCalled();
  });
});
