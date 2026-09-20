import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  verify,
} from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { WechatRechargePaymentGateway } from "../src/recharge/application/provider-payment.js";
import { WechatPayGateway } from "../src/recharge/infrastructure/wechat/wechat-pay.gateway.js";
import {
  decryptResource,
  signRequest,
  verifyMessage,
} from "../src/recharge/infrastructure/wechat/wechat-crypto.js";
import type {
  WechatHttpRequest,
  WechatHttpResponse,
} from "../src/recharge/infrastructure/wechat/wechat-https.js";
import { wechatFixture } from "./wechat-pay.fixture.js";

const f = wechatFixture();
const input = {
  description: "账户充值🔒",
  expiresAt: "2026-09-08T10:30:00+08:00",
};

describe("WeChat official protocol fixtures in actual implementation", () => {
  it("reproduces the published request signature (shared APIv3, not JSAPI activation)", () => {
    const v = JSON.parse(
      readFileSync(
        new URL(
          "./fixtures/wechat/request.public-example.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(v.purpose).toBe(
      "OFFICIAL PUBLIC EXAMPLE ONLY - NOT MERCHANT CREDENTIALS",
    );
    const signature = signRequest(createPrivateKey(v.privateKey), {
      ...v,
      body: Buffer.from(v.body),
    });
    expect(signature).toBe(v.expectedSignature);
    expect(
      signRequest(createPrivateKey(v.privateKey), {
        ...v,
        path: v.path + "?x=1",
        body: Buffer.from(v.body),
      }),
    ).not.toBe(signature);
  });

  const source = JSON.parse(
    readFileSync(
      new URL(
        "./fixtures/wechat/notification.public-example.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const headers = Object.fromEntries(
    Object.entries(source.headers).map(([key, value]) => [
      key,
      [value as string],
    ]),
  );
  const keys = new Map([
    [source.headers["wechatpay-serial"], createPublicKey(source.certificate)],
  ]);
  const seconds = Number(source.headers["wechatpay-timestamp"]);
  it.each([-299, 0, 299])(
    "accepts independent official signed bytes at %i seconds",
    (delta) => {
      expect(
        verifyMessage(
          headers,
          Buffer.from(source.body),
          keys,
          new Date((seconds + delta) * 1000),
        ).bodySha256,
      ).toMatch(/^[a-f0-9]{64}$/);
    },
  );
  it.each([-300, 300])(
    "rejects the pinned SDK clock boundary at %i seconds",
    (delta) => {
      expect(() =>
        verifyMessage(
          headers,
          Buffer.from(source.body),
          keys,
          new Date((seconds + delta) * 1000),
        ),
      ).toThrow("AUTH_TIMESTAMP");
    },
  );
  it("rejects altered body against the independent fixed signature", () => {
    expect(() =>
      verifyMessage(
        headers,
        Buffer.from(source.body + " "),
        keys,
        new Date(seconds * 1000),
      ),
    ).toThrow("AUTH_SIGNATURE");
  });
  it("decrypts the official Java AES-256-GCM vector using production crypto", () => {
    const r = {
      algorithm: "AEAD_AES_256_GCM",
      original_type: "transaction",
      nonce: "uluk4a9R25RW",
      associated_data: "associatedData",
      ciphertext: "ulwSiIajGClcvcOYvOQ7+l+0PAbzzwI=",
    };
    const key = Buffer.from("a7cde1ZJB1kG2e7VfTs3jQzaWizur8Gb"); // PUBLIC official Java test vector.
    expect(decryptResource(r, key).toString()).toBe("message");
    expect(() =>
      decryptResource({ ...r, associated_data: "other" }, key),
    ).toThrow("DECRYPTION");
    expect(() => decryptResource(r, Buffer.alloc(16))).toThrow("DECRYPTION");
  });
});

describe("WeChat Native operation mapping", () => {
  it.each([
    // Public URI examples: Native prepay 4012791877 and invocation 4012791878.
    "weixin://wxpay/bizpayurl/up?pr=NwY5Mz9&groupid=00",
    "weixin://pay.weixin.qq.com/bizpayurl/up?pr=NwY5Mz9&groupid=00",
  ])("preserves the authenticated official Native URI %s", async (url) => {
    const exchange = vi.fn(async () => f.response({ code_url: url }));
    const result = await new WechatPayGateway(f.config(), exchange).initiate(
      f.order,
      input,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { kind: "QR_CODE", url },
    });
    expect(exchange).toHaveBeenCalledTimes(1);
  });
  it.each([
    "https://evil.invalid/pay",
    "weixin://evil.invalid/bizpayurl?pr=x",
    "weixin://wxpay/bizpayurl",
    "not-a-url",
    "weixin://user@wxpay/bizpayurl/up?pr=x",
    "weixin://pay.weixin.qq.com:443/bizpayurl/up?pr=x",
    "weixin://wxpay/bizpayurl/up?pr=x#fragment",
    "weixin://pay.weixin.qq.com.evil.invalid/bizpayurl/up?pr=x",
    "weixin://wxpay/other-action?pr=x",
    "weixin://wxpay/bizpayurl/up?pr=",
    "weixin://wxpay/bizpayurl/up?pr=x\n",
    "weixin://wx\tpay/bizpayurl?pr=x",
    " weixin://wxpay/bizpayurl?pr=x",
    "weixin://wxpay/bizpayurl?pr=x\u0000",
  ])("rejects an unexpected signed QR action %j", async (url) => {
    const gateway = new WechatPayGateway(f.config(), async () =>
      f.response({ code_url: url }),
    );
    expect(await gateway.initiate(f.order, input)).toMatchObject({
      ok: false,
      error: { kind: "UNRESOLVED", code: "INVALID_RESPONSE" },
    });
  });
  it.each([Buffer.from("{"), Buffer.from([0x22, 0xff, 0x22])])(
    "rejects authenticated malformed JSON/UTF-8",
    async (raw) => {
      const gateway = new WechatPayGateway(f.config(), async () =>
        f.signed(raw),
      );
      expect(await gateway.query(f.order)).toMatchObject({
        ok: false,
        error: { code: "INVALID_RESPONSE" },
      });
    },
  );
  it("requires JSON content type after authenticating raw bytes", async () => {
    const response = f.response(f.trade());
    response.headers = { ...response.headers, "content-type": ["text/html"] };
    expect(
      await new WechatPayGateway(f.config(), async () => response).query(
        f.order,
      ),
    ).toMatchObject({ ok: false, error: { code: "INVALID_RESPONSE" } });
  });
  it("rejects noncanonical Base64 response signatures", async () => {
    const response = f.response(f.trade());
    response.headers = {
      ...response.headers,
      "wechatpay-signature": [
        response.headers["wechatpay-signature"]![0]! + "!",
      ],
    };
    expect(
      await new WechatPayGateway(f.config(), async () => response).query(
        f.order,
      ),
    ).toMatchObject({ ok: false, error: { code: "AUTH_SIGNATURE" } });
  });
  it("sends exact signed frozen fields and returns a QR action, not a paid state", async () => {
    let captured: WechatHttpRequest | undefined;
    const gateway = new WechatPayGateway(f.config(), async (request) => {
      captured = request;
      return f.response({ code_url: "weixin://wxpay/bizpayurl?pr=TEST" });
    });
    const result = await gateway.initiate(f.order, input);
    expect(result).toMatchObject({
      ok: true,
      value: { kind: "QR_CODE", paymentExpiresAt: "2026-09-08T02:30:00.000Z" },
    });
    expect(captured!.path).toBe("/v3/pay/transactions/native");
    expect(JSON.parse(captured!.body.toString())).toEqual({
      appid: f.order.appId,
      mchid: f.order.merchantId,
      description: input.description,
      out_trade_no: f.order.merchantOrderNo,
      time_expire: input.expiresAt,
      notify_url: f.config().notifyUrl,
      amount: { total: 100, currency: "CNY" },
    });
    const fields = Object.fromEntries(
      [...captured!.headers.Authorization!.matchAll(/(\w+)="([^"]*)"/g)].map(
        (m) => [m[1], m[2]],
      ),
    );
    expect(
      verify(
        "sha256",
        Buffer.concat([
          Buffer.from(
            `POST\n${captured!.path}\n${fields.timestamp}\n${fields.nonce_str}\n`,
          ),
          captured!.body,
          Buffer.from("\n"),
        ]),
        f.merchant.publicKey,
        Buffer.from(fields.signature!, "base64"),
      ),
    ).toBe(true);
    expect(captured!.headers["Wechatpay-Serial"]).toBe(f.keyId);
  });
  it("supports minimal NOTPAY query without inventing payment fields", async () => {
    const exchange = vi.fn(async (request: WechatHttpRequest) => {
      expect(request.method).toBe("GET");
      expect(request.body.length).toBe(0);
      expect(request.path).toBe(
        `/v3/pay/transactions/out-trade-no/ORDER_77?mchid=${f.order.merchantId}`,
      );
      return f.response({
        mchid: f.order.merchantId,
        appid: f.order.appId,
        out_trade_no: f.order.merchantOrderNo,
        trade_state: "NOTPAY",
      });
    });
    expect(
      await new WechatPayGateway(f.config(), exchange).query(f.order),
    ).toMatchObject({
      ok: true,
      value: { state: "NOTPAY", identity: f.order },
    });
    expect(exchange).toHaveBeenCalledTimes(1);
  });
  it("reports only bounded provider Request-ID diagnostics", async () => {
    const report = vi.fn();
    const response = f.response({
      mchid: f.order.merchantId,
      appid: f.order.appId,
      out_trade_no: f.order.merchantOrderNo,
      trade_state: "NOTPAY",
    });
    response.headers = {
      ...response.headers,
      "request-id": ["wx-request-77"],
    };
    const gateway = new WechatPayGateway(
      { ...f.config(), report },
      async () => response,
    );
    expect(await gateway.query(f.order)).toMatchObject({ ok: true });
    expect(report).toHaveBeenCalledWith({
      kind: "WECHAT_RESPONSE",
      status: 200,
      requestId: "wx-request-77",
    });
    expect(JSON.stringify(report.mock.calls)).not.toContain("ORDER_77");
  });
  it("keeps success total and nullable query payer fields distinct", async () => {
    const gateway = new WechatPayGateway(f.config(), async () =>
      f.response(
        f.trade({
          trade_type: undefined,
          amount: { total: 100, currency: "CNY" },
        }),
      ),
    );
    expect(await gateway.query(f.order)).toMatchObject({
      ok: true,
      value: {
        state: "SUCCESS",
        facts: {
          orderTotalFen: 100,
          payerTotalFen: null,
          payerCurrency: null,
          tradeType: null,
        },
      },
    });
  });
  it.each(["NOTPAY", "USERPAYING", "CLOSED", "REVOKED", "PAYERROR", "REFUND"])(
    "preserves %s without normalizing it to a credit",
    async (state) => {
      const gateway = new WechatPayGateway(f.config(), async () =>
        f.response({
          mchid: f.order.merchantId,
          appid: f.order.appId,
          out_trade_no: f.order.merchantOrderNo,
          trade_state: state,
        }),
      );
      const result = await gateway.query(f.order);
      expect(result).toMatchObject({ ok: true, value: { state } });
      expect(JSON.stringify(result)).not.toContain('"facts"');
    },
  );
  it.each([
    ["merchant", { mchid: "999999" }, "IDENTITY_MISMATCH"],
    ["app", { appid: "wxOther" }, "IDENTITY_MISMATCH"],
    ["order", { out_trade_no: "OTHER" }, "IDENTITY_MISMATCH"],
    ["amount", { amount: { total: 200, currency: "CNY" } }, "AMOUNT_MISMATCH"],
    [
      "currency",
      { amount: { total: 100, currency: "USD" } },
      "AMOUNT_MISMATCH",
    ],
    ["method", { trade_type: "JSAPI" }, "UNSUPPORTED_TRADE_TYPE"],
    ["state", { trade_state: "FUTURE_UNKNOWN" }, "INVALID_RESPONSE"],
    ["success identity", { transaction_id: undefined }, "INCOMPLETE_PAYMENT"],
    ["success amount", { amount: undefined }, "INCOMPLETE_PAYMENT"],
    [
      "success time",
      { success_time: "2026-02-30T00:00:00Z" },
      "INVALID_RESPONSE",
    ],
  ])("rejects mismatched/incomplete query %s", async (_name, extra, code) => {
    const gateway = new WechatPayGateway(f.config(), async () =>
      f.response(f.trade(extra as Record<string, unknown>)),
    );
    expect(await gateway.query(f.order)).toMatchObject({
      ok: false,
      error: { kind: "UNRESOLVED", code },
    });
  });
  it("snapshots caller identity before awaiting network", async () => {
    let complete!: (response: WechatHttpResponse) => void;
    const gateway = new WechatPayGateway(
      f.config(),
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const order = { ...f.order };
    const pending = gateway.query(order);
    order.amountFen = 900;
    order.merchantOrderNo = "MUTATED";
    complete(f.response(f.trade()));
    expect(await pending).toMatchObject({
      ok: true,
      value: {
        state: "SUCCESS",
        facts: { orderTotalFen: 100, merchantOrderNo: "ORDER_77" },
      },
    });
  });
  it("accepts only signed empty 204 for close", async () => {
    const exchange = vi.fn(async (request: WechatHttpRequest) => {
      expect(request.path).toMatch(/\/ORDER_77\/close$/);
      expect(JSON.parse(request.body.toString())).toEqual({
        mchid: f.order.merchantId,
      });
      return f.response(null, 204);
    });
    expect(
      await new WechatPayGateway(f.config(), exchange).close(f.order),
    ).toMatchObject({
      ok: true,
      value: { kind: "CLOSE_ACKNOWLEDGED", identity: f.order },
    });
    const wrong = f.response({}, 200);
    wrong.status = 204;
    expect(
      await new WechatPayGateway(f.config(), async () => wrong).close(f.order),
    ).toMatchObject({ ok: false });
    expect(
      await new WechatPayGateway(f.config(), async () =>
        f.response({}, 200),
      ).close(f.order),
    ).toMatchObject({ ok: false });
  });
  it.each([301, 401, 403, 404, 429, 500])(
    "HTTP %i neither retries nor supplies business state or unsafe text",
    async (status) => {
      const exchange = vi.fn(async () =>
        f.response(
          {
            code: "ORDER_NOT_EXIST",
            trade_state: "SUCCESS",
            secret: "private-error-body",
          },
          status,
        ),
      );
      const result = await new WechatPayGateway(f.config(), exchange).query(
        f.order,
      );
      expect(result).toMatchObject({
        ok: false,
        error: {
          kind: "UNRESOLVED",
          httpStatus: status,
          providerCode: "ORDER_NOT_EXIST",
        },
      });
      expect(exchange).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(result)).not.toContain("private-error-body");
    },
  );
  it("maps only the safe provider code into Recharge diagnostics", async () => {
    const protocol = new WechatPayGateway(f.config(), async () =>
      f.response(
        {
          code: "APPID_MCHID_NOT_MATCH",
          message: "private provider detail",
        },
        400,
      ),
    );
    const result = await new WechatRechargePaymentGateway(protocol).initiate(
      f.order,
      input,
    );
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "UNRESOLVED",
        code: "APPID_MCHID_NOT_MATCH",
        httpStatus: 400,
        recovery: "REVIEW",
      },
    });
    expect(JSON.stringify(result)).not.toContain("private provider detail");
  });
  it("sanitizes thrown transport errors and does not resend", async () => {
    const exchange = vi.fn(async () => {
      throw new Error("private-key / Authorization / private-response");
    });
    expect(
      await new WechatPayGateway(f.config(), exchange).initiate(f.order, input),
    ).toEqual({ ok: false, error: { kind: "UNRESOLVED", code: "TRANSPORT" } });
    expect(exchange).toHaveBeenCalledTimes(1);
  });
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid fen %s before transport",
    async (amountFen) => {
      const exchange = vi.fn();
      const gateway = new WechatPayGateway(f.config(), exchange);
      expect(
        await gateway.initiate({ ...f.order, amountFen }, input),
      ).toMatchObject({ ok: false, error: { kind: "INVALID_REQUEST" } });
      expect(exchange).not.toHaveBeenCalled();
    },
  );
  it("rejects unsafe input identity, description and expiry before network", async () => {
    const exchange = vi.fn();
    const gateway = new WechatPayGateway(f.config(), exchange);
    for (const order of [
      { ...f.order, merchantId: "999" },
      { ...f.order, merchantOrderNo: "x?mchid=other" },
    ])
      expect((await gateway.query(order)).ok).toBe(false);
    expect(
      (
        await gateway.initiate(f.order, {
          ...input,
          description: "充".repeat(43),
        })
      ).ok,
    ).toBe(false);
    expect(
      (await gateway.initiate(f.order, { ...input, expiresAt: "tomorrow" })).ok,
    ).toBe(false);
    expect(exchange).not.toHaveBeenCalled();
  });
});

