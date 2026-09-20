import type { PaymentOrder } from "../../application/payment-gateway.js";
import type { RechargePaymentGateway } from "../../application/provider-payment.js";
import { AlipayPaymentAdapter } from "./alipay-payment.adapter.js";
import {
  AlipayRechargeNotificationVerifier,
  alipayProviderProof,
  alipayTradeObservation,
  convertAlipayResult,
} from "./alipay-notification.gateway.js";

export { AlipayRechargeNotificationVerifier } from "./alipay-notification.gateway.js";

export class AlipayRechargePaymentGateway
  extends AlipayRechargeNotificationVerifier
  implements RechargePaymentGateway
{
  readonly method = "ALIPAY_PC" as const;
  readonly actionKind = "CASHIER_PAGE" as const;
  constructor(private readonly adapter: AlipayPaymentAdapter) {
    super(adapter);
  }

  prepareCashier(
    order: PaymentOrder,
    input: Readonly<{ description: string; expiresAt: string }>,
  ) {
    return convertAlipayResult(
      this.adapter.preparePage(order, input),
      (value) => ({
        kind: "CASHIER_PAGE" as const,
        html: value.html,
        paymentExpiresAt: value.paymentExpiresAt,
      }),
    );
  }

  async query(order: PaymentOrder, signal?: AbortSignal) {
    return convertAlipayResult(
      await this.adapter.query(order, signal),
      (value) =>
        alipayTradeObservation(value.trade, alipayProviderProof(value.proof)),
    );
  }

  async close(order: PaymentOrder, signal?: AbortSignal) {
    return convertAlipayResult(
      await this.adapter.close(order, signal),
      (value) => ({
        kind: value.kind,
        identity: { ...order },
        transactionId: value.transactionId,
        proof: alipayProviderProof(value.proof),
      }),
    );
  }

  dispose() {
    return this.adapter.dispose();
  }
}
