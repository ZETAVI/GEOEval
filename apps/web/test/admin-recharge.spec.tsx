import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiRequestError,
  type Account,
  type AdminRechargeDetail,
} from "@geoeval/api-client";
import {
  AdminRechargeController,
  type AdminRechargeSource,
} from "../app/admin/recharges/controller.js";
import {
  RechargeAdminDetail,
  RechargeAdminList,
} from "../app/admin/recharges/workspace.js";
const account = {
  id: "admin",
  mobile: "+8613900007801",
  role: "ADMINISTRATOR",
  status: "ACTIVE",
  revision: 1,
} as Account;
const item = {
  id: "order",
  accountId: "customer",
  accountMobile: "+8613900007800",
  amountYuan: 1,
  points: 10,
  method: "WECHAT_NATIVE",
  status: "SUCCESSFUL",
  createdAt: "2026-09-11T00:00:00Z",
  paymentExpiresAt: "2026-09-11T00:10:00Z",
  paidAt: "2026-09-11T00:01:00Z",
  closedAt: null,
} as const;
const detail: AdminRechargeDetail = {
  ...item,
  merchantOrderNo: "merchant-order",
  providerTransactionId: "transaction",
  ledgerId: "ledger",
  creditedPoints: 10,
  creditedAt: "2026-09-11T00:02:00Z",
  lastQueriedAt: "2026-09-11T00:01:30Z",
  diagnostic: null,
  notificationState: "PENDING",
  notificationDeliveredAt: null,
};
function source(): AdminRechargeSource {
  return {
    session: async () => ({ kind: "ready", account }),
    list: async () => ({ items: [item], nextCursor: null }),
    detail: async () => detail,
    accounts: async () => [],
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("administrator recharge request lifetimes", () => {
  it("fences an old page after filters change, even when abort is ignored", async () => {
    const s = source(),
      c = new AdminRechargeController(s, () => {});
    await c.bootstrap();
    const old = deferred<{ items: (typeof item)[]; nextCursor: null }>();
    s.list = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue({ items: [], nextCursor: null });
    const first = c.load({ status: "SUCCESSFUL" });
    await c.load({ status: "CLOSED" });
    old.resolve({ items: [item], nextCursor: null });
    await first;
    expect(c.state.page?.items).toEqual([]);
    c.destroy();
  });
  it("clears financial data when the server rejects a changed administrator", async () => {
    const s = source(),
      c = new AdminRechargeController(s, () => {});
    await c.bootstrap();
    s.list = async () => {
      throw new ApiRequestError("changed", 409, "ACCOUNT_CHANGED");
    };
    await c.load();
    expect(c.state.page).toBeNull();
    expect(c.state.accounts).toEqual([]);
    expect(c.state.session.kind).toBe("error");
    c.destroy();
  });
  it("rejects delayed data from the prior login generation", async () => {
    const s = source(),
      c = new AdminRechargeController(s, () => {}),
      old = deferred<{ items: (typeof item)[]; nextCursor: null }>();
    s.list = () => old.promise;
    const prior = c.bootstrap();
    await Promise.resolve();
    s.session = async () => ({ kind: "unauthenticated" });
    await c.bootstrap();
    old.resolve({ items: [item], nextCursor: null });
    await prior;
    expect(c.state.session.kind).toBe("unauthenticated");
    expect(c.state.page).toBeNull();
    c.destroy();
  });
  it("bounds a hung read and does not accept its late result", async () => {
    vi.useFakeTimers();
    const s = source(),
      old = deferred<{ items: (typeof item)[]; nextCursor: null }>();
    s.list = () => old.promise;
    const c = new AdminRechargeController(s, () => {}, undefined, 50);
    const pending = c.bootstrap();
    await vi.advanceTimersByTimeAsync(51);
    await pending;
    expect(c.state.error).toBe("加载失败，请重试");
    expect(c.state.busy).toBe(false);
    old.resolve({ items: [item], nextCursor: null });
    await Promise.resolve();
    expect(c.state.page).toBeNull();
    c.destroy();
  });
  it("retains earlier rows on a failed next-page read and retries the same cursor", async () => {
    const s = source();
    s.list = vi
      .fn()
      .mockResolvedValueOnce({ items: [item], nextCursor: "cursor" })
      .mockRejectedValueOnce(new Error())
      .mockResolvedValueOnce({
        items: [{ ...item, id: "second" }],
        nextCursor: null,
      });
    const c = new AdminRechargeController(s, () => {});
    await c.bootstrap();
    await c.load(undefined, true);
    expect(c.state.page?.items).toHaveLength(1);
    await c.load(undefined, true);
    expect(c.state.page?.items.map((x) => x.id)).toEqual(["order", "second"]);
    expect(vi.mocked(s.list).mock.calls[2]?.[1]).toEqual({ cursor: "cursor" });
    c.destroy();
  });
  it("never publishes an ignored-abort completion after unmount", async () => {
    const old = deferred<AdminRechargeDetail>(),
      s = source();
    s.detail = () => old.promise;
    const changed = vi.fn(),
      c = new AdminRechargeController(s, changed, "order");
    const pending = c.bootstrap();
    await Promise.resolve();
    c.destroy();
    const count = changed.mock.calls.length;
    old.resolve(detail);
    await pending;
    expect(changed.mock.calls).toHaveLength(count);
  });
});
describe("administrator recharge presentation", () => {
  it("separates successful credit from a pending message and exposes no mutation actions", () => {
    const html = renderToStaticMarkup(<RechargeAdminDetail order={detail} />);
    for (const text of [
      "充值成功",
      "付款时间",
      "到账记录时间",
      "到账流水号",
      "待投递",
      "ledger",
    ])
      expect(html).toContain(text);
    expect(html).not.toContain("未付款");
    expect(html).not.toContain("<button");
  });
  it("keeps credited evidence visible alongside a later conflict", () => {
    const html = renderToStaticMarkup(
      <RechargeAdminDetail
        order={{ ...detail, diagnostic: "付款信息存在冲突" }}
      />,
    );
    expect(html).toContain("充值成功");
    expect(html).toContain("ledger");
    expect(html).toContain("付款信息存在冲突");
  });
  it("does not turn absent payment confirmation into proof of nonpayment", () => {
    const html = renderToStaticMarkup(
      <RechargeAdminDetail
        order={{
          ...detail,
          status: "CONFIRMING",
          paidAt: null,
          providerTransactionId: null,
          ledgerId: null,
          creditedPoints: null,
          creditedAt: null,
          notificationState: null,
        }}
      />,
    );
    expect(html).toContain("尚未确认");
    expect(html).not.toContain("未付款");
    expect(html).toContain("确认中");
  });
  it("renders an empty filtered list with a simple message", () => {
    const c = new AdminRechargeController(source(), () => {});
    const html = renderToStaticMarkup(
      <RechargeAdminList
        state={{ ...c.state, page: { items: [], nextCursor: null } }}
        onSearch={() => {}}
        onFilter={() => {}}
        onNext={() => {}}
      />,
    );
    expect(html).toContain("暂无符合条件的充值记录");
    expect(html).not.toContain("查看详情");
    c.destroy();
  });
});
