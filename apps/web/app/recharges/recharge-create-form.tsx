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
import { PaymentMethodMark } from "./payment-method-mark.js";
import { formatPoints } from "../point-format.js";
import {
  amountDraftFromPoints,
  parseRechargePoints,
  pointDraftFromAmount,
} from "./recharge-point-selection.js";
const memory = {
  getItem: (k: string) => localStorage.getItem(k),
  setItem: (k: string, v: string) => localStorage.setItem(k, v),
  removeItem: (k: string) => localStorage.removeItem(k),
};
const paymentMethods = [
  { method: "ALIPAY_PC" },
  { method: "WECHAT_NATIVE" },
] as const;
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
  const pointDraft = state.pending
      ? String(state.pending.amountYuan * options.pointsPerYuan)
      : pointDraftFromAmount(state.draft, options.pointsPerYuan),
    pointSelection = state.pending
      ? {
          points: state.pending.amountYuan * options.pointsPerYuan,
          amount: state.pending.amountYuan,
          problem: null,
        }
      : parseRechargePoints(pointDraft, options),
    parsed = state.pending
      ? { amount: state.pending.amountYuan, problem: null }
      : parseRechargeAmount(state.draft, options),
    pointRange =
      options.minAmountYuan === null || options.maxAmountYuan === null
        ? null
        : {
            minimum: options.minAmountYuan * options.pointsPerYuan,
            maximum: options.maxAmountYuan * options.pointsPerYuan,
          },
    locked = state.busy || !!state.pending || state.blocked;
  return (
    <section
      className={`commerce-editor ${styles.create}`}
      aria-label="创建充值"
    >
      <div className={styles.createHeading}>
        <div>
          <p className={styles.step}>充值积分</p>
          <h2>选择本次充值的积分数量</h2>
        </div>
        <span>1 元 = {formatPoints(options.pointsPerYuan)}</span>
      </div>
      <p className="commerce-muted">
        选择所需积分，提交前核对真实人民币实付金额。
      </p>
      <div className={styles.formBody}>
        <div className={styles.selection}>
          {state.pending && (
            <p className="commerce-notice" role="status">
              有一笔{" "}
              {formatPoints(state.pending.amountYuan * options.pointsPerYuan)}{" "}
              的创建请求待恢复。先核对原请求，再开始新的充值。
            </p>
          )}
          {!options.available && (
            <p className="commerce-notice">
              在线充值暂未开放。已有请求可恢复，历史订单仍可查看。
            </p>
          )}
          <div
            className={styles.shortcuts}
            role="group"
            aria-label="快捷充值积分"
          >
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
                {formatPoints(amount * options.pointsPerYuan)}
              </button>
            ))}
          </div>
          <label className={styles.amount}>
            自定义充值积分
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={pointDraft}
              onChange={(event) =>
                controller.setDraft(
                  amountDraftFromPoints(
                    event.target.value,
                    options.pointsPerYuan,
                  ),
                )
              }
              disabled={locked || !options.available}
              aria-invalid={
                pointDraft !== "" && pointSelection.problem !== null
              }
              aria-describedby="recharge-amount-help"
            />
          </label>
          <p id="recharge-amount-help" className="commerce-muted">
            {state.pending
              ? "原请求金额保持不变，恢复后以订单记录为准。"
              : pointDraft && pointSelection.problem
                ? pointSelection.problem
                : options.available && pointRange
                  ? `支持 ${formatPoints(pointRange.minimum)}–${formatPoints(pointRange.maximum)}，需为 ${formatPoints(options.pointsPerYuan)} 的整数倍。`
                  : "开放后可选择或填写充值积分。"}
          </p>
          {(state.pending || options.methods.length > 0) && (
            <fieldset className={styles.methods}>
              <legend>支付方式</legend>
              {(state.pending
                ? paymentMethods.filter(
                    ({ method }) => method === state.pending?.method,
                  )
                : paymentMethods
              ).map(({ method }) => {
                const availableForCreation =
                  !!state.pending ||
                  (options.available && options.methods.includes(method));
                return (
                  <label
                    key={method}
                    className={
                      availableForCreation
                        ? undefined
                        : styles.methodUnavailable
                    }
                  >
                    <input
                      type="radio"
                      name="recharge-method"
                      value={method}
                      checked={
                        (state.pending?.method ?? state.method) === method
                      }
                      disabled={locked || !availableForCreation}
                      onChange={() => controller.setMethod(method)}
                    />{" "}
                    <PaymentMethodMark method={method} />
                    {!availableForCreation && (
                      <small className={styles.methodStatus}>暂未开放</small>
                    )}
                  </label>
                );
              })}
            </fieldset>
          )}
          {state.message && (
            <p className="form-error" role="alert">
              {state.message}
            </p>
          )}
        </div>
        <aside className={styles.orderPreview} aria-label="充值订单预览">
          <p className={styles.step}>订单确认</p>
          <div>
            <span>充值积分</span>
            <strong>{formatPoints(pointSelection.points ?? 0)}</strong>
          </div>
          <div>
            <span>实付金额</span>
            <strong>{moneyYuan(pointSelection.amount)}</strong>
          </div>
          <button
            className="primary-button"
            disabled={
              state.busy ||
              state.blocked ||
              (!state.pending &&
                (!options.available ||
                  parsed.amount === null ||
                  pointSelection.amount === null)) ||
              (!state.pending && !state.method)
            }
            onClick={() => void controller.submit()}
          >
            {state.busy
              ? "正在创建或恢复…"
              : state.pending
                ? "恢复上一笔充值"
                : "确认充值"}
          </button>
          <p>
            创建后前往官方收银台。付款结果以充值记录为准，充值不会自动购买发布服务。
          </p>
        </aside>
      </div>
    </section>
  );
}

function moneyYuan(amount: number | null) {
  return amount === null
    ? "¥—"
    : `¥${amount.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
}
