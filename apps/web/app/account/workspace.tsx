"use client";
import {
  getPointBalance,
  getPointHistory,
  type PointBalance,
  type PointHistory,
} from "@geoeval/api-client";
import { useEffect, useState } from "react";
import { CustomerSidebar } from "../customer-sidebar.js";
import { PointHistoryList } from "../points/point-history.js";
import {
  loadRoleSession,
  sessionFailureState,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../session-access.js";
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function AccountPointsWorkspace() {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [balance, setBalance] = useState<PointBalance>();
  const [history, setHistory] = useState<PointHistory>({
    items: [],
    nextBeforeSequence: null,
  });
  const [loadingMore, setLoadingMore] = useState(false),
    [error, setError] = useState("");
  async function load() {
    setSession({ kind: "loading" });
    setError("");
    const next = await loadRoleSession(apiBaseUrl, "TERMINAL_CUSTOMER");
    if (next.kind !== "ready") {
      setSession(next);
      return;
    }
    try {
      const [balance, history] = await Promise.all([
        getPointBalance(apiBaseUrl),
        getPointHistory(apiBaseUrl),
      ]);
      setBalance(balance);
      setHistory(history);
      setSession(next);
    } catch (error) {
      setSession(
        sessionFailureState(error) ?? {
          kind: "error",
          message: error instanceof Error ? error.message : "积分读取失败",
        },
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function more() {
    if (loadingMore || !history.nextBeforeSequence) return;
    setLoadingMore(true);
    try {
      const next = await getPointHistory(
        apiBaseUrl,
        history.nextBeforeSequence,
      );
      setHistory({
        items: [...history.items, ...next.items],
        nextBeforeSequence: next.nextBeforeSequence,
      });
    } catch (error) {
      const failure = sessionFailureState(error);
      if (failure) setSession(failure);
      setError(error instanceof Error ? error.message : "流水读取失败");
    } finally {
      setLoadingMore(false);
    }
  }
  if (session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={session}
        expectedRole="TERMINAL_CUSTOMER"
        workspaceName="账户中心"
        loadingDetail="读取当前账号的积分与流水"
        apiBaseUrl={apiBaseUrl}
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
            <h1>我的积分</h1>
            <p>同一账号的所有品牌共用一个积分余额。</p>
          </div>
          <button
            className="secondary-button"
            disabled={loadingMore}
            onClick={() => void load()}
          >
            刷新余额与流水
          </button>
        </header>
        <section className="point-balance">
          <p>当前可用积分</p>
          <strong>{balance?.balance.toLocaleString()}</strong>
          <span>积分</span>
          <p>内容生成、编辑和确认不扣积分，发布订单提交时才会扣除。</p>
          <button className="secondary-button" disabled>
            在线充值（后续接入）
          </button>
        </section>
        <div className="commerce-notice">
          目前可查看平台赠送与调整记录。充值支付和发布购买尚未接入，不会自动扣分或下单。
          <a href="/publishing">浏览发布方案 →</a>
        </div>
        <section>
          <h2>积分流水</h2>
          <PointHistoryList items={history.items} />
          {error && <p role="alert">{error}</p>}
          {history.nextBeforeSequence && (
            <button
              className="secondary-button"
              disabled={loadingMore}
              onClick={() => void more()}
            >
              {loadingMore ? "加载中…" : "加载更早记录"}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
