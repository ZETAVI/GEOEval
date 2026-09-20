"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiRequestError,
  getAdminAgencyCustomer,
  transferAgencyCustomer,
  listAdminAccounts,
  type AccountList,
  type AgencyTransfer,
} from "@geoeval/api-client";
import { useAgencyRead } from "./use-agency-read.js";
import { formatChinaDateTime } from "../china-time.js";
import styles from "./customer-service.module.css";
const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
export function AgencyTransferCard({ customerId }: { customerId: string }) {
  const load = useCallback(
    () => getAdminAgencyCustomer(base, customerId),
    [customerId],
  );
  const { data, error, refresh } = useAgencyRead(customerId, load);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [formRevision, setFormRevision] = useState<number>();
  const [search, setSearch] = useState("");
  const [agents, setAgents] = useState<AccountList>();
  const [busy, setBusy] = useState(false);
  const [finding, setFinding] = useState(false);
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef<AgencyTransfer | undefined>(undefined);
  const generation = useRef(0);
  const revision = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      ++generation.current;
    },
    [],
  );
  useEffect(() => {
    if (data && revision.current !== data.revision && !uncertain) {
      if (revision.current !== undefined)
        setMessage("已读取最新归属，请按当前关系确认操作。");
      revision.current = data.revision;
      setFormRevision(data.revision);
      setTarget(data.agentAccountId ?? "");
      setReason("");
    }
  }, [data, uncertain]);
  async function findAgents() {
    const current = ++generation.current;
    setFinding(true);
    try {
      const result = await listAdminAccounts(base, {
        role: "AGENT",
        status: "ACTIVE",
        search,
        limit: 20,
      });
      if (current === generation.current) setAgents(result);
    } catch (e) {
      if (current === generation.current)
        setMessage(e instanceof Error ? e.message : "无法查找代理商");
    } finally {
      if (current === generation.current) setFinding(false);
    }
  }
  async function submit() {
    if (!data && !pending.current) return;
    const request = pending.current ?? {
      agentAccountId: target || null,
      expectedRevision: formRevision ?? data!.revision,
      reason: reason.trim(),
      requestId: crypto.randomUUID(),
    };
    pending.current = request;
    setBusy(true);
    setMessage("");
    try {
      const result = await transferAgencyCustomer(base, customerId, request);
      pending.current = undefined;
      setUncertain(false);
      revision.current = undefined;
      await refresh();
      setMessage(
        result.outcome === "UNCHANGED"
          ? "归属未变化"
          : result.outcome === "REPLAYED"
            ? "原迁移请求已完成，已刷新最新关系。"
            : "客户归属已更新，访问权限随当前关系生效。",
      );
    } catch (e) {
      const unknown = !(e instanceof ApiRequestError) || e.status >= 500;
      setUncertain(unknown);
      if (!unknown) {
        pending.current = undefined;
        await refresh();
      }
      setMessage(
        unknown
          ? "结果尚未确认，请重试原请求以核对；不会重复迁移。"
          : e instanceof Error
            ? e.message
            : "迁移失败",
      );
    } finally {
      setBusy(false);
    }
  }
  const locked = busy || uncertain;
  return (
    <section className={styles.card} aria-label="客户归属管理">
      <h2>客户服务归属</h2>
      {error && (
        <p role="alert">
          {error}{" "}
          <button className="secondary-button" onClick={() => void refresh()}>
            重试读取
          </button>
        </p>
      )}
      {!data && !error && <p role="status">正在读取当前归属…</p>}
      {data && (
        <>
          <p>
            当前归属：
            <strong>
              {data.agentAccountId
                ? `代理商 ${data.agentMobile ?? data.agentAccountId}`
                : "公共池"}
            </strong>
          </p>
          <div className={styles.controls}>
            <label>
              查找目标代理商
              <input
                value={search}
                disabled={locked}
                placeholder="输入代理商手机号"
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              className="secondary-button"
              disabled={locked || finding}
              onClick={() => void findAgents()}
            >
              {finding ? "查找中…" : "查找代理商"}
            </button>
          </div>
          {agents?.nextCursor && <p>结果较多，请补充手机号缩小范围。</p>}
          <div className={styles.controls}>
            <label>
              迁移目标
              <select
                value={target}
                disabled={locked}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">公共池</option>
                {data.agentAccountId &&
                  !agents?.items.some((a) => a.id === data.agentAccountId) && (
                    <option value={data.agentAccountId}>
                      当前代理商 {data.agentMobile}
                    </option>
                  )}
                {agents?.items.map((a) => (
                  <option key={a.id} value={a.id}>
                    代理商 {a.mobile}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            迁移原因
            <textarea
              className={styles.reason}
              value={reason}
              disabled={locked}
              maxLength={300}
              placeholder="例如：客户服务交接"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <p>
            迁移后旧代理商将无法再读取该客户资料。已有订单和原始获客记录保持原事实。
          </p>
          <button
            className="primary-button"
            disabled={
              busy ||
              (!uncertain &&
                (!reason.trim() ||
                  formRevision !== data.revision ||
                  target === (data.agentAccountId ?? "")))
            }
            onClick={() => void submit()}
          >
            {busy ? "正在处理…" : uncertain ? "重试原请求并核对" : "确认迁移"}
          </button>
          <h3 style={{ marginTop: 24 }}>最近迁移记录</h3>
          {!data.events.length ? (
            <p>暂无迁移记录。</p>
          ) : (
            <ol>
              {data.events.map((e) => (
                <li key={e.id}>
                  <p>
                    {e.beforeAgentAccountId
                      ? `代理 ${e.beforeAgentMobile ?? e.beforeAgentAccountId.slice(0, 8)}`
                      : "公共池"}{" "}
                    →{" "}
                    {e.agentAccountId
                      ? `代理 ${e.agentMobile ?? e.agentAccountId.slice(0, 8)}`
                      : "公共池"}{" "}
                    · {e.reason}
                  </p>
                  <small>
                    {formatChinaDateTime(e.createdAt)} · 操作者{" "}
                    {e.actorMobile ?? e.actorAccountId.slice(0, 8)}
                  </small>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      {uncertain && !data && (
        <button
          disabled={busy}
          className="secondary-button"
          onClick={() => void submit()}
        >
          重试原请求并核对
        </button>
      )}
      {message && (
        <p role="status" className={styles.message}>
          {message}
        </p>
      )}
    </section>
  );
}
