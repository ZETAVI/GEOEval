import { execFileSync } from "node:child_process";
import { verify } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, request, type Server } from "node:https";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createWechatHttpsExchange } from "../src/recharge/infrastructure/wechat/wechat-https.js";
import { WechatPayGateway } from "../src/recharge/infrastructure/wechat/wechat-pay.gateway.js";
import { wechatFixture } from "./wechat-pay.fixture.js";

const f = wechatFixture();
type Plan = {
  status?: number;
  body?: Buffer;
  headers?: Record<string, string | string[]>;
  mode?: "hang" | "reset" | "trickle" | "truncate" | "split";
};

describe("actual WeChat adapter through controlled HTTPS", () => {
  let server: Server, cert: Buffer, directory: string;
  let port: number,
    attempts = 0,
    chunksSent = 0;
  let plan: Plan;
  let captured: {
    method: string;
    path: string;
    body: Buffer;
    signatureValid: boolean;
  }[];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const errors: string[] = [];

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), "geoeval77-test-tls-"));
    // Ephemeral test CA/key only. Never disables certificate verification.
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-days",
        "1",
        "-subj",
        "/CN=api.mch.weixin.qq.com",
        "-addext",
        "subjectAltName=DNS:api.mch.weixin.qq.com",
        "-keyout",
        join(directory, "test.key"),
        "-out",
        join(directory, "test.crt"),
      ],
      { stdio: "ignore" },
    );
    cert = readFileSync(join(directory, "test.crt"));
    server = createServer(
      { cert, key: readFileSync(join(directory, "test.key")) },
      (req, res) => {
        void respond(req, res);
      },
    );
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    port = (server.address() as { port: number }).port;
  });
  beforeEach(() => {
    plan = {};
    captured = [];
    attempts = 0;
    chunksSent = 0;
  });
  afterEach(() => {
    expect(errors).toEqual([]);
    expect(captured.every((x) => x.signatureValid)).toBe(true);
  });
  afterAll(async () => {
    for (const timer of timers) clearTimeout(timer);
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  async function respond(req: IncomingMessage, res: ServerResponse) {
    try {
      const current = plan;
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = Buffer.concat(chunks);
      const fields = Object.fromEntries(
        [...(req.headers.authorization ?? "").matchAll(/(\w+)="([^"]*)"/g)].map(
          (m) => [m[1], m[2]],
        ),
      );
      const signed = Buffer.concat([
        Buffer.from(
          `${req.method}\n${req.url}\n${fields.timestamp}\n${fields.nonce_str}\n`,
        ),
        body,
        Buffer.from("\n"),
      ]);
      captured.push({
        method: req.method!,
        path: req.url!,
        body,
        signatureValid:
          verify(
            "sha256",
            signed,
            f.merchant.publicKey,
            Buffer.from(fields.signature!, "base64"),
          ) && Number(req.headers["content-length"]) === body.length,
      });
      if (current.mode === "hang") return;
      if (current.mode === "reset") {
        req.socket.destroy();
        return;
      }
      const status =
        current.status ?? (req.url!.endsWith("/close") ? 204 : 200);
      const responseBody =
        current.body ??
        (status === 204
          ? Buffer.alloc(0)
          : Buffer.from(
              JSON.stringify(
                req.url === "/v3/pay/transactions/native"
                  ? {
                      code_url:
                        "weixin://wxpay/bizpayurl/up?pr=LOCAL&groupid=00",
                      extra: "充值🔒",
                    }
                  : f.trade(),
              ),
            ));
      const response = f.signed(responseBody, status);
      const headers = Object.fromEntries(
        Object.entries(response.headers).map(([name, values]) => [
          name,
          values![0]!,
        ]),
      ) as Record<string, string | string[]>;
      res.writeHead(status, { ...headers, ...current.headers });
      if (current.mode === "trickle") {
        res.flushHeaders();
        const timer = setInterval(() => {
          chunksSent += 1;
          res.write(" ");
        }, 20);
        timers.add(timer);
        res.on("close", () => {
          clearInterval(timer);
          timers.delete(timer);
        });
        return;
      }
      if (current.mode === "truncate") {
        res.write(responseBody.subarray(0, 5));
        const timer = setTimeout(() => {
          res.destroy();
          timers.delete(timer);
        }, 20);
        timers.add(timer);
        return;
      }
      if (current.mode === "split") {
        const at = responseBody.indexOf(Buffer.from("充")) + 1;
        res.write(responseBody.subarray(0, at));
        const timer = setTimeout(() => {
          res.end(responseBody.subarray(at));
          timers.delete(timer);
        }, 10);
        timers.add(timer);
        return;
      }
      res.end(responseBody);
    } catch (error) {
      errors.push(String(error));
      res.destroy();
    }
  }

  function adapter(
    options: {
      trusted?: boolean;
      servername?: string;
      ipFamily?: 4 | 6;
      timeoutMs?: number;
      maxResponseBytes?: number;
    } = {},
  ) {
    const exchange = createWechatHttpsExchange(
      {
        timeoutMs: options.timeoutMs ?? 1500,
        ...(options.ipFamily ? { ipFamily: options.ipFamily } : {}),
        ...(options.maxResponseBytes
          ? { maxResponseBytes: options.maxResponseBytes }
          : {}),
      },
      (requestOptions, receive) => {
        attempts += 1;
        expect(requestOptions.protocol).toBe("https:");
        expect(requestOptions.hostname).toBe("api.mch.weixin.qq.com");
        expect(requestOptions.family).toBe(options.ipFamily);
        expect(requestOptions.rejectUnauthorized).toBe(true);
        // The test alone redirects the socket to loopback and trusts the ephemeral CA.
        return request(
          {
            ...requestOptions,
            hostname: "127.0.0.1",
            port,
            servername: options.servername ?? "api.mch.weixin.qq.com",
            ...(options.trusted === false ? {} : { ca: cert }),
          },
          receive,
        );
      },
    );
    return new WechatPayGateway(f.config(), exchange);
  }

  it("executes Native, query and signed empty close over verified TLS", async () => {
    const gateway = adapter();
    expect(
      await gateway.initiate(f.order, {
        description: "充值🔒",
        expiresAt: "2026-09-08T10:30:00+08:00",
      }),
    ).toMatchObject({
      ok: true,
      value: {
        kind: "QR_CODE",
        url: "weixin://wxpay/bizpayurl/up?pr=LOCAL&groupid=00",
      },
    });
    expect(await gateway.query(f.order)).toMatchObject({
      ok: true,
      value: {
        state: "SUCCESS",
        facts: { orderTotalFen: 100, payerTotalFen: 80 },
      },
    });
    expect(await gateway.close(f.order)).toMatchObject({
      ok: true,
      value: { kind: "CLOSE_ACKNOWLEDGED" },
    });
    expect(attempts).toBe(3);
    expect(captured).toHaveLength(3);
    expect(captured[1]!.body.length).toBe(0);
  });
  it.each([{ trusted: false }, { servername: "wrong-host.example.invalid" }])(
    "rejects TLS trust or hostname failure (%j)",
    async (options) => {
      expect(await adapter(options).query(f.order)).toMatchObject({
        ok: false,
        error: { kind: "UNRESOLVED", code: "TRANSPORT" },
      });
      expect(attempts).toBe(1);
      expect(captured).toHaveLength(0);
    },
  );
  it("refuses origins outside the fixed HTTPS allowlist before I/O", () => {
    for (const origin of [
      "http://api.mch.weixin.qq.com",
      "https://evil.invalid",
      "https://api.mch.weixin.qq.com/path",
      "https://api.mch.weixin.qq.com@evil.invalid",
    ]) {
      expect(() => createWechatHttpsExchange({ origin })).toThrow(
        "INVALID_INPUT",
      );
    }
    expect(() => createWechatHttpsExchange({ ipFamily: 5 as 4 })).toThrow(
      "INVALID_INPUT",
    );
  });
  it("passes an explicit IP family without weakening TLS", async () => {
    expect(await adapter({ ipFamily: 4 }).query(f.order)).toMatchObject({
      ok: true,
    });
    expect(attempts).toBe(1);
    expect(captured).toHaveLength(1);
  });
  it("verifies raw bytes split inside UTF-8 before JSON interpretation", async () => {
    plan = { mode: "split" };
    expect(
      await adapter().initiate(f.order, {
        description: "充值",
        expiresAt: "2026-09-08T10:30:00+08:00",
      }),
    ).toMatchObject({ ok: true });
  });
  it.each([302, 401, 404, 429, 503])(
    "HTTP %i retains only a safe provider code exactly once",
    async (status) => {
      plan = {
        status,
        body: Buffer.from(
          JSON.stringify({
            code: "APPID_MCHID_NOT_MATCH",
            message: "private provider detail",
          }),
        ),
        headers: {
          Location: "https://api.mch.weixin.qq.com/redirected",
          "Retry-After": "0",
        },
      };
      const result = await adapter().query(f.order);
      expect(result).toMatchObject({
        ok: false,
        error: {
          kind: "UNRESOLVED",
          httpStatus: status,
          providerCode: "APPID_MCHID_NOT_MATCH",
        },
      });
      expect(attempts).toBe(1);
      expect(captured).toHaveLength(1);
      expect(JSON.stringify(result)).not.toContain("private provider detail");
    },
  );
  it("preserves and rejects duplicate signature headers from actual HTTP", async () => {
    plan = { headers: { "wechatpay-serial": [f.keyId, f.keyId] } };
    expect(await adapter().query(f.order)).toMatchObject({
      ok: false,
      error: { code: "AUTH_HEADERS" },
    });
  });
  it("does not close from unsigned 204", async () => {
    plan = { headers: { "wechatpay-signature": "" } };
    expect(await adapter().close(f.order)).toMatchObject({
      ok: false,
      error: { code: "AUTH_HEADERS" },
    });
  });
  it.each(["hang", "trickle"] as const)(
    "absolute deadline covers %s after provider received the request",
    async (mode) => {
      plan = { mode };
      const started = performance.now();
      expect(await adapter({ timeoutMs: 200 }).query(f.order)).toMatchObject({
        ok: false,
        error: { code: "TIMEOUT" },
      });
      expect(performance.now() - started).toBeLessThan(2000);
      expect(attempts).toBe(1);
      expect(captured).toHaveLength(1);
      if (mode === "trickle") expect(chunksSent).toBeGreaterThan(1);
    },
  );
  it("reset after receipt remains ambiguous", async () => {
    plan = { mode: "reset" };
    expect(await adapter().query(f.order)).toMatchObject({
      ok: false,
      error: { code: "TRANSPORT" },
    });
    expect(captured).toHaveLength(1);
    expect(attempts).toBe(1);
  });
  it("rejects truncated body", async () => {
    plan = { mode: "truncate", headers: { "Content-Length": "10000" } };
    expect(await adapter().query(f.order)).toMatchObject({
      ok: false,
      error: { code: "RESPONSE_INTERRUPTED" },
    });
  });
  it.each([false, true])(
    "bounds response bytes with/without declared length (%s)",
    async (declared) => {
      plan = {
        body: Buffer.from(" ".repeat(1000)),
        ...(declared ? { headers: { "Content-Length": "1000" } } : {}),
      };
      expect(
        await adapter({ maxResponseBytes: 64 }).query(f.order),
      ).toMatchObject({ ok: false, error: { code: "RESPONSE_SIZE" } });
    },
  );
  it("caps non-success diagnostics at four KiB", async () => {
    plan = {
      status: 400,
      body: Buffer.from("x".repeat(4097)),
    };
    expect(await adapter().query(f.order)).toMatchObject({
      ok: false,
      error: { code: "RESPONSE_SIZE" },
    });
  });
  it("rejects oversized headers through the strict HTTP parser", async () => {
    plan = { headers: { "X-Large": "x".repeat(20000) } };
    expect(await adapter().query(f.order)).toMatchObject({
      ok: false,
      error: { code: "TRANSPORT" },
    });
  });
  it("refuses automatic content decoding before signature verification", async () => {
    plan = { headers: { "Content-Encoding": "gzip" } };
    expect(await adapter().query(f.order)).toMatchObject({
      ok: false,
      error: { code: "CONTENT_ENCODING" },
    });
  });
});
