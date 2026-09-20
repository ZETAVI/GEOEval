import {
  ApiRequestError,
  type Account,
  type IdentityGovernanceAudit,
} from "@geoeval/api-client";
import { formatChinaDateTime } from "../../china-time.js";

export const accountRoleLabels: Record<Account["role"], string> = {
  TERMINAL_CUSTOMER: "终端客户",
  OPERATIONS: "运营人员",
  ADMINISTRATOR: "系统管理员",
  AGENT: "代理商",
};

export const accountStatusLabels: Record<Account["status"], string> = {
  ACTIVE: "启用",
  INACTIVE: "停用",
};

const governanceActionLabels: Record<string, string> = {
  BOOTSTRAP_ADMINISTRATOR: "初始化首位管理员",
  CREATE_INTERNAL_ACCOUNT: "创建内部账号",
  ACTIVATE_ACCOUNT: "启用账号",
  DEACTIVATE_ACCOUNT: "停用账号",
  CHANGE_INTERNAL_ROLE: "变更内部角色",
  REVOKE_ACCOUNT_SESSIONS: "回收全部会话",
};

export function governanceActionLabel(action: string): string {
  return governanceActionLabels[action] ?? action;
}

export function accountTimestamp(
  value: string | null | undefined,
  emptyLabel = "—",
): string {
  if (!value) return emptyLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return emptyLabel;
  return formatChinaDateTime(date, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  });
}

export function shortAccountId(accountId: string): string {
  return accountId.length <= 12
    ? accountId
    : `${accountId.slice(0, 8)}…${accountId.slice(-4)}`;
}

export function auditActorLabel(audit: IdentityGovernanceAudit): string {
  if (audit.actorKind === "BOOTSTRAP") {
    return audit.actorKeyId ? `Bootstrap · ${audit.actorKeyId}` : "Bootstrap";
  }
  return audit.actorAccountId
    ? `管理员 · ${shortAccountId(audit.actorAccountId)}`
    : "管理员";
}

export type GovernanceErrorView = {
  code?: string;
  title: string;
  message: string;
  refreshRequired: boolean;
};

export function governanceErrorView(error: unknown): GovernanceErrorView {
  if (!(error instanceof ApiRequestError)) {
    return {
      title: "操作没有完成",
      message: error instanceof Error ? error.message : "请稍后重试",
      refreshRequired: false,
    };
  }
  const common = {
    ...(error.code ? { code: error.code } : {}),
    message: error.message,
  };
  if (
    error.code === "STALE_REVISION" ||
    error.code === "CONCURRENT_GOVERNANCE_CONFLICT"
  ) {
    return {
      ...common,
      title: "账号已经发生变化",
      refreshRequired: true,
    };
  }
  if (error.code === "SELF_GOVERNANCE_FORBIDDEN") {
    return {
      ...common,
      title: "不能管理当前管理员账号",
      refreshRequired: false,
    };
  }
  if (error.code === "LAST_ADMINISTRATOR_FORBIDDEN") {
    return {
      ...common,
      title: "必须保留一名有效管理员",
      refreshRequired: false,
    };
  }
  if (error.code === "ROLE_FAMILY_CONVERSION_FORBIDDEN") {
    return {
      ...common,
      title: "角色族不可转换",
      refreshRequired: false,
    };
  }
  if (error.code === "ACCOUNT_ALREADY_EXISTS") {
    return {
      ...common,
      title: "手机号已经存在账号",
      refreshRequired: false,
    };
  }
  if (error.code === "NO_CHANGE") {
    return {
      ...common,
      title: "没有可提交的变化",
      refreshRequired: true,
    };
  }
  return {
    ...common,
    title: error.status === 403 ? "当前操作不被允许" : "操作没有完成",
    refreshRequired: false,
  };
}
