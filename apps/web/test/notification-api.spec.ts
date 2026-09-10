import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectCurrentBrand,
} from "@geoeval/api-client";

const base = "http://local.invalid";
const account = "77000000-0000-4000-8000-000000000101";
afterEach(() => vi.unstubAllGlobals());

describe("notification API request context", () => {
  it("retains existing call forms, cookie credentials and mutation CSRF headers", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({}));
    vi.stubGlobal("fetch", fetcher);
    await listNotifications(base);
    await markNotificationRead(base, "notice-one");
    await markAllNotificationsRead(base);
    expect(fetcher.mock.calls[0]).toEqual([
      `${base}/notifications`,
      { cache: "no-store", credentials: "include", headers: {} },
    ]);
    for (const [, init] of fetcher.mock.calls.slice(1)) {
      expect(init).toEqual({
        method: "PUT",
        cache: "no-store",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-geoeval-request": "1",
        },
      });
    }
  });

  it("sends optional account and abort context with no-store on lists and both mutations", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({}));
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    const request = { expectedAccountId: account, signal };
    await listNotifications(base, { limit: 10, cursor: "cursor-one" }, request);
    await markNotificationRead(base, "notice-one", request);
    await markAllNotificationsRead(base, request);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      `${base}/notifications?limit=10&cursor=cursor-one`,
      `${base}/notifications/notice-one/read`,
      `${base}/notifications/read-all`,
    ]);
    for (const [, init] of fetcher.mock.calls)
      expect(init).toMatchObject({
        cache: "no-store",
        credentials: "include",
        signal,
        headers: { "x-geoeval-account": account },
      });
    for (const [, init] of fetcher.mock.calls.slice(1))
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-geoeval-request": "1",
        "x-geoeval-account": account,
      });
  });

  it("keeps brand selection compatible and forwards optional notification cancellation context", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({}));
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    await selectCurrentBrand(base, "brand-one");
    await selectCurrentBrand(base, "brand-one", {
      signal,
      expectedAccountId: account,
    });
    expect(fetcher.mock.calls[0]).toEqual([
      `${base}/brands/brand-one/current`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-geoeval-request": "1",
        },
      },
    ]);
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      signal,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-geoeval-request": "1",
        "x-geoeval-account": account,
      },
    });
  });
});
