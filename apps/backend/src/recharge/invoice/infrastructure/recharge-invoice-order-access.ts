import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client.js";

export type InvoiceableRechargeOrder = {
  orderId: string;
  accountId: string;
  invoiceableAmountFen: bigint;
  currency: "CNY";
  paidAt: Date;
  method: string;
};

export type RechargeInvoiceOrderResult =
  | { kind: "NOT_FOUND" }
  | {
      kind: "INELIGIBLE";
      reason:
        "NOT_SUCCESSFUL" | "NOT_CNY" | "ZERO_AMOUNT" | "AMOUNT_REVIEW_REQUIRED";
    }
  | { kind: "ELIGIBLE"; order: InvoiceableRechargeOrder };

/** Recharge-owned projection. Invoice never chooses between provider money facts. */
@Injectable()
export class RechargeInvoiceOrderAccess {
  async readInvoiceable(
    tx: Prisma.TransactionClient,
    accountId: string,
    orderId: string,
  ): Promise<RechargeInvoiceOrderResult> {
    const [row] = await tx.$queryRaw<
      Array<{
        id: string;
        accountId: string;
        amountFen: bigint;
        currency: string;
        status: string;
        paidAt: Date | null;
        creditConfirmedAt: Date | null;
        method: string;
        orderTotalFen: bigint | null;
        payerTotalFen: bigint | null;
      }>
    >`
      SELECT r.id,
             r.account_id AS "accountId",
             r.amount_fen AS "amountFen",
             r.currency,
             r.status,
             r.paid_at AS "paidAt",
             r.credit_confirmed_at AS "creditConfirmedAt",
             r.method,
             o.order_total_fen AS "orderTotalFen",
             o.payer_total_fen AS "payerTotalFen"
      FROM recharge_orders r
      LEFT JOIN recharge_payment_observations o ON o.id=r.paid_observation_id
      WHERE r.id=CAST(${orderId} AS UUID)
        AND r.account_id=CAST(${accountId} AS UUID)
      FOR UPDATE OF r
    `;
    if (!row) return { kind: "NOT_FOUND" };
    if (row.status !== "SUCCESSFUL")
      return { kind: "INELIGIBLE", reason: "NOT_SUCCESSFUL" };
    if (row.currency !== "CNY")
      return { kind: "INELIGIBLE", reason: "NOT_CNY" };
    if (row.amountFen <= 0n)
      return { kind: "INELIGIBLE", reason: "ZERO_AMOUNT" };
    if (
      row.orderTotalFen === null ||
      row.orderTotalFen !== row.amountFen ||
      (row.payerTotalFen !== null && row.payerTotalFen !== row.amountFen)
    )
      return { kind: "INELIGIBLE", reason: "AMOUNT_REVIEW_REQUIRED" };
    const paidAt = row.paidAt ?? row.creditConfirmedAt;
    if (!paidAt)
      return { kind: "INELIGIBLE", reason: "AMOUNT_REVIEW_REQUIRED" };
    return {
      kind: "ELIGIBLE",
      order: {
        orderId: row.id,
        accountId: row.accountId,
        invoiceableAmountFen: row.amountFen,
        currency: "CNY",
        paidAt,
        method: row.method,
      },
    };
  }
}
