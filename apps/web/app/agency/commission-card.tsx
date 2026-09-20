"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiRequestError,
  getAgencyCommissionSettings,
  updateAgencyCommissionSettings,
  type AgencyCommissionUpdate,
} from "@geoeval/api-client";
import { useAgencyRead } from "./use-agency-read.js";
import { formatChinaDateTime } from "../china-time.js";
import styles from "./customer-service.module.css";
const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
export function AgencyCommissionCard({
  agentAccountId,
  inactive,
}: {
  agentAccountId: string;
  inactive: boolean;
}) {
  const load = useCallback(
    () => getAgencyCommissionSettings(base, agentAccountId),
    [agentAccountId],
  );
  const { data, error, refresh } = useAgencyRead(agentAccountId, load);
  const [enabled, setEnabled] = useState(false),
    [rate, setRate] = useState(""),
    [reason, setReason] = useState("");
  const [formRevision, setFormRevision] = useState<number>();
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [message, setMessage] = useState("");
  const revision = useRef<number | undefined>(undefined);
  const pending = useRef<AgencyCommissionUpdate | undefined>(undefined);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (data && revision.current !== data.revision && !uncertain && !busy) {
      revision.current = data.revision;
      setFormRevision(data.revision);
      setEnabled(data.enabled);
      setRate(data.rateBps === null ? "" : String(data.rateBps / 100));
      setReason("");
    }
  }, [data, uncertain, busy]);
  async function submit() {
    if (!data && !pending.current) return;
    if (
      !pending.current &&
      enabled &&
      (!/^\d+(\.\d{1,2})?$/.test(rate) || Number(rate) > 100)
    ) {
      setMessage("请填写 0% 至 100% 的费率，最多两位小数。");
      return;
    }
    const request = pending.current ?? {
      enabled,
      rateBps: enabled ? Math.round(Number(rate) * 100) : data!.rateBps,
      expectedRevision: formRevision ?? data!.revision,
      reason: reason.trim(),
      requestId: crypto.randomUUID(),
    };
    if (!request.reason) {
      setMessage("请填写修改原因。");
      return;
    }
    pending.current = request;
    setBusy(true);
    setMessage("");
    try {
      await updateAgencyCommissionSettings(base, agentAccountId, request);
      if (!alive.current) return;
      pending.current = undefined;
      setUncertain(false);
      revision.current = undefined;
      await refresh();
      if (alive.current) setMessage("修改已完成。");
    } catch (e) {
      if (!alive.current) return;
      const unknown = !(e instanceof ApiRequestError) || e.status >= 500;
      setUncertain(unknown);
      if (!unknown) {
        pending.current = undefined;
        await refresh();
      }
      if (alive.current)
        setMessage(
          unknown
            ? "结果尚未确认，请重试原请求核对。"
            : e instanceof Error
              ? e.message
              : "设置未保存",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const locked = busy || uncertain;
  return (
    <section className={styles.card} aria-label="佣金设置">
      <h2>佣金设置</h2>
      <p>仅影响新订单。关闭不影响客户购买；开启后可以设置为 0%。</p>
      {inactive && (
        <p>代理商已停用。当前不为新订单计佣，客户归属和旧订单权益保留。</p>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => void refresh()}>
            重新读取
          </button>
        </p>
      )}
      {!data && !error && <p role="status">正在读取设置…</p>}
      {data && (
        <>
          <p>
            当前佣金：{data.enabled ? "开启" : "关闭"}
            {data.rateBps !== null && ` · 费率 ${data.rateBps / 100}%`}
          </p>
          <fieldset className={styles.commissionFields} disabled={locked}>
            <label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              开启佣金
            </label>
            <label>
              佣金费率（%）
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={rate}
                disabled={!enabled}
                onChange={(e) => setRate(e.target.value)}
              />
            </label>
            <label>
              修改原因
              <textarea
                maxLength={320}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </fieldset>
        </>
      )}
      {(data || uncertain) && (
        <button
          type="button"
          className="primary-button"
          disabled={busy || (!uncertain && !data)}
          onClick={() => void submit()}
        >
          {busy ? "正在保存…" : uncertain ? "重试原请求" : "保存设置"}
        </button>
      )}
      {message && <p role="status">{message}</p>}
      {data && data.audits.length > 0 && (
        <details>
          <summary>最近修改记录</summary>
          <ul>
            {data.audits.map((event) => (
              <li key={event.id}>
                {formatChinaDateTime(event.createdAt)} ·{" "}
                {event.before.enabled ? "开启" : "关闭"} →{" "}
                {event.after.enabled ? "开启" : "关闭"} ·{" "}
                {event.before.rateBps === null
                  ? "未设置"
                  : `${event.before.rateBps / 100}%`}{" "}
                →{" "}
                {event.after.rateBps === null
                  ? "未设置"
                  : `${event.after.rateBps / 100}%`}{" "}
                · {event.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
