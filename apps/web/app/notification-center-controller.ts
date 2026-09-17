import {
  ApiRequestError,
  type Notification,
  type NotificationList,
  type NotificationRequestContext,
} from "@geoeval/api-client";

export type NotificationCenterState = Readonly<{
  items: Notification[];
  unreadCount: number;
  refreshing: boolean;
  busy: boolean;
  accessLost: boolean;
  message: string;
}>;

export interface NotificationCenterSource {
  list(request: NotificationRequestContext): Promise<NotificationList>;
  markRead(
    id: string,
    request: NotificationRequestContext,
  ): Promise<Notification>;
  markAllRead(request: NotificationRequestContext): Promise<unknown>;
  selectBrand(
    id: string,
    request: NotificationRequestContext,
  ): Promise<unknown>;
}

const initial: NotificationCenterState = {
  items: [],
  unreadCount: 0,
  refreshing: false,
  busy: false,
  accessLost: false,
  message: "",
};

type PendingRequest = { cancel: () => void };
type RetryAction = { kind: "open"; id: string } | { kind: "mark-all" };

/** Owns one mounted account scope; no notification is a source of balance truth. */
export class NotificationCenterController {
  private state = initial;
  private listeners = new Set<() => void>();
  private running = false;
  private generation = 0;
  private readRevision = 0;
  private read: PendingRequest | null = null;
  private action: PendingRequest | null = null;
  private refreshQueued = false;
  private retryAction: RetryAction | null = null;

  constructor(
    private readonly accountId: string,
    private readonly source: NotificationCenterSource,
    private readonly navigate: (path: string) => void,
    private readonly requestMs = 8000,
  ) {}

