import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiRequestError,
  type Notification,
  type NotificationList,
} from "@geoeval/api-client";
import {
  NotificationCenterController,
  type NotificationCenterSource,
} from "../app/notification-center-controller.js";

const account = "77000000-0000-4000-8000-000000000101";
const order = "77000000-0000-4000-8000-000000000102";
const brand = "77000000-0000-4000-8000-000000000103";
const notice: Notification = {
  id: "77000000-0000-4000-8000-000000000104",
  kind: "RECHARGE_SUCCESSFUL",
  target: { kind: "RECHARGE_ORDER", rechargeOrderId: order },
  title: "充值成功",
  summary: "积分已到账",
  occurredAt: "2026-09-09T00:00:00.000Z",
  readAt: null,
};
const page = (
  items = [notice],
  unreadCount = items.filter((item) => !item.readAt).length,
): NotificationList => ({ items, unreadCount, nextCursor: null });
const readNotice: Notification = { ...notice, readAt: notice.occurredAt };
const evaluationReadNotice: Notification = {
  ...readNotice,
  kind: "EVALUATION_RETRY_REQUIRED",
  target: { kind: "EVALUATION_RETRY", brandId: brand, runId: "run-one" },
};
const withdrawalReadNotice: Notification = {
  ...readNotice,
  kind: "AGENCY_WITHDRAWAL_COMPLETED",
  target: {
    kind: "AGENCY_WITHDRAWAL",
    withdrawalId: "77000000-0000-4000-8000-000000000105",
  },
};
const invoiceReadNotice: Notification = {
  ...readNotice,
  kind: "RECHARGE_INVOICE_NEEDS_CORRECTION",
  target: {
    kind: "RECHARGE_INVOICE",
    invoiceRequestId: "77000000-0000-4000-8000-000000000109",
    rechargeOrderId: order,
  },
};
const controllers: NotificationCenterController[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function fixture(id = account) {
  const source = {
    list: vi.fn<NotificationCenterSource["list"]>().mockResolvedValue(page()),
    markRead: vi
      .fn<NotificationCenterSource["markRead"]>()
      .mockResolvedValue(readNotice),
    markAllRead: vi
      .fn<NotificationCenterSource["markAllRead"]>()
      .mockResolvedValue({ unreadCount: 0 }),
    selectBrand: vi
      .fn<NotificationCenterSource["selectBrand"]>()
      .mockResolvedValue({ id: brand }),
  };
  const navigate = vi.fn<(path: string) => void>();
  const controller = new NotificationCenterController(
    id,
    source,
    navigate,
    100,
  );
  controllers.push(controller);
  return { source, navigate, controller };
}

const flush = () => vi.advanceTimersByTimeAsync(0);
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.stop());
  vi.useRealTimers();
});

