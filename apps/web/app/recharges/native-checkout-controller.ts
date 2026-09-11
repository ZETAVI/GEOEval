/** Web-owned projection. A future authenticated API adapter maps its DTO here. */
export type NativeCheckoutOrder = Readonly<{
  id: string;
  amountYuan: number;
  points: number;
  status: "PENDING_PAYMENT" | "CONFIRMING" | "SUCCESSFUL" | "CLOSED";
  paymentExpiresAt: string;
  canCancel: boolean;
  canVerify?: boolean;
  cancelRequested?: boolean;
  supportRequired?: boolean;
  qr: Readonly<{ value: string; expiresAt: string }> | null;
}>;
export type NativeCheckoutRead =
  | { kind: "ok"; order: NativeCheckoutOrder; serverTime: string }
  | { kind: "unavailable" }
  | { kind: "access-denied" };
export interface NativeCheckoutSource {
  read(orderId: string, signal: AbortSignal): Promise<NativeCheckoutRead>;
  verify(
    orderId: string,
    signal: AbortSignal,
  ): Promise<"accepted" | "unavailable" | "access-denied">;
  cancel(
    orderId: string,
    signal: AbortSignal,
  ): Promise<"accepted" | "unavailable" | "access-denied">;
}
export interface CancellationMemory {
  read(key: string): boolean;
  write(key: string): void;
  clear(key: string): void;
}
export const cancellationKey = (accountId: string, orderId: string) =>
  `geoeval.recharge.cancel.${encodeURIComponent(JSON.stringify([accountId, orderId]))}`;
export type NativeCheckoutState = Readonly<{
  order: NativeCheckoutOrder | null;
  phase: "loading" | "ready" | "unavailable" | "access-denied";
  busy: "read" | "verify" | "cancel" | null;
  cancelPending: boolean;
  recoveryBlocked: boolean;
  pollingEnded: boolean;
  commandReady: boolean;
  qrValue: string | null;
  remainingSeconds: number;
  notice: string;
}>;
const initial: NativeCheckoutState = {
  order: null,
  phase: "loading",
  busy: null,
  cancelPending: false,
  recoveryBlocked: false,
  pollingEnded: false,
  commandReady: true,
  qrValue: null,
  remainingSeconds: 0,
  notice: "",
};
const terminal = (order: NativeCheckoutOrder | null) =>
  order?.status === "SUCCESSFUL" || order?.status === "CLOSED";
