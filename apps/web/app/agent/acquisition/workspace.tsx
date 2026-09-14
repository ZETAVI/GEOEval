"use client";
import styles from "../../acquisition/link-card.module.css";
import { useEffect, useState } from "react";
import {
  loadRoleSession,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../../session-access.js";
import { AgencyLinkCard } from "../../acquisition/link-card.js";
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
export function AgentAcquisitionWorkspace() {
  const [state, setState] = useState<RoleSessionState>({ kind: "loading" });
  const load = async () => {
    setState({ kind: "loading" });
    setState(await loadRoleSession(apiBaseUrl, "AGENT"));
  };
  useEffect(() => {
    void load();
  }, []);
  if (state.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={state}
        expectedRole="AGENT"
        workspaceName="获客入口"
        loadingDetail="正在确认身份"
        apiBaseUrl={apiBaseUrl}
        onRetry={() => void load()}
      />
    );
  return (
    <main className={styles.workspace}>
      <a href="/agent">返回代理商工作区</a>
      <h1>邀请客户</h1>
      <AgencyLinkCard key={state.account.id} />
    </main>
  );
}
