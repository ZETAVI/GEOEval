import { execFileSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:https";
import { createServer as createTcpServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent, Pool } from "undici";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  AlipayPaymentAdapter,
  type AlipayConfig,
} from "../src/recharge/infrastructure/alipay/alipay-payment.adapter.js";
import {
  ALIPAY_RESPONSE_BYTES,
  alipayCallTransport,
} from "../src/recharge/infrastructure/alipay/alipay-transport.js";

const host = "openapi-sandbox.dl.alipaydev.com";
const merchant = generateKeyPairSync("rsa", { modulusLength: 2048 });
const provider = generateKeyPairSync("rsa", { modulusLength: 2048 });
const config: AlipayConfig = {
  appId: "2026000000000001",
  merchantId: "2088000000000001",
  environment: "sandbox",
  privateKey: merchant.privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString(),
  verification: {
    mode: "PUBLIC_KEY",
    publicKey: provider.publicKey
      .export({ type: "spki", format: "pem" })
      .toString(),
  },
  notifyUrl: "https://merchant.example/notify",
  returnUrl: "https://merchant.example/return",
  timeoutMs: 400,
};
const order = {
  merchantId: config.merchantId,
  appId: config.appId,
  merchantOrderNo: "https_test_order",
  amountFen: 100,
};
const trade = {
  out_trade_no: order.merchantOrderNo,
  trade_no: "20260911000000000001",
  total_amount: "1.00",
  trade_status: "TRADE_SUCCESS",
};