describe("authenticated notification projection", () => {
  const gateway = new WechatPayGateway(f.config(), vi.fn());
  it("projects only safe facts and tolerates omitted associated_data", () => {
    const result = gateway.verifyNotification(
      f.notification({ omitAad: true }),
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        notificationId: "EV_77",
        factsVersion: 1,
        facts: { orderTotalFen: 100, payerTotalFen: 80, payerCurrency: "CNY" },
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /openid|never-persist|ciphertext|Authorization/,
    );
  });
  it("uses normalized business facts, not reencryption or whitespace, for fact digest", () => {
    const first = gateway.verifyNotification(f.notification());
    const second = gateway.verifyNotification(f.notification({ pretty: true }));
    if (!first.ok || !second.ok) throw new Error("fixture failed");
    expect(first.value.factsSha256).toBe(second.value.factsSha256);
    expect(first.value.proof.bodySha256).not.toBe(
      second.value.proof.bodySha256,
    );
  });
  it("preserves trusted foreign merchant facts for later discrepancy handling", () => {
    expect(
      gateway.verifyNotification(
        f.notification({
          trade: { mchid: "999999", appid: "wxOther", out_trade_no: "UNKNOWN" },
        }),
      ),
    ).toMatchObject({
      ok: true,
      value: { facts: { merchantId: "999999", merchantOrderNo: "UNKNOWN" } },
    });
  });
  it.each([
    ["event", { envelope: { event_type: "PAYSCORE.USER_OPEN_SERVICE" } }],
    ["original type", { resource: { original_type: "other" } }],
    ["algorithm", { resource: { algorithm: "other" } }],
    ["nonce", { resource: { nonce: "short" } }],
    ["GCM tag", { badTag: true }],
    ["base64", { resource: { ciphertext: "abcd!" } }],
    ["missing payer", { trade: { amount: { total: 100, currency: "CNY" } } }],
    [
      "wrong payer currency",
      {
        trade: {
          amount: {
            total: 100,
            currency: "CNY",
            payer_total: 80,
            payer_currency: "USD",
          },
        },
      },
    ],
  ])(
    "rejects notification %s without exposing the decrypted body",
    (_name, options) => {
      const result = gateway.verifyNotification(
        f.notification(options as Parameters<typeof f.notification>[0]),
      );
      expect(result).toMatchObject({
        ok: false,
        error: { kind: "INVALID_NOTIFICATION" },
      });
      expect(JSON.stringify(result)).not.toContain("never-persist");
    },
  );
  it.each([
    "wechatpay-serial",
    "wechatpay-signature",
    "wechatpay-nonce",
    "wechatpay-timestamp",
  ])("rejects missing and duplicate %s", (header) => {
    const v = f.notification();
    expect(
      gateway.verifyNotification({
        ...v,
        headers: { ...v.headers, [header]: undefined },
      }),
    ).toMatchObject({ ok: false, error: { code: "AUTH_HEADERS" } });
    expect(
      gateway.verifyNotification({
        ...v,
        headers: {
          ...v.headers,
          [header]: [v.headers[header]![0]!, v.headers[header]![0]!],
        },
      }),
    ).toMatchObject({ ok: false, error: { code: "AUTH_HEADERS" } });
  });
  it("rejects unknown key, SIGNTEST and altered bytes before parsing", () => {
    const v = f.notification();
    expect(
      gateway.verifyNotification({
        ...v,
        headers: { ...v.headers, "wechatpay-serial": ["UNKNOWN"] },
      }),
    ).toMatchObject({ ok: false, error: { code: "AUTH_KEY" } });
    expect(
      gateway.verifyNotification({
        ...v,
        headers: {
          ...v.headers,
          "wechatpay-signature": ["WECHATPAY/SIGNTEST/example"],
        },
      }),
    ).toMatchObject({ ok: false, error: { code: "AUTH_SIGNATURE" } });
    expect(
      gateway.verifyNotification({ ...v, rawBody: Buffer.from("{") }),
    ).toMatchObject({ ok: false, error: { code: "AUTH_SIGNATURE" } });
  });
  it("copies configuration keys/API key so later caller mutation cannot alter trust", () => {
    const config = f.config();
    const keys = [...config.verificationKeys];
    const apiV3Key = Buffer.from(config.apiV3Key);
    const adapter = new WechatPayGateway(
      { ...config, verificationKeys: keys, apiV3Key },
      vi.fn(),
    );
    keys.length = 0;
    apiV3Key.fill(0);
    expect(adapter.verifyNotification(f.notification()).ok).toBe(true);
  });
  it("permits explicit trusted-key overlap and rejects unknown/revoked keys", () => {
    const next = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const config = f.config();
    const overlap = new WechatPayGateway(
      {
        ...config,
        activeVerificationKeyId: "PUB_KEY_ID_2",
        verificationKeys: [
          ...config.verificationKeys,
          { id: "PUB_KEY_ID_2", key: next.publicKey },
        ],
      },
      vi.fn(),
    );
    expect(overlap.verifyNotification(f.notification()).ok).toBe(true);
    const revoked = new WechatPayGateway(
      {
        ...config,
        activeVerificationKeyId: "PUB_KEY_ID_2",
        verificationKeys: [{ id: "PUB_KEY_ID_2", key: next.publicKey }],
      },
      vi.fn(),
    );
    expect(revoked.verifyNotification(f.notification())).toMatchObject({
      ok: false,
      error: { code: "AUTH_KEY" },
    });
  });
  it("validates explicit configuration without leaking bad input", () => {
    for (const extra of [
      { apiV3Key: Buffer.alloc(16) },
      { notifyUrl: "http://unsafe.invalid" },
      { notifyUrl: "https://safe.invalid/?token=private" },
      { origin: "https://evil.invalid" },
      { origin: "" },
      { origin: "http://api.mch.weixin.qq.com" },
      { verificationKeys: [] },
      { notifyUrl: "https://safe.invalid/path#" },
      { merchantPrivateKey: f.merchant.publicKey },
      {
        verificationKeys: [
          f.config().verificationKeys[0]!,
          f.config().verificationKeys[0]!,
        ],
      },
    ]) {
      expect(
        () => new WechatPayGateway({ ...f.config(), ...extra }, vi.fn()),
      ).toThrow("WECHAT_PAY_CONFIGURATION_INVALID");
    }
  });
});
