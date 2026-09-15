import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NativeCheckoutController,
  cancellationKey,
  type NativeCheckoutSource,
  type NativeCheckoutOrder,
  type CancellationMemory,
  type NativeCheckoutRead,
} from "../app/recharges/native-checkout-controller.js";
import { NativeCheckoutPanel } from "../app/recharges/native-checkout.js";

const uri = "weixin://pay.weixin.qq.com/bizpayurl/up?pr=NwY5Mz9&groupid=00";
const iso = (delta = 0) => new Date(Date.now() + delta).toISOString();
const controllers: NativeCheckoutController[] = [];
function fixture() {
  let order: NativeCheckoutOrder = {
    id: "order-one",
    amountYuan: 50,
    points: 500,
    status: "PENDING_PAYMENT",
    paymentExpiresAt: iso(120_000),
    canCancel: true,
    qr: { value: uri, expiresAt: iso(90_000) },
  };
  const values = new Set<string>();
  const memory: CancellationMemory = {
    read: vi.fn((key) => values.has(key)),
    write: vi.fn((key) => {
      values.add(key);
    }),
    clear: vi.fn((key) => {
      values.delete(key);
    }),
  };
  const source: NativeCheckoutSource = {
    read: vi.fn<NativeCheckoutSource["read"]>(async () => ({
      kind: "ok",
      order,
      serverTime: iso(),
    })),
    verify: vi.fn<NativeCheckoutSource["verify"]>(async () => "accepted"),
    cancel: vi.fn<NativeCheckoutSource["cancel"]>(async () => "accepted"),
  };
  const make = (id = "order-one", account = "customer") => {
    const c = new NativeCheckoutController(account, id, source, memory);
    controllers.push(c);
    return c;
  };
  return {
    source,
    memory,
    values,
    make,
    get: () => order,
    set: (patch: Partial<NativeCheckoutOrder>) => {
      order = { ...order, ...patch };
    },
  };
}
const flush = () => vi.advanceTimersByTimeAsync(0);
function pending<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-09T03:00:00Z"));
});
afterEach(() => {
  for (const c of controllers.splice(0)) c.stop();
  vi.useRealTimers();
});