describe("real SDK through bounded local HTTPS", () => {
  let server: Server, directory: string, certificate: Buffer, port: number;
  const sockets = new Set<Socket>();
  const clients: AlipayPaymentAdapter[] = [];
  let mode = "normal",
    requests = 0,
    validSignatures = 0,
    writtenChunks = 0,
    responseClosed = false;
  let lastEncoding: string | undefined;
  let certificateConfig: AlipayConfig;
  const providerSn = createHash("md5")
    .update("CN=protocol-provider1")
    .digest("hex");
  let responseSn: string | undefined;
  let started: () => void = () => {};
  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), "geoeval-alipay-https-"));
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
        `/CN=${host}`,
        "-addext",
        `subjectAltName=DNS:${host}`,
        "-keyout",
        join(directory, "tls.key"),
        "-out",
        join(directory, "tls.crt"),
      ],
      { stdio: "ignore" },
    );
    certificate = readFileSync(join(directory, "tls.crt"));
    function signingCertificate(name: string, privateKey: string) {
      const key = join(directory, `${name}.key`),
        cert = join(directory, `${name}.crt`);
      writeFileSync(key, privateKey, { mode: 0o600 });
      execFileSync(
        "openssl",
        [
          "req",
          "-new",
          "-x509",
          "-sha256",
          "-key",
          key,
          "-out",
          cert,
          "-days",
          "1",
          "-set_serial",
          "1",
          "-subj",
          `/CN=${name}`,
        ],
        { stdio: "ignore" },
      );
      return readFileSync(cert, "utf8");
    }
    const appCertificate = signingCertificate(
      "protocol-merchant",
      config.privateKey,
    );
    const alipayCertificate = signingCertificate(
      "protocol-provider",
      provider.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    );
    certificateConfig = {
      ...config,
      verification: {
        mode: "CERTIFICATE",
        appCertificate,
        alipayCertificate,
        rootCertificate: alipayCertificate,
      },
    };

    server = createServer(
      { cert: certificate, key: readFileSync(join(directory, "tls.key")) },
      (req, res) => {
        requests++;
        started();
        res.on("close", () => {
          responseClosed = true;
        });
        lastEncoding = req.headers["accept-encoding"];
        const pieces: Buffer[] = [];
        req.on("data", (c) => pieces.push(c));
        req.on("end", () => {
          const body = Buffer.concat(pieces).toString();
          const auth = String(req.headers.authorization).replace(
            "ALIPAY-SHA256withRSA ",
            "",
          );
          const at = auth.lastIndexOf(",sign=");
          if (
            verify(
              "RSA-SHA256",
              Buffer.from(
                `${auth.slice(0, at)}\n${req.method}\n${req.url}\n${body}\n`,
              ),
              merchant.publicKey,
              Buffer.from(auth.slice(at + 6), "base64"),
            )
          )
            validSignatures++;
          if (mode === "stall") return;
          if (mode === "reset") {
            req.socket.destroy();
            return;
          }
          if (mode === "redirect" || mode === "same-origin-redirect") {
            res.writeHead(302, {
              location:
                mode === "redirect"
                  ? "https://external.invalid/leak"
                  : `https://${host}/leak`,
            });
            res.end();
            return;
          }
          if (mode === "length") {
            res.writeHead(200, {
              "content-length": String(ALIPAY_RESPONSE_BYTES + 1),
            });
            res.flushHeaders();
            return;
          }
          if (mode === "encoding") {
            res.writeHead(200, { "content-encoding": "gzip" });
            res.end("compressed");
            return;
          }
          if (mode === "error") {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
              JSON.stringify({
                code: "ACQ.SYSTEM_ERROR",
                message: "provider diagnostic",
              }),
            );
            return;
          }
          const data = JSON.stringify(
            req.url?.endsWith("close")
              ? {
                  out_trade_no: order.merchantOrderNo,
                  trade_no: trade.trade_no,
                }
              : trade,
          );
          const timestamp = String(Date.now()),
            nonce = "controlled-http";
          const headers: Record<string, string> = {
            "content-type": "application/json",
            "alipay-timestamp": timestamp,
            "alipay-nonce": nonce,
            "alipay-signature": sign(
              "RSA-SHA256",
              Buffer.from(`${timestamp}\n${nonce}\n${data}\n`),
              provider.privateKey,
            ).toString("base64"),
          };
          if (responseSn) headers["alipay-sn"] = responseSn;
          if (mode === "missing-header") delete headers["alipay-nonce"];
          res.writeHead(200, headers);
          if (mode === "trickle") {
            res.flushHeaders();
            const timer = setInterval(() => {
              writtenChunks++;
              res.write(" ");
            }, 15);
            res.on("close", () => clearInterval(timer));
            return;
          }
          if (mode === "chunked") {
            res.end(Buffer.alloc(ALIPAY_RESPONSE_BYTES + 1, 32));
            return;
          }
          if (mode === "tampered") {
            res.end(data + " ");
            return;
          }
          res.end(data);
        });
      },
    );
    server.on("connection", (socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    port = (server.address() as { port: number }).port;
  });
  function client(
    timeoutMs = 400,
    trusted = true,
    targetPort = port,
    certificateMode = false,
  ) {
    const createPool = (signal: AbortSignal) =>
      new Agent({
        factory: () =>
          new Pool(`https://${host}:${targetPort}`, {
            connections: 1,
            connect: {
              signal,
              timeout: timeoutMs + 1000,
              ...(trusted ? { ca: certificate } : {}),
              rejectUnauthorized: true,
              lookup: (_hostname, options, callback) => {
                if (options.all)
                  callback(null, [{ address: "127.0.0.1", family: 4 }]);
                else callback(null, "127.0.0.1", 4);
              },
            },
          }),
      });
    const value = new AlipayPaymentAdapter(
      { ...(certificateMode ? certificateConfig : config), timeoutMs },
      undefined,
      createPool,
    );
    clients.push(value);
    return value;
  }
  beforeEach(() => {
    mode = "normal";
    responseSn = undefined;
    requests = 0;
    validSignatures = 0;
    writtenChunks = 0;
    responseClosed = false;
    started = () => {};
  });
  afterEach(async () => {
    await Promise.all(clients.splice(0).map((c) => c.dispose()));
  });
  afterAll(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  });

  it("signs and authenticates an actual HTTPS query and close", async () => {
    const c = client();
    expect(await c.query(order)).toMatchObject({
      ok: true,
      value: { trade: { state: "SUCCESS" } },
    });
    expect(await c.close(order)).toMatchObject({
      ok: true,
      value: { kind: "CLOSE_ACKNOWLEDGED" },
    });
    expect(requests).toBe(2);
    expect(validSignatures).toBe(2);
    expect(lastEncoding).toBe("identity");
  });
  it.each(["redirect", "same-origin-redirect"])(
    "blocks %s before any second request",
    async (kind) => {
      mode = kind;
      expect(await client().query(order)).toMatchObject({
        ok: false,
        error: { code: "REDIRECT", recovery: "REVIEW" },
      });
      expect(requests).toBe(1);
    },
  );
  it.each([
    ["length", "RESPONSE_SIZE"],
    ["chunked", "RESPONSE_SIZE"],
    ["encoding", "RESPONSE_ENCODING"],
    ["missing-header", "AUTH_HEADERS"],
  ])("rejects %s response before SDK interpretation", async (kind, code) => {
    mode = kind;
    expect(await client().query(order)).toMatchObject({
      ok: false,
      error: { code },
    });
    expect(requests).toBe(1);
  });
  it("rejects a valid TLS response with an altered payment body", async () => {
    mode = "tampered";
    expect((await client().query(order)).ok).toBe(false);
    expect(requests).toBe(1);
  });
  it("keeps unsigned HTTP400 system errors retryable without a close proof", async () => {
    mode = "error";
    expect(await client().close(order)).toMatchObject({
      ok: false,
      error: { code: "CHANNEL_TEMPORARY", recovery: "RETRY" },
    });
  });
  it.each(["stall", "trickle"])(
    "aborts %s at the full deadline",
    async (kind) => {
      mode = kind;
      const c = client(150);
      const start = performance.now();
      const result = await c.query(order);
      expect(result).toMatchObject({
        ok: false,
        error: { code: "DEADLINE", recovery: "RETRY" },
      });
      expect(performance.now() - start).toBeLessThan(1000);
      await c.dispose();
      await expect.poll(() => responseClosed, { timeout: 500 }).toBe(true);
      if (kind === "trickle") expect(writtenChunks).toBeGreaterThan(0);
    },
  );
  it("cancels an active request and closes its response", async () => {
    mode = "trickle";
    const signal = new AbortController();
    const c = client(1500);
    const began = new Promise<void>((resolve) => {
      started = resolve;
    });
    const pending = c.query(order, signal.signal);
    await began;
    signal.abort();
    expect(await pending).toMatchObject({
      ok: false,
      error: { code: "ABORTED" },
    });
    await c.dispose();
    await expect.poll(() => responseClosed, { timeout: 500 }).toBe(true);
  });
  it("does not dispatch a pre-aborted request", async () => {
    const signal = new AbortController();
    signal.abort();
    expect(await client().query(order, signal.signal)).toMatchObject({
      ok: false,
      error: { code: "ABORTED" },
    });
    expect(requests).toBe(0);
  });
  it("does not disable TLS verification", async () => {
    expect((await client(500, false).query(order)).ok).toBe(false);
    expect(requests).toBe(0);
  });
  it("does not retry a broken socket", async () => {
    mode = "reset";
    expect((await client().query(order)).ok).toBe(false);
    expect(requests).toBe(1);
  });
  it("rejects new work after disposal", async () => {
    const c = client();
    await c.dispose();
    expect(await c.query(order)).toMatchObject({
      ok: false,
      error: { code: "ADAPTER_DISPOSED" },
    });
    expect(requests).toBe(0);
  });
  it("cancels concurrent work without cancelling another request", async () => {
    mode = "stall";
    const c = client(300);
    const first = c.query(order);
    const aborter = new AbortController();
    const second = c.query(
      { ...order, merchantOrderNo: "queued_order" },
      aborter.signal,
    );
    aborter.abort();
    expect(await second).toMatchObject({
      ok: false,
      error: { code: "ABORTED" },
    });
    expect(await first).toMatchObject({
      ok: false,
      error: { code: "DEADLINE" },
    });
    expect(requests).toBe(1);
  });
  it("aborts a stalled TLS handshake before an HTTP request can be sent", async () => {
    const pendingSockets = new Set<Socket>();
    const blackhole = createTcpServer((socket) => {
      pendingSockets.add(socket);
      socket.once("close", () => pendingSockets.delete(socket));
    });
    blackhole.listen(0, "127.0.0.1");
    await once(blackhole, "listening");
    const forceCleanup = setTimeout(() => {
      for (const socket of pendingSockets) socket.destroy();
    }, 1200);
    try {
      const c = client(
        150,
        true,
        (blackhole.address() as { port: number }).port,
      );
      const start = performance.now();
      expect(await c.query(order)).toMatchObject({
        ok: false,
        error: { code: "DEADLINE" },
      });
      expect(performance.now() - start).toBeLessThan(800);
      await c.dispose();
      expect(requests).toBe(0);
    } finally {
      clearTimeout(forceCleanup);
      for (const socket of pendingSockets) socket.destroy();
      await new Promise<void>((resolve) => blackhole.close(() => resolve()));
    }
  });
  it("authenticates certificate mode over actual HTTPS", async () => {
    responseSn = providerSn;
    expect((await client(400, true, port, true).query(order)).ok).toBe(true);
  });
  it.each([undefined, "wrong_certificate"])(
    "rejects absent or mismatched response certificate %s",
    async (sn) => {
      responseSn = sn;
      expect(await client(400, true, port, true).query(order)).toMatchObject({
        ok: false,
        error: { code: "AUTH_HEADERS" },
      });
    },
  );
  it("rejects destination/path substitution before network I/O", async () => {
    const pool = new Agent();
    const call = alipayCallTransport(() => pool, {
      origin: `https://${host}`,
      path: "/v3/alipay/trade/query",
      timeoutMs: 100,
    });
    try {
      await expect(
        call.dispatcher.request({
          origin: "https://external.invalid",
          path: "/leak",
          method: "POST",
        }),
      ).rejects.toMatchObject({ code: "DESTINATION" });
    } finally {
      await call.finish();
    }
  });
});
