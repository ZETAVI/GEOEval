"use client";

import type { Account } from "@geoeval/api-client";
import { CustomerNotificationCenter } from "./customer-notification-center.js";
import { SessionExitActions } from "./session-exit-actions.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

const navigation = [
  ["我的品牌", "品牌资料与概览", "/brands"],
  ["AI 搜索诊断", "五平台免费评测", "/diagnosis"],
  ["AI 搜索优化", "生成优化文章", "/optimization"],
  ["发布方案", "套餐与媒体选择", "/publishing"],
  ["发布管理", "查看购买订单", "/orders"],
  ["账户中心", "积分与流水", "/account"],
  ["联系客服", "问题与处理结果", "/support"],
] as const;

export function CustomerSidebar({
  account,
  activePath,
}: {
  account: Account | undefined;
  activePath:
    | "/brands"
    | "/diagnosis"
    | "/optimization"
    | "/publishing"
    | "/orders"
    | "/account"
    | "/support";
}) {
  return (
    <aside className="sidebar">
      <a className="brand-mark inverse" href="/">
        <span aria-hidden="true">G</span>
        <strong>GEO 优化</strong>
      </a>
      <nav aria-label="平台功能">
        {navigation.map(([name, description, href], index) => {
          const active = href === activePath;
          return href ? (
            <a
              key={name}
              className={active ? "side-link active" : "side-link"}
              href={href}
              aria-current={active ? "page" : undefined}
            >
              <i>{index + 1}</i>
              <span>
                <b>{name}</b>
                <small>{description}</small>
              </span>
            </a>
          ) : (
            <span key={name} className="side-link unavailable">
              <i>{index + 1}</i>
              <span>
                <b>{name}</b>
                <small>{description}</small>
              </span>
              <em>即将接入</em>
            </span>
          );
        })}
      </nav>
      <CustomerNotificationCenter accountId={account?.id} />
      <div className="sidebar-account">
        <span>{account?.mobile.slice(-4) ?? "用户"}</span>
        <div>
          <b>终端客户</b>
          <small>{account?.mobile}</small>
        </div>
        <SessionExitActions apiBaseUrl={apiBaseUrl} />
      </div>
    </aside>
  );
}
