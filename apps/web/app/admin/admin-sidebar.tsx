"use client";

import type { Account } from "@geoeval/api-client";

import { SessionExitActions } from "../session-exit-actions.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

type AdminSection =
  | "records"
  | "overview"
  | "accounts"
  | "media"
  | "publishing"
  | "points"
  | "delivery"
  | "recharges"
  | "invoices"
  | "support";

export function AdminSidebar({
  account,
  active,
}: {
  account: Account;
  active: AdminSection;
}) {
  return (
    <aside className="sidebar admin-sidebar">
      <a className="brand-mark inverse" href="/admin">
        <span aria-hidden="true">G</span>
        <strong>GEO 管理台</strong>
      </a>
      <div className="admin-area-label">管理员工作区</div>
      <nav aria-label="管理员功能">
        <a
          className={active === "records" ? "side-link active" : "side-link"}
          href="/admin/records"
          aria-current={active === "records" ? "page" : undefined}
        >
          <i>录</i>
          <span>
            <b>业务记录</b>
            <small>积分、充值、订单与工单</small>
          </span>
        </a>
        <a
          className={active === "support" ? "side-link active" : "side-link"}
          href="/admin/support"
          aria-current={active === "support" ? "page" : undefined}
        >
          <i>客</i>
          <span>
            <b>客服工单</b>
            <small>沟通与处理记录</small>
          </span>
        </a>
        <a
          className={active === "delivery" ? "side-link active" : "side-link"}
          href="/admin/delivery"
          aria-current={active === "delivery" ? "page" : undefined}
        >
          <i>单</i>
          <span>
            <b>履约订单</b>
            <small>责任与改派</small>
          </span>
        </a>
        <a
          className={active === "overview" ? "side-link active" : "side-link"}
          href="/admin"
          aria-current={active === "overview" ? "page" : undefined}
        >
          <i>总</i>
          <span>
            <b>管理总览</b>
            <small>权限与系统模块</small>
          </span>
        </a>
        <a
          className={active === "accounts" ? "side-link active" : "side-link"}
          href="/admin/accounts"
          aria-current={active === "accounts" ? "page" : undefined}
        >
          <i>权</i>
          <span>
            <b>账号与访问</b>
            <small>账号、角色与会话</small>
          </span>
        </a>
        <a
          className={active === "media" ? "side-link active" : "side-link"}
          href="/admin/media"
          aria-current={active === "media" ? "page" : undefined}
        >
          <i>媒</i>
          <span>
            <b>媒体库管理</b>
            <small>平台、资源与供应商</small>
          </span>
        </a>
        <a
          className={active === "publishing" ? "side-link active" : "side-link"}
          href="/admin/publishing"
          aria-current={active === "publishing" ? "page" : undefined}
        >
          <i>发</i>
          <span>
            <b>发布套餐</b>
            <small>数量、范围与积分价</small>
          </span>
        </a>
        <a
          className={active === "points" ? "side-link active" : "side-link"}
          href="/admin/points"
          aria-current={active === "points" ? "page" : undefined}
        >
          <i>分</i>
          <span>
            <b>客户积分</b>
            <small>赠送、调整与流水</small>
          </span>
        </a>
        <a
          className={active === "recharges" ? "side-link active" : "side-link"}
          href="/admin/recharges"
          aria-current={active === "recharges" ? "page" : undefined}
        >
          <i>充</i>
          <span>
            <b>充值记录</b>
            <small>付款与到账查询</small>
          </span>
        </a>
        <a
          className={active === "invoices" ? "side-link active" : "side-link"}
          href="/admin/invoices"
          aria-current={active === "invoices" ? "page" : undefined}
        >
          <i>票</i>
          <span>
            <b>开票管理</b>
            <small>分配、接管与审计</small>
          </span>
        </a>
      </nav>
      <div className="admin-boundary-note">
        <b>职责说明</b>
        <p>管理员治理账号、访问与平台级资料，不代替运营履约或客户内容管理。</p>
      </div>
      <div className="sidebar-account">
        <span>{account.mobile.slice(-4)}</span>
        <div>
          <b>系统管理员</b>
          <small>{account.mobile}</small>
        </div>
        <SessionExitActions apiBaseUrl={apiBaseUrl} />
      </div>
    </aside>
  );
}
