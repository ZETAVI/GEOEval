"use client";
import { createRecharge, type RechargeOptions } from "@geoeval/api-client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { RechargeCreateController } from "./recharge-create-controller.js";
import {
  parseRechargeAmount,
  rechargeEntryKey,
  readReturnBrand,
  rechargeReturnKey,
} from "./recharge-intent.js";
import styles from "./recharge.module.css";
const memory = {
  getItem: (k: string) => localStorage.getItem(k),
  setItem: (k: string, v: string) => localStorage.setItem(k, v),
  removeItem: (k: string) => localStorage.removeItem(k),
};
export function RechargeCreateForm({
  accountId,
  options,
  base,
}: {
  accountId: string;
  options: RechargeOptions;
  base: string;
}) {
  const controller = useMemo(() => {
    let returnBrand: string | null = null;
    try {
      returnBrand = readReturnBrand(
        sessionStorage.getItem(rechargeEntryKey(accountId)),
      );
    } catch {
      /* stored selection itself remains on the server */
    }
    return new RechargeCreateController(
      accountId,
      options,
      (intent, signal) =>
        createRecharge(
          base,
          accountId,
          {
            amountYuan: intent.amountYuan,
            method: intent.method,
            idempotencyKey: intent.idempotencyKey,
          },
          signal,
        ),
      memory,
      returnBrand,
    );
  }, [accountId, options, base]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getServerSnapshot,
  );
  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);
  useEffect(() => {
    if (!state.created) return;
    try {
      if (state.created.returnBrandId)
        sessionStorage.setItem(
          rechargeReturnKey(accountId, state.created.id),
          state.created.returnBrandId,
        );
      sessionStorage.removeItem(rechargeEntryKey(accountId));
    } catch {
      /* explicit return can still start at account/publishing */
    }
    window.location.assign(
      `/recharges/${encodeURIComponent(state.created.id)}`,
    );
  }, [accountId, state.created]);
  const parsed = state.pending
      ? { amount: state.pending.amountYuan, problem: null }
      : parseRechargeAmount(state.draft, options),
    locked = state.busy || !!state.pending || state.blocked;
  return (
    <section
      className={`commerce-editor ${styles.create}`}
      aria-label="创建充值"
    >
      <h2>选择充值金额</h2>
      <p className="commerce-muted">
        充值以人民币计价，成功后每 1 元到账 {options.pointsPerYuan} 积分。
      </p>
      {state.pending && (
        <p className="commerce-notice" role="status">
          有一笔 ¥{state.pending.amountYuan}{" "}
          的创建请求待恢复。先核对原请求，再开始新的充值。
        </p>
      )}
      {!options.available && (
        <p className="commerce-notice">
          在线充值暂未开放。已有请求可恢复，历史订单仍可查看。
        </p>
      )}
      <div className={styles.shortcuts} role="group" aria-label="快捷充值金额">
        {options.shortcutAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            className={
              state.draft === String(amount)
                ? "primary-button"
                : "secondary-button"
            }
            aria-pressed={state.draft === String(amount)}
            disabled={locked || !options.available}
            onClick={() => controller.setDraft(String(amount))}
          >
            ¥{amount}
          </button>
        ))}
      </div>
      <label className={styles.amount}>
        自定义金额（元）
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={state.draft}
          onChange={(e) => controller.setDraft(e.target.value)}
          disabled={locked || !options.available}
          aria-invalid={state.draft !== "" && parsed.problem !== null}
          aria-describedby="recharge-amount-help"
        />
      </label>
      <p id="recharge-amount-help" className="commerce-muted">
        {state.pending
          ? "原请求金额保持不变，恢复后以订单记录为准。"
          : state.draft && parsed.problem
            ? parsed.problem
            : options.available
              ? `支持 ${options.minAmountYuan}–${options.maxAmountYuan} 整数元。`
              : "开放后可选择或填写充值金额。"}
      </p>
      {(state.pending || options.methods.length > 0) && (
        <fieldset className={styles.methods}>
          <legend>支付方式</legend>
          {(state.pending ? [state.pending.method] : options.methods).map(
            (method) => (
              <label key={method}>
                <input
                  type="radio"
                  name="recharge-method"
                  value={method}
                  checked={(state.pending?.method ?? state.method) === method}
                  disabled={locked || !options.available}
                  onChange={() => controller.setMethod(method)}
                />{" "}
                {method === "WECHAT_NATIVE"
                  ? "微信支付 · 电脑扫码"
                  : "支付宝 · 官方收银台"}
              </label>
            ),
          )}
        </fieldset>
      )}
      <div className={styles.total}>
        <span>充值成功可得</span>
        <strong>
          {(state.pending
            ? state.pending.amountYuan * options.pointsPerYuan
            : parsed.amount !== null
              ? parsed.amount * options.pointsPerYuan
              : 0
          ).toLocaleString()}{" "}
          积分
        </strong>
      </div>
      {state.message && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}
      <button
        className="primary-button"
        disabled={
          state.busy ||
          state.blocked ||
          (!state.pending && (!options.available || parsed.amount === null)) ||
          (!state.pending && !state.method)
        }
        onClick={() => void controller.submit()}
      >
        {state.busy
          ? "正在创建或恢复…"
          : state.pending
            ? "恢复上一笔充值"
            : parsed.amount !== null
              ? `确认充值 ¥${parsed.amount}`
              : "确认充值"}
      </button>
      <p className="commerce-muted">
        创建后进入订单支付页。关闭页面不会自动取消订单，支付结果以充值记录为准。
      </p>
    </section>
  );
}
