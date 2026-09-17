"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  listAdminPointRecords,
  type AdminPointRecords,
  type AdminPointRecordFilter,
} from "@geoeval/api-client";
import {
  loadRoleSession,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../../session-access.js";
import { AdminSidebar } from "../admin-sidebar.js";
import { BusinessRecordsNavigation } from "./navigation.js";
import { PointHistoryList } from "../../points/point-history.js";
const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
export type RecordsForm = {
  accountId: string;
  mobile: string;
  referenceId: string;
  kind: string;
  createdFrom: string;
  createdBefore: string;
};
export function recordsFilter(form: RecordsForm): AdminPointRecordFilter {
  const result: AdminPointRecordFilter = {};
  for (const [key, value] of Object.entries(form))
    if (value.trim()) Object.assign(result, { [key]: value.trim() });
  return result;
}
export function AdminRecordsWorkspace({
  initial,
  withdrawalEnabled = false,
}: {
  initial: RecordsForm;
  withdrawalEnabled?: boolean;
}) {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [form, setForm] = useState(initial),
    [filter, setFilter] = useState(initial);
  const [page, setPage] = useState<AdminPointRecords>();
  const [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const sequence = useRef(0),
    request = useRef<AbortController | null>(null);
  const load = useCallback(
    async (cursor?: string) => {
      const n = ++sequence.current;
      request.current?.abort();
      const abort = new AbortController();
      request.current = abort;
      setBusy(true);
      setError("");
      try {
        const next = await loadRoleSession(base, "ADMINISTRATOR");
        if (n !== sequence.current) return;
        setSession(next);
        if (next.kind !== "ready") {
          setPage(undefined);
          return;
        }
        const result = await listAdminPointRecords(
          base,
          next.account.id,
          { ...recordsFilter(filter), ...(cursor ? { cursor } : {}) },
          abort.signal,
        );
        if (n === sequence.current)
          setPage((old) =>
            cursor && old
              ? { ...result, items: [...old.items, ...result.items] }
              : result,
          );
      } catch (e) {
        if (n === sequence.current) {
          setPage(undefined);
          setError(e instanceof Error ? e.message : "查询失败，请重试");
        }
      } finally {
        if (n === sequence.current) setBusy(false);
      }
    },
    [filter],
  );
  useEffect(() => {
    const refresh = () => {
      setPage(undefined);
      void load();
    };
    const visibility = () => {
      if (document.visibilityState === "visible") refresh();
      else {
        ++sequence.current;
        request.current?.abort();
        setPage(undefined);
        setBusy(true);
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      ++sequence.current;
      request.current?.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [load]);
  if (session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={session}
        expectedRole="ADMINISTRATOR"
        workspaceName="业务记录"
        loadingDetail="正在核验管理员身份"
        apiBaseUrl={base}
        onRetry={() => void load()}
      />
    );
  return (
    <div className="app-shell">
      <AdminSidebar account={session.account} active="records" />
      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">全量业务记录</p>
            <h1>积分流水</h1>
            <p>查看所有客户实际发生的积分变化。</p>
          </div>
          <a className="secondary-button" href="/admin/points">
            客户积分管理
          </a>
        </header>
        <BusinessRecordsNavigation
          active="points"
          withdrawalEnabled={withdrawalEnabled}
        />
        <form
          className="commerce-editor"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(undefined);
            setFilter({ ...form });
            const q = new URLSearchParams();
            for (const [k, v] of Object.entries(form)) if (v) q.set(k, v);
            window.history.replaceState(null, "", `/admin/records?${q}`);
          }}
        >
          <label>
            客户手机号
            <input
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="手机号或至少 3 位数字"
            />
          </label>
          <label>
            关联编号
            <input
              value={form.referenceId}
              onChange={(e) =>
                setForm({ ...form, referenceId: e.target.value })
              }
              placeholder="流水、发布订单或充值 ID"
            />
          </label>
          <label>
            类型
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              <option value="">全部</option>
              <option value="RECHARGE">充值到账</option>
              <option value="PUBLISHING_ORDER">发布消费</option>
              <option value="ORDER_RETURN">订单退点</option>
              <option value="ADMIN_ADJUSTMENT">积分调整</option>
            </select>
          </label>
          <label>
            开始时间
            <input
              type="datetime-local"
              value={toLocal(form.createdFrom)}
              onChange={(e) =>
                setForm({
                  ...form,
                  createdFrom: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : "",
                })
              }
            />
          </label>
          <label>
            截止时间（不含）
            <input
              type="datetime-local"
              value={toLocal(form.createdBefore)}
              onChange={(e) =>
                setForm({
                  ...form,
                  createdBefore: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : "",
                })
              }
            />
          </label>
          {form.accountId && <p>已限定客户账号：{form.accountId}</p>}
          <div className="commerce-actions">
            <button className="primary-button" disabled={busy}>
              查询
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => {
                const empty = {
                  accountId: "",
                  mobile: "",
                  referenceId: "",
                  kind: "",
                  createdFrom: "",
                  createdBefore: "",
                };
                setForm(empty);
                setFilter(empty);
                setPage(undefined);
                window.history.replaceState(null, "", "/admin/records");
              }}
            >
              清除筛选
            </button>
          </div>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error} <button onClick={() => void load()}>重试</button>
          </p>
        )}
        {busy && !page && <p role="status">正在读取…</p>}
        {page?.items.length === 0 && <p>没有符合条件的积分流水。</p>}
        {page?.items.map((item) => (
          <section key={item.id} className="commerce-card">
            <p>
              客户：
              <a href={`/admin/records?accountId=${item.accountId}`}>
                {item.accountMobile}
              </a>{" "}
              · 流水 ID：{item.id}
            </p>
            <PointHistoryList items={[item]} showInternal />
          </section>
        ))}
        {page?.nextCursor && (
          <button disabled={busy} onClick={() => void load(page.nextCursor!)}>
            加载更多
          </button>
        )}
      </main>
    </div>
  );
}
function toLocal(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
