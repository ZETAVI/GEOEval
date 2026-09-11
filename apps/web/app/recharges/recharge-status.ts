import type { RechargeSummary } from "@geoeval/api-client";

export const rechargeLabels: Record<RechargeSummary["status"], string> = {
  PENDING_PAYMENT: "待支付",
  CONFIRMING: "确认中",
  SUCCESSFUL: "充值成功",
  CLOSED: "已关闭",
};
export const rechargeMessages: Record<RechargeSummary["status"], string> = {
  PENDING_PAYMENT: "请在有效期内完成支付",
  CONFIRMING: "正在确认支付结果，请勿重复支付",
  SUCCESSFUL: "积分已到账",
  CLOSED: "订单已关闭，如需充值请重新下单",
};
