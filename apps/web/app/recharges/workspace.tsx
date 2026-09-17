"use client";

import {
  getPointBalance,
  getRechargeOptions,
  type PointBalance,
  type RechargeOptions,
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
import { RechargeRecords } from "./recharge-records.js";
import { rechargeApiBase } from "./native-api-source.js";
import styles from "./recharge.module.css";
import { rechargeLabels } from "./recharge-status.js";

export { rechargeLabels };

export function RechargeWorkspace() {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [options, setOptions] = useState<RechargeOptions>();
  const [balance, setBalance] = useState<PointBalance>();
  const version = useRef(0);
  const request = useRef<AbortController | null>(null);

  async function load() {
    const token = ++version.current;
    request.current?.abort();
    const abort = new AbortController();
    request.current = abort;
    setSession({ kind: "loading" });
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
      const [nextOptions, nextBalance] = await Promise.all([
        getRechargeOptions(rechargeApiBase, next.account.id, abort.signal),
        getPointBalance(rechargeApiBase, abort.signal, next.account.id),
      ]);
      if (token !== version.current || abort.signal.aborted) return;
      setOptions(nextOptions);
      setBalance(nextBalance);
      setSession(next);
    } catch (cause) {
      if (token !== version.current || abort.signal.aborted) return;
      setSession(
        sessionFailureState(cause) ?? {
          kind: "error",
          message: cause instanceof Error ? cause.message : "充值页面读取失败",
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
      request.current?.abort();
    };
  }, []);

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
            <p>支付确认后积分到账。充值不会自动购买发布服务。</p>
            <p>需要发票时，请在下方已成功的充值订单中提交申请。</p>
            <a href="/publishing">查看发布方案 →</a>
            {options.supportMessage && <p>{options.supportMessage}</p>}
          </aside>
        </div>
        <RechargeRecords
          base={rechargeApiBase}
          accountId={session.account.id}
        />
      </main>
    </div>
  );
}
