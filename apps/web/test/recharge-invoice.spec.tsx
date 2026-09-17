import type {
  InternalRechargeInvoicePage,
  InternalRechargeInvoiceSummary,
  RechargeInvoice,
  RechargeInvoiceSubmission,
  RechargeSummary,
} from "@geoeval/api-client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { InvoiceDialog } from "../app/recharges/invoice-dialog.js";
import { PaymentMethodMark } from "../app/recharges/payment-method-mark.js";
import {
  resolveRequestedInvoice,
  updateUnavailableOrderIds,
} from "../app/recharges/recharge-records.js";
import { shortReference } from "../app/recharges/record-reference.js";
import { mergeInternalInvoicePage } from "../app/operations/invoices/workspace.js";

const order: RechargeSummary = {
  id: "77000000-0000-4000-8000-000000000109",
  amountYuan: 5,
  points: 50,
  method: "ALIPAY_PC",
  status: "SUCCESSFUL",
  createdAt: "2026-09-17T00:00:00.000Z",
  paymentExpiresAt: "2026-09-17T00:15:00.000Z",
  paidAt: "2026-09-17T00:01:00.000Z",
  closedAt: null,
};

const invoice: RechargeInvoice = {
  id: "77000000-0000-4000-8000-000000000109",
  number: 109,
  rechargeOrderId: order.id,
  amountFen: "500",
  currency: "CNY",
  status: "PROCESSING",
  revision: 1,
  submission: {
    buyerType: "INDIVIDUAL",
    title: "个人",
    taxNumber: null,
    email: "customer@example.com",
    revision: 1,
    submittedAt: "2026-09-17T00:01:00.000Z",
  },
  correction: null,
  issued: null,
  submittedAt: "2026-09-17T00:01:00.000Z",
  updatedAt: "2026-09-17T00:01:00.000Z",
};

const summary = (number: number): InternalRechargeInvoiceSummary => ({
  id: `77000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
  number,
  rechargeOrderId: `88000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
  amountFen: "500",
  currency: "CNY",
  status: "PROCESSING",
  revision: 1,
  buyerType: "ENTERPRISE",
  customerReference: "****0900",
  assignee: null,
  submittedAt: "2026-09-17T00:01:00.000Z",
  updatedAt: "2026-09-17T00:01:00.000Z",
});

function dialog(defaults: RechargeInvoiceSubmission | null) {
  return renderToStaticMarkup(
    <InvoiceDialog
      base="http://local.invalid"
      accountId="77000000-0000-4000-8000-000000000001"
      order={order}
      defaults={defaults}
      onClose={() => {}}
      onSaved={() => {}}
    />,
  );
}

describe("recharge invoice interaction", () => {
  it("uses official payment assets with visible method names", () => {
    const html = renderToStaticMarkup(
      <>
        <PaymentMethodMark method="ALIPAY_PC" />
        <PaymentMethodMark method="WECHAT_NATIVE" />
      </>,
    );
    expect(html).toContain("/payment-marks/alipay.png");
    expect(html).toContain("/payment-marks/wechat-pay.png");
    expect(html).toContain("支付宝");
    expect(html).toContain("微信支付");
  });

  it("shortens the displayed order reference without changing its identity", () => {
    expect(shortReference(order.id)).toBe("77000000…0109");
    expect(shortReference("FP-1001")).toBe("FP-1001");
  });

  it("keeps the personal form minimal and the confirmation copy concise", () => {
    const html = dialog(null);
    expect(html).toContain("我确认以上开票信息准确");
    expect(html).toContain("支付时间");
    expect(html).toContain('value="个人"');
    expect(html).not.toContain("仅能在");
    expect(html).not.toContain("需补正状态");
    expect(html).not.toContain("电话号码");
    expect(html).not.toContain("单位地址");
    expect(html).not.toContain("开户银行");
    expect(html).not.toContain("银行账户");
  });

  it("shows only the approved enterprise name, tax number and email fields", () => {
    const html = dialog({
      buyerType: "ENTERPRISE",
      title: "互动派科技股份有限公司",
      taxNumber: "91440101773316648W",
      email: "3892016@qq.com",
      revision: 1,
      submittedAt: "2026-09-17T00:00:00.000Z",
    });
    expect(html).toContain("公司名称");
    expect(html).toContain("统一社会信用代码 / 纳税人识别号");
    expect(html).toContain("发票接收邮箱");
    expect(html).not.toContain("邮编");
    expect(html).not.toContain("VAT/GST");
  });

  it("resolves a notification target outside the first invoice page", async () => {
    const read = vi.fn(async () => invoice);
    await expect(resolveRequestedInvoice(invoice.id, [], read)).resolves.toBe(
      invoice,
    );
    expect(read).toHaveBeenCalledExactlyOnceWith(invoice.id);

    read.mockClear();
    await expect(
      resolveRequestedInvoice(invoice.id, [invoice], read),
    ).resolves.toBe(invoice);
    expect(read).not.toHaveBeenCalled();
  });

  it("keeps failed summary pages unavailable until that exact page recovers", () => {
    const first = updateUnavailableOrderIds(new Set(), ["one", "two"], true);
    const second = updateUnavailableOrderIds(first, ["three"], true);
    const recoveredSecond = updateUnavailableOrderIds(second, ["three"], false);
    expect([...recoveredSecond]).toEqual(["one", "two"]);
  });

  it("appends internal task pages without losing prior rows or duplicating overlap", () => {
    const first: InternalRechargeInvoicePage = {
      items: [summary(3), summary(2)],
      nextCursor: 2,
    };
    const second: InternalRechargeInvoicePage = {
      items: [summary(2), summary(1)],
      nextCursor: null,
    };
    expect(
      mergeInternalInvoicePage([], first, false).map((item) => item.number),
    ).toEqual([3, 2]);
    expect(
      mergeInternalInvoicePage(first.items, second, true).map(
        (item) => item.number,
      ),
    ).toEqual([3, 2, 1]);
  });
});
