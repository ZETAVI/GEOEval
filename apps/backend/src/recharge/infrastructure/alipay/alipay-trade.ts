import { alipayPaymentFactsSha256 } from "../../application/payment-facts.js";
import {
  amountFen,
  channelDate,
  identifier,
  requireValue,
} from "./alipay-values.js";

type AlipayTradeData = Readonly<{
  provider: "ALIPAY";
  merchantId: string;
  appId: string;
  merchantOrderNo: string;
  transactionId: string | null;
  orderTotalFen: number;
  currency: "CNY";
  payerTotalFen: number | null;
  state: "SUCCESS" | "WAIT_BUYER_PAY" | "CLOSED_UNRESOLVED";
  providerState:
    "TRADE_SUCCESS" | "TRADE_FINISHED" | "WAIT_BUYER_PAY" | "TRADE_CLOSED";
  paymentAt: string | null;
  sellerTransferAt: string | null;
}>;

export type AlipayTrade =
  | (AlipayTradeData & {
      state: "SUCCESS";
      transactionId: string;
      factsVersion: 2;
      factsSha256: string;
    })
  | (AlipayTradeData & {
      state: "WAIT_BUYER_PAY" | "CLOSED_UNRESOLVED";
      factsVersion?: never;
      factsSha256?: never;
    });

export function parseAlipayTrade(
  data: Record<string, unknown>,
  source: "QUERY" | "NOTIFICATION",
  appId: string,
  merchantId: string,
): AlipayTrade {
  const state = data.trade_status;
  requireValue(
    state === "TRADE_SUCCESS" ||
      state === "TRADE_FINISHED" ||
      state === "WAIT_BUYER_PAY" ||
      state === "TRADE_CLOSED",
  );
  const total = amountFen(data.total_amount);
  requireValue(total > 0, "AMOUNT_INVALID");
  const payer =
    data.buyer_pay_amount === undefined
      ? null
      : amountFen(data.buyer_pay_amount);
  requireValue(payer === null || payer <= total, "AMOUNT_INVALID");
  const value: AlipayTradeData = {
    provider: "ALIPAY",
    merchantId,
    appId,
    merchantOrderNo: identifier(data.out_trade_no),
    transactionId:
      data.trade_no === undefined &&
      (state === "WAIT_BUYER_PAY" || state === "TRADE_CLOSED")
        ? null
        : identifier(data.trade_no),
    orderTotalFen: total,
    currency: "CNY",
    payerTotalFen: payer,
    state:
      state === "TRADE_CLOSED"
        ? "CLOSED_UNRESOLVED"
        : state === "WAIT_BUYER_PAY"
          ? state
          : "SUCCESS",
    providerState: state,
    paymentAt: source === "NOTIFICATION" ? channelDate(data.gmt_payment) : null,
    sellerTransferAt:
      source === "QUERY" ? channelDate(data.send_pay_date) : null,
  };
  if (value.state !== "SUCCESS") return { ...value, state: value.state };
  const paid = { ...value, transactionId: identifier(data.trade_no) };
  return {
    ...paid,
    state: "SUCCESS",
    factsVersion: 2,
    factsSha256: alipayPaymentFactsSha256(paid),
  };
}
