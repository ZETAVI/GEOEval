"use client";

import {
  ApiRequestError,
  getCurrentAccount,
  logout,
  type Account,
} from "@geoeval/api-client";

import { roleHomePath } from "./enter/post-login-route.js";

export type SessionAccessFailureKind =
  "unauthenticated" | "inactive" | "revoked" | "expired";

export type RoleSessionState =
  | { kind: "loading" }
  | { kind: "ready"; account: Account }
  | { kind: "denied"; account: Account }
  | { kind: SessionAccessFailureKind }
  | { kind: "error"; message: string };

export const accountRoleLabels: Record<Account["role"], string> = {
  TERMINAL_CUSTOMER: "终端客户",
  OPERATIONS: "运营人员",
  ADMINISTRATOR: "系统管理员",
  AGENT: "代理商",
};

const sessionFailureContent: Record<
  SessionAccessFailureKind,
  { eyebrow: string; title: string; description: string; mark: string }
> = {
  unauthenticated: {
    eyebrow: "需要登录",
    title: "当前浏览器还没有有效登录",
    description: "请完成手机号验证后，再进入你的固定角色工作区。",
    mark: "401",
  },
  inactive: {
    eyebrow: "账号不可用",
    title: "当前账号已停用",
    description:
      "系统已经停止该账号的访问。请联系管理员确认账号状态，或使用其他账号登录。",
    mark: "停用",
  },
  revoked: {
    eyebrow: "会话已撤销",
    title: "这次登录已经结束",
    description:
      "账号治理、角色调整或退出全部设备都可能结束旧会话。请重新验证手机号。",
    mark: "撤销",
  },
  expired: {
    eyebrow: "会话已过期",
    title: "为了账号安全，请重新登录",
    description:
      "本次登录已超过允许的空闲时间或最长使用时间，重新验证后即可继续。",
    mark: "过期",
  },
};

export async function loadRoleSession(
  apiBaseUrl: string,
  expectedRole: Account["role"],
): Promise<RoleSessionState> {
  try {
    const account = await getCurrentAccount(apiBaseUrl);
    return account.role === expectedRole
      ? { kind: "ready", account }
      : { kind: "denied", account };
  } catch (error) {
    return (
      sessionFailureState(error) ?? {
        kind: "error",
        message: error instanceof Error ? error.message : "身份暂时无法核验",
      }
    );
  }
}

export function sessionFailureState(
  error: unknown,
): Extract<RoleSessionState, { kind: SessionAccessFailureKind }> | undefined {
  if (!(error instanceof ApiRequestError) || error.status !== 401) {
    return undefined;
  }
  if (error.code === "ACCOUNT_INACTIVE") return { kind: "inactive" };
  if (error.code === "SESSION_REVOKED") return { kind: "revoked" };
  if (error.code === "SESSION_EXPIRED") return { kind: "expired" };
  return { kind: "unauthenticated" };
}

export function WorkspaceAccessPanel({
  state,
  expectedRole,
  workspaceName,
  loadingDetail,
  apiBaseUrl,
  onRetry,
}: {
  state: Exclude<RoleSessionState, { kind: "ready" }>;
  expectedRole: Account["role"];
  workspaceName: string;
  loadingDetail: string;
  apiBaseUrl: string;
  onRetry: () => void;
}) {
  if (state.kind === "loading") {
    return (
      <main className="loading-page admin-loading-page" role="status">
        <span className="loading-orbit" />
        <div>
          <b>正在核验{accountRoleLabels[expectedRole]}身份</b>
          <small>{loadingDetail}</small>
        </div>
      </main>
    );
  }

  if (state.kind === "denied") {
    return (
      <main className="admin-denied-page">
        <section>
          <span className="denied-mark" aria-hidden="true">
            403
          </span>
          <p className="eyebrow">固定角色边界</p>
          <h1>该账号不能进入{workspaceName}</h1>
          <p>
            当前账号是「{accountRoleLabels[state.account.role]}
            」，系统不会合并角色权限或提供角色切换。
          </p>
          <div>
            <a
              className="primary-button"
              href={roleHomePath(state.account.role)}
            >
              返回我的工作区
            </a>
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                void logout(apiBaseUrl).then(() =>
                  window.location.assign("/enter"),
                )
              }
            >
              退出并更换账号
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (state.kind !== "error") {
    const content = sessionFailureContent[state.kind];
    return (
      <main className="admin-denied-page session-interruption-page">
        <section>
          <span className="denied-mark session-state-mark" aria-hidden="true">
            {content.mark}
          </span>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
          <a className="primary-button" href="/enter">
            前往登录
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-error-page">
      <section>
        <p className="eyebrow">暂时无法进入工作区</p>
        <h1>{workspaceName}没有加载完成</h1>
        <p>{state.message}</p>
        <button className="primary-button" type="button" onClick={onRetry}>
          重新加载
        </button>
      </section>
    </main>
  );
}
