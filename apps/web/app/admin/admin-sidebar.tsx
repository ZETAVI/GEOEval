"use client";

import type { Account } from "@geoeval/api-client";

import { SessionExitActions } from "../session-exit-actions.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

type AdminSection = "overview" | "accounts" | "media" | "publishing";

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
