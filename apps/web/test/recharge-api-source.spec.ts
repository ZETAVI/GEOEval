import { afterEach, describe, expect, it, vi } from "vitest";
import type { RechargeRead } from "@geoeval/api-client";
import { nativeApiSource } from "../app/recharges/native-api-source.js";

const account = "77000000-0000-4000-8000-000000000101";
const order = "77000000-0000-4000-8000-000000000102";
const value: RechargeRead = {
  serverTime: "2026-09-09T00:00:00.000Z",
  order: {
    id: order,
    amountYuan: 1,
    points: 10,
    method: "WECHAT_NATIVE",
    status: "CONFIRMING",
    createdAt: "2026-09-09T00:00:00.000Z",
    paymentExpiresAt: "2026-09-09T00:15:00.000Z",
    paidAt: null,
    closedAt: null,
    qr: null,
    cancelRequested: true,
    canCancel: false,
    canVerify: false,
    supportRequired: true,
  },
};
afterEach(() => vi.unstubAllGlobals());
describe("customer Native API boundary", () => {
  it("sends cookie, expected-account and no-store reads, retaining authoritative capabilities", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(value));
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal,
      observed = vi.fn();
    const result = await nativeApiSource(
      "http://local.invalid",
      account,
      observed,
    ).read(order, signal);
    expect(fetcher).toHaveBeenCalledWith(
      `http://local.invalid/recharges/${order}`,
      {
        cache: "no-store",
        credentials: "include",
        signal,
        headers: { "x-geoeval-account": account },
      },
    );
    expect(result).toEqual({ kind: "ok", ...value });
    expect(observed).toHaveBeenCalledWith(value);
  });
  it("commands send only empty body plus CSRF/account headers and acceptance never emits success", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        Response.json({ accepted: true }, { status: 202 }),
      );
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal,
      observed = vi.fn();
    const source = nativeApiSource("http://local.invalid", account, observed);
    expect(await source.verify(order, signal)).toBe("accepted");
    expect(await source.cancel(order, signal)).toBe("accepted");
    for (const [url, init] of fetcher.mock.calls) {
      expect(url).toMatch(new RegExp(`/recharges/${order}/(verify|cancel)$`));
      expect(init).toEqual({
        method: "POST",
        body: "{}",
        cache: "no-store",
        credentials: "include",
        signal,
        headers: {
          "content-type": "application/json",
          "x-geoeval-request": "1",
          "x-geoeval-account": account,
        },
      });
    }
    expect(observed).not.toHaveBeenCalled();
  });
  it("requests a private cashier grant and returns only the same-origin handoff URL", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        path: `/recharges/${order}/cashier-page`,
        expiresAt: "2026-09-09T00:10:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    expect(
      await nativeApiSource("http://local.invalid/", account).cashier?.(
        order,
        signal,
      ),
    ).toEqual({
      kind: "accepted",
      url: `http://local.invalid/recharges/${order}/cashier-page`,
    });
    expect(fetcher).toHaveBeenCalledWith(
      `http://local.invalid/recharges/${order}/cashier`,
      {
        method: "POST",
        body: "{}",
        cache: "no-store",
        credentials: "include",
        signal,
        headers: {
          "content-type": "application/json",
          "x-geoeval-request": "1",
          "x-geoeval-account": account,
        },
      },
    );
  });
  it.each([
    [401, undefined],
    [403, undefined],
    [404, undefined],
    [409, "ACCOUNT_CHANGED"],
  ])(
    "treats access failure %s/%s as access loss, not an unpaid order",
    async (status, code) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn<typeof fetch>()
          .mockImplementation(async () =>
            Response.json({ code }, { status: status as number }),
          ),
      );
      const source = nativeApiSource("http://local.invalid", account),
        signal = new AbortController().signal;
      expect(await source.read(order, signal)).toEqual({
        kind: "access-denied",
      });
      expect(await source.verify(order, signal)).toBe("access-denied");
    },
  );
  it("suppresses side effects from a response arriving after abort", async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const abort = new AbortController(),
      observed = vi.fn();
    const pending = nativeApiSource(
      "http://local.invalid",
      account,
      observed,
    ).read(order, abort.signal);
    abort.abort();
    finish(
      Response.json({
        ...value,
        order: { ...value.order, status: "SUCCESSFUL" },
      }),
    );
    await pending;
    expect(observed).not.toHaveBeenCalled();
  });
});
