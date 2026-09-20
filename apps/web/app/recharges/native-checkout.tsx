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
import { rechargeLabels, rechargeMessages } from "./recharge-status.js";
import { formatPoints } from "../point-format.js";

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
      onCashier={() =>
        void controller.cashier().then((url) => {
          if (url) window.location.assign(url);
        })
      }
      onLeave={onLeave}
      onSupport={onSupport}
    />
  );
}

export function NativeCheckoutPanel({
  state,
  onRefresh,
  onVerify,
  onCancel,
  onCashier = () => {},
  onLeave,
  onSupport,
}: {
  state: NativeCheckoutState;
  onRefresh: () => void;
  onVerify: () => void;
  onCancel: () => void;
  onCashier?: () => void;
  onLeave: () => void;
  onSupport: () => void;
}) {
  const order = state.order;
  const success = order?.status === "SUCCESSFUL";
  const closed = order?.status === "CLOSED";
  const active =
    !!order && !success && !closed && state.phase !== "access-denied";
  const working =
    state.busy === "verify" ||
    state.busy === "cancel" ||
    state.busy === "cashier" ||
    !state.commandReady;
  const heading = success
    ? "⚡已到账"
    : closed
      ? "这笔充值未支付"
      : order?.method === "ALIPAY_PC"
        ? "支付宝充值"
        : "微信扫码充值";
  const message = order
    ? rechargeMessages[order.status]
    : state.phase === "loading"
      ? "正在加载…"
      : "加载失败，请重试";
  const feedback =
    state.phase === "unavailable"
      ? "加载失败，请重试"
      : !success && !closed && state.notice !== message
        ? state.notice
        : "";
  const countdown = `${Math.floor(state.remainingSeconds / 60)}:${String(state.remainingSeconds % 60).padStart(2, "0")}`;
  return (
    <div className={styles.frame}>
      <section
        className={styles.checkout}
        aria-label={order?.method === "ALIPAY_PC" ? "支付宝充值" : "微信充值"}
      >
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>账户充值</p>
            <h1>{heading}</h1>
          </div>
          {order && (
            <span
              className={`${styles.badge} ${success ? styles.success : ""}`}
            >
              {rechargeLabels[order.status]}
            </span>
          )}
        </header>
        {order && (
          <div className={styles.summary}>
            <div>
              <span>实付金额</span>
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
              <b>{formatPoints(order.points)}</b>
            </div>
          </div>
        )}
        <p className={styles.message} role="status" aria-live="polite">
          {message}
        </p>
        {feedback && feedback !== message && (
          <p className={styles.message} role="status">
            {feedback}
          </p>
        )}
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
            页面自动刷新已暂停，可稍后查看充值记录。
          </p>
        )}
        {active && (
          <div className={styles.actions}>
            {!state.cancelPending &&
              !state.recoveryBlocked &&
              order.method === "ALIPAY_PC" && (
                <button
                  className={styles.primary}
                  disabled={working}
                  onClick={onCashier}
                >
                  {state.busy === "cashier"
                    ? "正在打开支付宝…"
                    : "前往支付宝官方收银台"}
                </button>
              )}
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
