import { createHash } from "node:crypto";
import type { RechargePaymentObservation } from "../../generated/prisma/client.js";
import { paymentFactsSha256 } from "../application/payment-facts.js";
import type {
  AuthenticatedPaymentNotification,
  PaymentFacts,
  PaymentProof,
} from "../application/payment-gateway.js";

/** Structural persistence invariants; provider authentication must already have happened. */
export function paymentObservationData(
  facts: PaymentFacts,
  proof: PaymentProof,
) {
  const f = { ...facts },
    p = { ...proof };
  const safe = (value: number, min: number) =>
    Number.isSafeInteger(value) && value >= min;
  if (
    f.provider !== "WECHAT" ||
    f.currency !== "CNY" ||
    ![null, "NATIVE"].includes(f.tradeType) ||
    ![null, "CNY"].includes(f.payerCurrency) ||
    !safe(f.orderTotalFen, 1) ||
    (f.payerTotalFen !== null &&
      (!safe(f.payerTotalFen, 0) || f.payerTotalFen > f.orderTotalFen)) ||
    !safe(p.signedAtSeconds, 0) ||
    !/^[a-f0-9]{64}$/.test(p.bodySha256) ||
    ![
      f.merchantId,
      f.appId,
      f.merchantOrderNo,
      f.transactionId,
      p.verificationKeyId,
    ].every((v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v))
  )
    throw new Error("RECHARGE_OBSERVATION_INVARIANT");
  return {
    provider: f.provider,
    merchantId: f.merchantId,
    appId: f.appId,
    merchantOrderNo: f.merchantOrderNo,
    transactionId: f.transactionId,
    tradeType: f.tradeType,
    factsVersion: 1,
    factsSha256: paymentFactsSha256(f),
    orderTotalFen: BigInt(f.orderTotalFen),
    currency: f.currency,
    payerTotalFen: f.payerTotalFen === null ? null : BigInt(f.payerTotalFen),
    payerCurrency: f.payerCurrency,
    successAt: canonicalDate(f.successAt),
    verificationKeyId: p.verificationKeyId,
    signedAtSeconds: BigInt(p.signedAtSeconds),
    receivedAt: canonicalDate(p.receivedAt),
    bodySha256: p.bodySha256,
  };
}
export function canonicalDate(value: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value)
    throw new Error("RECHARGE_OBSERVATION_INVARIANT");
  return date;
}
export function storedPaymentFacts(
  c: RechargePaymentObservation,
): PaymentFacts {
  return {
    provider: "WECHAT",
    merchantId: c.merchantId,
    appId: c.appId,
    merchantOrderNo: c.merchantOrderNo,
    transactionId: c.transactionId,
    tradeType: c.tradeType === null ? null : "NATIVE",
    orderTotalFen: Number(c.orderTotalFen),
    currency: "CNY",
    payerTotalFen: c.payerTotalFen === null ? null : Number(c.payerTotalFen),
    payerCurrency: c.payerCurrency === null ? null : "CNY",
    successAt: c.successAt.toISOString(),
  };
}
export function storedNotification(
  c: RechargePaymentObservation,
): AuthenticatedPaymentNotification {
  if (
    c.sourceKind !== "NOTIFICATION" ||
    c.notificationId === null ||
    c.notificationCreatedAt === null ||
    c.tradeType === null ||
    c.payerCurrency === null ||
    c.payerTotalFen === null
  )
    throw new Error("RECHARGE_NOTIFICATION_INVARIANT");
  return {
    notificationId: c.notificationId,
    createdAt: c.notificationCreatedAt.toISOString(),
    factsVersion: 1,
    factsSha256: c.factsSha256,
    facts: storedPaymentFacts(c),
    proof: {
      verificationKeyId: c.verificationKeyId,
      signedAtSeconds: Number(c.signedAtSeconds),
      receivedAt: c.receivedAt.toISOString(),
      bodySha256: c.bodySha256,
    },
  };
}

export function queryObservationKey(orderId: string, factsSha256: string) {
  return createHash("sha256")
    .update(`QUERY\n${orderId}\n${factsSha256}`)
    .digest("hex");
}