describe("notification account scope and refresh lifecycle", () => {
  it("coalesces duplicate SSE, reconnect and focus hints into one active read and one trailing refresh", async () => {
    const f = fixture();
    const pending = deferred<NotificationList>();
    f.source.list.mockReturnValueOnce(pending.promise);
    f.controller.start();
    await flush();
    for (let i = 0; i < 20; i++) void f.controller.refresh();
    expect(f.source.list).toHaveBeenCalledTimes(1);
    pending.resolve(page());
    await flush();
    expect(f.source.list).toHaveBeenCalledTimes(2);
    expect(f.controller.getSnapshot()).toMatchObject({
      items: [notice],
      unreadCount: 1,
      refreshing: false,
    });
    expect(f.source.list.mock.calls[0]?.[0]).toMatchObject({
      expectedAccountId: account,
      signal: expect.any(AbortSignal),
    });
  });

  it("clears old notices immediately and rejects A1 late replies after an A→B→A restart", async () => {
    const f = fixture();
    f.controller.start();
    await flush();
    const stale = deferred<NotificationList>();
    f.source.list.mockReturnValueOnce(stale.promise);
    const a1 = f.controller.refresh();
    await flush();
    const oldSignal = f.source.list.mock.calls[1]?.[0].signal;
    f.controller.stop();
    expect(f.controller.getSnapshot()).toMatchObject({
      items: [],
      unreadCount: 0,
    });
    expect(oldSignal?.aborted).toBe(true);
    const b = fixture("another-account");
    b.source.list.mockResolvedValue(page([], 0));
    b.controller.start();
    await flush();
    b.controller.stop();
    f.source.list.mockResolvedValue(page([readNotice], 0));
    f.controller.start();
    await flush();
    stale.resolve(page([notice], 99));
    await a1;
    await flush();
    expect(f.controller.getSnapshot()).toMatchObject({
      items: [readNotice],
      unreadCount: 0,
    });
  });

  it("times out a read even if abort is ignored, exposes retry, and ignores its later success", async () => {
    const f = fixture(),
      late = deferred<NotificationList>();
    f.source.list.mockReturnValueOnce(late.promise);
    f.controller.start();
    await vi.advanceTimersByTimeAsync(101);
    expect(f.controller.getSnapshot()).toMatchObject({
      refreshing: false,
      accessLost: false,
      items: [],
      message: "暂时无法读取通知，请重试。",
    });
    expect(f.source.list.mock.calls[0]?.[0].signal?.aborted).toBe(true);
    await f.controller.refresh();
    late.resolve(page([], 90));
    await flush();
    expect(f.controller.getSnapshot()).toMatchObject({
      unreadCount: 1,
      message: "",
    });
  });

  it("retains same-account notices on a network failure and reconciles them on retry", async () => {
    const f = fixture();
    f.controller.start();
    await flush();
    f.source.list.mockRejectedValueOnce(new Error("offline"));
    await f.controller.refresh();
    expect(f.controller.getSnapshot()).toMatchObject({
      items: [notice],
      unreadCount: 1,
      accessLost: false,
      message: "暂时无法读取通知，请重试。",
    });
    f.source.list.mockResolvedValueOnce(page([readNotice], 0));
    await f.controller.refresh();
    expect(f.controller.getSnapshot()).toMatchObject({
      items: [readNotice],
      unreadCount: 0,
      message: "",
    });
  });

  it.each([
    [401, undefined],
    [403, undefined],
    [409, "ACCOUNT_CHANGED"],
  ])(
    "clears all state and stops further work after %s/%s access loss",
    async (status, code) => {
      const f = fixture();
      f.controller.start();
      await flush();
      f.source.list.mockRejectedValueOnce(
        new ApiRequestError("denied", status, code),
      );
      await f.controller.refresh();
      expect(f.controller.getSnapshot()).toMatchObject({
        items: [],
        unreadCount: 0,
        accessLost: true,
        busy: false,
        refreshing: false,
      });
      await f.controller.refresh();
      await f.controller.markAllRead();
      await f.controller.openNotification(notice.id);
      expect(f.source.list).toHaveBeenCalledTimes(2);
      expect(f.source.markAllRead).not.toHaveBeenCalled();
      expect(f.navigate).not.toHaveBeenCalled();
    },
  );

  it("does not let a list begun before mark-all overwrite its fresh post-mutation list", async () => {
    const f = fixture();
    f.controller.start();
    await flush();
    const stale = deferred<NotificationList>();
    f.source.list.mockReturnValueOnce(stale.promise);
    const reading = f.controller.refresh();
    await flush();
    f.source.list.mockResolvedValue(page([readNotice], 0));
    await f.controller.markAllRead();
    await flush();
    stale.resolve(page());
    await reading;
    await flush();
    expect(f.controller.getSnapshot()).toMatchObject({
      items: [readNotice],
      unreadCount: 0,
      busy: false,
    });
    expect(f.source.list.mock.calls[1]?.[0].signal?.aborted).toBe(true);
  });

  it("bounds a hung mark-all, ignores its late rejection after retry, and serializes repeated actions", async () => {
    const f = fixture(),
      pending = deferred<unknown>();
    f.controller.start();
    await flush();
    f.source.markAllRead.mockReturnValueOnce(pending.promise);
    const marking = f.controller.markAllRead();
    await f.controller.markAllRead();
    await f.controller.openNotification(notice.id);
    await flush();
    expect(f.source.markAllRead).toHaveBeenCalledTimes(1);
    expect(f.source.markRead).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(101);
    await marking;
    expect(f.controller.getSnapshot()).toMatchObject({
      busy: false,
      message: "暂时无法标记全部已读，请重试。",
    });
    await f.controller.markAllRead();
    await flush();
    pending.reject(new ApiRequestError("late access loss", 403));
    await flush();
    expect(f.controller.getSnapshot()).toMatchObject({
      accessLost: false,
      message: "",
    });
  });
});

