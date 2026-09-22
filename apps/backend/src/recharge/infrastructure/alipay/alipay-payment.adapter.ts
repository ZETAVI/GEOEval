import {
  AlipaySdk,
  AlipayRequestError,
  type AlipayCURLOptions,
} from "alipay-sdk";
import { Agent, type Dispatcher } from "undici";
import { alipayCallTransport, transportFailure } from "./alipay-transport.js";
import {
  createPrivateKey,
  createPublicKey,
  X509Certificate,
  type KeyObject,
} from "node:crypto";
import type { PaymentOrder } from "../../application/payment-gateway.js";
import { AlipayNotificationAdapter } from "./alipay-notification.adapter.js";
import type { AlipayResult } from "./alipay-result.js";
import { parseAlipayTrade, type AlipayTrade } from "./alipay-trade.js";
import {
  AlipayProtocolError,
  amountYuan,
  identifier,
  record,
  requireValue,
  sha256,
  shanghaiDate,
} from "./alipay-values.js";

const ENDPOINTS = {
  production: "https://openapi.alipay.com",
  sandbox: "https://openapi-sandbox.dl.alipaydev.com",
} as const;
export type AlipayConfig = Readonly<{
  appId: string;
  merchantId: string;
  privateKey: string;
  environment: keyof typeof ENDPOINTS;
  notifyUrl: string;
  returnUrl: string;
  timeoutMs: number;
  verification:
    | { mode: "PUBLIC_KEY"; publicKey: string }
    | {
        mode: "CERTIFICATE";
        appCertificate: string;
        alipayCertificate: string;
        rootCertificate: string;
      };
}>;
export { AlipayNotificationAdapter } from "./alipay-notification.adapter.js";
export type { AlipayNotificationConfig } from "./alipay-notification.adapter.js";
export type { AlipayResult } from "./alipay-result.js";
export type { AlipayTrade } from "./alipay-trade.js";
export type AlipaySdkProof = Readonly<{
  kind: "ALIPAY_V3_SDK";
  sdkVersion: "4.14.0";
  verificationKeyId: string;
  receivedAt: string;
  requestSha256: string;
  responseDataSha256: string;
}>;
function rsa(key: KeyObject): KeyObject {
  requireValue(
    key.asymmetricKeyType === "rsa" &&
      (key.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048,
    "INVALID_INPUT",
  );
  return key;
}
function publicId(key: KeyObject): string {
  return sha256(key.export({ type: "spki", format: "der" }));
}
function endpointUrl(value: string): string {
  const url = new URL(value);
  requireValue(
    url.protocol === "https:" && !url.username && !url.password && !url.hash,
    "INVALID_INPUT",
  );
  return url.href;
}
function withCashierFallback(html: string): string {
  const closingForms = html.match(/<\/form\s*>/giu) ?? [];
  requireValue(closingForms.length === 1, "INVALID_INPUT");
  return html.replace(
    /<\/form\s*>/iu,
    '<p>正在前往支付宝官方收银台…</p><button type="submit">继续前往支付宝</button></form>',
  );
}
function failure<T>(
  error: unknown,
  kind: "INVALID_INPUT" | "INVALID_NOTIFICATION" | "UNRESOLVED",
): AlipayResult<T> {
  const transport = transportFailure(error);
  if (transport)
    return {
      ok: false,
      error: {
        kind,
        code: transport.code,
        recovery: ["DEADLINE", "ABORTED"].includes(transport.code)
          ? "RETRY"
          : "REVIEW",
      },
    };
  let code =
    error instanceof AlipayProtocolError ? error.message : "PROTOCOL_ERROR";
  let recovery: "RETRY" | "VERIFY" | "REVIEW" = "REVIEW";
  let httpStatus: number | undefined;
  if (error instanceof AlipayRequestError) {
    httpStatus = error.responseHttpStatus;
    if (
      httpStatus === 429 ||
      (httpStatus !== undefined && httpStatus >= 500) ||
      error.code === "ACQ.SYSTEM_ERROR"
    ) {
      code = "CHANNEL_TEMPORARY";
      recovery = "RETRY";
    } else if (error.code === "ACQ.TRADE_NOT_EXIST") {
      code = "TRADE_NOT_FOUND";
      recovery = "VERIFY";
    } else if (
      [
        "ACQ.TRADE_STATUS_ERROR",
        "ACQ.REASON_ILLEGAL_STATUS",
        "ACQ.REASON_TRADE_STATUS_INVALID",
      ].includes(error.code ?? "")
    ) {
      code = "TRADE_STATE_UNRESOLVED";
      recovery = "VERIFY";
    } else if (error.code?.startsWith("response-")) code = "AUTH_RESPONSE";
    else if (httpStatus === undefined && !error.code) {
      code = "TRANSPORT";
      recovery = "RETRY";
    } else code = "CHANNEL_REJECTED";
  }
  // SDK errors may contain merchant payloads and signatures. Never forward them.
  return {
    ok: false,
    error: {
      kind,
      code,
      recovery,
      ...(httpStatus === undefined ? {} : { httpStatus }),
    },
  };
}

/** Protocol-only: not assembled into HTTP, a worker, persistence or the V1 WeChat port. */
export class AlipayPaymentAdapter {
  readonly #sdk: AlipaySdk;
  readonly #appId: string;
  readonly #merchantId: string;
  readonly #notifyUrl: string;
  readonly #returnUrl: string;
  readonly #keyId: string;
  readonly #createPool: (signal: AbortSignal) => Dispatcher;
  readonly #inflight = new Set<Promise<void>>();
  readonly #origin: string;
  readonly #timeoutMs: number;
  readonly #maxPaymentWindowMs: number;
  readonly #notifications: AlipayNotificationAdapter;
  #disposed = false;
  #disposal?: Promise<void>;
  constructor(
    config: AlipayConfig,
    readonly clock: () => Date = () => new Date(),
    createPool?: (signal: AbortSignal) => Dispatcher,
  ) {
    try {
      requireValue(
        /^\d{16,32}$/.test(config.appId) &&
          /^2088\d{12}$/.test(config.merchantId),
        "INVALID_INPUT",
      );
      requireValue(
        Object.hasOwn(ENDPOINTS, config.environment),
        "INVALID_INPUT",
      );
      requireValue(
        Number.isInteger(config.timeoutMs) &&
          config.timeoutMs > 0 &&
          config.timeoutMs <= 30_000,
        "INVALID_INPUT",
      );
      const key = rsa(createPrivateKey(config.privateKey));
      this.#appId = config.appId;
      this.#merchantId = config.merchantId;
      this.#notifyUrl = endpointUrl(config.notifyUrl);
      this.#returnUrl = endpointUrl(config.returnUrl);
      let verification;
      let publicKey: KeyObject;
      if (config.verification.mode === "CERTIFICATE") {
        const app = new X509Certificate(config.verification.appCertificate);
        requireValue(
          publicId(rsa(app.publicKey)) === publicId(createPublicKey(key)),
          "INVALID_INPUT",
        );
        publicKey = rsa(
          new X509Certificate(config.verification.alipayCertificate).publicKey,
        );
        verification = {
          appCertContent: config.verification.appCertificate,
          alipayPublicCertContent: config.verification.alipayCertificate,
          alipayRootCertContent: config.verification.rootCertificate,
        };
      } else {
        requireValue(
          config.verification.mode === "PUBLIC_KEY",
          "INVALID_INPUT",
        );
        publicKey = rsa(createPublicKey(config.verification.publicKey));
        verification = {
          alipayPublicKey: publicKey
            .export({ type: "spki", format: "pem" })
            .toString(),
        };
      }
      this.#keyId = publicId(publicKey);
      this.#notifications = new AlipayNotificationAdapter(
        {
          appId: this.#appId,
          merchantId: this.#merchantId,
          publicKey: publicKey
            .export({ type: "spki", format: "pem" })
            .toString(),
        },
        clock,
      );
      this.#origin = ENDPOINTS[config.environment];
      this.#timeoutMs = config.timeoutMs;
      this.#maxPaymentWindowMs =
        (config.environment === "sandbox" ? 15 : 15 * 24) * 3600_000;
      this.#sdk = new AlipaySdk({
        appId: this.#appId,
        privateKey: key.export({ type: "pkcs8", format: "pem" }).toString(),
        keyType: "PKCS8",
        signType: "RSA2",
        charset: "utf-8",
        endpoint: ENDPOINTS[config.environment],
        gateway: ENDPOINTS[config.environment] + "/gateway.do",
        timeout: config.timeoutMs,
        ...verification,
      });
      this.#createPool =
        createPool ??
        ((signal) =>
          new Agent({
            connections: 1,
            pipelining: 1,
            maxHeaderSize: 16 * 1024,
            connect: { timeout: config.timeoutMs, signal },
          }));
    } catch {
      throw new AlipayProtocolError("ALIPAY_CONFIG_INVALID");
    }
  }
  /** Stop new outgoing work; drain bounded in-flight requests and close owned sockets. */
  dispose(): Promise<void> {
    this.#disposed = true;
    return (this.#disposal ??= Promise.all([...this.#inflight]).then(() => {}));
  }

  #order(order: PaymentOrder): PaymentOrder {
    requireValue(!this.#disposed, "ADAPTER_DISPOSED");
    requireValue(
      order.appId === this.#appId && order.merchantId === this.#merchantId,
      "IDENTITY_MISMATCH",
    );
    identifier(order.merchantOrderNo);
    amountYuan(order.amountFen);
    return { ...order };
  }
  preparePage(
    order: PaymentOrder,
    input: { description: string; expiresAt: string },
  ): AlipayResult<{
    kind: "ALIPAY_POST_FORM";
    html: string;
    paymentExpiresAt: string;
  }> {
    try {
      const o = this.#order(order),
        now = this.clock(),
        expiry = new Date(input.expiresAt);
      requireValue(
        Number.isFinite(expiry.getTime()) &&
          expiry.getTime() - now.getTime() >= 60_000 &&
          expiry.getTime() - now.getTime() <= this.#maxPaymentWindowMs,
        "INVALID_INPUT",
      );
      requireValue(
        typeof input.description === "string" &&
          /^[\p{L}\p{N} _.,，。-]{1,256}$/u.test(input.description),
        "INVALID_INPUT",
      );
      const html = withCashierFallback(
        this.#sdk.pageExecute("alipay.trade.page.pay", "POST", {
          timestamp: shanghaiDate(now),
          notifyUrl: this.#notifyUrl,
          returnUrl: this.#returnUrl,
          bizContent: {
            out_trade_no: o.merchantOrderNo,
            total_amount: amountYuan(o.amountFen),
            subject: input.description,
            product_code: "FAST_INSTANT_TRADE_PAY",
            qr_pay_mode: "2",
            integration_type: "PCWEB",
            time_expire: shanghaiDate(expiry),
          },
        }),
      );
      requireValue(html.length <= 16384, "INVALID_INPUT");
      return {
        ok: true,
        value: {
          kind: "ALIPAY_POST_FORM",
          html,
          paymentExpiresAt: expiry.toISOString(),
        },
      };
    } catch (error) {
      return failure(error, "INVALID_INPUT");
    }
  }
  verifyNotification(rawBody: Buffer) {
    return this.#notifications.verifyNotification(rawBody);
  }
  async #request(
    order: PaymentOrder,
    operation: "query" | "close",
    signal?: AbortSignal,
  ): Promise<
    AlipayResult<{ data: Record<string, unknown>; proof: AlipaySdkProof }>
  > {
    let o: PaymentOrder;
    try {
      o = this.#order(order);
    } catch (error) {
      return failure(error, "INVALID_INPUT");
    }
    const path = `/v3/alipay/trade/${operation}`;
    const call = alipayCallTransport(this.#createPool, {
      origin: this.#origin,
      path,
      timeoutMs: this.#timeoutMs,
      ...(signal ? { signal } : {}),
      ...(this.#sdk.config.alipayCertSn
        ? { certificateSn: this.#sdk.config.alipayCertSn }
        : {}),
    });
    let release!: () => void;
    const finished = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#inflight.add(finished);
    try {
      call.check();
      const response = await this.#sdk.curl("POST", path, {
        body: { out_trade_no: o.merchantOrderNo },
        // SDK narrows this public option to ProxyAgent; urllib consumes Dispatcher.
        // The pinned SDK transport tests exercise this structural compatibility.
        agent: call.dispatcher as unknown as NonNullable<
          AlipayCURLOptions["agent"]
        >,
      });
      call.check();
      requireValue(response.responseHttpStatus === 200);
      const data = record(response.data);
      requireValue(
        data.out_trade_no === o.merchantOrderNo,
        "IDENTITY_MISMATCH",
      );
      return {
        ok: true,
        value: {
          data,
          proof: {
            kind: "ALIPAY_V3_SDK",
            sdkVersion: "4.14.0",
            verificationKeyId: this.#keyId,
            receivedAt: this.clock().toISOString(),
            requestSha256: sha256(JSON.stringify({ path, order: o })),
            responseDataSha256: sha256(JSON.stringify(data)),
          },
        },
      };
    } catch (error) {
      return failure(error, "UNRESOLVED");
    } finally {
      try {
        await call.finish();
      } finally {
        this.#inflight.delete(finished);
        release();
      }
    }
  }
  async query(
    order: PaymentOrder,
    signal?: AbortSignal,
  ): Promise<AlipayResult<{ trade: AlipayTrade; proof: AlipaySdkProof }>> {
    const expected = { ...order };
    const response = await this.#request(expected, "query", signal);
    if (!response.ok) return response;
    try {
      const observed = parseAlipayTrade(
        response.value.data,
        "QUERY",
        this.#appId,
        this.#merchantId,
      );
      requireValue(
        observed.orderTotalFen === expected.amountFen,
        "AMOUNT_MISMATCH",
      );
      return {
        ok: true,
        value: { trade: observed, proof: response.value.proof },
      };
    } catch (error) {
      return failure(error, "UNRESOLVED");
    }
  }
  async close(
    order: PaymentOrder,
    signal?: AbortSignal,
  ): Promise<
    AlipayResult<{
      kind: "CLOSE_ACKNOWLEDGED";
      transactionId: string;
      proof: AlipaySdkProof;
    }>
  > {
    const response = await this.#request(order, "close", signal);
    if (!response.ok) return response;
    try {
      return {
        ok: true,
        value: {
          kind: "CLOSE_ACKNOWLEDGED",
          transactionId: identifier(response.value.data.trade_no),
          proof: response.value.proof,
        },
      };
    } catch (error) {
      return failure(error, "UNRESOLVED");
    }
  }
}
