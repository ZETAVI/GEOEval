import { createHash } from "node:crypto";
import type { PaymentFacts } from "./payment-gateway.js";

/** Monetary identity only. Optional channel metadata and delivery proofs stay separate. */
export type AlipayPaymentIdentity = Readonly<{
  provider: "ALIPAY";
  merchantId: string;
  appId: string;
  merchantOrderNo: string;
  transactionId: string;
  orderTotalFen: number;
  currency: "CNY";
}>;

/** V2 never rewrites V1. A matching digest is not authentication or settlement approval. */
export function alipayPaymentFactsSha256(facts: AlipayPaymentIdentity): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        factsVersion: 2,
        provider: facts.provider,
        merchantId: facts.merchantId,
        appId: facts.appId,
        merchantOrderNo: facts.merchantOrderNo,
        transactionId: facts.transactionId,
        orderTotalFen: facts.orderTotalFen,
        currency: facts.currency,
      }),
    )
    .digest("hex");
}

/** V1 order is durable. Re-encryption and object insertion order do not change facts. */
export function paymentFactsSha256(facts: PaymentFacts): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        provider: facts.provider,
        merchantId: facts.merchantId,
        appId: facts.appId,
        merchantOrderNo: facts.merchantOrderNo,
        transactionId: facts.transactionId,
        tradeType: facts.tradeType,
        orderTotalFen: facts.orderTotalFen,
        currency: facts.currency,
        payerTotalFen: facts.payerTotalFen,
        payerCurrency: facts.payerCurrency,
        successAt: facts.successAt,
      }),
    )
    .digest("hex");
}
