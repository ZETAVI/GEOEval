import {
  ApiRequestError,
  type RechargeOptions,
  type RechargeRead,
} from "@geoeval/api-client";
import {
  decodeRechargeIntent,
  parseRechargeAmount,
  rechargeIntentKey,
  uuid,
  type RechargeIntent,
} from "./recharge-intent.js";
export type RechargeCreateState = Readonly<{
  draft: string;
  pending: RechargeIntent | null;
  busy: boolean;
  blocked: boolean;
  message: string;
  created: { id: string; returnBrandId: string | null } | null;
}>;
const initial: RechargeCreateState = {
  draft: "",
  pending: null,
  busy: false,
  blocked: false,
  message: "",
  created: null,
};
export interface RechargeIntentMemory {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export class RechargeCreateController {
  private state: RechargeCreateState = initial;
  private listeners = new Set<() => void>();
  private running = false;
  private generation = 0;
  private request: AbortController | null = null;
  private cancelCall: (() => void) | null = null;
  readonly key: string;
  constructor(
    private readonly accountId: string,
    readonly options: RechargeOptions,
    private readonly source: (
      intent: RechargeIntent,
      signal: AbortSignal,
    ) => Promise<RechargeRead>,
    private readonly memory: RechargeIntentMemory,
    private readonly returnBrandId: string | null = null,
    private readonly requestMs = 8000,
  ) {
    this.key = rechargeIntentKey(accountId);
  }
  getSnapshot = () => this.state;
  getServerSnapshot = () => initial;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private publish(patch: Partial<RechargeCreateState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn();
  }
  start() {
    this.running = true;
    try {
      const pending = decodeRechargeIntent(
        this.memory.getItem(this.key),
        this.accountId,
      );
      this.publish({
        pending,
        draft: pending ? String(pending.amountYuan) : this.state.draft,
        busy: false,
        blocked: false,
      });
    } catch (e) {
      this.publish({
        busy: false,
        blocked: true,
        message: e instanceof Error ? e.message : "无法读取充值恢复记录。",
      });
    }
  }
  stop() {
    this.running = false;
    this.generation++;
    this.request?.abort();
    this.cancelCall?.();
    this.cancelCall = null;
  }
  setDraft(draft: string) {
    if (!this.state.pending && !this.state.busy && !this.state.blocked)
      this.publish({ draft, message: "" });
  }
  async submit() {
    if (
      !this.running ||
      this.state.busy ||
      this.state.blocked ||
      this.state.created
    )
      return;
    let intent = this.state.pending;
    if (!intent) {
      try {
        intent = decodeRechargeIntent(
          this.memory.getItem(this.key),
          this.accountId,
        );
      } catch {
        this.publish({
          blocked: true,
          message: "无法恢复已有充值记录，请先核对充值历史。",
        });
        return;
      }
    }
    if (!intent) {
      if (!this.options.available) {
        this.publish({
          message: "在线充值暂未开放，已有订单可从充值记录查看。",
        });
        return;
      }
      const parsed = parseRechargeAmount(this.state.draft, this.options);
      if (parsed.problem !== null) {
        this.publish({ message: parsed.problem });
        return;
      }
      intent = {
        accountId: this.accountId,
        amountYuan: parsed.amount,
        method: "WECHAT_NATIVE",
        idempotencyKey: crypto.randomUUID(),
        returnBrandId: this.returnBrandId,
      };
      try {
        this.memory.setItem(this.key, JSON.stringify(intent));
      } catch {
        this.publish({
          blocked: true,
          message:
            "无法保存充值恢复记录，请检查浏览器存储后重试；请求尚未发出。",
        });
        return;
      }
    }
    const frozen = intent,
      token = ++this.generation;
    this.publish({
      pending: frozen,
      draft: String(frozen.amountYuan),
      busy: true,
      message: "",
    });
    const abort = new AbortController();
    this.request = abort;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const result = await new Promise<{ value?: RechargeRead; error?: unknown }>(
      (resolve) => {
        const cancel = () => {
          abort.abort();
          resolve({ error: new Error("TIMEOUT") });
        };
        this.cancelCall = cancel;
        timer = setTimeout(cancel, this.requestMs);
        void Promise.resolve()
          .then(() => this.source(frozen, abort.signal))
          .then(
            (value) => resolve({ value }),
            (error) => resolve({ error }),
          );
      },
    );
    if (timer) clearTimeout(timer);
    if (this.request === abort) this.cancelCall = null;
    if (!this.running || token !== this.generation) return;
    if (
      result.value &&
      uuid(result.value.order.id) &&
      result.value.order.amountYuan === frozen.amountYuan &&
      result.value.order.method === frozen.method
    ) {
      try {
        this.memory.removeItem(this.key);
      } catch {
        /* same-key replay remains safe */
      }
      this.publish({
        busy: false,
        pending: null,
        created: {
          id: result.value.order.id,
          returnBrandId: frozen.returnBrandId,
        },
      });
      return;
    }
    const error = result.error;
    const rejected =
      error instanceof ApiRequestError &&
      [
        "AMOUNT_NOT_ALLOWED",
        "POINT_LIMIT_EXCEEDED",
        "ACTIVE_ORDER_LIMIT",
        "INVALID_INPUT",
      ].includes(error.code ?? "");
    if (rejected) {
      try {
        this.memory.removeItem(this.key);
        this.publish({ pending: null, busy: false, message: error.message });
        return;
      } catch {
        /* preserve known identity when browser storage is unavailable */
      }
    }
    this.publish({
      busy: false,
      message:
        error instanceof ApiRequestError && error.code === "ACCOUNT_CHANGED"
          ? "登录账号已变化，请重新进入页面；原充值恢复记录已保留。"
          : "暂未确认创建结果。请恢复同一笔充值，勿更改金额或重复新建。",
    });
  }
}
