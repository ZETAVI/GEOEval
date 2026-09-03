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
    expect(upstreamUrl?.origin).toBe("https://restapi.amap.com");
    expect(upstreamUrl?.pathname).toBe("/v3/place/text");
    expect(upstreamUrl?.searchParams.get("keywords")).toBe("test");
    expect(upstreamUrl?.searchParams.getAll("jscode")).toEqual([
      "fixture-security-code",
    ]);
  });

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
        await GET(new Request("http://localhost/_AMapService/test"), {
          params: Promise.resolve({ path: [".."] }),
        })
      ).status,
    ).toBe(400);
  });
});
