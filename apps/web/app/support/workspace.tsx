"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ApiRequestError,
  createSupportTicket,
  commandSupportTicket,
  getSupportTicket,
  listSupportTickets,
  type Account,
  type SupportPage,
  type SupportDetail,
  type SupportCommand,
} from "@geoeval/api-client";
import { CustomerSidebar } from "../customer-sidebar.js";
import { AdminSidebar } from "../admin/admin-sidebar.js";
import { SessionExitActions } from "../session-exit-actions.js";
import {
  loadRoleSession,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../session-access.js";
import styles from "./support.module.css";
const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
type Role = "TERMINAL_CUSTOMER" | "OPERATIONS" | "ADMINISTRATOR";
const home = (role: Role) =>
  role === "TERMINAL_CUSTOMER"
    ? "/support"
    : role === "OPERATIONS"
      ? "/operations/support"
      : "/admin/support";
const statusText = (status: string) =>
  status === "RESOLVED" ? "已处理" : "处理中";
const date = (value: string) =>
  new Date(value).toLocaleString("zh-CN", { hour12: false });
const message = (error: unknown) =>
  error instanceof Error ? error.message : "暂时无法完成，请重试";
export function SupportWorkspace({
  role,
  ticketId,
}: {
  role: Role;
  ticketId?: string | undefined;
}) {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [epoch, setEpoch] = useState(0);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    let alive = true;
    let generation = 0;
    const refresh = async () => {
      const current = ++generation;
      setChecking(true);
      const next = await loadRoleSession(base, role);
      if (alive && current === generation) {
        setSession(next);
        setChecking(false);
        setEpoch((x) => x + 1);
      }
    };
    const visibility = () => {
      if (document.visibilityState === "visible") void refresh();
      else {
        ++generation;
        setChecking(true);
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      alive = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [role]);
  if (session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={session}
        expectedRole={role}
        workspaceName="客服工单"
        loadingDetail="正在确认访问权限"
        apiBaseUrl={base}
        onRetry={() => window.location.reload()}
      />
    );
  const account = session.account;
  return (
    <>
      <div
        hidden={checking}
        style={checking ? { display: "none" } : undefined}
        className="app-shell admin-app-shell"
      >
        {role === "TERMINAL_CUSTOMER" ? (
          <CustomerSidebar account={account} activePath="/support" />
        ) : role === "ADMINISTRATOR" ? (
          <AdminSidebar account={account} active="support" />
        ) : (
          <aside className="sidebar admin-sidebar">
            <a className="brand-mark inverse" href="/operations">
              <span>G</span>
              <strong>GEO 优化</strong>
            </a>
            <nav aria-label="运营功能">
              <a className="side-link" href="/operations/orders">
                <i>单</i>
                <span>
                  <b>履约订单</b>
                  <small>订单与发布进度</small>
                </span>
              </a>
              <a
                className="side-link active"
                href="/operations/support"
                aria-current="page"
              >
                <i>客</i>
                <span>
                  <b>客服工单</b>
                  <small>问题与处理记录</small>
                </span>
              </a>
            </nav>
            <div className="sidebar-account">
              <span>{account.mobile.slice(-4)}</span>
              <div>
                <b>运营人员</b>
                <small>{account.mobile}</small>
              </div>
              <SessionExitActions apiBaseUrl={base} />
            </div>
          </aside>
        )}
        <main className={`workspace ${styles.workspace}`}>
          <header className={styles.header}>
            <div>
              <p className="eyebrow">
                {role === "TERMINAL_CUSTOMER" ? "联系客服" : "客服工单"}
              </p>
              <h1>
                {ticketId
                  ? "问题详情"
                  : role === "TERMINAL_CUSTOMER"
                    ? "有什么可以帮你？"
                    : "客服工作台"}
              </h1>
              <p>
                {role === "TERMINAL_CUSTOMER"
                  ? "提交问题，查看回复和处理结果。"
                  : "领取问题并跟进，在同一工单记录沟通结果。"}
              </p>
            </div>
            {ticketId && <a href={home(role)}>返回工单列表</a>}
          </header>
          <SupportContent
            key={`${account.id}:${ticketId ?? "list"}`}
            refreshEpoch={epoch}
            account={account}
            role={role}
            ticketId={ticketId}
          />
        </main>
      </div>
      {checking && <p role="status">正在重新确认访问权限…</p>}
    </>
  );
}
function SupportContent({
  account,
  role,
  ticketId,
  refreshEpoch,
}: {
  account: Account;
  role: Role;
  ticketId?: string | undefined;
  refreshEpoch: number;
}) {
  const [scope, setScope] = useState(
    role === "OPERATIONS" ? "pool" : role === "ADMINISTRATOR" ? "all" : "mine",
  );
  const [status, setStatus] = useState("");
  const [pageState, setPage] = useState<SupportPage>();
  const [detailState, setDetail] = useState<SupportDetail>();
  const [loadedEpoch, setLoadedEpoch] = useState(refreshEpoch);
  // Keep the draft, but never show a previous permission check's private data.
  const page = loadedEpoch === refreshEpoch ? pageState : undefined;
  const detail = loadedEpoch === refreshEpoch ? detailState : undefined;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recharge, setRecharge] = useState("");
  const [reply, setReply] = useState("");
  // Retain one identity for a retried unchanged submission; never generate a new key for a network retry.
  const pending = useRef<{ signature: string; requestId: string } | undefined>(
    undefined,
  );
  const mounted = useRef(true);
  const generation = useRef(0);
  const load = useCallback(
    async (before?: number, after?: number) => {
      const current = ++generation.current;
      setLoading(true);
      setError("");
      try {
        if (ticketId) {
          const result = await getSupportTicket(
            base,
            account.id,
            ticketId,
            after ?? 0,
          );
          if (mounted.current && current === generation.current) {
            setLoadedEpoch(refreshEpoch);
            setDetail((old) =>
              after && old
                ? { ...result, events: [...old.events, ...result.events] }
                : result,
            );
          }
        } else {
          const result = await listSupportTickets(base, account.id, {
            scope,
            status: status || undefined,
            before,
          });
          if (mounted.current && current === generation.current) {
            setLoadedEpoch(refreshEpoch);
            setPage((old) =>
              before && old
                ? { ...result, items: [...old.items, ...result.items] }
                : result,
            );
          }
        }
      } catch (e) {
        if (mounted.current && current === generation.current) {
          setError(message(e));
          setDetail(undefined);
          setPage(undefined);
        }
      } finally {
        if (mounted.current && current === generation.current)
          setLoading(false);
      }
    },
    [account.id, ticketId, scope, status, refreshEpoch],
  );
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      ++generation.current;
    };
  }, [load, refreshEpoch]);
  function keyFor(value: unknown) {
    const signature = JSON.stringify(value);
    if (pending.current?.signature !== signature)
      pending.current = { signature, requestId: crypto.randomUUID() };
    return pending.current!.requestId;
  }
  async function create(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const fields = {
      subject: subject.trim(),
      message: body.trim(),
      ...(recharge.trim() ? { rechargeOrderId: recharge.trim() } : {}),
    };
    try {
      const result = await createSupportTicket(base, account.id, {
        ...fields,
        requestId: keyFor(fields),
      });
      if (mounted.current) {
        pending.current = undefined;
        window.location.assign(`${home(role)}/${result.ticketId}`);
      }
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function action(
    id: string,
    revision: number,
    action: SupportCommand["action"],
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    const fields = {
      action,
      expectedRevision: revision,
      ...(action === "CLAIM" ? {} : { message: reply.trim() }),
    };
    try {
      const result = await commandSupportTicket(base, account.id, id, {
        ...fields,
        requestId: keyFor({ id, ...fields }),
      });
      if (!mounted.current) return;
      pending.current = undefined;
      setReply("");
      if (action === "CLAIM")
        window.location.assign(`${home(role)}/${result.ticketId}`);
      else await load();
    } catch (e) {
      if (mounted.current) {
        setError(message(e));
        if (
          e instanceof ApiRequestError &&
          [401, 403, 404].includes(e.status)
        ) {
          setDetail(undefined);
          setPage(undefined);
        }
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <div role="alert" className={styles.error}>
          {error}{" "}
          <button onClick={() => void load()} disabled={busy}>
            重新读取
          </button>
        </div>
      )}
      {!ticketId && role === "TERMINAL_CUSTOMER" && (
        <section className={styles.card}>
          <h2>提交问题</h2>
          <form onSubmit={create} className={styles.form}>
            <label>
              问题概述
              <input
                required
                maxLength={100}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              具体说明
              <textarea
                required
                maxLength={4000}
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              充值 ID（充值问题时填写）
              <input
                value={recharge}
                onChange={(e) => setRecharge(e.target.value)}
                placeholder="复制并粘贴本人充值记录中的 ID"
                disabled={busy}
              />
            </label>
            <button
              type="submit"
              disabled={busy || !subject.trim() || !body.trim()}
            >
              {busy ? "正在提交…" : "提交问题"}
            </button>
          </form>
        </section>
      )}
      {!ticketId && (
        <section className={styles.card}>
          <div className={styles.toolbar}>
            <h2>{role === "TERMINAL_CUSTOMER" ? "我的工单" : "工单列表"}</h2>
            {role !== "TERMINAL_CUSTOMER" && (
              <label>
                范围
                <select
                  value={scope}
                  onChange={(e) => {
                    setPage(undefined);
                    setScope(e.target.value);
                  }}
                  disabled={busy}
                >
                  {role === "ADMINISTRATOR" ? (
                    <option value="all">全部工单</option>
                  ) : (
                    <option value="mine">我的工单</option>
                  )}
                  <option value="pool">待领取</option>
                </select>
              </label>
            )}
            <label>
              进度
              <select
                value={status}
                onChange={(e) => {
                  setPage(undefined);
                  setStatus(e.target.value);
                }}
                disabled={busy}
              >
                <option value="">全部</option>
                <option value="PROCESSING">处理中</option>
                <option value="RESOLVED">已处理</option>
              </select>
            </label>
            <button onClick={() => void load()} disabled={busy || loading}>
              刷新
            </button>
          </div>
          {loading && !page ? (
            <p role="status">正在读取…</p>
          ) : page?.items.length === 0 ? (
            <p className={styles.muted}>暂无工单</p>
          ) : (
            page?.items.map((row) => (
              <article className={styles.row} key={row.id}>
                <div>
                  <p className={styles.meta}>
                    工单 #{row.sequence} ·{" "}
                    {row.kind === "RECHARGE" ? "充值问题" : "一般咨询"} ·{" "}
                    {date(row.createdAt)}
                  </p>
                  {role === "OPERATIONS" && !row.mine ? (
                    <h3>{row.subject}</h3>
                  ) : (
                    <h3>
                      <a href={`${home(role)}/${row.id}`}>{row.subject}</a>
                    </h3>
                  )}
                  <span>{statusText(row.status)}</span>
                </div>
                {role === "OPERATIONS" &&
                  !row.assigned &&
                  row.status === "PROCESSING" && (
                    <button
                      disabled={busy}
                      onClick={() => void action(row.id, row.revision, "CLAIM")}
                    >
                      领取
                    </button>
                  )}
              </article>
            ))
          )}
          {page?.nextBefore && (
            <button
              disabled={loading || busy}
              onClick={() => void load(page.nextBefore!)}
            >
              加载更多
            </button>
          )}
        </section>
      )}
      {ticketId && loading && !detail && <p role="status">正在读取…</p>}
      {ticketId && detail && (
        <>
          <section className={styles.card}>
            <p className={styles.meta}>
              工单 #{detail.sequence} · {statusText(detail.status)}
            </p>
            <h2>{detail.subject}</h2>
            <p className={styles.meta}>工单 ID：{detail.id}</p>
            {detail.rechargeOrderId && (
              <p>
                关联充值：
                {role === "OPERATIONS" ? (
                  <span>{detail.rechargeOrderId}</span>
                ) : (
                  <a
                    href={`${role === "ADMINISTRATOR" ? "/admin" : ""}/recharges/${detail.rechargeOrderId}`}
                  >
                    {detail.rechargeOrderId}
                  </a>
                )}
              </p>
            )}
            <ol className={styles.conversation}>
              {detail.events.map((e) => (
                <li key={e.id}>
                  <p className={styles.meta}>
                    {e.author === "TERMINAL_CUSTOMER"
                      ? "客户"
                      : e.author === "OPERATIONS"
                        ? "客服"
                        : "管理员"}{" "}
                    · {date(e.createdAt)}
                    {e.action === "RESOLVE"
                      ? " · 已处理"
                      : e.action === "RELEASE"
                        ? " · 重新安排处理"
                        : ""}
                  </p>
                  <p className={styles.message}>
                    {e.message ?? "客服已领取，正在跟进。"}
                  </p>
                </li>
              ))}
            </ol>
            {detail.nextAfter && (
              <button
                disabled={loading || busy}
                onClick={() => void load(undefined, detail.nextAfter!)}
              >
                继续查看对话
              </button>
            )}
          </section>
          {detail.status === "PROCESSING" && (
            <section className={styles.card}>
              {role === "ADMINISTRATOR" ? (
                <>
                  <h2>处理安排</h2>
                  <p>责任人无法继续跟进时，可退回工单池重新领取。</p>
                  <label className={styles.form}>
                    说明（客户可见）
                    <textarea
                      maxLength={4000}
                      rows={3}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <button
                    disabled={busy || !detail.assigned || !reply.trim()}
                    onClick={() =>
                      void action(detail.id, detail.revision, "RELEASE")
                    }
                  >
                    退回工单池
                  </button>
                </>
              ) : (
                <>
                  <h2>
                    {role === "TERMINAL_CUSTOMER" ? "补充说明" : "回复客户"}
                  </h2>
                  <label className={styles.form}>
                    内容（客户可见）
                    <textarea
                      maxLength={4000}
                      rows={4}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <div className={styles.toolbar}>
                    <button
                      disabled={busy || !reply.trim()}
                      onClick={() =>
                        void action(detail.id, detail.revision, "REPLY")
                      }
                    >
                      发送
                    </button>
                    {role === "OPERATIONS" && detail.mine && (
                      <button
                        disabled={busy || !reply.trim()}
                        onClick={() =>
                          void action(detail.id, detail.revision, "RESOLVE")
                        }
                      >
                        发送并标记已处理
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
