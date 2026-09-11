import { generateKeyPairSync, sign, verify } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import {
  AlipayPaymentAdapter,
  type AlipayConfig,
} from "../src/recharge/infrastructure/alipay/alipay-payment.adapter.js";
import {
  amountFen,
  amountYuan,
  channelDate,
} from "../src/recharge/infrastructure/alipay/alipay-values.js";

// Exercise the real published SDK, replacing only its actual HTTP transport.
const sdkRequire = createRequire(
  createRequire(import.meta.url).resolve("alipay-sdk"),
);
const urllib = (
  await import(
    pathToFileURL(sdkRequire.resolve("urllib").replace("/commonjs/", "/esm/"))
      .href
  )
).default;
const http = vi.spyOn(urllib, "request");
const merchant = generateKeyPairSync("rsa", { modulusLength: 2048 });
const provider = generateKeyPairSync("rsa", { modulusLength: 2048 });
const now = new Date("2026-09-11T08:00:00.000Z");
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
  notifyUrl: "https://merchant.example/recharges/providers/alipay/notify",
  returnUrl: "https://merchant.example/recharges/return",
  timeoutMs: 1200,
};
const adapter = () => new AlipayPaymentAdapter(config, () => now);
const order = {
  merchantId: config.merchantId,
  appId: config.appId,
  merchantOrderNo: "order_123",
  amountFen: 12300,
};
const successful = {
  trade_no: "20260911000000000001",
  out_trade_no: order.merchantOrderNo,
  trade_status: "TRADE_SUCCESS",
  total_amount: "123.00",
};
function signedResponse(data: unknown, status = 200) {
  const raw = JSON.stringify(data, null, 2),
    timestamp = String(now.getTime()),
    nonce = "controlled-response";
  return {
    status,
    data: raw,
    headers: {
      "alipay-timestamp": timestamp,
      "alipay-nonce": nonce,
      "alipay-signature": sign(
        "RSA-SHA256",
        Buffer.from(`${timestamp}\n${nonce}\n${raw}\n`),
        provider.privateKey,
      ).toString("base64"),
    },
  };
}
function notification(changes: Record<string, string> = {}) {
  const data: Record<string, string> = {
    ...successful,
    app_id: config.appId,
    seller_id: config.merchantId,
    notify_id: "n".repeat(128),
    notify_time: "2026-09-09 16:00:00",
    notify_type: "trade_status_sync",
    subject: "充值 + 100% 完整",
    ...changes,
  };
  const content = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("&");
  data.sign_type = "RSA2";
  data.sign = sign(
    "RSA-SHA256",
    Buffer.from(content),
    provider.privateKey,
  ).toString("base64");
  return Buffer.from(new URLSearchParams(data).toString());
}
beforeEach(() => {
  http.mockReset().mockRejectedValue(new Error("UNEXPECTED_NETWORK_REQUEST"));
});
afterAll(() => http.mockRestore());

