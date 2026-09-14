import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listAgencyCustomers,
  getAgencyCustomer,
  getAgencyCurrentReport,
  getAgencyReportHistory,
  getAgencyReport,
  transferAgencyCustomer,
  ApiRequestError,
} from "@geoeval/api-client";
afterEach(() => vi.unstubAllGlobals());
describe("agency service API boundary", () => {
  it("uses current-session credentials and no-store for every customer/report read", async () => {
    const requests: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        requests.push([url, init]);
        return Response.json({ items: [], nextCursor: null });
      }),
    );
    await listAgencyCustomers("https://api.test", "cursor-value");
    await getAgencyCustomer("https://api.test", "customer");
    await getAgencyCurrentReport("https://api.test", "customer", "brand");
    await getAgencyReportHistory("https://api.test", "customer", "brand");
    await getAgencyReport("https://api.test", "customer", "brand", "report");
    expect(requests.map(([url]) => new URL(url).pathname)).toEqual([
      "/agency/customers",
      "/agency/customers/customer/brands",
      "/agency/customers/customer/brands/brand/report",
      "/agency/customers/customer/brands/brand/reports",
      "/agency/customers/customer/brands/brand/reports/report",
    ]);
    for (const [, init] of requests)
      expect(init).toMatchObject({ credentials: "include", cache: "no-store" });
  });
  it("does not turn revoked access into cached data or a public response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "该客户或资料当前不可访问" }, { status: 404 }),
      ),
    );
    await expect(
      getAgencyCustomer("https://api.test", "former-customer"),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
  it("preserves the same migration request when retrying an uncertain response", async () => {
    const bodies: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push(init.body as string);
        if (bodies.length === 1) throw new TypeError("network lost");
        return Response.json({ outcome: "REPLAYED" });
      }),
    );
    const request = {
      agentAccountId: null,
      expectedRevision: 3,
      reason: "服务交接",
      requestId: "request-fixed",
    };
    await expect(
      transferAgencyCustomer("https://api.test", "customer", request),
    ).rejects.toThrow("network lost");
    expect(
      await transferAgencyCustomer("https://api.test", "customer", request),
    ).toMatchObject({ outcome: "REPLAYED" });
    expect(bodies[0]).toBe(bodies[1]);
  });
});
