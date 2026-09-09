"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  NativeCheckoutController,
  type CancellationMemory,
  type NativeCheckoutSource,
  type NativeCheckoutState,
} from "./native-checkout-controller.js";
import styles from "./native-checkout.module.css";

const browserMemory: CancellationMemory = {
  read: (key) => localStorage.getItem(key) === "requested",
  write: (key) => localStorage.setItem(key, "requested"),
  clear: (key) => localStorage.removeItem(key),
};
export function NativeCheckout({
  accountId,
  orderId,
  source,
  onLeave,
  onSupport,
}: {
  accountId: string;
  orderId: string;
  source: NativeCheckoutSource;
  onLeave: () => void;
  onSupport: () => void;
}) {
  const controller = useMemo(
    () =>
      new NativeCheckoutController(accountId, orderId, source, browserMemory),
    [accountId, orderId, source],
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getServerSnapshot,
  );
  useEffect(() => {
    controller.start();
    const visibility = () =>
      controller.setVisible(document.visibilityState === "visible");
    const storage = (event: StorageEvent) => {
      if (event.key === controller.key || event.key === null)
        controller.syncMemory();
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("storage", storage);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("storage", storage);
      controller.stop();
    };
  }, [controller]);
  return (
    <NativeCheckoutPanel
      state={state}
      onRefresh={() => void controller.refresh()}
      onVerify={() => void controller.command("verify")}
      onCancel={() => void controller.command("cancel")}
      onLeave={onLeave}
      onSupport={onSupport}
    />
  );
}
const stateLabels = {
  PENDING_PAYMENT: "待支付",
  CONFIRMING: "确认中",
  SUCCESSFUL: "充值成功",
  CLOSED: "已关闭",
};
export function NativeCheckoutPanel({
  state,
  onRefresh,
  onVerify,
  onCancel,
  onLeave,
  onSupport,
}: {
  state: NativeCheckoutState;
  onRefresh: () => void;
  onVerify: () => void;
  onCancel: () => void;
  onLeave: () => void;
  onSupport: () => void;
}) {
  const order = state.order;
  const success = order?.status === "SUCCESSFUL";
  const closed = order?.status === "CLOSED";
  const active =
    !!order && !success && !closed && state.phase !== "access-denied";
  const working =
    state.busy === "verify" || state.busy === "cancel" || !state.commandReady;
  const heading = success
    ? "积分已到账"
    : closed
      ? "这笔充值已关闭"
      : "微信扫码充值";
  let message = state.phase === "loading" ? "正在读取充值记录…" : state.notice;
  if (!message) {
    if (success)
      message = "充值已确认成功。返回后请重新核对发布方案，再确认购买。";
    else if (closed) message = "这笔订单已结束。如需充值，请返回后重新创建。";
    else if (state.recoveryBlocked)
      message = "暂时无法恢复这笔充值的操作记录，请刷新重试或联系客服。";
    else if (state.cancelPending) message = "取消结果正在确认，请勿再次支付。";
    else if (order?.supportRequired)
      message = "这笔充值需要平台核查，请保留订单并联系客服，勿重复支付。";
    else if (order?.canVerify === false)
      message = "暂时无法处理付款操作，订单已保留，请稍后查看或联系客服。";
    else if (order?.status === "CONFIRMING")
      message = "正在确认支付结果，请勿重复支付。";
    else if (!state.qrValue && state.remainingSeconds === 0)
      message = "正在核实订单，请刷新状态，勿重复支付。";
    else if (!state.qrValue)
      message = "支付二维码正在准备中，请稍候或刷新状态。";
    else message = "订单已准备好，请核对充值金额后完成支付。";
  }
  const countdown = `${Math.floor(state.remainingSeconds / 60)}:${String(state.remainingSeconds % 60).padStart(2, "0")}`;
  return (
    <div className={styles.frame}>
      <section className={styles.checkout} aria-label="微信充值">
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>账户充值</p>
            <h1>{heading}</h1>
          </div>
          {order && (
            <span
              className={`${styles.badge} ${success ? styles.success : ""}`}
            >
              {stateLabels[order.status]}
            </span>
          )}
        </header>
        {order && (
          <div className={styles.summary}>
            <div>
              <span>充值金额</span>
              <strong>
                ¥
                {order.amountYuan.toLocaleString("zh-CN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </div>
            <div>
              <span>
                {success
                  ? "已到账积分"
                  : closed
                    ? "本单对应积分"
                    : "充值成功可得"}
              </span>
              <b>
                {order.points.toLocaleString("zh-CN")} <small>积分</small>
              </b>
            </div>
          </div>
        )}
        <p className={styles.message} role="status" aria-live="polite">
          {message}
        </p>
        {state.qrValue && (
          <div className={styles.qrArea}>
            <div className={styles.qr}>
              <QRCodeSVG
                value={state.qrValue}
                size={240}
                marginSize={4}
                level="M"
                bgColor="#ffffff"
                fgColor="#102b22"
                title="使用微信扫一扫完成本次充值"
              />
            </div>
            <p className={styles.scanHint}>请使用手机微信「扫一扫」</p>
            <p className={styles.countdown} aria-live="off">
              二维码剩余展示时间 <strong>{countdown}</strong>
            </p>
            <p className={styles.mobileHint}>
              请在电脑上打开本页，再用手机微信扫码。手机网页支付将另行开放。
            </p>
          </div>
        )}
        {active && state.pollingEnded && (
          <p className={styles.help} role="status">
            暂未确认支付结果。自动刷新已暂停，你可以稍后刷新状态或从充值记录中继续查看，请勿重复支付。
          </p>
        )}
        {active && (
          <div className={styles.actions}>
            {!state.cancelPending &&
              !state.recoveryBlocked &&
              order.canVerify !== false && (
                <button
                  className={styles.primary}
                  disabled={working}
                  onClick={onVerify}
                >
                  我已完成支付
                </button>
              )}
            <button
              className={styles.secondary}
              disabled={!!state.busy}
              onClick={onRefresh}
            >
              {state.busy === "read" ? "正在刷新…" : "刷新状态"}
            </button>
            {order.canCancel && (
              <button
                className={styles.quiet}
                disabled={working}
                onClick={onCancel}
              >
                {state.cancelPending ? "重试取消请求" : "取消本次充值"}
              </button>
            )}
          </div>
        )}
        {!order && state.phase === "unavailable" && (
          <button
            className={styles.secondary}
            disabled={!!state.busy}
            onClick={onRefresh}
          >
            重新读取
          </button>
        )}
        {(success || closed) && (
          <button className={styles.primary} onClick={onLeave}>
            {success ? "返回继续查看" : "返回"}
          </button>
        )}
        {order && (
          <p className={styles.reference}>
            充值单号 <span>{order.id}</span>
          </p>
        )}
        <footer className={styles.footer}>
          {!success && !closed && (
            <button className={styles.quiet} onClick={onLeave}>
              稍后再查看
            </button>
          )}
          <button className={styles.quiet} onClick={onSupport}>
            联系客服
          </button>
        </footer>
        {active && (
          <p className={styles.finePrint}>
            离开本页不会自动取消充值。只有订单确认为充值成功后，积分才会到账。
          </p>
        )}
      </section>
    </div>
  );
}