describe("Native checkout local lifecycle", () => {
  it("reads once, exposes the original action and never sends a payment command on mount", async () => {
    const f = fixture(),
      c = f.make();
    c.start();
    await flush();
    expect(c.getSnapshot()).toMatchObject({
      phase: "ready",
      qrValue: uri,
      remainingSeconds: 90,
    });
    expect(f.source.read).toHaveBeenCalledTimes(1);
    expect(f.source.verify).not.toHaveBeenCalled();
    expect(f.source.cancel).not.toHaveBeenCalled();
  });
  it("ends polling without claiming closure; manual refresh still works", async () => {
    const f = fixture(),
      c = f.make();
    c.start();
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);
    const count = vi.mocked(f.source.read).mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.source.read).toHaveBeenCalledTimes(count);
    expect(c.getSnapshot()).toMatchObject({
      pollingEnded: true,
      order: { status: "PENDING_PAYMENT" },
    });
    await c.refresh();
    expect(f.source.read).toHaveBeenCalledTimes(count + 1);
    expect(f.source.cancel).not.toHaveBeenCalled();
  });
  it("uses the earlier deadline and does not renew the same QR on reads", async () => {
    const f = fixture();
    f.set({
      paymentExpiresAt: iso(3_000),
      qr: { value: uri, expiresAt: iso(9_000) },
    });
    const c = f.make();
    c.start();
    await flush();
    expect(c.getSnapshot().remainingSeconds).toBe(3);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(c.getSnapshot()).toMatchObject({
      qrValue: null,
      remainingSeconds: 0,
      order: { status: "PENDING_PAYMENT" },
    });
    expect(f.source.cancel).not.toHaveBeenCalled();
  });
  it("anchors countdown to server time even when the client wall clock is wrong", async () => {
    const f = fixture(),
      server = Date.parse("2030-01-01T00:00:00Z");
    vi.mocked(f.source.read).mockResolvedValue({
      kind: "ok",
      serverTime: new Date(server).toISOString(),
      order: {
        ...f.get(),
        paymentExpiresAt: new Date(server + 5000).toISOString(),
        qr: { value: uri, expiresAt: new Date(server + 3000).toISOString() },
      },
    });
    const c = f.make();
    c.start();
    await flush();
    vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
    await vi.advanceTimersByTimeAsync(1500);
    expect(c.getSnapshot().remainingSeconds).toBe(2);
  });
  it("pause/resume does not create parallel reads or extend the polling budget", async () => {
    const f = fixture(),
      c = f.make();
    c.start();
    await flush();
    c.setVisible(false);
    await vi.advanceTimersByTimeAsync(65_000);
    expect(f.source.read).toHaveBeenCalledTimes(1);
    c.setVisible(true);
    c.setVisible(true);
    await flush();
    expect(f.source.read).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(f.source.read).toHaveBeenCalledTimes(2);
  });
  it("a slow read is bounded even if transport ignores abort, and its late reply is discarded", async () => {
    const f = fixture(),
      late = pending<NativeCheckoutRead>();
    vi.mocked(f.source.read).mockReturnValueOnce(late.promise);
    const c = f.make();
    c.start();
    await flush();
    await vi.advanceTimersByTimeAsync(8_000);
    expect(c.getSnapshot()).toMatchObject({
      phase: "unavailable",
      busy: null,
      qrValue: null,
    });
    late.resolve({ kind: "ok", order: f.get(), serverTime: iso() });
    await flush();
    expect(c.getSnapshot().phase).toBe("unavailable");
  });
  it("cancel wins over an already-running read, and ACK alone does not close the order", async () => {
    const f = fixture(),
      c = f.make();
    c.start();
    await flush();
    const old = pending<NativeCheckoutRead>();
    vi.mocked(f.source.read).mockReturnValueOnce(old.promise);
    void c.refresh();
    await flush();
    await c.command("cancel");
    old.resolve({ kind: "ok", order: f.get(), serverTime: iso() });
    await flush();
    expect(c.getSnapshot()).toMatchObject({
      qrValue: null,
      cancelPending: true,
      order: { status: "PENDING_PAYMENT" },
    });
    expect(f.values.has(c.key)).toBe(true);
    expect(f.source.cancel).toHaveBeenCalledTimes(1);
  });
  it("a lost cancel response survives remount and can be retried for the same order", async () => {
    const f = fixture();
    vi.mocked(f.source.cancel).mockRejectedValueOnce(
      new Error("private server detail"),
    );
    const c = f.make();
    c.start();
    await flush();
    await c.command("cancel");
    c.stop();
    const next = f.make();
    next.start();
    await flush();
    expect(next.getSnapshot()).toMatchObject({
      cancelPending: true,
      qrValue: null,
    });
    expect(next.getSnapshot().notice).not.toContain("private server detail");
    await next.command("cancel");
    expect(f.source.cancel).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(f.source.cancel).mock.calls.every(([id]) => id === "order-one"),
    ).toBe(true);
  });
  it("another tab's cancel marker immediately hides a still-valid QR", async () => {
    const f = fixture(),
      c = f.make();
    c.start();
    await flush();
    f.values.add(c.key);
    c.syncMemory();
    expect(c.getSnapshot()).toMatchObject({
      cancelPending: true,
      qrValue: null,
    });
    expect(f.source.cancel).not.toHaveBeenCalled();
  });
  it("does not emit cancel when its recovery marker cannot be stored", async () => {
    const f = fixture(),
      c = f.make();
    c.start();
    await flush();
    vi.mocked(f.memory.write).mockImplementation(() => {
      throw new Error("blocked");
    });
    await c.command("cancel");
    expect(f.source.cancel).not.toHaveBeenCalled();
    expect(c.getSnapshot().qrValue).toBeNull();
    expect(c.getSnapshot().notice).toContain("未发出");
  });
  it("does not show a QR when cancellation recovery cannot be read", async () => {
    const f = fixture();
    vi.mocked(f.memory.read).mockImplementation(() => {
      throw new Error("blocked");
    });
    const c = f.make();
    c.start();
    await flush();
    expect(c.getSnapshot()).toMatchObject({
      recoveryBlocked: true,
      qrValue: null,
    });
  });
  it.each(["SUCCESSFUL", "CLOSED"] as const)(
    "only server %s ends waiting and clears the marker",
    async (status) => {
      const f = fixture(),
        c = f.make();
      f.values.add(c.key);
      f.set({ status, canCancel: false, qr: null });
      c.start();
      await flush();
      expect(c.getSnapshot()).toMatchObject({
        cancelPending: false,
        qrValue: null,
        order: { status },
      });
      expect(f.values.has(c.key)).toBe(false);
      await vi.advanceTimersByTimeAsync(70_000);
      expect(f.source.read).toHaveBeenCalledTimes(1);
    },
  );
  it("verify acceptance cannot manufacture success and rapid commands coalesce", async () => {
    const f = fixture(),
      c = f.make();
    c.start();
    await flush();
    await Promise.all([c.command("verify"), c.command("verify")]);
    expect(f.source.verify).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot().order?.status).toBe("PENDING_PAYMENT");
    expect(c.getSnapshot().notice).toContain("勿重复支付");
    await c.command("verify");
    expect(f.source.verify).toHaveBeenCalledTimes(1);
  });
  it("opens only an authenticated Alipay cashier grant and does not claim payment", async () => {
    const f = fixture();
    f.set({ method: "ALIPAY_PC", qr: null });
    f.source.cashier = vi.fn(async () => ({
      kind: "accepted" as const,
      url: "http://local.invalid/recharges/order-one/cashier-page",
    }));
    const c = f.make();
    c.start();
    await flush();
    await expect(c.cashier()).resolves.toBe(
      "http://local.invalid/recharges/order-one/cashier-page",
    );
    expect(f.source.cashier).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot().order?.status).toBe("PENDING_PAYMENT");
    expect(c.getSnapshot().notice).toContain("跳转支付宝收银台");
  });
  it("access loss clears sensitive order/actions and stops automatic work", async () => {
    const f = fixture(),
      c = f.make();
    c.start();
    await flush();
    vi.mocked(f.source.read).mockResolvedValue({ kind: "access-denied" });
    await c.refresh();
    expect(c.getSnapshot()).toMatchObject({
      phase: "access-denied",
      order: null,
      qrValue: null,
    });
    const count = vi.mocked(f.source.read).mock.calls.length;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(f.source.read).toHaveBeenCalledTimes(count);
  });
  it("wrong-order data and stale data from an unmounted identity cannot enter the view", async () => {
    const f = fixture(),
      c = f.make(),
      late = pending<NativeCheckoutRead>();
    vi.mocked(f.source.read).mockReturnValueOnce(late.promise);
    c.start();
    await flush();
    c.stop();
    const other = f.make("order-two", "other-customer");
    other.start();
    await flush();
    expect(other.getSnapshot()).toMatchObject({
      phase: "unavailable",
      qrValue: null,
    });
    late.resolve({ kind: "ok", order: f.get(), serverTime: iso() });
    await flush();
    expect(c.getSnapshot().order).toBeNull();
    expect(cancellationKey("customer", "order-one")).not.toBe(other.key);
    expect(cancellationKey("a.b", "c")).not.toBe(cancellationKey("a", "b.c"));
  });
  it("supports effect cleanup/start replay without leaving a permanently busy read", async () => {
    const f = fixture(),
      c = f.make();
    c.start();
    c.stop();
    c.start();
    await flush();
    expect(c.getSnapshot()).toMatchObject({
      phase: "ready",
      busy: null,
      qrValue: uri,
    });
  });
  it.each(["CLOSED", "CONFIRMING", "SUCCESSFUL"] as const)(
    "never displays a QR for server state %s",
    async (status) => {
      const f = fixture();
      f.set({ status });
      const c = f.make();
      c.start();
      await flush();
      const noop = () => {};
      const html = renderToStaticMarkup(
        <NativeCheckoutPanel
          state={c.getSnapshot()}
          onRefresh={noop}
          onVerify={noop}
          onCancel={noop}
          onLeave={noop}
          onSupport={noop}
        />,
      );
      expect(html).not.toContain("<svg");
      if (status === "CLOSED") {
        expect(html).toContain("本单对应积分");
        expect(html).not.toContain("已到账积分");
      }
    },
  );
  it("renders a real SVG with no external QR service or raw URI link", async () => {
    const f = fixture(),
      c = f.make();
    c.start();
    await flush();
    const noop = () => {};
    const html = renderToStaticMarkup(
      <NativeCheckoutPanel
        state={c.getSnapshot()}
        onRefresh={noop}
        onVerify={noop}
        onCancel={noop}
        onLeave={noop}
        onSupport={noop}
      />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("¥50.00");
    expect(html).toContain("500");
    expect(html).not.toContain('href="weixin:');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("groupid=");
  });
});
