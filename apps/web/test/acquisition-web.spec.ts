import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers.js", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { value: jar.get(name) } : undefined,
  }),
}));
import {
  registrationHref,
  resolveEntry,
  entryCookieName,
} from "../app/acquisition/server.js";
import { GET } from "../app/e/[entryKey]/route.js";
import { POST } from "../app/api/entry/challenge/route.js";
import { NextRequest } from "next/server.js";

const key = "K".repeat(32),
  token = "T".repeat(43);
const context = {
  entryKey: key,
  visitToken: token,
  expiresAt: "2030-01-01T00:00:00.000Z",
};
describe("same-origin acquisition boundary", () => {
  beforeEach(() => {
    jar.clear();
    vi.stubEnv("AGENCY_ACQUISITION_ENABLED", "1");
    vi.stubEnv("GEOEVAL_WEB_ORIGIN", "https://example.test");
    vi.stubEnv("GEOEVAL_INTERNAL_API_BASE_URL", "https://api.example.test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  it("restores the exact entry address and never forwards an authentication cookie", async () => {
    jar.set(entryCookieName(), token);
    jar.set("geoeval_session", "secret-session");
    const fetcher = vi.fn(async () => Response.json(context));
    vi.stubGlobal("fetch", fetcher);
    expect(await registrationHref()).toBe(`/e/${key}`);
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ visitToken: token });
    expect(init.headers).not.toHaveProperty("cookie");
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("error");
  });
  it("never substitutes a public link on a transient backend failure", async () => {
    jar.set(entryCookieName(), token);
    vi.stubGlobal("fetch", async () => new Response(null, { status: 503 }));
    expect(await registrationHref()).toBeNull();
    expect(jar.get(entryCookieName())).toBe(token);
  });
  it("offers an existing-account login escape without replacing an unavailable source", async () => {
    jar.set(entryCookieName(), token);
    vi.stubGlobal("fetch", async () => new Response(null, { status: 503 }));
    const response = await GET(
      new NextRequest(`https://example.test/e/${key}`),
      { params: Promise.resolve({ entryKey: key }) },
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(await response.text()).toContain("/enter?loginOnly=1");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(jar.get(entryCookieName())).toBe(token);
  });
  it("sets a distinct secure host cookie and sends every entry to the same registration page", async () => {
    vi.stubGlobal("fetch", async () => Response.json(context));
    const response = await GET(
      new NextRequest(`https://example.test/e/${key}`),
      { params: Promise.resolve({ entryKey: key }) },
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.test/enter");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("__Host-geoeval_entry=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).not.toContain("Domain=");
  });
  it("does not establish source when a framework prefetch requests an entry", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new NextRequest(`https://example.test/e/${key}`, {
        headers: { purpose: "prefetch" },
      }),
      { params: Promise.resolve({ entryKey: key }) },
    );
    expect(response.status).toBe(204);
    expect(fetcher).not.toHaveBeenCalled();
    expect(response.headers.has("set-cookie")).toBe(false);
  });
  it("rejects forged cross-origin challenge requests and passes only the server-read source", async () => {
    jar.set(entryCookieName(), token);
    const fetcher = vi.fn(async () =>
      Response.json({ challengeId: "challenge", expiresAt: context.expiresAt }),
    );
    vi.stubGlobal("fetch", fetcher);
    const forged = await POST(
      new NextRequest("https://example.test/api/entry/challenge", {
        method: "POST",
        headers: {
          origin: "https://evil.test",
          "content-type": "application/json",
          "x-geoeval-request": "1",
        },
        body: JSON.stringify({ mobile: "13900010000" }),
      }),
    );
    expect(forged.status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
    const good = await POST(
      new NextRequest("https://example.test/api/entry/challenge", {
        method: "POST",
        headers: {
          origin: "https://example.test",
          "content-type": "application/json",
          "x-geoeval-request": "1",
        },
        body: JSON.stringify({
          mobile: "13900010000",
          acquisitionVisitToken: "forged",
          target: "https://evil.test",
        }),
      }),
    );
    expect(good.status).toBe(200);
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.example.test/identity/challenges");
    expect(JSON.parse(init.body as string)).toEqual({
      mobile: "13900010000",
      acquisitionVisitToken: token,
    });
  });
  it("rejects malformed source responses and preserves the ordinary disabled entry", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json({ ...context, entryKey: "//evil.test" }),
    );
    await expect(resolveEntry()).rejects.toThrow();
    vi.stubEnv("AGENCY_ACQUISITION_ENABLED", "0");
    expect(await registrationHref()).toBe("/enter");
  });
});
