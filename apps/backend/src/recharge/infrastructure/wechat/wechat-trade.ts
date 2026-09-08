import type {
  PaymentFacts,
  PaymentOrder,
  PaymentProof,
  TradeObservation,
} from "../../application/payment-gateway.js";
import {
  fen,
  identifier,
  object,
  requireProtocol,
  rfc3339,
} from "./wechat-protocol.js";

function tradeIdentity(data: Record<string, unknown>) {
  return {
    merchantId: identifier(data.mchid),
    appId: identifier(data.appid),
    merchantOrderNo: identifier(data.out_trade_no),
  };
}

function checkAmount(data: Record<string, unknown>, expected?: PaymentOrder) {
  const amount = object(data);
  if (amount.total !== undefined) {
    fen(amount.total);
    requireProtocol(
      !expected || amount.total === expected.amountFen,
      "AMOUNT_MISMATCH",
    );
  }
  if (amount.currency !== undefined)
    requireProtocol(amount.currency === "CNY", "AMOUNT_MISMATCH");
  if (amount.payer_currency !== undefined)
    requireProtocol(amount.payer_currency === "CNY", "AMOUNT_MISMATCH");
  if (amount.payer_total !== undefined) {
    const payerTotal = fen(amount.payer_total, true);
    requireProtocol(
      amount.total === undefined || payerTotal <= (amount.total as number),
      "AMOUNT_MISMATCH",
    );
  }
  return amount;
}

export function paymentFacts(
  value: unknown,
  notification: boolean,
  expected?: PaymentOrder,
): PaymentFacts {
  const data = object(value);
  const identity = tradeIdentity(data);
  requireProtocol(data.trade_state === "SUCCESS");
  requireProtocol(
    data.trade_type === "NATIVE" ||
      (!notification && data.trade_type === undefined),
    "UNSUPPORTED_TRADE_TYPE",
  );
  requireProtocol(
    typeof data.transaction_id === "string" &&
      typeof data.success_time === "string" &&
      data.amount !== undefined,
    "INCOMPLETE_PAYMENT",
  );
  const amount = checkAmount(object(data.amount), expected);
  requireProtocol(
    amount.total !== undefined && amount.currency !== undefined,
    "INCOMPLETE_PAYMENT",
  );
  if (notification)
    requireProtocol(
      amount.payer_total !== undefined && amount.payer_currency !== undefined,
      "INCOMPLETE_PAYMENT",
    );
  return {
    provider: "WECHAT",
    ...identity,
    transactionId: identifier(data.transaction_id),
    tradeType: data.trade_type === "NATIVE" ? "NATIVE" : null,
    orderTotalFen: fen(amount.total),
    currency: "CNY",
    payerTotalFen:
      amount.payer_total === undefined ? null : fen(amount.payer_total, true),
    payerCurrency: amount.payer_currency === undefined ? null : "CNY",
    successAt: rfc3339(data.success_time),
  };
}

export function tradeObservation(
  value: unknown,
  expected: PaymentOrder,
  proof: PaymentProof,
): TradeObservation {
  const data = object(value);
  const identity = tradeIdentity(data);
  requireProtocol(
    identity.merchantId === expected.merchantId &&
      identity.appId === expected.appId &&
      identity.merchantOrderNo === expected.merchantOrderNo,
    "IDENTITY_MISMATCH",
  );
  if (data.trade_type !== undefined)
    requireProtocol(data.trade_type === "NATIVE", "UNSUPPORTED_TRADE_TYPE");
  if (data.amount !== undefined) checkAmount(object(data.amount), expected);
  if (data.trade_state === "SUCCESS")
    return {
      state: "SUCCESS",
      facts: paymentFacts(data, false, expected),
      proof,
    };
  const state = data.trade_state;
  requireProtocol(
    state === "NOTPAY" ||
      state === "USERPAYING" ||
      state === "CLOSED" ||
      state === "REVOKED" ||
      state === "PAYERROR" ||
      state === "REFUND",
  );
  return { state, identity: expected, proof };
}
