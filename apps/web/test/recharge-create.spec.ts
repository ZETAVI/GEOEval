import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiRequestError,
  type RechargeOptions,
  type RechargeRead,
} from "@geoeval/api-client";
import {
  RechargeCreateController,
  type RechargeIntentMemory,
} from "../app/recharges/recharge-create-controller.js";
import {
  parseRechargeAmount,
  decodeRechargeIntent,
  rechargeIntentKey,
  readReturnBrand,
} from "../app/recharges/recharge-intent.js";
const account = "77000000-0000-4000-8000-000000000101",
  order = "77000000-0000-4000-8000-000000000102",
  brand = "77000000-0000-4000-8000-000000000103";
const options: RechargeOptions = {
  available: true,
  controlled: true,
  minAmountYuan: 1,
  maxAmountYuan: 100,
  shortcutAmounts: [1, 10, 50],
  pointsPerYuan: 10,
  methods: ["WECHAT_NATIVE"],
  supportMessage: "测试",
};
const response = (
  amount = 1,
  method: "WECHAT_NATIVE" | "ALIPAY_PC" = "WECHAT_NATIVE",
): RechargeRead => ({
  serverTime: new Date().toISOString(),
  order: {
    id: order,
    amountYuan: amount,
    method,
    points: amount * 10,
    status: "PENDING_PAYMENT",
    createdAt: new Date().toISOString(),
    paymentExpiresAt: new Date(Date.now() + 60000).toISOString(),
    paidAt: null,
    closedAt: null,
    cancelRequested: false,
    canCancel: true,
    canVerify: true,
    supportRequired: false,
    qr: null,
  },
});
const controllers: RechargeCreateController[] = [];
type Source = ConstructorParameters<typeof RechargeCreateController>[2];
function setup(handler: Source = async () => response()) {
  const source = vi.fn<Source>(handler);
  const storage = new Map<string, string>();
  const memory: RechargeIntentMemory = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      storage.set(k, v);
    },
    removeItem: (k) => {
      storage.delete(k);
    },
  };
  const create = (
    enabled = true,
    methods: RechargeOptions["methods"] = options.methods,
  ) => {
    const c = new RechargeCreateController(
      account,
      { ...options, available: enabled, methods },
      source,
      memory,
      brand,
      100,
    );
    controllers.push(c);
    c.start();
    return c;
  };
  return { source, storage, memory, create };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  controllers.splice(0).forEach((c) => c.stop());
  vi.useRealTimers();
});
async function flush() {
  await vi.advanceTimersByTimeAsync(0);
}
describe("recoverable customer recharge creation", () => {
  it("preserves decimal/invalid drafts without falling back to a shortcut", async () => {
    const f = setup(),
      c = f.create();
    c.setDraft("50");
    c.setDraft("1.5");
    await c.submit();
    expect(c.getSnapshot().draft).toBe("1.5");
    expect(f.source).not.toHaveBeenCalled();
    for (const value of ["", "0", "883", "abc", "-1", "1e2"])
      expect(parseRechargeAmount(value, options).problem).not.toBeNull();
  });
  it("persists one intent before sending and serializes repeated submit", async () => {
    let finish!: (v: RechargeRead) => void;
    const f = setup(
        vi.fn(
          () =>
            new Promise<RechargeRead>((r) => {
              finish = r;
            }),
        ),
      ),
      c = f.create();
    c.setDraft("1");
    const a = c.submit();
    await flush();
    expect(
      decodeRechargeIntent(f.storage.get(rechargeIntentKey(account))!, account)
        ?.amountYuan,
    ).toBe(1);
    await c.submit();
    expect(f.source).toHaveBeenCalledTimes(1);
    finish(response());
    await a;
    expect(c.getSnapshot().created).toEqual({
      id: order,
      returnBrandId: brand,
    });
    expect(f.storage.size).toBe(0);
  });
  it("selects Alipay explicitly and preserves the method through create recovery", async () => {
    const f = setup(async () => response(10, "ALIPAY_PC")),
      c = f.create(true, ["WECHAT_NATIVE", "ALIPAY_PC"]);
    c.setMethod("ALIPAY_PC");
    c.setDraft("10");
    await c.submit();
    expect(f.source).toHaveBeenCalledWith(
      expect.objectContaining({ amountYuan: 10, method: "ALIPAY_PC" }),
      expect.any(AbortSignal),
    );
    expect(c.getSnapshot().created?.id).toBe(order);
  });
  it("cannot select or submit an unavailable WeChat method during Alipay rollout", async () => {
    const f = setup(async () => response(10, "ALIPAY_PC")),
      c = f.create(true, ["ALIPAY_PC"]);
    c.setMethod("WECHAT_NATIVE");
    expect(c.getSnapshot().method).toBe("ALIPAY_PC");
    c.setDraft("10");
    await c.submit();
    expect(f.source).toHaveBeenCalledWith(
      expect.objectContaining({ method: "ALIPAY_PC" }),
      expect.any(AbortSignal),
    );
  });
  it("blocks dispatch when browser recovery storage fails", async () => {
    const f = setup();
    f.memory.setItem = () => {
      throw new Error("storage");
    };
    const c = f.create();
    c.setDraft("1");
    await c.submit();
    expect(f.source).not.toHaveBeenCalled();
    expect(c.getSnapshot().blocked).toBe(true);
  });
  it("keeps the exact request after timeout and reload, even while new creation is disabled", async () => {
    const f = setup(vi.fn(() => new Promise<RechargeRead>(() => {}))),
      c = f.create();
    c.setDraft("1");
    const pending = c.submit();
    await vi.advanceTimersByTimeAsync(101);
    await pending;
    const original = c.getSnapshot().pending!;
    c.stop();
    const restored = f.create(false);
    restored.setDraft("50");
    expect(restored.getSnapshot().draft).toBe("1");
    f.source.mockResolvedValueOnce(response());
    await restored.submit();
    expect(f.source.mock.calls[1]?.[0]).toEqual(original);
    expect(restored.getSnapshot().created?.id).toBe(order);
  });
  it("adopts an intent written by another tab before sending a new request", async () => {
    const f = setup(),
      a = f.create(),
      b = f.create();
    a.setDraft("1");
    f.source.mockRejectedValueOnce(new Error("lost response"));
    await a.submit();
    b.setDraft("50");
    await b.submit();
    expect(f.source.mock.calls[1]?.[0]).toEqual(f.source.mock.calls[0]?.[0]);
    expect(b.getSnapshot().draft).toBe("1");
  });
  it("does not clear an unknown intent on account change or idempotency conflict", async () => {
    const f = setup(
        vi
          .fn()
          .mockRejectedValue(
            new ApiRequestError("changed", 409, "ACCOUNT_CHANGED"),
          ),
      ),
      c = f.create();
    c.setDraft("1");
    await c.submit();
    expect(c.getSnapshot().pending).not.toBeNull();
    expect(f.storage.size).toBe(1);
  });
  it("unlocks only a definitive rejected create", async () => {
    const f = setup(
        vi
          .fn()
          .mockRejectedValue(
            new ApiRequestError("amount", 409, "AMOUNT_NOT_ALLOWED"),
          ),
      ),
      c = f.create();
    c.setDraft("1");
    await c.submit();
    expect(c.getSnapshot().pending).toBeNull();
    c.setDraft("10");
    expect(c.getSnapshot().draft).toBe("10");
    expect(f.storage.size).toBe(0);
  });
  it("does not accept a different amount returned for the frozen request", async () => {
    const f = setup(vi.fn(async () => response(50))),
      c = f.create();
    c.setDraft("1");
    await c.submit();
    expect(c.getSnapshot().created).toBeNull();
    expect(c.getSnapshot().pending?.amountYuan).toBe(1);
  });
  it("ignores completion after leaving and preserves the request for later recovery", async () => {
    let finish!: (v: RechargeRead) => void;
    const f = setup(
        vi.fn(
          () =>
            new Promise<RechargeRead>((r) => {
              finish = r;
            }),
        ),
      ),
      c = f.create();
    c.setDraft("1");
    const sending = c.submit();
    await flush();
    c.stop();
    finish(response());
    await sending;
    expect(c.getSnapshot().created).toBeNull();
    expect(f.storage.size).toBe(1);
  });
  it("rejects cross-account, malformed and arbitrary return targets", () => {
    const f = setup();
    f.storage.set(rechargeIntentKey(account), "not json");
    expect(f.create().getSnapshot().blocked).toBe(true);
    expect(readReturnBrand("https://attacker.invalid")).toBeNull();
    expect(() =>
      decodeRechargeIntent(
        JSON.stringify({ accountId: "someone-else" }),
        account,
      ),
    ).toThrow();
  });
  it("restores either supported payment method and rejects unknown methods", () => {
    const intent = {
      accountId: account,
      amountYuan: 10,
      method: "ALIPAY_PC",
      idempotencyKey: "77000000-0000-4000-8000-000000000104",
      returnBrandId: null,
    };
    expect(decodeRechargeIntent(JSON.stringify(intent), account)?.method).toBe(
      "ALIPAY_PC",
    );
    expect(() =>
      decodeRechargeIntent(
        JSON.stringify({ ...intent, method: "UNSUPPORTED" }),
        account,
      ),
    ).toThrow();
  });
});
