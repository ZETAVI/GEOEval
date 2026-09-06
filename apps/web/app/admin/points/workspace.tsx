"use client";
import {
  adjustGrantedPoints,
  getAdminPointBalance,
  getAdminPointHistory,
  listAdminAccounts,
  type AccountList,
  type PointAdminBalance,
  type PointAdminHistory,
} from "@geoeval/api-client";
import { useEffect, useRef, useState } from "react";
import { AdminSidebar } from "../admin-sidebar.js";
import { PointHistoryList } from "../../points/point-history.js";
import {
  loadRoleSession,
  sessionFailureState,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../../session-access.js";
import {
  adjustmentRequest,
  adjustmentForm,
  decodePending,
  emptyAdjustmentForm,
  isDefinitiveRejection,
  pendingStorageKey,
  type AdjustmentForm,
  type PendingAdjustment,
} from "./pending-adjustment.js";
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function AdminPointsWorkspace() {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [accounts, setAccounts] = useState<AccountList>({
    items: [],
    nextCursor: null,
  });
  const [search, setSearch] = useState("");
  const [wallet, setWallet] = useState<PointAdminBalance>();
  const [history, setHistory] = useState<PointAdminHistory>({
    items: [],
    nextBeforeSequence: null,
  });
  const [form, setForm] = useState<AdjustmentForm>({ ...emptyAdjustmentForm });
  const [pending, setPending] = useState<PendingAdjustment | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const actionLock = useRef(false);
  function failure(error: unknown) {
    const access = sessionFailureState(error);
    if (access) setSession(access);
    setError(error instanceof Error ? error.message : "操作失败");
  }
  async function readWallet(accountId: string) {
    const [balance, history] = await Promise.all([
      getAdminPointBalance(apiBaseUrl, accountId),
      getAdminPointHistory(apiBaseUrl, accountId),
    ]);
    setWallet(balance);
    setHistory(history);
  }
  async function bootstrap() {
    setSession({ kind: "loading" });
    const next = await loadRoleSession(apiBaseUrl, "ADMINISTRATOR");
    if (next.kind !== "ready") {
      setSession(next);
      return;
    }
    try {
      const prior = decodePending(
        sessionStorage.getItem(pendingStorageKey(next.account.id)),
        next.account.id,
      );
      setAccounts(
        await listAdminAccounts(apiBaseUrl, {
          role: "TERMINAL_CUSTOMER",
          limit: 20,
        }),
      );
      if (prior) {
        setPending(prior);
        setForm(adjustmentForm(prior.request));
        await readWallet(prior.accountId);
        setNotice("已恢复上次未确认的调整，只能核对或重试同一次请求。");
      }
      setSession(next);
    } catch (error) {
      setSession(
        sessionFailureState(error) ?? {
          kind: "error",
          message:
            error instanceof Error ? error.message : "积分工作区加载失败",
        },
      );
    }
  }
  useEffect(() => {
    void bootstrap();
  }, []);
  const dirty = JSON.stringify(form) !== JSON.stringify(emptyAdjustmentForm);
  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  async function choose(accountId: string) {
    if (actionLock.current || pending) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setWallet(undefined);
    try {
      await readWallet(accountId);
      setForm({ ...emptyAdjustmentForm });
    } catch (error) {
      failure(error);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  async function findAccounts(cursor?: string) {
    if (actionLock.current || pending) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await listAdminAccounts(apiBaseUrl, {
        role: "TERMINAL_CUSTOMER",
        search,
        limit: 20,
        ...(cursor ? { cursor } : {}),
      });
      setAccounts(
        cursor
          ? {
              items: [...accounts.items, ...result.items],
              nextCursor: result.nextCursor ?? null,
            }
          : result,
      );
    } catch (error) {
      failure(error);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  async function moreHistory() {
    if (actionLock.current || !wallet || !history.nextBeforeSequence) return;
    actionLock.current = true;
    setBusy(true);
    try {
      const more = await getAdminPointHistory(
        apiBaseUrl,
        wallet.customer.id,
        history.nextBeforeSequence,
      );
      setHistory({
        items: [...history.items, ...more.items],
        nextBeforeSequence: more.nextBeforeSequence,
      });
    } catch (error) {
      failure(error);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  async function submit() {
    if (actionLock.current || session.kind !== "ready" || !wallet) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    let intent = pending;
    let persisted = !!pending;
    try {
      if (!intent) {
        intent = {
          actorAccountId: session.account.id,
          accountId: wallet.customer.id,
          request: adjustmentRequest(form, crypto.randomUUID()),
        };
        // Persist before sending so a reload cannot turn an uncertain write into a new grant.
        sessionStorage.setItem(
          pendingStorageKey(session.account.id),
          JSON.stringify(intent),
        );
        persisted = true;
        setPending(intent);
      }
      const result = await adjustGrantedPoints(
        apiBaseUrl,
        intent.accountId,
        intent.request,
      );
      sessionStorage.removeItem(pendingStorageKey(session.account.id));
      setPending(null);
      setForm({ ...emptyAdjustmentForm });
      setNotice(
        `已核对流水 ${result.sequence}：${result.amount > 0 ? "+" : ""}${result.amount} 积分；重复请求不会再次记账。`,
      );
      setWallet(undefined);
      try {
        await readWallet(intent.accountId);
      } catch (error) {
        failure(error);
        setNotice(`流水 ${result.sequence} 已记账，请重新加载以读取当前余额。`);
      }
    } catch (error) {
      if (intent && isDefinitiveRejection(error)) {
        try {
          sessionStorage.removeItem(pendingStorageKey(session.account.id));
          setPending(null);
        } catch {
          setNotice("无法清理重试凭据，请继续核对同一次操作。");
        }
      } else if (intent && persisted) {
        setNotice(
          "提交结果尚未确认。请保留这次操作，通过下方按钮核对或重试；不要另行赠送。",
        );
      } else if (intent) {
        setNotice(
          "浏览器无法保留重试凭据，本次没有提交积分调整。请允许会话存储后重试。",
        );
      }
      failure(error);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  if (session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={session}
        expectedRole="ADMINISTRATOR"
        workspaceName="积分管理"
        loadingDetail="读取终端客户目录与待核对调整"
        apiBaseUrl={apiBaseUrl}
        onRetry={() => void bootstrap()}
      />
    );

  return (
    <div className="app-shell">
      <AdminSidebar account={session.account} active="points" />
      <main className="workspace commerce-workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">管理员积分管理</p>
            <h1>客户积分</h1>
            <p>只调整赠送积分；每次操作保留原因、操作者和原始流水。</p>
          </div>
        </header>
        <div className="commerce-notice">
          本阶段不提供充值积分入账，不直接设置余额，不修改或删除历史流水。停用客户可查看，不接受新增调整。
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="commerce-notice" role="status">
            {notice}
          </p>
        )}
        <div className="points-admin-grid">
          <section className="commerce-editor point-account-picker">
            <h2>选择终端客户</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void findAccounts();
              }}
            >
              <label>
                手机号搜索
                <input
                  value={search}
                  disabled={busy || !!pending || dirty}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <button
                className="secondary-button"
                disabled={busy || !!pending || dirty}
              >
                搜索
              </button>
            </form>
            {!accounts.items.length && <p>没有匹配的终端客户。</p>}
            <ul>
              {accounts.items.map((item) => (
                <li key={item.id}>
                  <button
                    className={
                      wallet?.customer.id === item.id
                        ? "point-account-option selected"
                        : "point-account-option"
                    }
                    disabled={busy || !!pending || dirty}
                    onClick={() => void choose(item.id)}
                  >
                    <strong>{item.mobile}</strong>
                    <small>
                      {item.status === "ACTIVE" ? "正常" : "已停用"}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
            {accounts.nextCursor && (
              <button
                className="secondary-button"
                disabled={busy || !!pending || dirty}
                onClick={() => void findAccounts(accounts.nextCursor!)}
              >
                更多客户
              </button>
            )}
          </section>
          <section>
            {!wallet ? (
              <div className="commerce-empty">
                <h2>{busy ? "读取中…" : "选择客户后查看积分"}</h2>
                <p>积分归属于账号，不归属于单个品牌。</p>
              </div>
            ) : (
              <>
                <section className="point-balance">
                  <p>
                    {wallet.customer.mobile} ·{" "}
                    {wallet.customer.status === "ACTIVE" ? "正常" : "已停用"}
                  </p>
                  <strong>{wallet.balance.toLocaleString()}</strong>
                  <span>积分</span>
                  <p>
                    赠送 {wallet.grantedBalance.toLocaleString()} / 充值{" "}
                    {wallet.fundedBalance.toLocaleString()} · 账务序号{" "}
                    {wallet.revision}
                  </p>
                  <button
                    className="secondary-button"
                    disabled={busy || !!pending || dirty}
                    onClick={() => void choose(wallet.customer.id)}
                  >
                    刷新余额与流水
                  </button>
                </section>
                {pending ? (
                  <section className="commerce-editor">
                    <h2>待核对的同一次调整</h2>
                    <p>目标客户：{wallet.customer.mobile}</p>
                    <p>
                      {pending.request.amount > 0 ? "增加" : "扣减"}赠送积分{" "}
                      {Math.abs(pending.request.amount).toLocaleString()}
                    </p>
                    <p>客户可见原因：{pending.request.reason}</p>
                    <button
                      className="primary-button"
                      disabled={busy}
                      onClick={() => void submit()}
                    >
                      {busy ? "核对中…" : "核对或重试同一次调整"}
                    </button>
                  </section>
                ) : (
                  <section className="commerce-editor">
                    <h2>调整赠送积分</h2>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submit();
                      }}
                    >
                      <fieldset
                        className="commerce-form-grid"
                        disabled={busy || wallet.customer.status !== "ACTIVE"}
                      >
                        <label>
                          调整方向
                          <select
                            value={form.direction}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                direction: e.target
                                  .value as AdjustmentForm["direction"],
                              })
                            }
                          >
                            <option value="ADD">增加赠送积分</option>
                            <option value="DEDUCT">扣减赠送积分</option>
                          </select>
                        </label>
                        <label>
                          积分数量
                          <input
                            required
                            inputMode="numeric"
                            pattern="[0-9]+"
                            value={form.amount}
                            onChange={(e) =>
                              setForm({ ...form, amount: e.target.value })
                            }
                          />
                        </label>
                        <label className="wide">
                          客户可见原因
                          <input
                            required
                            maxLength={160}
                            value={form.reason}
                            onChange={(e) =>
                              setForm({ ...form, reason: e.target.value })
                            }
                          />
                        </label>
                        <label className="wide">
                          内部备注（选填，不向客户展示）
                          <textarea
                            maxLength={320}
                            value={form.internalNote}
                            onChange={(e) =>
                              setForm({ ...form, internalNote: e.target.value })
                            }
                          />
                        </label>
                        <label className="wide">
                          业务关联（选填）
                          <input
                            maxLength={160}
                            value={form.businessReference}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                businessReference: e.target.value,
                              })
                            }
                          />
                        </label>
                      </fieldset>
                      <p>
                        确认后将向 {wallet.customer.mobile}{" "}
                        {form.direction === "ADD" ? "增加" : "扣减"}{" "}
                        {form.amount || "—"} 赠送积分。
                      </p>
                      <div className="commerce-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={busy || !dirty}
                          onClick={() => setForm({ ...emptyAdjustmentForm })}
                        >
                          放弃未提交修改
                        </button>
                        <button
                          className="primary-button"
                          disabled={
                            busy ||
                            !dirty ||
                            wallet.customer.status !== "ACTIVE"
                          }
                        >
                          确认积分调整
                        </button>
                      </div>
                    </form>
                  </section>
                )}
                <section>
                  <h2>客户积分流水</h2>
                  <PointHistoryList items={history.items} showInternal />
                  {history.nextBeforeSequence && (
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => void moreHistory()}
                    >
                      加载更早记录
                    </button>
                  )}
                </section>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
