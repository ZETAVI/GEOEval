import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpBrowserSamplingGateway } from "../src/geo-intelligence/infrastructure/http-browser-sampling.gateway.js";

describe("HTTP browser sampling gateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits one real batch with a stable idempotency key", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ task: { id: "external-1" } }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", request);
    const gateway = new HttpBrowserSamplingGateway({
      mode: "browser-control-plane",
      baseUrl: "http://control.test",
      bearerToken: "test-token",
      accountId: "primary",
      requestTimeoutMs: 1_000,
      pollIntervalMs: 250,
      collectionDeadlineMs: 85_000,
      maximumWaitMs: 600_000,
    });

    await expect(
      gateway.submitBatch({
        platform: "qwen",
        accountId: "primary",
        prompts: ["问题一", "问题二"],
        idempotencyKey: "stable-key",
        collectionDeadlineMs: 85_000,
      }),
    ).resolves.toEqual({ externalTaskId: "external-1" });
    expect(request).toHaveBeenCalledOnce();
    const [url, init] = request.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("http://control.test/api/v1/tasks");
    expect(new Headers(init.headers)).toEqual(expect.objectContaining({}));
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer test-token",
    );
    expect(new Headers(init.headers).get("idempotency-key")).toBe("stable-key");
    expect(JSON.parse(String(init.body))).toEqual({
      platform: "qwen",
      accountId: "primary",
      prompts: ["问题一", "问题二"],
      collectionDeadlineMs: 85_000,
      executionMode: "real",
    });
  });

  it("normalizes captured-late and failed result items", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "FAILED" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "FAILED",
            result: {
              collectionElapsedMs: 90_000,
              items: [
                {
                  index: 0,
                  status: "SUCCEEDED",
                  completionStatus: "CAPTURED_LATE",
                  answer: " 完整助手回答 ",
                  collectionSlaMet: false,
                  capturedAtMs: 88_000,
                  resetReady: true,
                },
                {
                  index: 1,
                  status: "FAILED",
                  completionStatus: "FAILED",
                  failureCode: "VERIFICATION_CHALLENGE",
                },
              ],
            },
            failureCode: "VERIFICATION_CHALLENGE",
            failureMessage: "one item failed",
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", request);
    const gateway = new HttpBrowserSamplingGateway({
      mode: "browser-control-plane",
      baseUrl: "http://control.test",
      bearerToken: "",
      accountId: "primary",
      requestTimeoutMs: 1_000,
      pollIntervalMs: 250,
      collectionDeadlineMs: 85_000,
      maximumWaitMs: 600_000,
    });

    await expect(gateway.readBatch("external-1")).resolves.toEqual({
      kind: "TERMINAL",
      status: "FAILED",
      collectionElapsedMs: 90_000,
      failureCode: "VERIFICATION_CHALLENGE",
      failureMessage: "one item failed",
      items: [
        expect.objectContaining({
          index: 0,
          completionStatus: "CAPTURED_LATE",
          answer: "完整助手回答",
          assistantRoleVerified: true,
          nonEchoVerified: true,
        }),
        expect.objectContaining({
          index: 1,
          completionStatus: "FAILED",
          failureCode: "VERIFICATION_CHALLENGE",
        }),
      ],
    });
  });

  it("returns running state without requesting a result", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ status: "RUNNING" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", request);

    await expect(
      gatewayFor("secret-token").readBatch("external-2"),
    ).resolves.toEqual({
      kind: "RUNNING",
      status: "RUNNING",
    });
    expect(request).toHaveBeenCalledOnce();
  });

  it("masks remote bodies and bearer tokens in transport errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: "private answer and secret-token" }),
            { status: 503 },
          ),
        ),
    );

    const error = await gatewayFor("secret-token")
      .readBatch("external-3")
      .catch((value) => value);
    expect(error).toBeInstanceOf(Error);
    expect(String(error.message)).toBe("Control plane returned HTTP 503");
    expect(String(error.message)).not.toContain("secret-token");
    expect(String(error.message)).not.toContain("private answer");
  });
});

function gatewayFor(bearerToken: string) {
  return new HttpBrowserSamplingGateway({
    mode: "browser-control-plane",
    baseUrl: "http://control.test",
    bearerToken,
    accountId: "primary",
    requestTimeoutMs: 1_000,
    pollIntervalMs: 250,
    collectionDeadlineMs: 85_000,
    maximumWaitMs: 600_000,
  });
}
