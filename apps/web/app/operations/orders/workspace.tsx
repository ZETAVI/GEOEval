"use client";
import { useEffect, useRef, useState } from "react";
import {
  actOnDeliveryOrder,
  ApiRequestError,
  getDeliveryOrder,
  listDeliveryOrders,
  listAdminAccounts,
  type AccountList,
  type DeliveryActionRequest,
  type DeliveryOrderPage,
  type OperationalOrder,
} from "@geoeval/api-client";
import { AdminSidebar } from "../../admin/admin-sidebar.js";
import { SafeMarkdown } from "../../diagnosis/safe-markdown.js";
import { AgreementSummary } from "../../publishing/agreement-summary.js";
import { SessionExitActions } from "../../session-exit-actions.js";
import {
  loadRoleSession,
  sessionFailureState,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../../session-access.js";
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
type Action = "claim" | "start" | "return" | "reassign";
const actionLabels: Record<string, string> = {
  CLAIM: "认领订单",
  START: "开始处理",
  RETURN: "退回订单池",
  REASSIGN: "管理员改派",
};

export function DeliveryWorkspace({
  admin = false,
  orderId,
}: {
  admin?: boolean;
  orderId?: string;
}) {
  const [session, setSession] = useState<RoleSessionState>({ kind: "loading" });
  const [scope, setScope] = useState<"POOL" | "MINE" | "ALL">(
    admin ? "ALL" : "POOL",
  );
  const [page, setPage] = useState<DeliveryOrderPage>({
    items: [],
    nextBeforeSequence: null,
  });
  const [order, setOrder] = useState<OperationalOrder>();
  const [operators, setOperators] = useState<AccountList>({
    items: [],
    nextCursor: null,
  });
  const [target, setTarget] = useState(""),
    [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const readEpoch = useRef(0);
  const lock = useRef(false);
  const pending = useRef<{
    action: Action;
    input: DeliveryActionRequest;
  } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const basePath = admin ? "/admin/delivery" : "/operations/orders";
  const role = admin ? "ADMINISTRATOR" : "OPERATIONS";
  async function refresh(epoch = ++readEpoch.current) {
    setLoading(true);
    try {
      if (orderId) {
        const next = await getDeliveryOrder(apiBaseUrl, orderId);
        if (epoch === readEpoch.current) setOrder(next);
      } else {
        const next = await listDeliveryOrders(apiBaseUrl, scope);
        if (epoch === readEpoch.current) setPage(next);
      }
    } finally {
      if (epoch === readEpoch.current) setLoading(false);
    }
  }
  async function load() {
    const epoch = ++readEpoch.current;
    setLoading(true);
    setError("");
    const next = await loadRoleSession(apiBaseUrl, role);
    if (epoch !== readEpoch.current) return;
    setSession(next);
    if (next.kind !== "ready") return;
    try {
      await refresh(epoch);
      if (admin && orderId) {
        const staff = await listAdminAccounts(apiBaseUrl, {
          role: "OPERATIONS",
          status: "ACTIVE",
          limit: 50,
        });
        if (epoch === readEpoch.current) setOperators(staff);
      }
    } catch (e) {
      if (epoch !== readEpoch.current) return;
      setError(e instanceof Error ? e.message : "订单读取失败");
      const failure = sessionFailureState(e);
      if (failure) setSession(failure);
    }
  }
  useEffect(() => {
    void load();
  }, [orderId, scope, admin]);
  async function more() {
    if (lock.current || !page.nextBeforeSequence) return;
    lock.current = true;
    setBusy(true);
    try {
      const next = await listDeliveryOrders(
        apiBaseUrl,
        scope,
        page.nextBeforeSequence,
      );
      setPage((old) => ({
        items: [...old.items, ...next.items],
        nextBeforeSequence: next.nextBeforeSequence,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function moreOperators() {
    if (!operators.nextCursor) return;
    try {
      const next = await listAdminAccounts(apiBaseUrl, {
        role: "OPERATIONS",
        status: "ACTIVE",
        limit: 50,
        cursor: operators.nextCursor,
      });
      setOperators((old) => ({
        items: [...old.items, ...next.items],
        nextCursor: next.nextCursor ?? null,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "运营账号读取失败");
    }
  }
  async function act(action: Action) {
    if (lock.current || !order || loading) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const request = pending.current ?? {
      action,
      input: {
        expectedRevision: order.delivery.revision,
        idempotencyKey: crypto.randomUUID(),
        ...(action === "return" || action === "reassign" ? { reason } : {}),
        ...(action === "reassign" ? { assigneeAccountId: target } : {}),
      },
    };
    pending.current = request;
    try {
      await actOnDeliveryOrder(
        apiBaseUrl,
        order.id,
        request.action,
        request.input,
      );
      pending.current = null;
      setUncertain(false);
      setReason("");
      setTarget("");
      setNotice("操作已保存。");
      // A returned/reassigned order may no longer be readable to this operator.
      if (request.action === "return") {
        window.location.assign(basePath);
        return;
      }
      await refresh();
    } catch (e) {
      const definitive =
        e instanceof ApiRequestError && e.status >= 400 && e.status < 500;
      if (definitive) {
        pending.current = null;
        setUncertain(false);
      } else setUncertain(pending.current !== null);
      setError(e instanceof Error ? e.message : "操作结果尚未确认");
      const failure = sessionFailureState(e);
      if (failure) setSession(failure);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={session}
        expectedRole={role}
        workspaceName="履约订单"
        loadingDetail="确认角色并读取可处理订单"
        apiBaseUrl={apiBaseUrl}
        onRetry={() => void load()}
      />
    );
  return (
    <div className="app-shell admin-app-shell">
      {admin ? (
        <AdminSidebar account={session.account} active="delivery" />
      ) : (
        <aside className="sidebar admin-sidebar">
          <a className="brand-mark inverse" href="/operations">
            <strong>GEO 运营台</strong>
          </a>
          <nav aria-label="运营功能">
            <a className="side-link" href="/operations">
              <i>工</i>
              <span>
                <b>工作台</b>
                <small>任务入口</small>
              </span>
            </a>
            <a className="side-link active" href={basePath}>
              <i>单</i>
              <span>
                <b>履约订单</b>
                <small>领取与处理</small>
              </span>
            </a>
          </nav>
          <div className="sidebar-account">
            <span>{session.account.mobile.slice(-4)}</span>
            <div>
              <b>运营账号</b>
              <small>{session.account.mobile}</small>
            </div>
            <SessionExitActions apiBaseUrl={apiBaseUrl} />
          </div>
        </aside>
      )}
      <main className="workspace commerce-workspace delivery-workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">已购服务 · 责任交接</p>
            <h1>{orderId ? "订单处理" : "履约订单"}</h1>
            <p>
              {admin
                ? "查看订单责任与处理记录，按需改派。"
                : "从订单池领取整单，再开始处理。"}
            </p>
          </div>
          <div>
            {orderId && (
              <a className="secondary-button" href={basePath}>
                返回列表
              </a>
            )}
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => void load()}
            >
              刷新
            </button>
          </div>
        </header>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {loading && <p role="status">正在读取订单…</p>}
        {uncertain && pending.current && (
          <section className="commerce-notice">
            <p>
              结果尚未确认，请重试本次操作；将沿用同一个请求标识，不会再次分配或重复记录。
            </p>
            <button
              disabled={busy}
              onClick={() => void act(pending.current!.action)}
            >
              重试本次操作
            </button>
          </section>
        )}
        {!orderId && (
          <>
            <div className="commerce-actions" aria-label="订单范围">
              {(admin ? ["ALL", "POOL"] : (["POOL", "MINE"] as const)).map(
                (value) => (
                  <button
                    key={value}
                    className={
                      scope === value ? "primary-button" : "secondary-button"
                    }
                    aria-pressed={scope === value}
                    disabled={busy}
                    onClick={() => {
                      setPage({ items: [], nextBeforeSequence: null });
                      setScope(value as typeof scope);
                    }}
                  >
                    {value === "POOL"
                      ? "待领取"
                      : value === "MINE"
                        ? "我的订单"
                        : "全部订单"}
                  </button>
                ),
              )}
            </div>
            {!loading && !page.items.length && !error && (
              <section className="commerce-empty">
                <h2>{scope === "POOL" ? "暂无待领取订单" : "暂无订单"}</h2>
                <p>
                  {scope === "MINE"
                    ? "从待领取列表选择需要负责的订单。"
                    : "新购买的订单会自动进入此列表。"}
                </p>
              </section>
            )}
            <div className="delivery-list">
              {page.items.map((item) => (
                <article className="commerce-card" key={item.id}>
                  <div className="commerce-card-heading">
                    <h2>{item.title}</h2>
                    <span className="current-badge">
                      {item.status === "PUBLISHING" ? "发布中" : "待领取"}
                    </span>
                  </div>
                  <p>
                    {item.number} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p>
                    {item.agreement.mode === "RANDOM" ? "随机套餐" : "精确发布"}{" "}
                    · {item.agreement.quantity} 篇 ·{" "}
                    {item.delivery.startedAt
                      ? "已开始处理"
                      : item.delivery.assigneeAccountId
                        ? "已认领，尚未开始"
                        : "尚未认领"}
                  </p>
                  <a
                    className="secondary-button"
                    href={`${basePath}/${item.id}`}
                  >
                    查看并处理
                  </a>
                </article>
              ))}
            </div>
            {page.nextBeforeSequence && (
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => void more()}
              >
                加载更多
              </button>
            )}
          </>
        )}
        {order && (
          <>
            <section className="commerce-intro">
              <div>
                <span className="current-badge">
                  {order.status === "PUBLISHING" ? "发布中" : "待领取"}
                </span>
                <h2>{order.title}</h2>
                <p>
                  {order.number} · {order.agreement.quantity} 篇
                </p>
                <p>
                  当前责任人：
                  {order.delivery.assigneeAccountId
                    ? (order.delivery.assignee?.mobile ??
                      "已分配（资料暂不可用）")
                    : "尚未认领"}
                </p>
                <p>
                  {order.delivery.startedAt
                    ? `开始处理：${new Date(order.delivery.startedAt).toLocaleString()}`
                    : "尚未开始实际处理"}
                </p>
              </div>
            </section>
            <section className="commerce-editor" aria-label="订单操作">
              <h2>{admin ? "责任人改派" : "当前操作"}</h2>
              {!admin && !order.delivery.assigneeAccountId && (
                <button
                  className="primary-button"
                  disabled={busy || uncertain}
                  onClick={() => void act("claim")}
                >
                  认领订单
                </button>
              )}
              {!admin &&
                order.delivery.assigneeAccountId === session.account.id &&
                !order.delivery.startedAt && (
                  <>
                    <p>开始处理后不能自行退回订单池，需要管理员改派。</p>
                    <button
                      className="primary-button"
                      disabled={busy || uncertain}
                      onClick={() => void act("start")}
                    >
                      开始处理
                    </button>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void act("return");
                      }}
                    >
                      <label>
                        退回原因
                        <textarea
                          required
                          maxLength={320}
                          value={reason}
                          disabled={busy || uncertain}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </label>
                      <button
                        className="secondary-button"
                        disabled={busy || uncertain}
                      >
                        退回订单池
                      </button>
                    </form>
                  </>
                )}
              {!admin && order.delivery.startedAt && (
                <p>
                  你已开始处理此订单。发布结果录入将在本切片后续接入，目前不会显示虚构的完成进度。
                </p>
              )}
              {admin && order.delivery.assigneeAccountId && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act("reassign");
                  }}
                >
                  <label>
                    新的运营责任人
                    <select
                      required
                      value={target}
                      disabled={busy || uncertain}
                      onChange={(e) => setTarget(e.target.value)}
                    >
                      <option value="">请选择运营账号</option>
                      {operators.items
                        .filter(
                          (a) => a.id !== order.delivery.assigneeAccountId,
                        )
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.mobile}
                          </option>
                        ))}
                    </select>
                  </label>
                  {operators.nextCursor && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void moreOperators()}
                    >
                      加载更多运营账号
                    </button>
                  )}
                  <label>
                    改派原因
                    <textarea
                      required
                      maxLength={320}
                      value={reason}
                      disabled={busy || uncertain}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <button
                    className="primary-button"
                    disabled={busy || uncertain}
                  >
                    确认改派
                  </button>
                </form>
              )}
              {admin && !order.delivery.assigneeAccountId && (
                <p>订单尚未认领，请由运营从订单池领取。</p>
              )}
            </section>
            <AgreementSummary terms={order.agreement} />
            <details className="commerce-editor">
              <summary>查看购买时的文章</summary>
              <SafeMarkdown markdown={order.bodyMarkdown} highlights={[]} />
            </details>
            <details className="commerce-editor">
              <summary>责任变更记录（最近 50 条）</summary>
              <ol>
                {order.delivery.history.map((entry) => (
                  <li key={entry.revision}>
                    {new Date(entry.createdAt).toLocaleString()} ·{" "}
                    {actionLabels[String(entry.request.action)] ?? "处理记录"}{" "}
                    {typeof entry.request.reason === "string"
                      ? `· ${entry.request.reason}`
                      : ""}
                  </li>
                ))}
              </ol>
            </details>
          </>
        )}
      </main>
    </div>
  );
}
