import type {
  RechargeInvoiceSubmission,
  RechargeSummary,
} from "@geoeval/api-client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InvoiceDialog } from "../app/recharges/invoice-dialog.js";
import { PaymentMethodMark } from "../app/recharges/payment-method-mark.js";
import { shortReference } from "../app/recharges/record-reference.js";

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
});
