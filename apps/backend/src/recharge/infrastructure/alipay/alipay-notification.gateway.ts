import type { PaymentOrder } from "../../application/payment-gateway.js";
import type {
  ProviderFailure,
  ProviderNotification,
  ProviderPaymentFacts,
  ProviderProof,
  ProviderResult,
  ProviderTradeObservation,
  ProviderNotificationVerifier,
} from "../../application/provider-payment.js";
import type { AlipayNotificationAdapter } from "./alipay-notification.adapter.js";
import type { AlipayResult } from "./alipay-result.js";
import type { AlipayTrade } from "./alipay-trade.js";

function failure(
  error: Extract<AlipayResult<never>, { ok: false }>["error"],
): ProviderFailure {
  return {
    kind:
      error.kind === "INVALID_INPUT"
        ? "INVALID_REQUEST"
        : error.kind === "INVALID_NOTIFICATION"
          ? "INVALID_NOTIFICATION"
          : "UNRESOLVED",
    code: error.code,
    recovery: error.recovery,
    ...(error.httpStatus === undefined ? {} : { httpStatus: error.httpStatus }),
  };
}

export function convertAlipayResult<T, U>(
  source: AlipayResult<T>,
  map: (value: T) => U,
): ProviderResult<U> {
  return source.ok
    ? { ok: true, value: map(source.value) }
    : { ok: false, error: failure(source.error) };
}

function identity(trade: AlipayTrade): PaymentOrder {
  return {
    merchantId: trade.merchantId,
    appId: trade.appId,
    merchantOrderNo: trade.merchantOrderNo,
    amountFen: trade.orderTotalFen,
  };
}

export function alipayProviderProof(
  value:
    | {
        kind: "ALIPAY_FORM_RSA2";
        verificationKeyId: string;
        receivedAt: string;
        bodySha256: string;
      }
    | {
        kind: "ALIPAY_V3_SDK";
        sdkVersion: "4.14.0";
        verificationKeyId: string;
        receivedAt: string;
        requestSha256: string;
        responseDataSha256: string;
      },
): ProviderProof {
  return { ...value };
}

export function alipayTradeObservation(
  trade: AlipayTrade,
  verifiedBy: ProviderProof,
): ProviderTradeObservation {
  if (trade.state === "SUCCESS") {
    const facts: ProviderPaymentFacts = {
      factsVersion: 2,
      provider: "ALIPAY",
      merchantId: trade.merchantId,
      appId: trade.appId,
      merchantOrderNo: trade.merchantOrderNo,
      transactionId: trade.transactionId,
      tradeType: "ALIPAY_PC",
      orderTotalFen: trade.orderTotalFen,
      currency: "CNY",
      payerTotalFen: trade.payerTotalFen,
      payerCurrency: trade.payerTotalFen === null ? null : "CNY",
      successAt: trade.paymentAt,
      sellerTransferAt: trade.sellerTransferAt,
      factsSha256: trade.factsSha256,
    };
    return {
      state: "SUCCESS",
      providerState: trade.providerState,
      facts,
      proof: verifiedBy,
    };
  }
  return {
    state: trade.state === "WAIT_BUYER_PAY" ? "NOTPAY" : "CLOSED_UNRESOLVED",
    providerState: trade.providerState,
    identity: identity(trade),
    transactionId: trade.transactionId,
    orderTotalFen: trade.orderTotalFen,
    payerTotalFen: trade.payerTotalFen,
    proof: verifiedBy,
  };
}

type AlipayNotificationProtocol = Pick<
  AlipayNotificationAdapter,
  "verifyNotification"
>;

export class AlipayRechargeNotificationVerifier implements ProviderNotificationVerifier {
  readonly provider = "ALIPAY" as const;

  constructor(private readonly verifier: AlipayNotificationProtocol) {}

  verifyNotification(input: {
    headers: Readonly<Record<string, readonly string[] | undefined>>;
    rawBody: Buffer;
  }): ProviderResult<ProviderNotification> {
    return convertAlipayResult(
      this.verifier.verifyNotification(input.rawBody),
      (value) => ({
        notificationId: value.notificationId,
        createdAt: value.notificationAt,
        observation: alipayTradeObservation(
          value.trade,
          alipayProviderProof(value.proof),
        ),
      }),
    );
  }
}
