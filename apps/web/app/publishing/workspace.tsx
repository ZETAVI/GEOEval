"use client";

import {
  listPublishingPackages,
  type PublishingPackage,
} from "@geoeval/api-client";
import { useEffect, useState } from "react";
import { CustomerSidebar } from "../customer-sidebar.js";
import {
  loadRoleSession,
  sessionFailureState,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../session-access.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function PublishingWorkspace() {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [packages, setPackages] = useState<PublishingPackage[]>([]);
  async function load() {
    setSession({ kind: "loading" });
    const next = await loadRoleSession(apiBaseUrl, "TERMINAL_CUSTOMER");
    if (next.kind !== "ready") {
      setSession(next);
      return;
    }
    try {
      setPackages(await listPublishingPackages(apiBaseUrl));
      setSession(next);
    } catch (error) {
      setSession(
        sessionFailureState(error) ?? {
          kind: "error",
          message: error instanceof Error ? error.message : "方案读取失败",
        },
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  if (session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={session}
        expectedRole="TERMINAL_CUSTOMER"
        workspaceName="发布方案"
        loadingDetail="读取管理员维护的当前发布方案"
        apiBaseUrl={apiBaseUrl}
        onRetry={() => void load()}
      />
    );
  return (
    <div className="app-shell">
      <CustomerSidebar account={session.account} activePath="/publishing" />
      <main className="workspace commerce-workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">让品牌内容走向更多媒体</p>
            <h1>发布方案</h1>
            <p>
              先了解发布数量与服务范围。完成核心文章后，再继续选择适合的发布方式。
            </p>
          </div>
          <button className="secondary-button" onClick={() => void load()}>
            刷新方案
          </button>
        </header>
        <section className="commerce-intro">
          <div>
            <span className="step-label">随机发布套餐</span>
            <h2>确定数量与范围，由平台安排媒体</h2>
            <p>
              套餐购买的是约定范围内的成功发布数量，不承诺指定媒体平台或账号，也不保证
              AI 提及或排名变化。
            </p>
          </div>
          <a className="secondary-button" href="/optimization">
            查看我的核心文章 →
          </a>
        </section>
        <div className="commerce-notice" role="status">
          当前可浏览已维护的套餐，并在
          <a href="/account">账户中心查看积分余额</a>
          ；精准发布选择与购买提交尚未接入，不会产生扣分或订单。
        </div>
        <PublishingPackageCards packages={packages} />
      </main>
    </div>
  );
}

export function PublishingPackageCards({
  packages,
}: {
  packages: PublishingPackage[];
}) {
  if (!packages.length)
    return (
      <section className="commerce-empty">
        <h2>发布方案正在准备中</h2>
        <p>目前没有已启用的套餐。你可以先完善并确认核心文章，稍后再来查看。</p>
      </section>
    );
  return (
    <div className="commerce-grid">
      {packages.map((item) => (
        <article className="commerce-card" key={item.id}>
          <div className="commerce-card-heading">
            <h2>{item.name}</h2>
            <span className="current-badge">
              {item.buyable ? "方案可用" : "暂不可用"}
            </span>
          </div>
          <p className="commerce-price">
            {item.pointPrice.toLocaleString()} <small>积分 / 套餐</small>
          </p>
          <p className="commerce-quantity">
            成功发布 <strong>{item.quantity.toLocaleString()}</strong> 篇
          </p>
          <div className="commerce-tags" aria-label="套餐媒体范围">
            {item.scope.map((platform) => (
              <span key={platform.platformId}>{platform.displayName}</span>
            ))}
          </div>
          <p className="commerce-muted">
            {item.buyable
              ? "在以上范围内安排发布，不指定单个平台或账号。"
              : "范围内的媒体当前均不可购买，请稍后刷新查看。"}
          </p>
          <button className="primary-button" disabled>
            {item.buyable ? "购买入口准备中" : "暂不可购买"}
          </button>
        </article>
      ))}
    </div>
  );
}
