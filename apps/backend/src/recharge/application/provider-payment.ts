import type {
  AuthenticatedPaymentNotification,
  GatewayResult,
  NativePaymentAction,
  PaymentGateway,
  PaymentNotificationVerifier,
  PaymentOrder,
  TradeObservation,
} from "./payment-gateway.js";
import { paymentFactsSha256 } from "./payment-facts.js";

export type RechargeProvider = "WECHAT" | "ALIPAY";
export type RechargeMethod = "WECHAT_NATIVE" | "ALIPAY_PC";

export function providerForMethod(method: RechargeMethod): RechargeProvider {
  return method === "WECHAT_NATIVE" ? "WECHAT" : "ALIPAY";
}

export type ProviderProof =
  | Readonly<{
      kind: "WECHAT_V3";
      verificationKeyId: string;
      signedAtSeconds: number;
      receivedAt: string;
      bodySha256: string;
    }>
  | Readonly<{
      kind: "ALIPAY_FORM_RSA2";
      verificationKeyId: string;
      receivedAt: string;
      bodySha256: string;
    }>
  | Readonly<{
      kind: "ALIPAY_V3_SDK";
      sdkVersion: "4.14.0";
      verificationKeyId: string;
      receivedAt: string;
      requestSha256: string;
      responseDataSha256: string;
    }>;

export type ProviderPaymentFacts = Readonly<{
  factsVersion: 1 | 2;
  provider: RechargeProvider;
  merchantId: string;
  appId: string;
  merchantOrderNo: string;
  transactionId: string;
  tradeType: "NATIVE" | "ALIPAY_PC" | null;
  orderTotalFen: number;
  currency: "CNY";
  payerTotalFen: number | null;
  payerCurrency: "CNY" | null;
  /** Provider payment time. Alipay query does not guarantee this value. */
  successAt: string | null;
  sellerTransferAt: string | null;
  factsSha256: string;
}>;

export type ProviderTradeObservation =
  | Readonly<{
      state: "SUCCESS";
      providerState: string;
      facts: ProviderPaymentFacts;
      proof: ProviderProof;
    }>
  | Readonly<{
      state:
        | "NOTPAY"
        | "USERPAYING"
        | "CLOSED"
        | "CLOSED_UNRESOLVED"
        | "REVOKED"
        | "PAYERROR"
        | "REFUND";
      providerState: string;
      identity: PaymentOrder;
      transactionId: string | null;
      orderTotalFen: number;
      payerTotalFen: number | null;
      proof: ProviderProof;
    }>;

export type ProviderNotification = Readonly<{
  notificationId: string;
  createdAt: string;
  observation: ProviderTradeObservation;
}>;

export type ProviderFailure = Readonly<{
  kind: "INVALID_REQUEST" | "UNRESOLVED" | "INVALID_NOTIFICATION";
  code: string;
  httpStatus?: number;
  recovery?: "RETRY" | "VERIFY" | "REVIEW";
}>;
export type ProviderResult<T> =
  { ok: true; value: T } | { ok: false; error: ProviderFailure };

export type ProviderCheckoutAction =
  | Readonly<{
      kind: "QR_CODE";
      url: string;
      paymentExpiresAt: string;
      proof: ProviderProof;
    }>
  | Readonly<{
      kind: "CASHIER_PAGE";
      html: string;
      paymentExpiresAt: string;
    }>;

export interface RechargePaymentGateway {
  readonly provider: RechargeProvider;
  readonly method: RechargeMethod;
  readonly actionKind: "QR_CODE" | "CASHIER_PAGE";
  initiate?(
    order: PaymentOrder,
    input: Readonly<{ description: string; expiresAt: string }>,
  ): Promise<
    ProviderResult<Extract<ProviderCheckoutAction, { kind: "QR_CODE" }>>
  >;
  prepareCashier?(
    order: PaymentOrder,
    input: Readonly<{ description: string; expiresAt: string }>,
  ): ProviderResult<Extract<ProviderCheckoutAction, { kind: "CASHIER_PAGE" }>>;
  query(
    order: PaymentOrder,
    signal?: AbortSignal,
  ): Promise<ProviderResult<ProviderTradeObservation>>;
  close(
    order: PaymentOrder,
    signal?: AbortSignal,
  ): Promise<
    ProviderResult<{
      kind: "CLOSE_ACKNOWLEDGED";
      identity: PaymentOrder;
      transactionId: string | null;
      proof: ProviderProof;
    }>
  >;
  verifyNotification?(input: {
    headers: Readonly<Record<string, readonly string[] | undefined>>;
    rawBody: Buffer;
  }): ProviderResult<ProviderNotification>;
  dispose?(): Promise<void>;
}

