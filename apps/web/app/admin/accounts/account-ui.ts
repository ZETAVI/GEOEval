import type { Account, IdentityGovernanceAudit } from "@geoeval/api-client";

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
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(date);
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