/** Owns local waiting, never a payment or closure transition. No default transport. */
export class NativeCheckoutController {
  private state: NativeCheckoutState = initial;
  private listeners = new Set<() => void>();
  private running = false;
  private visible = true;
  private generation = 0;
  private request: AbortController | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private budgetUntil = 0;
  private nextReadAt = 0;
  private qrUntil = 0;
  private paymentUntil = 0;
  private lastCommandAt = -Infinity;
  private verificationRequested = false;
  readonly key: string;
  constructor(
    accountId: string,
    private readonly orderId: string,
    private readonly source: NativeCheckoutSource,
    private readonly memory: CancellationMemory,
    private readonly policy = {
      pollMs: 2_000,
      budgetMs: 60_000,
      requestMs: 8_000,
      commandCooldownMs: 3_000,
    },
  ) {
    this.key = cancellationKey(accountId, orderId);
  }
  getSnapshot = () => this.state;
  getServerSnapshot = () => initial;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private now() {
    return performance.now();
  }
  private publish(patch: Partial<NativeCheckoutState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.publish({ busy: null, pollingEnded: false });
    this.budgetUntil = this.now() + this.policy.budgetMs;
    this.syncMemory();
    this.ticker = setInterval(() => this.tick(), 250);
    void this.refresh();
  }
  stop() {
    this.running = false;
    this.invalidate();
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }
  private invalidate() {
    this.generation++;
    this.request?.abort();
    this.request = null;
  }
  syncMemory() {
    if (terminal(this.state.order)) return;
    try {
      // Never clear an in-flight local intent because another tab has not written yet.
      const cancelPending =
        this.state.cancelPending || this.memory.read(this.key);
      this.publish({ cancelPending, recoveryBlocked: false });
    } catch {
      this.publish({
        recoveryBlocked: true,
        notice: "操作记录暂不可用，请重试",
      });
    }
    this.updateDisplay();
  }
  setVisible(visible: boolean) {
    if (this.visible === visible) return;
    this.visible = visible;
    if (visible && this.running && !terminal(this.state.order)) {
      this.syncMemory();
      void this.refresh();
    }
  }
  private tick() {
    if (!this.running) return;
    this.updateDisplay();
    if (
      !this.state.commandReady &&
      this.now() - this.lastCommandAt >= this.policy.commandCooldownMs
    )
      this.publish({ commandReady: true });
    if (this.now() >= this.budgetUntil && !this.state.pollingEnded)
      this.publish({ pollingEnded: true });
    if (
      this.visible &&
      !this.state.busy &&
      !terminal(this.state.order) &&
      this.state.phase !== "access-denied" &&
      !this.state.pollingEnded &&
      this.now() >= this.nextReadAt
    )
      void this.refresh();
  }
  private updateDisplay() {
    const seconds = Math.max(
      0,
      Math.ceil(
        (Math.min(this.qrUntil, this.paymentUntil) - this.now()) / 1000,
      ),
    );
    const show =
      this.running &&
      this.state.phase === "ready" &&
      this.state.order?.status === "PENDING_PAYMENT" &&
      !this.state.cancelPending &&
      !this.state.recoveryBlocked &&
      seconds > 0;
    const qrValue = show ? (this.state.order!.qr?.value ?? null) : null;
    if (
      qrValue !== this.state.qrValue ||
      seconds !== this.state.remainingSeconds
    )
      this.publish({ qrValue, remainingSeconds: seconds });
  }
  private async call<T>(
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<{ token: number; value: T | null }> {
    this.invalidate();
    const token = this.generation;
    const request = new AbortController();
    this.request = request;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const aborted = new Promise<null>((resolve) => {
      request.signal.addEventListener("abort", () => resolve(null), {
        once: true,
      });
      timeout = setTimeout(() => request.abort(), this.policy.requestMs);
    });
    const value = await Promise.race([
      Promise.resolve()
        .then(() => (request.signal.aborted ? null : work(request.signal)))
        .catch(() => null),
      aborted,
    ]);
    if (timeout) clearTimeout(timeout);
    if (this.request === request) this.request = null;
    return { token, value };
  }
  private current(token: number) {
    return this.running && token === this.generation;
  }
  async refresh() {
    if (
      !this.running ||
      this.state.busy ||
      this.state.phase === "access-denied"
    )
      return;
    this.syncMemory();
    this.publish({ busy: "read" });
    const started = this.now();
    const { token, value } = await this.call((signal) =>
      this.source.read(this.orderId, signal),
    );
    if (!this.current(token)) return;
    this.nextReadAt = this.now() + this.policy.pollMs;
    if (!value || value.kind === "unavailable") {
      this.publish({
        phase: "unavailable",
        busy: null,
        notice: "加载失败，请重试",
      });
    } else if (value.kind === "access-denied") {
      this.denyAccess();
    } else {
      const server = Date.parse(value.serverTime);
      const payment = Date.parse(value.order.paymentExpiresAt);
      const qr = value.order.qr
        ? Date.parse(value.order.qr.expiresAt)
        : payment;
      if (
        value.order.id !== this.orderId ||
        !Number.isFinite(server) ||
        !Number.isFinite(payment) ||
        !Number.isFinite(qr)
      ) {
        this.publish({
          phase: "unavailable",
          busy: null,
          notice: "加载失败，请重试",
        });
      } else {
        // Anchor to request start, not the client wall clock or response completion.
        this.paymentUntil = started + payment - server;
        this.qrUntil = started + qr - server;
        const done = terminal(value.order);
        if (done) {
          if (this.ticker) clearInterval(this.ticker);
          this.ticker = null;
          try {
            this.memory.clear(this.key);
          } catch {
            /* terminal evidence wins */
          }
        }
        this.publish({
          order: value.order,
          phase: "ready",
          busy: null,
          cancelPending: done
            ? false
            : this.state.cancelPending || value.order.cancelRequested === true,
          recoveryBlocked: done ? false : this.state.recoveryBlocked,
          notice:
            !done && this.verificationRequested
              ? "正在确认支付结果，请勿重复支付"
              : "",
        });
      }
    }
    this.updateDisplay();
  }
  private denyAccess() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    this.publish({
      order: null,
      phase: "access-denied",
      busy: null,
      qrValue: null,
      notice: "当前无法访问这笔充值，请重新登录后查看。",
    });
  }
  async command(kind: "verify" | "cancel") {
    if (
      !this.running ||
      !this.state.order ||
      terminal(this.state.order) ||
      this.state.phase === "access-denied" ||
      this.state.busy === "verify" ||
      this.state.busy === "cancel" ||
      this.now() - this.lastCommandAt < this.policy.commandCooldownMs
    )
      return;
    if (kind === "verify" && this.state.order.canVerify === false) return;
    if (kind === "cancel") {
      if (!this.state.order?.canCancel) return;
      try {
        this.memory.write(this.key);
      } catch {
        this.publish({
          recoveryBlocked: true,
          notice: "取消请求未发出，请重试",
        });
        this.updateDisplay();
        return;
      }
    }
    if (kind === "verify") this.verificationRequested = true;
    this.lastCommandAt = this.now();
    this.publish({
      busy: kind,
      commandReady: false,
      cancelPending: kind === "cancel" || this.state.cancelPending,
      notice:
        kind === "cancel"
          ? "取消结果待确认，请勿重复支付"
          : "正在确认支付结果，请勿重复支付",
    });
    this.updateDisplay();
    const { token, value } = await this.call((signal) =>
      this.source[kind](this.orderId, signal),
    );
    if (!this.current(token)) return;
    if (value === "access-denied") {
      this.denyAccess();
      return;
    }
    this.publish({
      busy: null,
      notice:
        value === "accepted"
          ? kind === "cancel"
            ? "取消结果待确认，请勿重复支付"
            : "正在确认支付结果，请勿重复支付"
          : kind === "cancel"
            ? "取消结果待确认，请勿重复支付"
            : "暂时无法核验，请稍后重试",
    });
    await this.refresh();
  }
}
