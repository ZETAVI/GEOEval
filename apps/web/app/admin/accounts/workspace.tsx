"use client";

import {
  ApiRequestError,
  changeAdminAccountRole,
  changeAdminAccountStatus,
  createAdminInternalAccount,
  listAdminAccounts,
  listIdentityGovernanceAudits,
  revokeAdminAccountSessions,
  type Account,
  type AccountList,
  type AccountSummary,
  type IdentityGovernanceAuditList,
} from "@geoeval/api-client";
import { useEffect, useRef, useState } from "react";

import {
  loadRoleSession,
  type RoleSessionState,
  sessionFailureState,
  WorkspaceAccessPanel,
} from "../../session-access.js";
import { AgencyLinkCard } from "../../acquisition/link-card.js";
import { AdminSidebar } from "../admin-sidebar.js";
import {
  accountRoleLabels,
  accountStatusLabels,
  accountTimestamp,
  auditActorLabel,
  governanceActionLabel,
  governanceErrorView,
  shortAccountId,
  type GovernanceErrorView,
} from "./account-ui.js";
import {
  CreateInternalAccountDialog,
  GovernanceActionDialog,
  type DangerousGovernanceAction,
  type InternalAccountRole,
} from "./governance-dialog.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
const accountPageSize = 20;
const auditPageSize = 20;

type AuthenticationState = RoleSessionState["kind"];
type DataState = "loading" | "ready" | "error";
type AccountFilters = {
  search: string;
  role: "" | Account["role"];
  status: "" | Account["status"];
};
type AccountDialog = { kind: "create" } | DangerousGovernanceAction;

const emptyFilters: AccountFilters = { search: "", role: "", status: "" };
const emptyAccountPage: AccountList = { items: [], nextCursor: null };
const emptyAuditPage: IdentityGovernanceAuditList = {
  items: [],
  nextCursor: null,
};

