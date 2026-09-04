"use client";

import {
  ApiRequestError,
  getCurrentAccount,
  listAdminAccounts,
  listIdentityGovernanceAudits,
  type Account,
  type AccountList,
  type AccountSummary,
  type IdentityGovernanceAuditList,
} from "@geoeval/api-client";
import { useEffect, useRef, useState } from "react";

import { roleHomePath } from "../../enter/post-login-route.js";
import { AdminSidebar } from "../admin-sidebar.js";
import {
  accountRoleLabels,
  accountStatusLabels,
  accountTimestamp,
  auditActorLabel,
  governanceActionLabel,
  shortAccountId,
} from "./account-ui.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
const accountPageSize = 20;
const auditPageSize = 20;

type AuthenticationState = "loading" | "ready" | "denied" | "error";
type DataState = "loading" | "ready" | "error";
type AccountFilters = {
  search: string;
  role: "" | Account["role"];
  status: "" | Account["status"];
};

const emptyFilters: AccountFilters = { search: "", role: "", status: "" };
const emptyAccountPage: AccountList = { items: [], nextCursor: null };
const emptyAuditPage: IdentityGovernanceAuditList = {
  items: [],
  nextCursor: null,
};

export function AdminAccountsWorkspace() {
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
  const accountRequest = useRef(0);
  const auditRequest = useRef(0);

  async function authenticate() {
    setAuthenticationState("loading");
    setAuthenticationError("");
    try {
      const current = await getCurrentAccount(apiBaseUrl);
      setAccount(current);
      if (current.role !== "ADMINISTRATOR") {
        setAuthenticationState("denied");
        return;
      }
      setAuthenticationState("ready");
      await loadAccountPage(emptyFilters);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        window.location.assign("/enter");
        return;
      }
      setAuthenticationError(
        error instanceof Error ? error.message : "管理员身份暂时无法核验",
      );
      setAuthenticationState("error");
    }
  }

  async function loadAccountPage(filters: AccountFilters, cursor?: string) {
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
      const firstAccount = result.items[0];
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
      if (error instanceof ApiRequestError && error.status === 401) {
        window.location.assign("/enter");
        return;
      }
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
      if (error instanceof ApiRequestError && error.status === 401) {
        window.location.assign("/enter");
        return;
      }
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

  if (authenticationState === "loading") {
    return (
      <main className="loading-page admin-loading-page">
        <span className="loading-orbit" />
        <div>
          <b>正在核验管理员身份</b>
          <small>通过后再读取账号与治理记录</small>
        </div>
      </main>
    );
  }

  if (authenticationState === "denied" && account) {
    return (
      <main className="admin-denied-page">
        <section>
          <span className="denied-mark" aria-hidden="true">
            403
          </span>
          <p className="eyebrow">权限边界</p>
          <h1>该账号不能进入账号与访问管理</h1>
          <p>
            当前账号是「{accountRoleLabels[account.role]}
            」，账号治理与审计只向系统管理员开放。
          </p>
          <a className="primary-button" href={roleHomePath(account.role)}>
            返回我的工作区
          </a>
        </section>
      </main>
    );
  }

  if (authenticationState === "error") {
    return (
      <main className="admin-error-page">
        <section>
          <p className="eyebrow">暂时无法进入管理台</p>
          <h1>管理员身份没有核验完成</h1>
          <p>{authenticationError}</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => void authenticate()}
          >
            重新加载
          </button>
        </section>
      </main>
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
            <p>查看账号、固定角色、状态、活跃会话与留存的治理记录。</p>
          </div>
          <span className="read-only-pill">只读视图</span>
        </header>

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
                <aside className="account-read-boundary">
                  <b>当前仅开放查看</b>
                  <p>
                    创建账号、角色或状态变更、全部会话回收将在独立检查点加入原因、确认和并发冲突处理。
                  </p>
                </aside>
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
    </div>
  );
}
