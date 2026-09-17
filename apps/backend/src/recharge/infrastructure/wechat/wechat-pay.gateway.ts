import { randomBytes, type KeyObject } from "node:crypto";
import { paymentFactsSha256 } from "../../application/payment-facts.js";
import type {
  AuthenticatedPaymentNotification,
  GatewayResult,
  NativePaymentAction,
  PaymentGateway,
  PaymentNotificationVerifier,
  PaymentOrder,
  PaymentProof,
  TradeObservation,
} from "../../application/payment-gateway.js";
import {
  decryptResource,
  signRequest,
  verifyMessage,
} from "./wechat-crypto.js";
import {
  createWechatHttpsExchange,
  WECHAT_API_ORIGINS,
  type WechatExchange,
  type WechatHttpResponse,
} from "./wechat-https.js";
import {
  fen,
  identifier,
  object,
  parseJson,
  requireProtocol,
  rfc3339,
  WechatProtocolError,
} from "./wechat-protocol.js";
import { paymentFacts, tradeObservation } from "./wechat-trade.js";

export type WechatPayConfig = Readonly<{
  merchantId: string;
  appId: string;
  merchantCertificateSerial: string;
  merchantPrivateKey: KeyObject;
  activeVerificationKeyId: string;
  verificationKeys: readonly Readonly<{ id: string; key: KeyObject }>[];
  apiV3Key: Buffer;
  notifyUrl: string;
  origin?: string;
  ipFamily?: 4 | 6;
  timeoutMs?: number;
  report?: (
    event: Readonly<{
      kind: "WECHAT_RESPONSE";
      status: number;
      requestId: string | null;
    }>,
  ) => void;
}>;

const MAX_MESSAGE_BYTES = 2 * 1024 * 1024;

function failure<T>(
  kind: "INVALID_REQUEST" | "UNRESOLVED" | "INVALID_NOTIFICATION",
  error: unknown,
): GatewayResult<T> {
  const protocol =
    error instanceof WechatProtocolError
      ? error
      : new WechatProtocolError("TRANSPORT");
  return {
    ok: false,
    error: {
      kind,
      code: kind === "INVALID_REQUEST" ? "INVALID_INPUT" : protocol.code,
      ...(protocol.httpStatus === undefined
        ? {}
        : { httpStatus: protocol.httpStatus }),
    },
  };
}