export type ProviderNotificationVerifier = Readonly<{
  provider: RechargeProvider;
  verifyNotification(input: {
    headers: Readonly<Record<string, readonly string[] | undefined>>;
    rawBody: Buffer;
  }): ProviderResult<ProviderNotification>;
}>;

function wechatProof(
  proof: NativePaymentAction["proof"],
): Extract<ProviderProof, { kind: "WECHAT_V3" }> {
  return { kind: "WECHAT_V3", ...proof };
}

function wechatFacts(
  facts: Extract<TradeObservation, { state: "SUCCESS" }>["facts"],
): ProviderPaymentFacts {
  return {
    factsVersion: 1,
    ...facts,
    sellerTransferAt: null,
    factsSha256: paymentFactsSha256(facts),
  };
}

function wechatObservation(value: TradeObservation): ProviderTradeObservation {
  if (value.state === "SUCCESS")
    return {
      state: "SUCCESS",
      providerState: "SUCCESS",
      facts: wechatFacts(value.facts),
      proof: wechatProof(value.proof),
    };
  return {
    state: value.state,
    providerState: value.state,
    identity: value.identity,
    transactionId: null,
    orderTotalFen: value.identity.amountFen,
    payerTotalFen: null,
    proof: wechatProof(value.proof),
  };
}

function result<T, U>(
  source: GatewayResult<T>,
  map: (value: T) => U,
): ProviderResult<U> {
  return source.ok ? { ok: true, value: map(source.value) } : source;
}

/** Adapts the passive WeChat callback protocol to the provider-neutral inbox seam. */
export class WechatRechargeNotificationVerifier implements ProviderNotificationVerifier {
  readonly provider = "WECHAT" as const;

  constructor(private readonly verifier: PaymentNotificationVerifier) {}

  verifyNotification(input: {
    headers: Readonly<Record<string, readonly string[] | undefined>>;
    rawBody: Buffer;
  }): ProviderResult<ProviderNotification> {
    return result(this.verifier.verifyNotification(input), (value) =>
      wechatNotification(value),
    );
  }
}

/** Keeps the released WeChat protocol port stable while Recharge consumes one provider seam. */
export class WechatRechargePaymentGateway
  extends WechatRechargeNotificationVerifier
  implements RechargePaymentGateway
{
  readonly provider = "WECHAT" as const;
  readonly method = "WECHAT_NATIVE" as const;
  readonly actionKind = "QR_CODE" as const;
  constructor(
    private readonly gateway: PaymentGateway & PaymentNotificationVerifier,
  ) {
    super(gateway);
  }
  async initiate(
    order: PaymentOrder,
    input: Readonly<{ description: string; expiresAt: string }>,
  ) {
    return result(await this.gateway.initiate(order, input), (value) => ({
      kind: "QR_CODE" as const,
      url: value.url,
      paymentExpiresAt: value.paymentExpiresAt,
      proof: wechatProof(value.proof),
    }));
  }
  async query(order: PaymentOrder) {
    return result(await this.gateway.query(order), wechatObservation);
  }
  async close(order: PaymentOrder) {
    return result(await this.gateway.close(order), (value) => ({
      kind: value.kind,
      identity: value.identity,
      transactionId: null,
      proof: wechatProof(value.proof),
    }));
  }
  dispose() {
    return (
      (this.gateway as { dispose?: () => Promise<void> }).dispose?.() ??
      Promise.resolve()
    );
  }
}

function wechatNotification(
  value: AuthenticatedPaymentNotification,
): ProviderNotification {
  return {
    notificationId: value.notificationId,
    createdAt: value.createdAt,
    observation: {
      state: "SUCCESS",
      providerState: "SUCCESS",
      facts: {
        ...wechatFacts(value.facts),
        factsSha256: value.factsSha256,
      },
      proof: wechatProof(value.proof),
    },
  };
}
