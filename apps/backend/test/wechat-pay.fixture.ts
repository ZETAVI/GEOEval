import {
  createCipheriv,
  generateKeyPairSync,
  randomBytes,
  sign,
} from "node:crypto";
import type { PaymentOrder } from "../src/recharge/application/payment-gateway.js";
import type { WechatHttpResponse } from "../src/recharge/infrastructure/wechat/wechat-https.js";
import type { WechatPayConfig } from "../src/recharge/infrastructure/wechat/wechat-pay.gateway.js";

/** In-memory test material only. No environment, merchant files or provider calls. */
export function wechatFixture() {
  const merchant = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const provider = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const apiKey = randomBytes(32);
  const keyId = "PUB_KEY_ID_1000000001";
  const order: PaymentOrder = {
    merchantId: "1900007291",
    appId: "wx1234567890",
    merchantOrderNo: "ORDER_77",
    amountFen: 100,
  };
  const config = (): WechatPayConfig => ({
    ...order,
    merchantCertificateSerial: "ABCD1234",
    merchantPrivateKey: merchant.privateKey,
    activeVerificationKeyId: keyId,
    verificationKeys: [{ id: keyId, key: provider.publicKey }],
    apiV3Key: Buffer.from(apiKey),
    notifyUrl:
      "https://payments.example.invalid/recharges/providers/wechat/notify",
  });
  const trade = (extra: Record<string, unknown> = {}) => ({
    mchid: order.merchantId,
    appid: order.appId,
    out_trade_no: order.merchantOrderNo,
    transaction_id: "420000000077",
    trade_type: "NATIVE",
    trade_state: "SUCCESS",
    success_time: "2026-09-08T10:00:00+08:00",
    amount: {
      total: 100,
      currency: "CNY",
      payer_total: 80,
      payer_currency: "CNY",
    },
    payer: { openid: "never-persist-this-payer" },
    ...extra,
  });
  const signed = (body: Buffer, status = 200): WechatHttpResponse => {
    const timestamp = String(Math.floor(Date.now() / 1000)),
      nonce = randomBytes(16).toString("hex");
    const signature = sign(
      "sha256",
      Buffer.concat([
        Buffer.from(`${timestamp}\n${nonce}\n`),
        body,
        Buffer.from("\n"),
      ]),
      provider.privateKey,
    ).toString("base64");
    return {
      status,
      body,
      headers: {
        "content-type": ["application/json; charset=utf-8"],
        "wechatpay-timestamp": [timestamp],
        "wechatpay-nonce": [nonce],
        "wechatpay-serial": [keyId],
        "wechatpay-signature": [signature],
      },
    };
  };
  const response = (value: unknown, status = 200) =>
    signed(
      status === 204 ? Buffer.alloc(0) : Buffer.from(JSON.stringify(value)),
      status,
    );
  const notification = (
    options: {
      trade?: Record<string, unknown>;
      envelope?: Record<string, unknown>;
      resource?: Record<string, unknown>;
      pretty?: boolean;
      omitAad?: boolean;
      badTag?: boolean;
    } = {},
  ) => {
    const nonce = randomBytes(6).toString("hex"),
      aad = options.omitAad ? "" : "transaction";
    const encoder = createCipheriv("aes-256-gcm", apiKey, nonce);
    encoder.setAAD(Buffer.from(aad));
    const bytes = Buffer.concat([
      encoder.update(JSON.stringify(trade(options.trade))),
      encoder.final(),
      encoder.getAuthTag(),
    ]);
    if (options.badTag) bytes[bytes.length - 1]! ^= 1;
    const envelope = {
      id: "EV_77",
      create_time: "2026-09-08T10:00:01+08:00",
      summary: "支付成功",
      event_type: "TRANSACTION.SUCCESS",
      resource_type: "encrypt-resource",
      resource: {
        original_type: "transaction",
        algorithm: "AEAD_AES_256_GCM",
        nonce,
        ...(options.omitAad ? {} : { associated_data: aad }),
        ciphertext: bytes.toString("base64"),
        ...options.resource,
      },
      ...options.envelope,
    };
    const raw = Buffer.from(
      JSON.stringify(envelope, null, options.pretty ? 2 : undefined),
    );
    const r = signed(raw);
    return { rawBody: raw, headers: r.headers };
  };
  return {
    merchant,
    provider,
    apiKey,
    keyId,
    order,
    config,
    trade,
    signed,
    response,
    notification,
  };
}
