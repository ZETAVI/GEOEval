"use client";

import { logout, type Account } from "@geoeval/api-client";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function AdminSidebar({ account }: { account: Account }) {
  return (
    <aside className="sidebar admin-sidebar">
      <a className="brand-mark inverse" href="/admin/media">
        <span aria-hidden="true">G</span>
        <strong>GEO 管理台</strong>
      </a>
      <div className="admin-area-label">内容与供给</div>
      <nav aria-label="管理员功能">
        <a className="side-link active" href="/admin/media" aria-current="page">
          <i>媒</i>
          <span>
            <b>媒体库管理</b>
            <small>平台、资源与供应商</small>
          </span>
        </a>
      </nav>
      <div className="admin-boundary-note">
        <b>职责说明</b>
        <p>管理员维护媒体平台、价格和资源；实际发布由运营人员负责。</p>
      </div>
      <div className="sidebar-account">
        <span>{account.mobile.slice(-4)}</span>
        <div>
          <b>系统管理员</b>
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
  );
}
