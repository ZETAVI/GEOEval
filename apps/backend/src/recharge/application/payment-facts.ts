import { createHash } from "node:crypto";
import type { PaymentFacts } from "./payment-gateway.js";

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
