"use client";

import { logout, type Account } from "@geoeval/api-client";
import { useEffect, useState } from "react";

import { AdminSidebar } from "./admin/admin-sidebar.js";
import { roleHomePath } from "./enter/post-login-route.js";
import {
  accountRoleLabels,
  loadRoleSession,
  type RoleSessionState,
  WorkspaceAccessPanel,
} from "./session-access.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

type SupportingRole = Exclude<Account["role"], "TERMINAL_CUSTOMER">;

type RoleWorkspaceConfig = {
  eyebrow: string;
  title: string;
  introduction: string;
  boundary: string;
  navigation?: Array<{
    label: string;
    description: string;
    mark: string;
    href?: string;
  }>;
  cards: Array<{
    title: string;
    description: string;
    status:
      "AVAILABLE" | "READ_ONLY" | "FOUNDATION_READY" | "FUTURE_CAPABILITY";
    href?: string;
  }>;
};

const statusLabels: Record<
  RoleWorkspaceConfig["cards"][number]["status"],
  string
> = {
  AVAILABLE: "已开放",
  READ_ONLY: "只读视图已开放",
  FOUNDATION_READY: "基础已就绪",
  FUTURE_CAPABILITY: "业务模块待接入",
};

export function SupportingRoleWorkspace({ role }: { role: SupportingRole }) {
  const config = supportingRoleConfig(role);
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });

  async function load() {
    setSession({ kind: "loading" });
    setSession(await loadRoleSession(apiBaseUrl, role));
  }

  useEffect(() => {
    void load();
  }, []);

  if (session.kind !== "ready") {
    return (
      <WorkspaceAccessPanel
        state={session}
        expectedRole={role}
        workspaceName={`${accountRoleLabels[role]}工作区`}
        loadingDetail="角色确认后再加载对应工作区"
        apiBaseUrl={apiBaseUrl}
        onRetry={() => void load()}
      />
    );
  }

  const { account } = session;

  return (
    <div className="app-shell admin-app-shell supporting-app-shell">
      {role === "ADMINISTRATOR" ? (
        <AdminSidebar account={account} active="overview" />
      ) : (
        <aside className="sidebar admin-sidebar supporting-sidebar">
          <a className="brand-mark inverse" href={roleHomePath(role)}>
            <span aria-hidden="true">G</span>
            <strong>GEO 优化</strong>
          </a>
          <div className="admin-area-label">{config.eyebrow}</div>
          <nav aria-label={`${accountRoleLabels[role]}功能`}>
            {config.navigation?.map((item, index) =>
              item.href ? (
                <a
                  key={item.label}
                  className={index === 0 ? "side-link active" : "side-link"}
                  href={item.href}
                  aria-current={index === 0 ? "page" : undefined}
                >
                  <i>{item.mark}</i>
                  <span>
                    <b>{item.label}</b>
                    <small>{item.description}</small>
                  </span>
                </a>
              ) : (
                <span key={item.label} className="side-link unavailable">
                  <i>{item.mark}</i>
                  <span>
                    <b>{item.label}</b>
                    <small>{item.description}</small>
                  </span>
                  <em>待接入</em>
                </span>
              ),
            )}
          </nav>
          <div className="admin-boundary-note">
            <b>职责边界</b>
            <p>{config.boundary}</p>
          </div>
          <div className="sidebar-account">
            <span>{account.mobile.slice(-4)}</span>
            <div>
              <b>{accountRoleLabels[role]}</b>
              <small>{account.mobile}</small>
            </div>
            <button
              type="button"
              onClick={() =>
                void logout(apiBaseUrl).then(() => window.location.assign("/"))
              }
            >
              退出
            </button>
          </div>
        </aside>
      )}
      <main className="workspace supporting-workspace">
        <header className="supporting-hero">
          <div>
            <p className="eyebrow">{config.eyebrow}</p>
            <h1>{config.title}</h1>
            <p>{config.introduction}</p>
          </div>
          <span className="role-foundation-pill">身份与访问基础已启用</span>
        </header>
        <section className="role-overview-grid" aria-label="工作区能力">
          {config.cards.map((card) => {
            const content = (
              <>
                <div
                  className={`role-card-status ${card.status.toLowerCase()}`}
                >
                  {statusLabels[card.status]}
                </div>
                <h2>{card.title}</h2>
                <p>{card.description}</p>
                {card.href && <strong>进入模块 →</strong>}
              </>
            );
            return card.href ? (
              <a
                key={card.title}
                className="role-overview-card available"
                href={card.href}
              >
                {content}
              </a>
            ) : (
              <article key={card.title} className="role-overview-card">
                {content}
              </article>
            );
          })}
        </section>
        <section className="role-empty-guidance">
          <p className="eyebrow">当前阶段</p>
          <h2>角色入口已建立，业务数据不会被虚构</h2>
          <p>
            后续模块激活后，这里会替换为对应角色真正拥有的统计、列表和操作；当前仅呈现已经成立的能力与明确边界。
          </p>
        </section>
      </main>
    </div>
  );
}

