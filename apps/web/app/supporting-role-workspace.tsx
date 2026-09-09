"use client";

import type { Account } from "@geoeval/api-client";
import { useEffect, useState } from "react";

import { AdminSidebar } from "./admin/admin-sidebar.js";
import { roleHomePath } from "./enter/post-login-route.js";
import { SessionExitActions } from "./session-exit-actions.js";
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
    status: "AVAILABLE" | "FUTURE_CAPABILITY";
    href?: string;
  }>;
};

const statusLabels: Record<
  RoleWorkspaceConfig["cards"][number]["status"],
  string
> = {
  AVAILABLE: "已开放",
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
            <SessionExitActions apiBaseUrl={apiBaseUrl} />
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
        "集中进入需要系统管理员权限的账号治理、媒体供给和发布商业配置。",
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
          title: "发布套餐",
          description: "维护随机发布套餐的数量、积分价格、媒体范围与启用状态。",
          status: "AVAILABLE",
          href: "/admin/publishing",
        },
        {
          title: "客户积分",
          description: "查看终端客户积分与流水，并按原因赠送或调整赠送积分。",
          status: "AVAILABLE",
          href: "/admin/points",
        },
        {
          title: "履约订单",
          description:
            "查看履约与协商记录、按需改派，并在“待退点”中确认执行已约定退点。",
          status: "AVAILABLE",
          href: "/admin/delivery",
        },
      ],
    };
  }
  if (role === "OPERATIONS") {
    return {
      eyebrow: "运营工作区",
      title: "履约工作台",
      introduction:
        "从订单池认领已购服务，逐项准备内容或直接录入发布结果；客户可查看真实进度。",
      boundary:
        "运营负责已支付订单的发布履约与普通异常，不管理账号角色、平台价格或客户积分。",
      navigation: [
        {
          label: "履约工作台",
          description: "订单与异常总览",
          mark: "工",
          href: "/operations",
        },
        {
          label: "履约订单",
          description: "待领取与我负责的订单",
          mark: "待",
          href: "/operations/orders",
        },
        { label: "发票处理", description: "已分配的开票工作", mark: "票" },
      ],
      cards: [
        {
          title: "待领取订单",
          description: "领取整单，开始处理；未开始时可说明原因退回。",
          status: "AVAILABLE",
          href: "/operations/orders",
        },
        {
          title: "进行中与临期工作",
          description: "进入履约订单后切换“我的订单”，优先跟进延期和临期工作。",
          status: "AVAILABLE",
          href: "/operations/orders",
        },
        {
          title: "协商异常与退点",
          description:
            "进入“我的订单”处理协商替换或停止剩余发布；零额终止直接关闭，正额退点由管理员执行。",
          status: "AVAILABLE",
          href: "/operations/orders",
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
