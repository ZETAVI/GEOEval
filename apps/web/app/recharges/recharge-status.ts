import type { RechargeSummary } from "@geoeval/api-client";

export const rechargeLabels: Record<RechargeSummary["status"], string> = {
  PENDING_PAYMENT: "待支付",
  CONFIRMING: "确认中",
  SUCCESSFUL: "充值成功",
  CLOSED: "未支付",
};
export const rechargeMethodLabels: Record<RechargeSummary["method"], string> = {
  WECHAT_NATIVE: "微信扫码支付",
  ALIPAY_PC: "支付宝电脑网站支付",
};
export const rechargeMessages: Record<RechargeSummary["status"], string> = {
  PENDING_PAYMENT: "请在有效期内完成支付",
  CONFIRMING: "正在确认支付结果，请勿重复支付",
  SUCCESSFUL: "⚡已到账",
  CLOSED: "订单未支付，如需充值请重新下单",
};
