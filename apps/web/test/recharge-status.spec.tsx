import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RechargeOptions } from "@geoeval/api-client";
import { RechargeCreateForm } from "../app/recharges/recharge-create-form.js";
import { NativeCheckoutPanel } from "../app/recharges/native-checkout.js";
import type { NativeCheckoutState } from "../app/recharges/native-checkout-controller.js";
import {
  rechargeLabels,
  rechargeMessages,
} from "../app/recharges/recharge-status.js";

function state(status: keyof typeof rechargeLabels): NativeCheckoutState {
  return {
    order: {
      id: "order",
      amountYuan: 10,
      points: 100,
      status,
      paymentExpiresAt: "2026-09-11T12:00:00Z",
      canCancel: false,
      canVerify: false,
      supportRequired: true,
      qr: null,
    },
    phase: "ready",
    busy: null,
    cancelPending: false,
    recoveryBlocked: false,
    pollingEnded: false,
    commandReady: true,
    qrValue: null,
    remainingSeconds: 0,
    notice: "",
  };
}
function render(value: NativeCheckoutState) {
  return renderToStaticMarkup(
    <NativeCheckoutPanel
      state={value}
      onRefresh={() => {}}
      onVerify={() => {}}
      onCancel={() => {}}
      onLeave={() => {}}
      onSupport={() => {}}
    />,
  );
}
describe("simple recharge presentation preserves business state", () => {
  it.each(Object.keys(rechargeLabels) as Array<keyof typeof rechargeLabels>)(
    "%s uses common copy with the same persistent support entry",
    (status) => {
      const html = render(state(status));
      expect(html).toContain(rechargeLabels[status]);
      expect(html).toContain(rechargeMessages[status]);
      expect(html.match(/<button[^>]*>联系客服<\/button>/g)).toHaveLength(1);
      expect(html).not.toContain("请保留订单并联系客服");
      expect(html).not.toContain("平台核查");
      expect(html).not.toContain("自动恢复中");
    },
  );
  it("a failed read preserves credited success and keeps loading feedback separate", () => {
    const value = {
      ...state("SUCCESSFUL"),
      phase: "unavailable" as const,
      notice: "加载失败，请重试",
    };
    const html = render(value);
    expect(html).toContain("积分已到账");
    expect(html).toContain("充值成功");
    expect(html).toContain("加载失败，请重试");
    expect(html).not.toContain("正在确认支付结果");
  });
  it("a local polling pause never claims that background recovery stopped", () => {
    const html = render({ ...state("CONFIRMING"), pollingEnded: true });
    expect(html).toContain("页面自动刷新已暂停");
    expect(html).toContain(rechargeMessages.CONFIRMING);
    expect(html).not.toContain("后台停止");
  });
  it("shows the official Alipay handoff without WeChat QR instructions", () => {
    const value = {
      ...state("PENDING_PAYMENT"),
      order: {
        ...state("PENDING_PAYMENT").order!,
        method: "ALIPAY_PC" as const,
      },
    };
    const html = render(value);
    expect(html).toContain("支付宝充值");
    expect(html).toContain("前往支付宝官方收银台");
    expect(html).not.toContain("微信扫一扫");
  });
  it("keeps Alipay active while showing the deferred WeChat method disabled", () => {
    const options: RechargeOptions = {
      available: true,
      controlled: false,
      minAmountYuan: 1,
      maxAmountYuan: 100,
      shortcutAmounts: [10, 50, 100],
      pointsPerYuan: 10,
      methods: ["ALIPAY_PC"],
      supportMessage: "请保留充值单号并稍后刷新状态。",
    };
    const html = renderToStaticMarkup(
      <RechargeCreateForm
        accountId="77000000-0000-4000-8000-000000000101"
        options={options}
        base="http://127.0.0.1:3100"
      />,
    );
    expect(html.indexOf("支付宝 · 官方收银台")).toBeLessThan(
      html.indexOf("微信支付 · 电脑扫码"),
    );
    const alipay = html.match(/<input[^>]*value="ALIPAY_PC"[^>]*>/)?.[0],
      wechat = html.match(/<input[^>]*value="WECHAT_NATIVE"[^>]*>/)?.[0];
    expect(alipay).toBeDefined();
    expect(wechat).toBeDefined();
    expect(alipay).not.toContain("disabled");
    expect(wechat).toContain('disabled=""');
    expect(html).toContain("暂未开放");
  });
});
