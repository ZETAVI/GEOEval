"use client";
import {
  ApiRequestError,
  getPointBalance,
  getRechargeOptions,
  listRecharges,
  type PointBalance,
  type RechargeOptions,
  type RechargePage,
  type RechargeSummary,
} from "@geoeval/api-client";
import { useEffect, useRef, useState } from "react";
import { CustomerSidebar } from "../customer-sidebar.js";
import {
  loadRoleSession,
  sessionFailureState,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../session-access.js";
import { RechargeCreateForm } from "./recharge-create-form.js";
import { rechargeApiBase } from "./native-api-source.js";
import styles from "./recharge.module.css";
import {
  rechargeLabels,
  rechargeMessages,
  rechargeMethodLabels,
} from "./recharge-status.js";
export { rechargeLabels };
const empty: RechargePage = { items: [], nextCursor: null };
export function RechargeWorkspace() {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" }),
    [options, setOptions] = useState<RechargeOptions>(),
    [balance, setBalance] = useState<PointBalance>();
  const [history, setHistory] = useState<RechargePage>(empty),
    [filter, setFilter] = useState<RechargeSummary["status"] | "">(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const version = useRef(0),
    request = useRef<AbortController | null>(null),
    listVersion = useRef(0),
    listRequest = useRef<AbortController | null>(null);
  async function load() {
    const token = ++version.current;
    request.current?.abort();
    const abort = new AbortController();
    request.current = abort;
    listVersion.current++;
    listRequest.current?.abort();
    setSession({ kind: "loading" });
    setError("");
    setHistory(empty);
    setBalance(undefined);
    const timeout = setTimeout(() => {
      abort.abort();
      if (token === version.current)
        setSession({
          kind: "error",
          message: "充值页面读取超时，请重新加载。",
        });
    }, 8000);
    try {
      const next = await loadRoleSession(rechargeApiBase, "TERMINAL_CUSTOMER");
      if (token !== version.current || abort.signal.aborted) return;
      if (next.kind !== "ready") {
        setSession(next);
        return;
      }
      const [o, b, h] = await Promise.all([
        getRechargeOptions(rechargeApiBase, next.account.id, abort.signal),
        getPointBalance(rechargeApiBase, abort.signal, next.account.id),
        listRecharges(rechargeApiBase, next.account.id, {}, abort.signal),
      ]);
      if (token !== version.current || abort.signal.aborted) return;
      setOptions(o);
      setBalance(b);
      setHistory(h);
      setFilter("");
      setSession(next);
    } catch (e) {
      if (token !== version.current || abort.signal.aborted) return;
      setSession(
        sessionFailureState(e) ?? {
          kind: "error",
          message: e instanceof Error ? e.message : "充值页面读取失败",
        },
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      version.current++;
      listVersion.current++;
      request.current?.abort();
      listRequest.current?.abort();
    };
  }, []);
  async function historyPage(nextFilter: typeof filter, cursor?: string) {
    if (session.kind !== "ready") return;
    const token = ++listVersion.current;
    listRequest.current?.abort();
    const abort = new AbortController();
    listRequest.current = abort;
    setLoading(true);
    setError("");
    setFilter(nextFilter);
    if (!cursor) setHistory(empty);
    const timeout = setTimeout(() => abort.abort(), 8000);
    try {
      const next = await listRecharges(
        rechargeApiBase,
        session.account.id,
        {
          ...(nextFilter ? { status: nextFilter } : {}),
          ...(cursor ? { cursor } : {}),
        },
        abort.signal,
      );
      if (token !== listVersion.current || abort.signal.aborted) return;
      setHistory((previous) => ({
        items: cursor
          ? [
              ...new Map(
                [...previous.items, ...next.items].map((o) => [o.id, o]),
              ).values(),
            ]
          : next.items,
        nextCursor: next.nextCursor,
      }));
    } catch (e) {
      if (token !== listVersion.current) return;
      if (e instanceof ApiRequestError && e.code === "ACCOUNT_CHANGED")
        setSession({ kind: "error", message: e.message });
      else {
        const denied = sessionFailureState(e);
        if (denied) setSession(denied);
        setError(
          abort.signal.aborted
            ? "充值记录读取超时，请重新查询。"
            : e instanceof Error
              ? e.message
              : "充值记录读取失败",
        );
      }
    } finally {
      clearTimeout(timeout);
      if (token === listVersion.current) setLoading(false);
    }
  }
  if (session.kind !== "ready" || !options)
    return (
      <WorkspaceAccessPanel
        state={session.kind === "ready" ? { kind: "loading" } : session}
        expectedRole="TERMINAL_CUSTOMER"
        workspaceName="账户充值"
        loadingDetail="读取充值选项与本人订单"
        apiBaseUrl={rechargeApiBase}
        onRetry={() => void load()}
      />
    );
  return (
    <div className="app-shell">
      <CustomerSidebar account={session.account} activePath="/account" />
      <main className="workspace commerce-workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">账户中心</p>
            <h1>账户充值</h1>
            <p>
              当前可用 {balance?.balance.toLocaleString() ?? "—"} 积分 ·
              同一账号各品牌共用。
            </p>
          </div>
          <a className="secondary-button" href="/account">
            积分与流水
          </a>
        </header>
        {options.controlled && (
          <p className={styles.controlled} role="status">
            受控测试环境 · 仅验证流程，二维码不能真实付款
          </p>
        )}
        <div className={styles.layout}>
          <RechargeCreateForm
            accountId={session.account.id}
            options={options}
            base={rechargeApiBase}
          />
          <aside className={`commerce-editor ${styles.guide}`}>
            <h2>充值与购买</h2>
            <p>
              支付确认后积分到账。充值不会自动购买发布服务，也不会锁定媒体和价格。
            </p>
            <p>返回发布方案后，请核对最新报价并明确确认购买。</p>
            <a href="/publishing">查看发布方案 →</a>
            {options.supportMessage && <p>{options.supportMessage}</p>}
          </aside>
        </div>
        <section className={styles.history} aria-label="充值记录">
          <div className={styles.historyHeading}>
            <div>
              <h2>充值记录</h2>
              <p className="commerce-muted">
                查询本账号全部充值记录，包含未支付订单；积分流水只记录实际账务变化。
              </p>
            </div>
            <label>
              订单状态
              <select
                value={filter}
                onChange={(e) =>
                  void historyPage(e.target.value as typeof filter)
                }
              >
                <option value="">全部状态</option>
                {Object.entries(rechargeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button"
              disabled={loading}
              onClick={() => void historyPage(filter)}
            >
              刷新记录
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {loading && !history.items.length ? (
            <p role="status">正在查询…</p>
          ) : !history.items.length ? (
            <p>
              {error
                ? "本次查询未完成，请重试。"
                : "当前筛选范围内没有充值记录。"}
            </p>
          ) : (
            <ul className={styles.orders}>
              {history.items.map((o) => (
                <li key={o.id}>
                  <div>
                    <strong>
                      ¥{o.amountYuan.toLocaleString()} ·{" "}
                      {o.points.toLocaleString()} 积分
                    </strong>
                    <p>
                      {rechargeMethodLabels[o.method]} ·{" "}
                      {new Date(o.createdAt).toLocaleString()}
                    </p>
                    <small>充值单号 {o.id}</small>
                  </div>
                  <span title={rechargeMessages[o.status]}>
                    {rechargeLabels[o.status]}
                  </span>
                  <a href={`/recharges/${o.id}`}>
                    {o.status === "PENDING_PAYMENT"
                      ? "继续查看付款"
                      : "查看详情"}{" "}
                    →
                  </a>
                </li>
              ))}
            </ul>
          )}
          {history.nextCursor && (
            <button
              className="secondary-button"
              disabled={loading}
              onClick={() => void historyPage(filter, history.nextCursor!)}
            >
              {loading ? "加载中…" : "加载更早记录"}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
