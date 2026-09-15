import type {
  BeforeApplicationShutdown,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { z } from "zod";
import type { NativeRecoveryService } from "./application/native-recovery.service.js";

const policySchema = z
  .object({
    orderIntervalMs: z.number().int().min(100).max(60_000),
    notificationIntervalMs: z.number().int().min(100).max(60_000).optional(),
    settlementIntervalMs: z.number().int().min(100).max(60_000),
    failureIntervalMs: z.number().int().min(100).max(300_000),
    drainWarningMs: z.number().int().min(100).max(300_000),
  })
  .strict()
  .refine(
    (p) =>
      p.failureIntervalMs >=
      Math.max(
        p.orderIntervalMs,
        p.settlementIntervalMs,
        p.notificationIntervalMs ?? 0,
      ),
  );
export type RechargeWorkerPolicy = z.infer<typeof policySchema>;
type Lane = "orders" | "settlements" | "notifications";
type Phase = "created" | "running" | "stopping" | "stopped";
type Result = {
  failed: number;
  claimed?: number;
  applied?: number;
  delivered?: number;
  reviewed?: number;
};
type LaneState = {
  inFlight: boolean;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  consecutiveFailures: number;
  result: Result | null;
};
export type RechargeWorkerEvent = Readonly<{
  kind:
    | "STARTED"
    | "STOPPING"
    | "STOPPED"
    | "LANE_FAILED"
    | "LANE_RECOVERED"
    | "REVIEW_REQUIRED"
    | "DRAIN_PENDING";
  lane?: Lane;
  count?: number;
}>;
type Work = Pick<NativeRecoveryService, "runOrders" | "runSettlements"> & {
  runNotifications?: (limit: number, stop?: AbortSignal) => Promise<Result>;
  dispose?: () => Promise<void> | void;
};

/** Scheduling only. Durable ownership, deadlines and settlement stay in Native/C1. */
export class RechargeWorkerRuntime
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private phase: Phase = "created";
  private readonly stopSignal = new AbortController();
  private readonly policy: Readonly<RechargeWorkerPolicy>;
  private readonly timers = new Map<Lane, NodeJS.Timeout>();
  private readonly pending = new Map<Lane, Promise<void>>();
  private drain: Promise<void> | undefined;
  private readonly lanes: Record<Lane, LaneState> = {
    orders: blank(),
    settlements: blank(),
    notifications: blank(),
  };
  constructor(
    private readonly work: Work,
    policy: RechargeWorkerPolicy,
    private readonly report: (event: RechargeWorkerEvent) => void = reportEvent,
  ) {
    this.policy = Object.freeze(policySchema.parse(policy));
    if (
      (this.policy.notificationIntervalMs !== undefined) !==
      (work.runNotifications !== undefined)
    )
      throw new Error("INCOMPLETE_NOTIFICATION_LANE");
  }

  onApplicationBootstrap() {
    if (this.phase !== "created") return;
    this.phase = "running";
    this.emit({ kind: "STARTED" });
    this.schedule("orders", 0);
    this.schedule("settlements", 0);
    if (this.work.runNotifications) this.schedule("notifications", 0);
  }
  snapshot() {
    return {
      phase: this.phase,
      notifications: this.work.runNotifications
        ? {
            ...this.lanes.notifications,
            result: copy(this.lanes.notifications.result),
          }
        : null,
      orders: { ...this.lanes.orders, result: copy(this.lanes.orders.result) },
      settlements: {
        ...this.lanes.settlements,
        result: copy(this.lanes.settlements.result),
      },
    };
  }
  beforeApplicationShutdown() {
    return this.stop();
  }
  stop(): Promise<void> {
    if (this.drain) return this.drain;
    this.phase = "stopping";
    this.stopSignal.abort();
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.emit({ kind: "STOPPING" });
    // A warning is not cancellation. Keep waiting before Persistence closes.
    let warned = false;
    const warning = setInterval(() => {
      if (!warned) {
        warned = true;
        this.emit({ kind: "DRAIN_PENDING" });
      }
    }, this.policy.drainWarningMs);
    this.drain = (async () => {
      try {
        await Promise.all([...this.pending.values()]);
        await this.work.dispose?.();
      } finally {
        clearInterval(warning);
        this.phase = "stopped";
        this.emit({ kind: "STOPPED" });
      }
    })();
    return this.drain;
  }
  private schedule(lane: Lane, delay: number) {
    if (this.phase !== "running") return;
    this.timers.set(
      lane,
      setTimeout(() => {
        this.timers.delete(lane);
        if (this.phase !== "running") return;
        // Defer entry so stop() can always see the current operation in pending.
        const operation = Promise.resolve().then(() => this.run(lane));
        this.pending.set(lane, operation);
        void operation.finally(() => this.pending.delete(lane));
      }, delay),
    );
  }
  private async run(lane: Lane) {
    if (this.phase !== "running") return;
    const state = this.lanes[lane];
    state.inFlight = true;
    state.lastStartedAt = new Date().toISOString();
    let result: Result;
    try {
      result =
        lane === "orders"
          ? await this.work.runOrders(1, this.stopSignal.signal)
          : lane === "settlements"
            ? await this.work.runSettlements(1, this.stopSignal.signal)
            : await this.work.runNotifications!(1, this.stopSignal.signal);
    } catch {
      result = { failed: 1 }; // Never log raw errors, request data or credentials.
    }
    // Explicit projection also prevents injected runtimes from exporting private fields.
    state.result = {
      failed: result.failed,
      ...(lane === "notifications" && result.delivered !== undefined
        ? { delivered: result.delivered }
        : {}),
      ...(lane === "orders" && result.claimed !== undefined
        ? { claimed: result.claimed }
        : {}),
      ...(lane === "settlements" && result.applied !== undefined
        ? { applied: result.applied }
        : {}),
      ...(lane !== "orders" && result.reviewed !== undefined
        ? { reviewed: result.reviewed }
        : {}),
    };
    state.lastFinishedAt = new Date().toISOString();
    state.inFlight = false;
    if (result.failed > 0) {
      if (state.consecutiveFailures === 0)
        this.emit({ kind: "LANE_FAILED", lane });
      state.consecutiveFailures++;
    } else {
      if (state.consecutiveFailures > 0)
        this.emit({ kind: "LANE_RECOVERED", lane });
      state.consecutiveFailures = 0;
    }
    if (result.reviewed)
      this.emit({ kind: "REVIEW_REQUIRED", lane, count: result.reviewed });
    this.schedule(
      lane,
      result.failed > 0
        ? this.policy.failureIntervalMs
        : lane === "orders"
          ? this.policy.orderIntervalMs
          : lane === "settlements"
            ? this.policy.settlementIntervalMs
            : this.policy.notificationIntervalMs!,
    );
  }
  private emit(event: RechargeWorkerEvent) {
    try {
      this.report(event);
    } catch {
      /* A reporting sink cannot change payment work. */
    }
  }
}
function blank(): LaneState {
  return {
    inFlight: false,
    lastStartedAt: null,
    lastFinishedAt: null,
    consecutiveFailures: 0,
    result: null,
  };
}
function copy(value: Result | null) {
  return value ? { ...value } : null;
}
function reportEvent(event: RechargeWorkerEvent) {
  process.stdout.write(
    `${JSON.stringify({ process: "recharge-worker", ...event })}\n`,
  );
}
