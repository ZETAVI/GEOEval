import type { RechargeSummary } from "@geoeval/api-client";
import styles from "./recharge.module.css";

const payment = {
  ALIPAY_PC: {
    label: "支付宝",
    detail: "官方收银台",
    source: "/payment-marks/alipay.png",
    kind: "alipay",
  },
  WECHAT_NATIVE: {
    label: "微信支付",
    detail: "电脑扫码",
    source: "/payment-marks/wechat-pay.png",
    kind: "wechat",
  },
} satisfies Record<
  RechargeSummary["method"],
  { label: string; detail: string; source: string; kind: string }
>;

export function PaymentMethodMark({
  method,
  compact = false,
}: {
  method: RechargeSummary["method"];
  compact?: boolean;
}) {
  const value = payment[method];
  return (
    <span
      className={`${styles.paymentMark} ${styles[value.kind]} ${compact ? styles.paymentMarkCompact : ""}`}
      aria-label={`${value.label}，${value.detail}`}
    >
      <img src={value.source} alt="" aria-hidden="true" />
      <span>
        <b>{value.label}</b>
        {!compact && <small>{value.detail}</small>}
      </span>
    </span>
  );
}

export const paymentMethodName = (method: RechargeSummary["method"]) =>
  payment[method].label;
