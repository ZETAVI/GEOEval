import { describe, expect, it, vi } from "vitest";

import { RechargeInvoiceOrderAccess } from "../src/recharge/invoice/infrastructure/recharge-invoice-order-access.js";

describe("Recharge invoice amount access", () => {
  const base = {
    id: "77000000-0000-4000-8000-000000000109",
    accountId: "77000000-0000-4000-8000-000000000001",
    amountFen: 500n,
    currency: "CNY",
    status: "SUCCESSFUL",
    paidAt: new Date("2026-09-17T00:00:00.000Z"),
    creditConfirmedAt: new Date("2026-09-17T00:00:01.000Z"),
    method: "WECHAT_NATIVE",
    orderTotalFen: 500n,
    payerTotalFen: null,
  };

  async function read(overrides: Partial<typeof base>) {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ ...base, ...overrides }]),
    };
    return new RechargeInvoiceOrderAccess().readInvoiceable(
      tx as never,
      base.accountId,
      base.id,
    );
  }

  it("returns the Recharge-owned amount when certified totals are unambiguous", async () => {
    await expect(read({})).resolves.toEqual({
      kind: "ELIGIBLE",
      order: {
        orderId: base.id,
        accountId: base.accountId,
        invoiceableAmountFen: 500n,
        currency: "CNY",
        paidAt: base.paidAt,
        method: "WECHAT_NATIVE",
      },
    });
  });

  it("fails closed when an observed payer total differs from the order total", async () => {
    await expect(read({ payerTotalFen: 400n })).resolves.toEqual({
      kind: "INELIGIBLE",
      reason: "AMOUNT_REVIEW_REQUIRED",
    });
    await expect(read({ orderTotalFen: 499n })).resolves.toEqual({
      kind: "INELIGIBLE",
      reason: "AMOUNT_REVIEW_REQUIRED",
    });
  });
});