  getSnapshot = () => this.state;
  getServerSnapshot = () => initial;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.generation++;
    this.publish(initial);
    void this.refresh();
  }

  stop() {
    this.running = false;
    this.generation++;
    this.cancelRequests();
    this.publish(initial);
  }

  private publish(patch: Partial<NotificationCenterState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  private active(generation: number) {
    return (
      this.running && !this.state.accessLost && generation === this.generation
    );
  }

  private cancelRequests() {
    this.readRevision++;
    this.read?.cancel();
    this.action?.cancel();
    this.read = null;
    this.action = null;
    this.refreshQueued = false;
    this.retryAction = null;
  }

  private failure(error: unknown, message: string, retryAction?: RetryAction) {
    if (
      error instanceof ApiRequestError &&
      (error.status === 401 ||
        error.status === 403 ||
        (error.status === 409 && error.code === "ACCOUNT_CHANGED"))
    ) {
      this.generation++;
      this.cancelRequests();
      this.publish({
        ...initial,
        accessLost: true,
        message: "登录状态已变化，请重新载入页面查看通知。",
      });
      return;
    }
    if (retryAction) this.retryAction = retryAction;
    // Incidental SSE/focus reads must not erase a failed user action.
    if (retryAction || !this.retryAction) this.publish({ message });
  }

  /** Cancellation settles locally even when an adapter ignores AbortSignal. */
  private request<T>(
    kind: "read" | "action",
    call: (request: NotificationRequestContext) => Promise<T>,
  ) {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let pending!: PendingRequest;
    const result = new Promise<T>((resolve, reject) => {
      let settled = false;
      const finish = (complete: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        complete();
      };
      pending = {
        cancel: () =>
          finish(() => {
            abort.abort();
            reject(new Error("Notification request cancelled or timed out"));
          }),
      };
      timer = setTimeout(pending.cancel, this.requestMs);
      void Promise.resolve()
        .then(() => {
          if (abort.signal.aborted)
            throw new Error("Notification request cancelled");
          return call({
            signal: abort.signal,
            expectedAccountId: this.accountId,
          });
        })
        .then(
          (value) => finish(() => resolve(value)),
          (error: unknown) => finish(() => reject(error)),
        );
    });
    this[kind] = pending;
    return result.finally(() => {
      if (this[kind] === pending) this[kind] = null;
    });
  }

  async refresh() {
    if (!this.running || this.state.accessLost) return;
    if (this.read || this.state.busy) {
      this.refreshQueued = true;
      return;
    }
    const generation = this.generation;
    const revision = ++this.readRevision;
    this.publish({ refreshing: true });
    try {
      const result = await this.request("read", (request) =>
        this.source.list(request),
      );
      if (!this.active(generation) || revision !== this.readRevision) return;
      this.publish({
        items: result.items,
        unreadCount: result.unreadCount,
        message: this.retryAction ? this.state.message : "",
      });
    } catch (error) {
      if (!this.active(generation) || revision !== this.readRevision) return;
      this.failure(error, "暂时无法读取通知，请重试。");
    } finally {
      if (this.active(generation) && revision === this.readRevision) {
        this.publish({ refreshing: false });
        if (this.refreshQueued) {
          this.refreshQueued = false;
          void this.refresh();
        }
      }
    }
  }

  async retry() {
    const action = this.retryAction;
    if (action?.kind === "mark-all") await this.markAllRead();
    else if (action?.kind === "open") await this.openNotification(action.id);
    else {
      this.retryAction = null;
      await this.refresh();
    }
  }

  private beginAction() {
    if (!this.running || this.state.accessLost || this.state.busy) return null;
    // A list begun before a read mutation must never restore its old unread state.
    this.readRevision++;
    this.read?.cancel();
    this.read = null;
    this.refreshQueued = false;
    this.retryAction = null;
    this.publish({ busy: true, refreshing: false, message: "" });
    return this.generation;
  }

  private finishAction(generation: number, refresh: boolean) {
    if (!this.active(generation)) return;
    this.publish({ busy: false });
    if (refresh || this.refreshQueued) {
      this.refreshQueued = false;
      void this.refresh();
    }
  }

  async markAllRead() {
    const generation = this.beginAction();
    if (generation === null) return;
    let succeeded = false;
    try {
      await this.request("action", (request) =>
        this.source.markAllRead(request),
      );
      if (!this.active(generation)) return;
      succeeded = true;
    } catch (error) {
      if (this.active(generation))
        this.failure(error, "暂时无法标记全部已读，请重试。", {
          kind: "mark-all",
        });
    } finally {
      this.finishAction(generation, succeeded);
    }
  }

  async openNotification(id: string) {
    const generation = this.beginAction();
    if (generation === null) return;
    let succeeded = false;
    try {
      // The idempotent command also fences navigation for an already-read notice.
      const notification = await this.request("action", (request) =>
        this.source.markRead(id, request),
      );
      if (!this.active(generation)) return;
      const target = notification.target;
      if (target.kind === "RECHARGE_ORDER") {
        this.navigate(
          `/recharges/${encodeURIComponent(target.rechargeOrderId)}`,
        );
        succeeded = true;
        return;
      }
      if (target.kind === "RECHARGE_INVOICE") {
        this.navigate(
          `/recharges?invoice=${encodeURIComponent(target.invoiceRequestId)}`,
        );
        succeeded = true;
        return;
      }
      if (target.kind === "AGENCY_WITHDRAWAL") {
        this.navigate(
          `/agent/withdrawals/${encodeURIComponent(target.withdrawalId)}`,
        );
        succeeded = true;
        return;
      }
      await this.request("action", (request) =>
        this.source.selectBrand(target.brandId, request),
      );
      if (!this.active(generation)) return;
      this.navigate(
        target.kind === "EVALUATION_REPORT"
          ? `/diagnosis/reports/${encodeURIComponent(target.reportId)}?brandId=${encodeURIComponent(target.brandId)}`
          : "/diagnosis",
      );
      succeeded = true;
    } catch (error) {
      if (this.active(generation))
        this.failure(error, "暂时无法打开通知，请重试。", { kind: "open", id });
    } finally {
      this.finishAction(generation, succeeded);
    }
  }
}