export function supportingRoleConfig(
  role: SupportingRole,
): RoleWorkspaceConfig {
  if (role === "ADMINISTRATOR") {
    return {
      eyebrow: "管理员工作区",
      title: "管理总览",
      introduction:
        "集中进入需要系统管理员权限的治理能力；账号与访问和媒体供给保持独立模块。",
      boundary:
        "管理员治理账号、角色与平台级资料，不代替运营履约，也不拥有客户品牌内容。",
      cards: [
        {
          title: "账号与访问",
          description:
            "查看账号、固定角色、状态、活跃会话与治理审计，并执行受控账号治理。",
          status: "AVAILABLE",
          href: "/admin/accounts",
        },
        {
          title: "媒体库管理",
          description: "维护媒体平台、销售价格、资源、供应商及操作记录。",
          status: "AVAILABLE",
          href: "/admin/media",
        },
        {
          title: "商业与履约治理",
          description:
            "套餐、积分、异常订单和代理结算由各自后续 Capability 激活。",
          status: "FUTURE_CAPABILITY",
        },
      ],
    };
  }
  if (role === "OPERATIONS") {
    return {
      eyebrow: "运营工作区",
      title: "履约工作台",
      introduction:
        "运营身份已经可独立登录；订单池、我的订单、临期与异常数据将在履约模块激活后接入。",
      boundary:
        "运营负责已支付订单的发布履约与普通异常，不管理账号角色、平台价格或客户积分。",
      navigation: [
        {
          label: "履约工作台",
          description: "订单与异常总览",
          mark: "工",
          href: "/operations",
        },
        { label: "待领取订单", description: "共享订单池", mark: "待" },
        { label: "我的订单", description: "当前负责的履约", mark: "单" },
        { label: "发票处理", description: "已分配的开票工作", mark: "票" },
      ],
      cards: [
        {
          title: "待领取订单",
          description:
            "发布订单能力尚未激活，因此当前不展示虚构数量或模拟订单。",
          status: "FUTURE_CAPABILITY",
        },
        {
          title: "进行中与临期工作",
          description: "履约模块将提供当前责任人、截止时间、进度和延迟风险。",
          status: "FUTURE_CAPABILITY",
        },
        {
          title: "异常与结果回传",
          description: "后续在订单边界内处理发布异常并记录可访问的发布结果。",
          status: "FUTURE_CAPABILITY",
        },
      ],
    };
  }
  return {
    eyebrow: "代理商工作区",
    title: "客户与收益总览",
    introduction:
      "代理商身份已经可独立登录；客户归因、业绩订单、佣金与提现仍由后续业务模块提供。",
    boundary:
      "代理商只查看归因客户与自身收益，不获得客户账号角色，也不能管理平台或履约订单。",
    navigation: [
      {
        label: "代理商总览",
        description: "客户与收益边界",
        mark: "总",
        href: "/agent",
      },
      { label: "客户管理", description: "已归因客户与品牌", mark: "客" },
      { label: "佣金明细", description: "已确认与待结算收益", mark: "佣" },
      { label: "提现记录", description: "申请与处理状态", mark: "提" },
    ],
    cards: [
      {
        title: "客户管理",
        description: "归因关系尚未激活，当前不会显示客户或品牌样例数据。",
        status: "FUTURE_CAPABILITY",
      },
      {
        title: "业绩与佣金",
        description: "未来只从真实的佣金资格、订单消费和结算记录形成摘要。",
        status: "FUTURE_CAPABILITY",
      },
      {
        title: "提现状态",
        description: "提现模块激活后展示可提现收益、申请与管理员处理状态。",
        status: "FUTURE_CAPABILITY",
      },
    ],
  };
}
