import type { PaymentOrder } from "../../application/payment-gateway.js";
import type {
  ProviderFailure,
  ProviderNotification,
  ProviderPaymentFacts,
  ProviderProof,
  ProviderResult,
  ProviderTradeObservation,
  RechargePaymentGateway,
} from "../../application/provider-payment.js";
import {
  AlipayPaymentAdapter,
  type AlipayResult,
  type AlipayTrade,
} from "./alipay-payment.adapter.js";

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

function convert<T, U>(
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

function proof(
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

function observation(
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

export class AlipayRechargePaymentGateway implements RechargePaymentGateway {
  readonly provider = "ALIPAY" as const;
  readonly method = "ALIPAY_PC" as const;
  readonly actionKind = "CASHIER_PAGE" as const;
  constructor(private readonly adapter: AlipayPaymentAdapter) {}

  prepareCashier(
    order: PaymentOrder,
    input: Readonly<{ description: string; expiresAt: string }>,
  ) {
    return convert(this.adapter.preparePage(order, input), (value) => ({
      kind: "CASHIER_PAGE" as const,
      html: value.html,
      paymentExpiresAt: value.paymentExpiresAt,
    }));
  }

  async query(order: PaymentOrder, signal?: AbortSignal) {
    return convert(await this.adapter.query(order, signal), (value) =>
      observation(value.trade, proof(value.proof)),
    );
  }

  async close(order: PaymentOrder, signal?: AbortSignal) {
    return convert(await this.adapter.close(order, signal), (value) => ({
      kind: value.kind,
      identity: { ...order },
      transactionId: value.transactionId,
      proof: proof(value.proof),
    }));
  }

  verifyNotification(input: {
    headers: Readonly<Record<string, readonly string[] | undefined>>;
    rawBody: Buffer;
  }): ProviderResult<ProviderNotification> {
    return convert(this.adapter.verifyNotification(input.rawBody), (value) => ({
      notificationId: value.notificationId,
      createdAt: value.notificationAt,
      observation: observation(value.trade, proof(value.proof)),
    }));
  }

  dispose() {
    return this.adapter.dispose();
  }
}