describe("explicit notification navigation", () => {
  it("opens the same-page invoice record without reading brand context", async () => {
    const f = fixture();
    f.source.list.mockResolvedValue(page([invoiceReadNotice]));
    f.source.markRead.mockResolvedValue(invoiceReadNotice);
    f.controller.start();
    await flush();
    await f.controller.openNotification(invoiceReadNotice.id);
    expect(f.source.selectBrand).not.toHaveBeenCalled();
    expect(f.navigate).toHaveBeenCalledExactlyOnceWith(
      "/recharges?invoice=77000000-0000-4000-8000-000000000109",
    );
  });

  it("opens an agency withdrawal result without reading customer brand context", async () => {
    const f = fixture();
    f.source.list.mockResolvedValue(page([withdrawalReadNotice]));
    f.source.markRead.mockResolvedValue(withdrawalReadNotice);
    f.controller.start();
    await flush();
    await f.controller.openNotification(withdrawalReadNotice.id);
    expect(f.source.selectBrand).not.toHaveBeenCalled();
    expect(f.navigate).toHaveBeenCalledExactlyOnceWith(
      "/agent/withdrawals/77000000-0000-4000-8000-000000000105",
    );
  });

  it("retries the failed notice by id after SSE pushes it off the latest page", async () => {
    const f = fixture();
    const latest = Array.from({ length: 9 }, (_, index) => ({
      ...notice,
      id: `new-${index}`,
    }));
    f.source.list.mockResolvedValueOnce(page([...latest, notice]));
    f.controller.start();
    await flush();
    f.source.markRead.mockRejectedValueOnce(new Error("offline"));
    await f.controller.openNotification(notice.id);
    f.source.list.mockResolvedValue(
      page([{ ...notice, id: "newest" }, ...latest]),
    );
    await f.controller.refresh();
    expect(
      f.controller.getSnapshot().items.some((item) => item.id === notice.id),
    ).toBe(false);
    expect(f.controller.getSnapshot().message).toBe(
      "暂时无法打开通知，请重试。",
    );
    f.source.markRead.mockResolvedValueOnce(evaluationReadNotice);
    await f.controller.retry();
    expect(f.source.markRead).toHaveBeenLastCalledWith(notice.id, {
      expectedAccountId: account,
      signal: expect.any(AbortSignal),
    });
    expect(f.source.selectBrand).toHaveBeenCalledWith(brand, {
      expectedAccountId: account,
      signal: expect.any(AbortSignal),
    });
    expect(f.navigate).toHaveBeenCalledExactlyOnceWith("/diagnosis");
  });

  it("keeps a failed open visible through queued refresh hints and retries that action", async () => {
    const f = fixture(),
      pending = deferred<Notification>();
    f.controller.start();
    await flush();
    f.source.markRead.mockReturnValueOnce(pending.promise);
    const opening = f.controller.openNotification(notice.id);
    await flush();
    for (let i = 0; i < 5; i++) void f.controller.refresh();
    pending.reject(new Error("offline"));
    await opening;
    await flush();
    expect(f.controller.getSnapshot()).toMatchObject({
      busy: false,
      message: "暂时无法打开通知，请重试。",
    });
    expect(f.source.list).toHaveBeenCalledTimes(2);
    expect(f.navigate).not.toHaveBeenCalled();
    await f.controller.retry();
    expect(f.source.markRead).toHaveBeenCalledTimes(2);
    expect(f.navigate).toHaveBeenCalledExactlyOnceWith(`/recharges/${order}`);
  });

  it("does not revive an old navigation after returning to the same account", async () => {
    const f = fixture(),
      pending = deferred<Notification>();
    f.controller.start();
    await flush();
    f.source.markRead.mockReturnValueOnce(pending.promise);
    const opening = f.controller.openNotification(notice.id);
    await flush();
    f.controller.stop();
    f.controller.start();
    await flush();
    pending.resolve(readNotice);
    await opening;
    await flush();
    expect(f.controller.getSnapshot()).toMatchObject({
      items: [notice],
      busy: false,
    });
    expect(f.navigate).not.toHaveBeenCalled();
    await f.controller.openNotification(notice.id);
    expect(f.navigate).toHaveBeenCalledExactlyOnceWith(`/recharges/${order}`);
  });

  it.each([null, notice.occurredAt])(
    "fences a recharge notice, including readAt=%s, then opens its order without selecting any brand",
    async (readAt) => {
      const f = fixture();
      f.source.list.mockResolvedValue(page([{ ...notice, readAt }]));
      f.controller.start();
      await flush();
      await f.controller.openNotification(notice.id);
      expect(f.source.markRead).toHaveBeenCalledWith(notice.id, {
        expectedAccountId: account,
        signal: expect.any(AbortSignal),
      });
      expect(f.source.selectBrand).not.toHaveBeenCalled();
      expect(f.navigate).toHaveBeenCalledExactlyOnceWith(`/recharges/${order}`);
    },
  );

  it.each(["EVALUATION_REPORT", "EVALUATION_RETRY"] as const)(
    "preserves %s brand selection and navigation",
    async (kind) => {
      const f = fixture();
      const target: Notification["target"] =
        kind === "EVALUATION_REPORT"
          ? { kind, brandId: brand, reportId: "report-one", runId: "run-one" }
          : { kind, brandId: brand, runId: "run-one" };
      f.source.list.mockResolvedValue(
        page([{ ...notice, kind: "EVALUATION_COMPLETED", target }]),
      );
      f.source.markRead.mockResolvedValue({ ...readNotice, target });
      f.controller.start();
      await flush();
      await f.controller.openNotification(notice.id);
      expect(f.source.selectBrand).toHaveBeenCalledWith(brand, {
        expectedAccountId: account,
        signal: expect.any(AbortSignal),
      });
      expect(f.navigate).toHaveBeenCalledExactlyOnceWith(
        kind === "EVALUATION_REPORT"
          ? `/diagnosis/reports/report-one?brandId=${brand}`
          : "/diagnosis",
      );
    },
  );

  it.each(["markRead", "selectBrand"] as const)(
    "prevents late %s from navigating after unmount",
    async (stage) => {
      const f = fixture(),
        pending = deferred<Notification>();
      f.source.list.mockResolvedValue(
        page([
          {
            ...notice,
            target: {
              kind: "EVALUATION_RETRY",
              brandId: brand,
              runId: "run-one",
            },
          },
        ]),
      );
      f.source.markRead.mockResolvedValue(evaluationReadNotice);
      f.source[stage].mockReturnValueOnce(pending.promise);
      f.controller.start();
      await flush();
      const opening = f.controller.openNotification(notice.id);
      await flush();
      const signal = f.source[stage].mock.calls[0]?.[1].signal;
      f.controller.stop();
      pending.resolve(readNotice);
      await opening;
      await flush();
      expect(signal?.aborted).toBe(true);
      expect(f.navigate).not.toHaveBeenCalled();
      expect(f.controller.getSnapshot()).toMatchObject({
        items: [],
        unreadCount: 0,
        busy: false,
      });
    },
  );

  it.each(["markRead", "selectBrand"] as const)(
    "bounds %s and never navigates from a late timeout response",
    async (stage) => {
      const f = fixture(),
        pending = deferred<Notification>();
      f.source.list.mockResolvedValue(
        page([
          {
            ...notice,
            target: {
              kind: "EVALUATION_RETRY",
              brandId: brand,
              runId: "run-one",
            },
          },
        ]),
      );
      f.source.markRead.mockResolvedValue(evaluationReadNotice);
      f.source[stage].mockReturnValueOnce(pending.promise);
      f.controller.start();
      await flush();
      const opening = f.controller.openNotification(notice.id);
      await vi.advanceTimersByTimeAsync(101);
      await opening;
      expect(f.controller.getSnapshot()).toMatchObject({
        busy: false,
        message: "暂时无法打开通知，请重试。",
      });
      pending.resolve(readNotice);
      await flush();
      expect(f.navigate).not.toHaveBeenCalled();
      await f.controller.openNotification(notice.id);
      expect(f.navigate).toHaveBeenCalledExactlyOnceWith("/diagnosis");
    },
  );

  it.each(["markRead", "markAllRead", "selectBrand"] as const)(
    "clears notices when %s detects an account change",
    async (stage) => {
      const f = fixture();
      f.source.list.mockResolvedValue(
        page([
          {
            ...notice,
            target: {
              kind: "EVALUATION_RETRY",
              brandId: brand,
              runId: "run-one",
            },
          },
        ]),
      );
      f.source.markRead.mockResolvedValue(evaluationReadNotice);
      f.source[stage].mockRejectedValueOnce(
        new ApiRequestError("changed", 409, "ACCOUNT_CHANGED"),
      );
      f.controller.start();
      await flush();
      if (stage === "markAllRead") await f.controller.markAllRead();
      else await f.controller.openNotification(notice.id);
      await flush();
      expect(f.controller.getSnapshot()).toMatchObject({
        items: [],
        unreadCount: 0,
        busy: false,
        accessLost: true,
      });
      expect(f.navigate).not.toHaveBeenCalled();
    },
  );
});
