import { afterEach, describe, expect, it, vi } from "vitest";

import { AmapStoreLocationProvider } from "../src/brand/infrastructure/amap-store-location.provider.js";

const config = {
  mode: "amap" as const,
  receiptSigningSecret: "test-store-location-receipt-secret-2026",
  receiptTtlSeconds: 900,
  requestTimeoutMs: 5_000,
  amapBaseUrl: "https://restapi.amap.test",
  amapWebServiceKey: "server-only-test-key",
};

describe("Amap Store Location adapter contract", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("combines v5 detail and v3 reverse geocode into minimal evidence", async () => {
    const urls: URL[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | RequestInfo) => {
        const url = new URL(String(input));
        urls.push(url);
        if (url.pathname === "/v5/place/detail") {
          return response({
            status: "1",
            infocode: "10000",
            pois: [
              {
                id: "B001",
                name: "广州塔",
                address: "阅江西路222号",
                location: "113.324553,23.106414",
                adcode: "440105",
                cityname: "广州市",
                adname: "海珠区",
                business: { business_area: "赤岗" },
              },
            ],
          });
        }
        return response({
          status: "1",
          infocode: "10000",
          regeocode: {
            formatted_address: "广东省广州市海珠区阅江西路222号",
            addressComponent: {
              province: "广东省",
              city: "广州市",
              district: "海珠区",
              township: "赤岗街道",
              adcode: "440105",
              towncode: "440105001000",
              businessAreas: [{ name: "赤岗" }, { name: "客村" }],
            },
          },
        });
      }),
    );

    const result = await new AmapStoreLocationProvider(
      config,
    ).resolveSelectedPlace({ providerPlaceId: "B001" });

    expect(result).toMatchObject({
      providerPlaceId: "B001",
      placeName: "广州塔",
      formattedAddress: "广东省广州市海珠区阅江西路222号",
      adcode: "440105",
      towncode: "440105001000",
      businessAreaLabels: ["赤岗", "客村"],
      coordinate: { system: "GCJ_02" },
    });
    expect(urls.map((url) => url.pathname)).toEqual([
      "/v5/place/detail",
      "/v3/geocode/regeo",
    ]);
    expect(urls[0]!.searchParams.get("show_fields")).toBe("business");
    expect(urls[1]!.searchParams.get("extensions")).toBe("all");
    expect(
      urls.every(
        (url) => url.searchParams.get("key") === config.amapWebServiceKey,
      ),
    ).toBe(true);
  });

  it("rejects inconsistent detail and reverse-geocode adcodes", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          response({
            status: "1",
            infocode: "10000",
            pois: [
              {
                name: "广州塔",
                address: "阅江西路222号",
                location: "113.324553,23.106414",
                adcode: "440105",
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          response({
            status: "1",
            infocode: "10000",
            regeocode: {
              formatted_address: "测试地址",
              addressComponent: { province: "广东省", adcode: "440106" },
            },
          }),
        ),
    );

    await expect(
      new AmapStoreLocationProvider(config).resolveSelectedPlace({
        providerPlaceId: "B001",
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });

  it.each([
    ["10003", "PROVIDER_CAPACITY"],
    ["10001", "PROVIDER_CONFIGURATION"],
  ] as const)("maps Amap infocode %s to %s", async (infocode, code) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response({ status: "0", infocode, info: "controlled failure" }),
      ),
    );

    await expect(
      new AmapStoreLocationProvider(config).resolveSelectedPlace({
        providerPlaceId: "B001",
      }),
    ).rejects.toMatchObject({ code });
  });

  it("aborts a request at the configured deadline and returns a safe failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: URL | RequestInfo, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("controlled abort", "AbortError"));
            });
          }),
      ),
    );

    await expect(
      new AmapStoreLocationProvider({
        ...config,
        requestTimeoutMs: 1,
      }).resolveSelectedPlace({ providerPlaceId: "B001" }),
    ).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      message: "位置服务请求超时或不可用",
    });
  });
});

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