describe("Alipay page signing with the published SDK", () => {
  it("creates an independently verifiable POST form without network or invented proof", () => {
    const result = adapter().preparePage(order, {
      description: "账户充值",
      expiresAt: "2026-09-11T08:15:00Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(http).not.toHaveBeenCalled();
    expect(result.value).not.toHaveProperty("proof");
    const html = result.value.html;
    expect(html).toContain('method="post"');
    const decode = (s: string) =>
      s
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&");
    const url = new URL(decode(html.match(/action="([^"]+)"/)![1]!));
    expect(url.origin).toBe("https://openapi-sandbox.dl.alipaydev.com");
    const fields = Object.fromEntries(url.searchParams);
    for (const match of html.matchAll(
      /<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g,
    ))
      fields[match[1]!] = decode(match[2]!);
    const signature = fields.sign!;
    delete fields.sign;
    expect(
      verify(
        "RSA-SHA256",
        Buffer.from(
          Object.keys(fields)
            .sort()
            .map((k) => `${k}=${fields[k]}`)
            .join("&"),
        ),
        merchant.publicKey,
        Buffer.from(signature, "base64"),
      ),
    ).toBe(true);
    expect(JSON.parse(fields.biz_content!)).toMatchObject({
      out_trade_no: order.merchantOrderNo,
      total_amount: "123.00",
      product_code: "FAST_INSTANT_TRADE_PAY",
      qr_pay_mode: "2",
      time_expire: "2026-09-11 16:15:00",
    });
    expect(fields.timestamp).toBe("2026-09-11 16:00:00");
    expect(fields.notify_url).toBe(config.notifyUrl);
    expect(fields.return_url).toBe(config.returnUrl);
  });
  it.each(["<script>alert(1)</script>", "bad & amount", "", "a".repeat(257)])(
    "rejects unsafe/invalid title %s",
    (description) => {
      expect(
        adapter().preparePage(order, {
          description,
          expiresAt: "2026-09-11T08:15:00Z",
        }).ok,
      ).toBe(false);
      expect(http).not.toHaveBeenCalled();
    },
  );
  it.each(["2026-09-11T08:00:59Z", "2026-09-10T08:00:00Z", "invalid"])(
    "rejects invalid payment window %s",
    (expiresAt) => {
      expect(
        adapter().preparePage(order, { description: "充值", expiresAt }).ok,
      ).toBe(false);
    },
  );
});

describe("v3 request signing and authenticated observations", () => {
  it("validates real SDK request and provider signature; optional metadata stays absent", async () => {
    http.mockResolvedValueOnce(signedResponse(successful));
    const result = await adapter().query(order);
    expect(result).toMatchObject({
      ok: true,
      value: {
        trade: {
          state: "SUCCESS",
          paymentAt: null,
          sellerTransferAt: null,
          payerTotalFen: null,
        },
        proof: { kind: "ALIPAY_V3_SDK", sdkVersion: "4.14.0" },
      },
    });
    const [url, options] = http.mock.calls[0]!;
    expect(url).toBe(
      "https://openapi-sandbox.dl.alipaydev.com/v3/alipay/trade/query",
    );
    expect(options.timeout).toBe(1200);
    const auth = options.headers.authorization.replace(
      "ALIPAY-SHA256withRSA ",
      "",
    );
    const split = auth.lastIndexOf(",sign="),
      content = `${auth.slice(0, split)}\nPOST\n/v3/alipay/trade/query\n${options.content}\n`;
    expect(
      verify(
        "RSA-SHA256",
        Buffer.from(content),
        merchant.publicKey,
        Buffer.from(auth.slice(split + 6), "base64"),
      ),
    ).toBe(true);
    expect(JSON.parse(options.content)).toEqual({
      out_trade_no: order.merchantOrderNo,
    });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("never maps TRADE_CLOSED to unpaid closure", async () => {
    http.mockResolvedValueOnce(
      signedResponse({ ...successful, trade_status: "TRADE_CLOSED" }),
    );
    expect(await adapter().query(order)).toMatchObject({
      ok: true,
      value: { trade: { state: "CLOSED_UNRESOLVED" } },
    });
  });
  it.each(["WAIT_BUYER_PAY", "TRADE_FINISHED"])(
    "preserves channel state %s",
    async (trade_status) => {
      http.mockResolvedValueOnce(
        signedResponse({ ...successful, trade_status }),
      );
      expect(await adapter().query(order)).toMatchObject({
        ok: true,
        value: { trade: { providerState: trade_status } },
      });
    },
  );
  it.each([
    { out_trade_no: "different" },
    { total_amount: "123.01" },
    { trade_no: undefined },
    { trade_status: "UNKNOWN" },
    { total_amount: 123 },
    { buyer_pay_amount: "124.00" },
  ])("rejects inconsistent authenticated success %j", async (changes) => {
    http.mockResolvedValueOnce(signedResponse({ ...successful, ...changes }));
    expect((await adapter().query(order)).ok).toBe(false);
  });
  it("rejects altered or absent signatures", async () => {
    const response = signedResponse(successful);
    response.data += " ";
    http.mockResolvedValueOnce(response);
    expect(await adapter().query(order)).toMatchObject({
      ok: false,
      error: { code: "AUTH_RESPONSE" },
    });
    http.mockResolvedValueOnce({ ...response, headers: {} });
    expect((await adapter().query(order)).ok).toBe(false);
  });
  it.each([
    [400, "ACQ.SYSTEM_ERROR", "RETRY"],
    [400, "ACQ.TRADE_NOT_EXIST", "VERIFY"],
    [400, "ACQ.TRADE_STATUS_ERROR", "VERIFY"],
    [429, "LIMIT", "RETRY"],
    [503, "SYSTEM", "RETRY"],
  ])(
    "treats unsigned %i %s as a diagnostic only",
    async (status, code, recovery) => {
      http.mockResolvedValueOnce({
        status,
        data: JSON.stringify({ code, message: "PRIVATE_PAYLOAD" }),
        headers: {},
      });
      const result = await adapter().close(order);
      expect(result).toMatchObject({
        ok: false,
        error: { kind: "UNRESOLVED", recovery },
      });
      expect(JSON.stringify(result)).not.toContain("PRIVATE_PAYLOAD");
      expect(result).not.toHaveProperty("value.proof");
    },
  );
  it("accepts only the authenticated, correctly associated close response", async () => {
    http.mockResolvedValueOnce(
      signedResponse({
        trade_no: successful.trade_no,
        out_trade_no: order.merchantOrderNo,
      }),
    );
    expect(await adapter().close(order)).toMatchObject({
      ok: true,
      value: { kind: "CLOSE_ACKNOWLEDGED" },
    });
    http.mockResolvedValueOnce(signedResponse({}));
    expect((await adapter().close(order)).ok).toBe(false);
  });
  it("preserves unresolved transport errors without internal retry", async () => {
    http.mockRejectedValueOnce(new Error("socket closed PRIVATE"));
    const result = await adapter().query(order);
    expect(result).toMatchObject({ ok: false, error: { recovery: "RETRY" } });
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(http).toHaveBeenCalledTimes(1);
  });
  it("rejects wrong merchant before any request", async () => {
    expect(
      (await adapter().query({ ...order, merchantId: "2088000000000002" })).ok,
    ).toBe(false);
    expect(http).not.toHaveBeenCalled();
  });
});

describe("one-pass form verification and long-lived notification replay", () => {
  it("accepts a long notification ID, literal plus/percent, delayed duplicate and absent payment time", () => {
    const raw = notification();
    const gateway = adapter();
    const a = gateway.verifyNotification(raw);
    expect(a).toMatchObject({
      ok: true,
      value: {
        notificationId: "n".repeat(128),
        trade: { state: "SUCCESS", paymentAt: null, payerTotalFen: null },
      },
    });
    expect(gateway.verifyNotification(raw)).toEqual(a);
    expect(http).not.toHaveBeenCalled();
  });
  it("keeps close notifications separate from paid facts", () => {
    expect(
      adapter().verifyNotification(
        notification({ trade_status: "TRADE_CLOSED" }),
      ),
    ).toMatchObject({
      ok: true,
      value: { trade: { state: "CLOSED_UNRESOLVED" } },
    });
  });
  it.each([
    { seller_id: "2088000000000002" },
    { app_id: "2026000000000002" },
    { gmt_payment: "2026-02-30 12:00:00" },
    { notify_id: "n".repeat(129) },
  ])("rejects signed invalid notification %j", (changes) => {
    expect(adapter().verifyNotification(notification(changes)).ok).toBe(false);
  });
  it.each([
    "&total_amount=123.00",
    "&sign_type=RSA2",
    "&subject=%ZZ",
    "&subject2=%FF",
  ])("rejects duplicate or malformed form %s", (suffix) => {
    expect(
      adapter().verifyNotification(
        Buffer.concat([notification(), Buffer.from(suffix)]),
      ).ok,
    ).toBe(false);
  });
  it("rejects tampering and RSA downgrade", () => {
    expect(
      adapter().verifyNotification(
        Buffer.from(notification().toString().replace("123.00", "124.00")),
      ).ok,
    ).toBe(false);
    expect(
      adapter().verifyNotification(
        Buffer.from(notification().toString().replace("RSA2", "RSA")),
      ).ok,
    ).toBe(false);
  });
});

describe("exact money and explicit channel dates", () => {
  it.each(["1e2", "0.001", "-1", "01.00", "100000000.01", "NaN"])(
    "rejects invalid amount %s",
    (value) => expect(() => amountFen(value)).toThrow(),
  );
  it("preserves exact integer boundaries and Shanghai date meaning", () => {
    expect(amountYuan(10_000_000_000)).toBe("100000000.00");
    expect(amountFen("0.01")).toBe(1);
    expect(channelDate("2026-09-11 16:00:00")).toBe(now.toISOString());
  });
});

describe("certificate configuration with ephemeral local certificates", () => {
  it("uses actual SDK certificate mode for form and notification signatures", () => {
    const dir = mkdtempSync(join(tmpdir(), "geoeval-alipay-cert-"));
    try {
      function certificate(name: string, privateKey: string) {
        const key = join(dir, `${name}.key`),
          cert = join(dir, `${name}.crt`);
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
            "-subj",
            `/CN=${name}`,
          ],
          { stdio: "pipe" },
        );
        return readFileSync(cert, "utf8");
      }
      const appCertificate = certificate(
        "ephemeral-merchant",
        config.privateKey,
      );
      const alipayCertificate = certificate(
        "ephemeral-provider",
        provider.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      );
      const certificateConfig: AlipayConfig = {
        ...config,
        verification: {
          mode: "CERTIFICATE",
          appCertificate,
          alipayCertificate,
          rootCertificate: alipayCertificate,
        },
      };
      const gateway = new AlipayPaymentAdapter(certificateConfig, () => now);
      expect(gateway.verifyNotification(notification()).ok).toBe(true);
      const page = gateway.preparePage(order, {
        description: "充值",
        expiresAt: "2026-09-11T08:15:00Z",
      });
      expect(page.ok).toBe(true);
      if (page.ok) {
        expect(page.value.html).toContain("app_cert_sn");
        expect(page.value.html).toContain("alipay_root_cert_sn");
      }
      expect(
        () =>
          new AlipayPaymentAdapter({
            ...certificateConfig,
            verification: {
              ...(certificateConfig.verification as Extract<
                AlipayConfig["verification"],
                { mode: "CERTIFICATE" }
              >),
              appCertificate: alipayCertificate,
            },
          }),
      ).toThrow("ALIPAY_CONFIG_INVALID");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it.each([
    { environment: "invalid" },
    { notifyUrl: "http://merchant.example/notify" },
    { returnUrl: "https://user:password@merchant.example/return" },
    { timeoutMs: 0 },
    { privateKey: "not a key" },
  ])("rejects invalid configuration %j", (changes) => {
    expect(
      () => new AlipayPaymentAdapter({ ...config, ...changes } as AlipayConfig),
    ).toThrow("ALIPAY_CONFIG_INVALID");
  });
  it("freezes query input before the asynchronous SDK exchange", async () => {
    let resolve!: (value: unknown) => void;
    http.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const mutable = { ...order };
    const result = adapter().query(mutable);
    mutable.amountFen = 1;
    resolve(signedResponse(successful));
    expect((await result).ok).toBe(true);
  });
});

it("keeps a preliminary unpaid query without trade_no recoverable", async () => {
  http.mockResolvedValueOnce(
    signedResponse({
      ...successful,
      trade_status: "WAIT_BUYER_PAY",
      trade_no: undefined,
    }),
  );
  expect(await adapter().query(order)).toMatchObject({
    ok: true,
    value: { trade: { state: "WAIT_BUYER_PAY", transactionId: null } },
  });
});
it("treats signed notification IDs as opaque bounded strings", () => {
  expect(
    adapter().verifyNotification(
      notification({ notify_id: "event-id:opaque/value" }),
    ),
  ).toMatchObject({
    ok: true,
    value: { notificationId: "event-id:opaque/value" },
  });
});