/** No environment lookup, database, logger, retry, or application activation. */
export class WechatPayGateway
  implements PaymentGateway, PaymentNotificationVerifier
{
  readonly #config: Omit<WechatPayConfig, "verificationKeys">;
  readonly #keys: ReadonlyMap<string, KeyObject>;
  readonly #exchange: WechatExchange;

  constructor(config: WechatPayConfig, exchange?: WechatExchange) {
    try {
      identifier(config.merchantId);
      identifier(config.appId);
      requireProtocol(/^\d{1,32}$/.test(config.merchantId));
      requireProtocol(
        /^[A-Fa-f0-9]{1,64}$/.test(config.merchantCertificateSerial),
      );
      requireProtocol(
        config.merchantPrivateKey.type === "private" &&
          config.merchantPrivateKey.asymmetricKeyType === "rsa" &&
          (config.merchantPrivateKey.asymmetricKeyDetails?.modulusLength ??
            0) >= 2048,
      );
      requireProtocol(
        Buffer.isBuffer(config.apiV3Key) && config.apiV3Key.length === 32,
      );
      const keys = new Map<string, KeyObject>();
      for (const entry of config.verificationKeys) {
        requireProtocol(
          /^(PUB_KEY_ID_\d+|[A-Fa-f0-9]{1,64})$/.test(entry.id) &&
            !keys.has(entry.id),
        );
        requireProtocol(
          entry.key.type === "public" &&
            entry.key.asymmetricKeyType === "rsa" &&
            (entry.key.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048,
        );
        keys.set(entry.id, entry.key);
      }
      requireProtocol(keys.has(config.activeVerificationKeyId));
      const notify = new URL(config.notifyUrl);
      requireProtocol(
        notify.protocol === "https:" &&
          !/[\\\s?#]/.test(config.notifyUrl) &&
          !notify.username &&
          !notify.password &&
          !notify.search &&
          !notify.hash &&
          config.notifyUrl.length <= 256,
      );
      requireProtocol(
        config.origin === undefined ||
          WECHAT_API_ORIGINS.some((origin) => origin === config.origin),
      );
      requireProtocol(
        config.ipFamily === undefined ||
          config.ipFamily === 4 ||
          config.ipFamily === 6,
      );
      this.#config = {
        merchantId: config.merchantId,
        appId: config.appId,
        merchantCertificateSerial: config.merchantCertificateSerial,
        merchantPrivateKey: config.merchantPrivateKey,
        activeVerificationKeyId: config.activeVerificationKeyId,
        apiV3Key: Buffer.from(config.apiV3Key),
        notifyUrl: config.notifyUrl,
        ...(config.origin ? { origin: config.origin } : {}),
        ...(config.ipFamily ? { ipFamily: config.ipFamily } : {}),
        ...(config.timeoutMs !== undefined
          ? { timeoutMs: config.timeoutMs }
          : {}),
        ...(config.report ? { report: config.report } : {}),
      };
      this.#keys = keys;
      this.#exchange =
        exchange ??
        createWechatHttpsExchange({
          ...(config.origin ? { origin: config.origin } : {}),
          ...(config.ipFamily ? { ipFamily: config.ipFamily } : {}),
          ...(config.timeoutMs !== undefined
            ? { timeoutMs: config.timeoutMs }
            : {}),
        });
    } catch {
      throw new Error("WECHAT_PAY_CONFIGURATION_INVALID");
    }
  }

  async initiate(
    order: PaymentOrder,
    input: Readonly<{ description: string; expiresAt: string }>,
  ): Promise<GatewayResult<NativePaymentAction>> {
    let body: Buffer, expiresAt: string;
    try {
      const frozen = this.#order(order);
      requireProtocol(
        typeof input.description === "string" &&
          Buffer.byteLength(input.description) > 0 &&
          Buffer.byteLength(input.description) <= 127 &&
          !/[\u0000-\u001f\u007f]/.test(input.description),
      );
      expiresAt = rfc3339(input.expiresAt);
      body = Buffer.from(
        JSON.stringify({
          appid: frozen.appId,
          mchid: frozen.merchantId,
          description: input.description,
          out_trade_no: frozen.merchantOrderNo,
          time_expire: input.expiresAt,
          notify_url: this.#config.notifyUrl,
          amount: { total: frozen.amountFen, currency: "CNY" },
        }),
      );
    } catch (error) {
      return failure("INVALID_REQUEST", error);
    }
    try {
      const { data, proof } = await this.#send(
        "POST",
        "/v3/pay/transactions/native",
        body,
        200,
      );
      const value = object(data).code_url;
      // URL parsing can discard whitespace/control bytes; the QR must retain its input.
      requireProtocol(
        typeof value === "string" &&
          value.length <= 2048 &&
          !/[\u0000-\u0020\u007f]/.test(value),
      );
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        throw new WechatProtocolError("INVALID_RESPONSE");
      }
      // Accept the documented Native targets, keeping the opaque token/query intact.
      const nativeTarget =
        (url.hostname === "wxpay" &&
          (url.pathname === "/bizpayurl" ||
            url.pathname === "/bizpayurl/up")) ||
        (url.hostname === "pay.weixin.qq.com" &&
          url.pathname === "/bizpayurl/up");
      requireProtocol(
        url.protocol === "weixin:" &&
          nativeTarget &&
          !url.port &&
          !url.username &&
          !url.password &&
          !url.hash &&
          !!url.searchParams.get("pr"),
      );
      return {
        ok: true,
        value: {
          kind: "QR_CODE",
          url: value,
          paymentExpiresAt: expiresAt,
          proof,
        },
      };
    } catch (error) {
      return failure("UNRESOLVED", error);
    }
  }

  async query(order: PaymentOrder): Promise<GatewayResult<TradeObservation>> {
    let frozen: PaymentOrder;
    try {
      frozen = this.#order(order);
    } catch (error) {
      return failure("INVALID_REQUEST", error);
    }
    try {
      const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(frozen.merchantOrderNo)}?mchid=${encodeURIComponent(frozen.merchantId)}`;
      const { data, proof } = await this.#send(
        "GET",
        path,
        Buffer.alloc(0),
        200,
      );
      return { ok: true, value: tradeObservation(data, frozen, proof) };
    } catch (error) {
      return failure("UNRESOLVED", error);
    }
  }

  async close(order: PaymentOrder): Promise<
    GatewayResult<{
      kind: "CLOSE_ACKNOWLEDGED";
      identity: PaymentOrder;
      proof: PaymentProof;
    }>
  > {
    let frozen: PaymentOrder;
    try {
      frozen = this.#order(order);
    } catch (error) {
      return failure("INVALID_REQUEST", error);
    }
    try {
      const { proof } = await this.#send(
        "POST",
        `/v3/pay/transactions/out-trade-no/${encodeURIComponent(frozen.merchantOrderNo)}/close`,
        Buffer.from(JSON.stringify({ mchid: frozen.merchantId })),
        204,
      );
      return {
        ok: true,
        value: { kind: "CLOSE_ACKNOWLEDGED", identity: frozen, proof },
      };
    } catch (error) {
      return failure("UNRESOLVED", error);
    }
  }

  verifyNotification(
    input: Parameters<PaymentNotificationVerifier["verifyNotification"]>[0],
  ): GatewayResult<AuthenticatedPaymentNotification> {
    try {
      requireProtocol(
        Buffer.isBuffer(input.rawBody) &&
          input.rawBody.length <= MAX_MESSAGE_BYTES,
        "RESPONSE_SIZE",
      );
      const raw = Buffer.from(input.rawBody);
      const proof = verifyMessage(input.headers, raw, this.#keys, new Date());
      const data = object(parseJson(raw));
      requireProtocol(
        data.event_type === "TRANSACTION.SUCCESS" &&
          data.resource_type === "encrypt-resource",
      );
      requireProtocol(
        typeof data.summary === "string" && data.summary.length <= 64,
      );
      const notificationId = identifier(data.id, 36),
        createdAt = rfc3339(data.create_time);
      const facts = paymentFacts(
        parseJson(decryptResource(data.resource, this.#config.apiV3Key)),
        true,
      );
      // Preserve authenticated foreign/unknown references for the inbox discrepancy path.
      // Never infer local ownership, order matching, durable receipt or credit here.
      return {
        ok: true,
        value: {
          notificationId,
          createdAt,
          factsVersion: 1,
          factsSha256: paymentFactsSha256(facts),
          facts,
          proof,
        },
      };
    } catch (error) {
      return failure("INVALID_NOTIFICATION", error);
    }
  }

  #order(order: PaymentOrder): PaymentOrder {
    const frozen = {
      merchantId: identifier(order.merchantId),
      appId: identifier(order.appId),
      merchantOrderNo: identifier(order.merchantOrderNo),
      amountFen: fen(order.amountFen),
    };
    requireProtocol(
      frozen.merchantId === this.#config.merchantId &&
        frozen.appId === this.#config.appId,
    );
    return Object.freeze(frozen);
  }

  async #send(
    method: "GET" | "POST",
    path: string,
    body: Buffer,
    expectedStatus: 200 | 204,
  ): Promise<{ data: unknown; proof: PaymentProof }> {
    const timestamp = String(Math.floor(Date.now() / 1000)),
      nonce = randomBytes(16).toString("hex");
    const signature = signRequest(this.#config.merchantPrivateKey, {
      method,
      path,
      timestamp,
      nonce,
      body,
    });
    const response: WechatHttpResponse = await this.#exchange({
      method,
      path,
      body,
      headers: {
        Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${this.#config.merchantId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${this.#config.merchantCertificateSerial}",signature="${signature}"`,
        "Wechatpay-Serial": this.#config.activeVerificationKeyId,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "GEOEval-WeChatPay/1",
      },
    });
    const requestIds = response.headers["request-id"],
      requestId =
        requestIds?.length === 1 &&
        /^[A-Za-z0-9._:-]{1,128}$/.test(requestIds[0]!)
          ? requestIds[0]!
          : null;
    try {
      this.#config.report?.({
        kind: "WECHAT_RESPONSE",
        status: response.status,
        requestId,
      });
    } catch {
      /* Diagnostics cannot change a payment result. */
    }
    if (response.status < 200 || response.status >= 300)
      throw new WechatProtocolError(
        response.status >= 300 && response.status < 400
          ? "REDIRECT"
          : "HTTP_ERROR",
        response.status,
      );
    requireProtocol(response.status === expectedStatus);
    requireProtocol(
      Buffer.isBuffer(response.body) &&
        response.body.length <= MAX_MESSAGE_BYTES,
      "RESPONSE_SIZE",
    );
    const proof = verifyMessage(
      response.headers,
      response.body,
      this.#keys,
      new Date(),
    );
    if (expectedStatus === 204) {
      requireProtocol(response.body.length === 0);
      return { data: null, proof };
    }
    const types = response.headers["content-type"];
    requireProtocol(
      types?.length === 1 && /^application\/json(?:\s*;|$)/i.test(types[0]!),
    );
    return { data: parseJson(response.body), proof };
  }
}