export function AdminAccountsWorkspace({
  acquisitionEnabled = false,
}: {
  acquisitionEnabled?: boolean;
}) {
  const [authenticationState, setAuthenticationState] =
    useState<AuthenticationState>("loading");
  const [account, setAccount] = useState<Account>();
  const [authenticationError, setAuthenticationError] = useState("");
  const [draftFilters, setDraftFilters] =
    useState<AccountFilters>(emptyFilters);
  const [activeFilters, setActiveFilters] =
    useState<AccountFilters>(emptyFilters);
  const [accountState, setAccountState] = useState<DataState>("loading");
  const [accountError, setAccountError] = useState("");
  const [accountPage, setAccountPage] = useState<AccountList>(emptyAccountPage);
  const [currentCursor, setCurrentCursor] = useState<string>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>(
    [],
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [auditState, setAuditState] = useState<DataState>("loading");
  const [auditError, setAuditError] = useState("");
  const [auditPage, setAuditPage] =
    useState<IdentityGovernanceAuditList>(emptyAuditPage);
  const [dialog, setDialog] = useState<AccountDialog>();
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationError, setMutationError] = useState<GovernanceErrorView>();
  const [toast, setToast] = useState("");
  const accountRequest = useRef(0);
  const auditRequest = useRef(0);

  async function authenticate() {
    setAuthenticationState("loading");
    setAuthenticationError("");
    const session = await loadRoleSession(apiBaseUrl, "ADMINISTRATOR");
    if (session.kind === "ready" || session.kind === "denied") {
      setAccount(session.account);
    }
    if (session.kind === "error") {
      setAuthenticationError(session.message);
    }
    setAuthenticationState(session.kind);
    if (session.kind === "ready") {
      await loadAccountPage(emptyFilters);
    }
  }

  function handleSessionFailure(error: unknown): boolean {
    const failure = sessionFailureState(error);
    if (failure) {
      setAuthenticationState(failure.kind);
      return true;
    }
    return false;
  }

  async function loadAccountPage(
    filters: AccountFilters,
    cursor?: string,
    preferredAccountId?: string,
  ) {
    const requestId = ++accountRequest.current;
    ++auditRequest.current;
    setAccountState("loading");
    setAccountError("");
    setSelectedAccountId(undefined);
    setAuditPage(emptyAuditPage);
    setAuditState("loading");
    try {
      const result = await listAdminAccounts(apiBaseUrl, {
        ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
        ...(filters.role ? { role: filters.role } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(cursor ? { cursor } : {}),
        limit: accountPageSize,
      });
      if (requestId !== accountRequest.current) return;
      setAccountPage(result);
      setAccountState("ready");
      const firstAccount =
        result.items.find((item) => item.id === preferredAccountId) ??
        result.items[0];
      setSelectedAccountId(firstAccount?.id);
      if (firstAccount) {
        await loadAudits(firstAccount.id);
      } else {
        ++auditRequest.current;
        setAuditPage(emptyAuditPage);
        setAuditState("ready");
      }
    } catch (error) {
      if (requestId !== accountRequest.current) return;
      if (handleSessionFailure(error)) return;
      if (error instanceof ApiRequestError && error.status === 403) {
        setAuthenticationState("denied");
        return;
      }
      setAccountError(
        error instanceof Error ? error.message : "账号列表暂时无法加载",
      );
      setAccountState("error");
    }
  }

  async function loadAudits(
    targetAccountId: string,
    cursor?: string,
    append = false,
  ) {
    const requestId = ++auditRequest.current;
    setAuditState("loading");
    setAuditError("");
    if (!append) setAuditPage(emptyAuditPage);
    try {
      const result = await listIdentityGovernanceAudits(apiBaseUrl, {
        targetAccountId,
        ...(cursor ? { cursor } : {}),
        limit: auditPageSize,
      });
      if (requestId !== auditRequest.current) return;
      setAuditPage((current) => ({
        items: append ? [...current.items, ...result.items] : result.items,
        nextCursor: result.nextCursor ?? null,
      }));
      setAuditState("ready");
    } catch (error) {
      if (requestId !== auditRequest.current) return;
      if (handleSessionFailure(error)) return;
      if (error instanceof ApiRequestError && error.status === 403) {
        setAuthenticationState("denied");
        return;
      }
      setAuditError(
        error instanceof Error ? error.message : "治理记录暂时无法加载",
      );
      setAuditState("error");
    }
  }

  useEffect(() => {
    void authenticate();
  }, []);

  function applyFilters() {
    setActiveFilters(draftFilters);
    setCurrentCursor(undefined);
    setCursorHistory([]);
    void loadAccountPage(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setCurrentCursor(undefined);
    setCursorHistory([]);
    void loadAccountPage(emptyFilters);
  }

  function nextPage() {
    if (!accountPage.nextCursor) return;
    setCursorHistory((current) => [...current, currentCursor]);
    setCurrentCursor(accountPage.nextCursor);
    void loadAccountPage(activeFilters, accountPage.nextCursor);
  }

  function previousPage() {
    if (!cursorHistory.length) return;
    const previousCursor = cursorHistory.at(-1);
    setCursorHistory((current) => current.slice(0, -1));
    setCurrentCursor(previousCursor);
    void loadAccountPage(activeFilters, previousCursor);
  }

  function selectAccount(item: AccountSummary) {
    if (item.id === selectedAccountId) return;
    setSelectedAccountId(item.id);
    void loadAudits(item.id);
  }

  function openDialog(next: AccountDialog) {
    setMutationError(undefined);
    setDialog(next);
  }

  function closeDialog() {
    if (mutationBusy) return;
    setMutationError(undefined);
    setDialog(undefined);
  }

  function refreshDialogTarget() {
    if (mutationBusy) return;
    const preferredAccountId =
      dialog && dialog.kind !== "create" ? dialog.target.id : undefined;
    setMutationError(undefined);
    setDialog(undefined);
    void loadAccountPage(activeFilters, currentCursor, preferredAccountId);
  }

  async function createInternalAccount(input: {
    mobile: string;
    role: InternalAccountRole;
    reason: string;
  }) {
    setMutationBusy(true);
    setMutationError(undefined);
    try {
      const created = await createAdminInternalAccount(apiBaseUrl, input);
      setDialog(undefined);
      setToast(
        `已创建${accountRoleLabels[created.role]}账号 ${created.mobile}`,
      );
      setDraftFilters(emptyFilters);
      setActiveFilters(emptyFilters);
      setCurrentCursor(undefined);
      setCursorHistory([]);
      await loadAccountPage(emptyFilters, undefined, created.id);
    } catch (error) {
      if (handleSessionFailure(error)) return;
      setMutationError(governanceErrorView(error));
    } finally {
      setMutationBusy(false);
    }
  }

  async function executeGovernanceAction(input: {
    reason: string;
    role?: InternalAccountRole;
  }) {
    if (!dialog || dialog.kind === "create") return;
    const action = dialog;
    setMutationBusy(true);
    setMutationError(undefined);
    try {
      const updated =
        action.kind === "status"
          ? await changeAdminAccountStatus(apiBaseUrl, action.target.id, {
              expectedRevision: action.target.revision,
              reason: input.reason,
              status: action.nextStatus,
            })
          : action.kind === "sessions"
            ? await revokeAdminAccountSessions(apiBaseUrl, action.target.id, {
                expectedRevision: action.target.revision,
                reason: input.reason,
              })
            : await changeAdminAccountRole(apiBaseUrl, action.target.id, {
                expectedRevision: action.target.revision,
                reason: input.reason,
                role: requiredRole(input.role),
              });
      setDialog(undefined);
      setToast(governanceSuccessMessage(action, updated));
      await loadAccountPage(activeFilters, currentCursor, action.target.id);
    } catch (error) {
      if (handleSessionFailure(error)) return;
      setMutationError(governanceErrorView(error));
    } finally {
      setMutationBusy(false);
    }
  }

  if (authenticationState !== "ready") {
    const accessState: Exclude<RoleSessionState, { kind: "ready" }> =
      authenticationState === "denied" && account
        ? { kind: "denied", account }
        : authenticationState === "error"
          ? { kind: "error", message: authenticationError }
          : authenticationState === "denied"
            ? { kind: "error", message: "当前账号角色暂时无法读取" }
            : { kind: authenticationState };
    return (
      <WorkspaceAccessPanel
        state={accessState}
        expectedRole="ADMINISTRATOR"
        workspaceName="账号与访问管理"
        loadingDetail="通过后再读取账号与治理记录"
        apiBaseUrl={apiBaseUrl}
        onRetry={() => void authenticate()}
      />
    );
  }

  if (!account) return null;
  const selectedAccount = accountPage.items.find(
    (item) => item.id === selectedAccountId,
  );

  return (
    <div className="app-shell admin-app-shell">
      <AdminSidebar account={account} active="accounts" />
      <main className="admin-account-workspace">
        <header className="workspace-header admin-account-header">
          <div>
            <p className="eyebrow">身份与访问</p>
            <h1>账号管理</h1>
            <p>查看账号与治理记录，并在明确确认后执行身份管理操作。</p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => openDialog({ kind: "create" })}
          >
            创建内部账号
          </button>
        </header>

        {toast && (
          <div className="governance-toast" role="status">
            <span>{toast}</span>
            <button type="button" onClick={() => setToast("")}>
              关闭
            </button>
          </div>
        )}

        <form
          className="account-filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
        >
          <label>
            <span>搜索手机号</span>
            <input
              value={draftFilters.search}
              placeholder="输入完整或部分手机号"
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>固定角色</span>
            <select
              value={draftFilters.role}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  role: event.target.value as AccountFilters["role"],
                }))
              }
            >
              <option value="">全部角色</option>
              {Object.entries(accountRoleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>账号状态</span>
            <select
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  status: event.target.value as AccountFilters["status"],
                }))
              }
            >
              <option value="">全部状态</option>
              {Object.entries(accountStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit">
            查询
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={resetFilters}
          >
            重置
          </button>
        </form>

        <section className="account-read-layout">
          <div className="account-list-panel">
            <header>
              <div>
                <p className="step-label">账号目录</p>
                <h2>当前查询结果</h2>
              </div>
              {accountState === "ready" && (
                <span>本页 {accountPage.items.length} 个</span>
              )}
            </header>
            {accountState === "loading" && (
              <div className="account-panel-state">正在读取账号…</div>
            )}
            {accountState === "error" && (
              <div className="account-panel-state error">
                <p>{accountError}</p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    void loadAccountPage(activeFilters, currentCursor)
                  }
                >
                  重试
                </button>
              </div>
            )}
            {accountState === "ready" && accountPage.items.length === 0 && (
              <div className="account-panel-state">
                当前筛选条件下没有账号。
              </div>
            )}
            {accountState === "ready" && accountPage.items.length > 0 && (
              <div className="account-result-list">
                {accountPage.items.map((item) => (
                  <button
                    key={item.id}
                    className={
                      item.id === selectedAccountId
                        ? "account-result active"
                        : "account-result"
                    }
                    type="button"
                    aria-pressed={item.id === selectedAccountId}
                    onClick={() => selectAccount(item)}
                  >
                    <span className="account-role-mark">
                      {accountRoleLabels[item.role].slice(0, 1)}
                    </span>
                    <span>
                      <b>{item.mobile}</b>
                      <small>
                        {accountRoleLabels[item.role]} · 修订 {item.revision}
                      </small>
                    </span>
                    <span
                      className={`account-status ${item.status.toLowerCase()}`}
                    >
                      {accountStatusLabels[item.status]}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <footer className="account-pagination">
              <button
                className="secondary-button"
                type="button"
                disabled={!cursorHistory.length || accountState !== "ready"}
                onClick={previousPage}
              >
                上一页
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={!accountPage.nextCursor || accountState !== "ready"}
                onClick={nextPage}
              >
                下一页
              </button>
            </footer>
          </div>

          <div className="account-detail-panel">
            {!selectedAccount && (
              <div className="account-detail-empty">
                <p className="eyebrow">账号详情</p>
                <h2>选择一个账号查看身份事实与治理记录</h2>
              </div>
            )}
            {selectedAccount && (
              <>
                <header className="account-detail-header">
                  <div>
                    <p className="step-label">账号详情</p>
                    <h2>{selectedAccount.mobile}</h2>
                    <small>{shortAccountId(selectedAccount.id)}</small>
                  </div>
                  <div className="account-detail-badges">
                    <span>{accountRoleLabels[selectedAccount.role]}</span>
                    <span className={selectedAccount.status.toLowerCase()}>
                      {accountStatusLabels[selectedAccount.status]}
                    </span>
                  </div>
                </header>
                <dl className="account-fact-grid">
                  <div>
                    <dt>活跃会话</dt>
                    <dd>{selectedAccount.activeSessionCount}</dd>
                  </div>
                  <div>
                    <dt>当前修订</dt>
                    <dd>{selectedAccount.revision}</dd>
                  </div>
                  <div>
                    <dt>最近登录</dt>
                    <dd>
                      {accountTimestamp(
                        selectedAccount.lastAuthenticatedAt,
                        "从未登录",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>创建时间</dt>
                    <dd>{accountTimestamp(selectedAccount.createdAt)}</dd>
                  </div>
                </dl>
                {acquisitionEnabled &&
                  selectedAccount?.role === "AGENT" &&
                  selectedAccount.status === "ACTIVE" && (
                    <AgencyLinkCard
                      key={selectedAccount.id}
                      agentAccountId={selectedAccount.id}
                    />
                  )}
                <section className="account-governance-panel">
                  <header>
                    <div>
                      <p className="step-label">账号治理</p>
                      <h3>管理固定身份与会话</h3>
                    </div>
                    <span>所有成功操作都会进入审计</span>
                  </header>
                  {selectedAccount.id === account.id ? (
                    <div className="self-governance-notice">
                      <b>当前管理员不能治理自身账号</b>
                      <p>
                        请使用普通退出功能管理自己的会话；角色、状态或管理性会话回收必须由另一名有效管理员执行。
                      </p>
                    </div>
                  ) : (
                    <>
                      {selectedAccount.role === "TERMINAL_CUSTOMER" && (
                        <p className="role-family-notice">
                          客户账号与内部账号之间不能转换角色；手机号错误时应停用旧账号并创建新的独立身份。
                        </p>
                      )}
                      <div className="governance-action-grid">
                        {selectedAccount.role !== "TERMINAL_CUSTOMER" && (
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() =>
                              openDialog({
                                kind: "role",
                                target: selectedAccount,
                              })
                            }
                          >
                            变更内部角色
                          </button>
                        )}
                        <button
                          className={
                            selectedAccount.status === "ACTIVE"
                              ? "danger-button"
                              : "secondary-button"
                          }
                          type="button"
                          onClick={() =>
                            openDialog({
                              kind: "status",
                              target: selectedAccount,
                              nextStatus:
                                selectedAccount.status === "ACTIVE"
                                  ? "INACTIVE"
                                  : "ACTIVE",
                            })
                          }
                        >
                          {selectedAccount.status === "ACTIVE"
                            ? "停用账号"
                            : "启用账号"}
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={selectedAccount.activeSessionCount === 0}
                          title={
                            selectedAccount.activeSessionCount === 0
                              ? "该账号当前没有活跃会话"
                              : undefined
                          }
                          onClick={() =>
                            openDialog({
                              kind: "sessions",
                              target: selectedAccount,
                            })
                          }
                        >
                          回收全部会话
                        </button>
                      </div>
                    </>
                  )}
                </section>
                <section className="identity-audit-panel">
                  <header>
                    <div>
                      <p className="step-label">身份治理审计</p>
                      <h3>操作记录</h3>
                    </div>
                    {auditState === "ready" && (
                      <span>{auditPage.items.length} 条已加载</span>
                    )}
                  </header>
                  {auditState === "loading" && auditPage.items.length === 0 && (
                    <div className="account-panel-state">正在读取治理记录…</div>
                  )}
                  {auditState === "error" && (
                    <div className="account-panel-state error">
                      <p>{auditError}</p>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => void loadAudits(selectedAccount.id)}
                      >
                        重试
                      </button>
                    </div>
                  )}
                  {auditState === "ready" && auditPage.items.length === 0 && (
                    <div className="account-panel-state">
                      该账号还没有身份治理记录。
                    </div>
                  )}
                  {auditPage.items.length > 0 && (
                    <ol className="identity-audit-list">
                      {auditPage.items.map((audit) => (
                        <li key={audit.id}>
                          <span className="audit-node" aria-hidden="true" />
                          <article>
                            <header>
                              <div>
                                <b>{governanceActionLabel(audit.action)}</b>
                                <small>{auditActorLabel(audit)}</small>
                              </div>
                              <time>{accountTimestamp(audit.createdAt)}</time>
                            </header>
                            <p>{audit.reason}</p>
                          </article>
                        </li>
                      ))}
                    </ol>
                  )}
                  {auditPage.nextCursor && auditState === "ready" && (
                    <button
                      className="secondary-button audit-more-button"
                      type="button"
                      onClick={() =>
                        void loadAudits(
                          selectedAccount.id,
                          auditPage.nextCursor ?? undefined,
                          true,
                        )
                      }
                    >
                      加载更多记录
                    </button>
                  )}
                </section>
              </>
            )}
          </div>
        </section>
      </main>
      {dialog?.kind === "create" && (
        <CreateInternalAccountDialog
          key="create-account"
          busy={mutationBusy}
          {...(mutationError ? { error: mutationError } : {})}
          onClose={closeDialog}
          onRefresh={refreshDialogTarget}
          onSubmit={(input) => void createInternalAccount(input)}
        />
      )}
      {dialog && dialog.kind !== "create" && (
        <GovernanceActionDialog
          key={`${dialog.kind}-${dialog.target.id}-${dialog.target.revision}`}
          action={dialog}
          busy={mutationBusy}
          {...(mutationError ? { error: mutationError } : {})}
          onClose={closeDialog}
          onRefresh={refreshDialogTarget}
          onSubmit={(input) => void executeGovernanceAction(input)}
        />
      )}
    </div>
  );
}

function requiredRole(
  role: InternalAccountRole | undefined,
): InternalAccountRole {
  if (role) return role;
  throw new Error("INTERNAL_ACCOUNT_ROLE_REQUIRED");
}

function governanceSuccessMessage(
  action: DangerousGovernanceAction,
  updated: Account,
): string {
  if (action.kind === "role") {
    return `已将 ${updated.mobile} 变更为${accountRoleLabels[updated.role]}，原有会话已回收`;
  }
  if (action.kind === "sessions") {
    return `已回收 ${updated.mobile} 的全部活跃会话`;
  }
  return updated.status === "ACTIVE"
    ? `已启用账号 ${updated.mobile}`
    : `已停用账号 ${updated.mobile}，原有会话已回收`;
}
