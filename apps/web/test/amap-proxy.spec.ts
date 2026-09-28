import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../app/%5FAMapService/[...path]/route.js";

describe("Amap JS security proxy", () => {
  const originalSecurityCode = process.env.AMAP_JS_SECURITY_CODE;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalSecurityCode === undefined) {
      delete process.env.AMAP_JS_SECURITY_CODE;
    } else {
      process.env.AMAP_JS_SECURITY_CODE = originalSecurityCode;
    }
  });

  it("adds the server-only security code and ignores a browser jscode", async () => {
    process.env.AMAP_JS_SECURITY_CODE = "fixture-security-code";
    let upstreamUrl: URL | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | RequestInfo) => {
        upstreamUrl = new URL(String(input));
        return new Response(JSON.stringify({ status: "1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const response = await GET(
      new Request(
        "http://localhost/_AMapService/v3/place/text?keywords=test&jscode=browser-value",
      ),
      { params: Promise.resolve({ path: ["v3", "place", "text"] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(upstreamUrl?.origin).toBe("https://restapi.amap.com");
    expect(upstreamUrl?.pathname).toBe("/v3/place/text");
    expect(upstreamUrl?.searchParams.get("keywords")).toBe("test");
    expect(upstreamUrl?.searchParams.getAll("jscode")).toEqual([
      "fixture-security-code",
    ]);
  });

  it("serves matching JSONP as JavaScript under nosniff", async () => {
    process.env.AMAP_JS_SECURITY_CODE = "fixture-security-code";
    const body = 'AMap.searchCallback({"status":"1","pois":[]});';
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(body, {
            status: 200,
            headers: { "content-type": "application/json;charset=UTF-8" },
          }),
      ),
    );

    const response = await GET(
      new Request(
        "http://localhost/_AMapService/v3/place/text?callback=AMap.searchCallback",
      ),
      { params: Promise.resolve({ path: ["v3", "place", "text"] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/javascript; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe(body);
  });

  it.each(["", "callback);alert(1)//", "window[0]", "x".repeat(201)])(
    "rejects invalid callback %j before reaching the upstream",
    async (callback) => {
      process.env.AMAP_JS_SECURITY_CODE = "fixture-security-code";
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const query = new URLSearchParams({ callback });
      const response = await GET(
        new Request(`http://localhost/_AMapService/v3/place/text?${query}`),
        { params: Promise.resolve({ path: ["v3", "place", "text"] }) },
      );
      expect(response.status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects duplicate callbacks before reaching the upstream", async () => {
    process.env.AMAP_JS_SECURITY_CODE = "fixture-security-code";
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await GET(
      new Request(
        "http://localhost/_AMapService/v3/place/text?callback=first&callback=second",
      ),
      { params: Promise.resolve({ path: ["v3", "place", "text"] }) },
    );
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    'otherCallback({"status":"1"})',
    '{"status":"1"}',
    "searchCallback({status:1})",
    'searchCallback({"status":"1"});alert(1)',
  ])(
    "does not make a mismatched or non-JSON response executable: %s",
    async (body) => {
      process.env.AMAP_JS_SECURITY_CODE = "fixture-security-code";
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(body, {
              headers: { "content-type": "application/json" },
            }),
        ),
      );
      const response = await GET(
        new Request(
          "http://localhost/_AMapService/v3/place/text?callback=searchCallback",
        ),
        { params: Promise.resolve({ path: ["v3", "place", "text"] }) },
      );
      expect(response.status).toBe(502);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
    },
  );

  it("fails closed when the server security code or path is invalid", async () => {
    delete process.env.AMAP_JS_SECURITY_CODE;
    expect(
      (
        await GET(new Request("http://localhost/_AMapService/v3/test"), {
          params: Promise.resolve({ path: ["v3", "test"] }),
        })
      ).status,
    ).toBe(503);

    process.env.AMAP_JS_SECURITY_CODE = "fixture-security-code";
    expect(
      (
        await GET(
          new Request("http://localhost/_AMapService/v3/assistant/inputtips"),
          {
            params: Promise.resolve({
              path: ["v3", "assistant", "inputtips"],
            }),
          },
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await GET(new Request("http://localhost/_AMapService/test"), {
          params: Promise.resolve({ path: [".."] }),
        })
      ).status,
    ).toBe(400);
  });
});
