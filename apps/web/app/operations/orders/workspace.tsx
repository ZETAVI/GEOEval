"use client";
import { BusinessRecordsNavigation } from "../../admin/records/navigation.js";
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
  type DeliveryOrderState,
  type OperationalOrder,
} from "@geoeval/api-client";
import { AdminOrderSettlementPanel } from "../../admin/records/order-settlement.js";
import { AdminSidebar } from "../../admin/admin-sidebar.js";
import { SafeMarkdown } from "../../diagnosis/safe-markdown.js";
import { AgreementSummary } from "../../publishing/agreement-summary.js";
import { SessionExitActions } from "../../session-exit-actions.js";
import { PublicationWorkPanel } from "./publication-work.js";
import {
  DeliveryResolutionPanel,
  DeliveryResolutionSummary,
} from "./delivery-resolution.js";
import { deliveryStatusLabel } from "../../orders/publication-results.js";
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
  REPORT_EXCEPTION: "记录异常",
  CLEAR_EXCEPTION: "解除异常",
  SAVE_RESOLUTION: "保存协商处理",
};

export function appendDeliveryPage(
  current: DeliveryOrderPage,
  next: DeliveryOrderPage,
  request: {
    epoch: number;
    cursor: NonNullable<DeliveryOrderPage["nextCursor"]>;
  },
  currentEpoch: number,
): DeliveryOrderPage {
  if (
    request.epoch !== currentEpoch ||
    current.nextCursor?.createdAt !== request.cursor.createdAt ||
    current.nextCursor?.sequence !== request.cursor.sequence
  )
    return current;
  return {
    items: [...current.items, ...next.items],
    nextCursor: next.nextCursor,
  };
}

const urgencyLabels = {
  NORMAL: "预计周期内",
  NEARING_DEADLINE: "即将到期 · 24 小时内",
  DELAYED: "已延期 · 优先跟进",
  COMPLETED: "发布已完成",
  CLOSED: "订单已关闭",
};
export function DeliveryScheduleView({
  schedule,
}: {
  schedule: OperationalOrder["schedule"];
}) {
  return (
    <div className="delivery-schedule">
      <span
        className={`delivery-urgency delivery-urgency-${schedule.urgency.toLowerCase()}`}
      >
        {urgencyLabels[schedule.urgency]}
      </span>
      <p>
        {schedule.urgency === "CLOSED" ? "原预计完成" : "预计完成"}：
        {new Date(schedule.expectedCompletionAt).toLocaleString()}
      </p>
    </div>
  );
}

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
  const [state, setState] = useState<DeliveryOrderState>(
    admin ? "ALL" : "ACTIVE",
  );
  const [page, setPage] = useState<DeliveryOrderPage>({
    items: [],
    nextCursor: null,
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
        const next = await listDeliveryOrders(apiBaseUrl, scope, state);
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
  }, [orderId, scope, state, admin]);
  async function more() {
    if (lock.current || loading || page.nextCursor === null) return;
    const request = {
      epoch: readEpoch.current,
      cursor: page.nextCursor,
    };
    lock.current = true;
    setBusy(true);
    try {
      const next = await listDeliveryOrders(
        apiBaseUrl,
        scope,
        state,
        request.cursor,
      );
      setPage((old) =>
        appendDeliveryPage(old, next, request, readEpoch.current),
      );
    } catch (e) {
      if (request.epoch === readEpoch.current)
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
        {admin && <BusinessRecordsNavigation active="orders" />}
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
                      if (scope === value) return;
                      ++readEpoch.current;
                      setPage({ items: [], nextCursor: null });
                      setScope(value as typeof scope);
                      if (value === "POOL") setState("ACTIVE");
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
            {scope !== "POOL" && (
              <div className="commerce-actions" aria-label="履约阶段">
                {(
                  [
                    "ACTIVE",
                    "COMPLETED",
                    "CLOSED",
                    ...(admin
                      ? ["ALL" as const, "PENDING_RETURN" as const]
                      : []),
                  ] as const
                ).map((value) => (
                  <button
                    key={value}
                    className={
                      state === value ? "primary-button" : "secondary-button"
                    }
                    aria-pressed={state === value}
                    disabled={busy}
                    onClick={() => {
                      if (state === value) return;
                      ++readEpoch.current;
                      setPage({ items: [], nextCursor: null });
                      setState(value);
                    }}
                  >
                    {
                      {
                        ALL: "全部状态",
                        ACTIVE: "待处理与进行中",
                        COMPLETED: "已完成",
                        CLOSED: "已关闭",
                        PENDING_RETURN: "待退点",
                      }[value]
                    }
                  </button>
                ))}
              </div>
            )}
            <p className="field-help">
              {state === "ACTIVE"
                ? "按预计完成时间由近到远排列；延期和临期订单优先。预计 7 天仅作进度提示，不自动结束订单。"
                : state === "PENDING_RETURN"
                  ? "保留所有已约定但尚未退回的积分；订单结束满 72 小时且相关问题处理完后由系统结算。"
                  : "保留原购买约定与实际发布结果，按下单时间由新到旧排列。"}
            </p>
            {!loading && !page.items.length && !error && (
              <section className="commerce-empty">
                <h2>
                  {scope === "POOL"
                    ? "暂无待领取订单"
                    : state === "COMPLETED"
                      ? "暂无已完成订单"
                      : state === "CLOSED"
                        ? "暂无已关闭订单"
                        : state === "PENDING_RETURN"
                          ? "暂无待退点订单"
                          : "暂无进行中的订单"}
                </h2>
                <p>
                  {state === "COMPLETED"
                    ? "发布完成后，订单会保留在这里，可继续查看或纠正结果。"
                    : state === "CLOSED"
                      ? "终止关闭的订单会保留原约定和实际发布结果。"
                      : state === "PENDING_RETURN"
                        ? "有正额协商退点且尚未执行的订单会显示在这里。"
                        : scope === "MINE"
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
                      {deliveryStatusLabel[item.status]}
                    </span>
                  </div>
                  <p>
                    {item.number} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p>
                    {item.agreement.mode === "RANDOM" ? "随机套餐" : "精确发布"}{" "}
                    · 已发布 {item.delivery.publishedQuantity} /{" "}
                    {item.agreement.quantity} 篇 ·{" "}
                    {item.delivery.startedAt
                      ? "已开始处理"
                      : item.delivery.assigneeAccountId
                        ? "已认领，尚未开始"
                        : "尚未认领"}
                  </p>
                  <DeliveryScheduleView schedule={item.schedule} />
                  {state === "PENDING_RETURN" && (
                    <DeliveryResolutionSummary resolution={item.resolution} />
                  )}
                  <a
                    className="secondary-button"
                    href={`${basePath}/${item.id}`}
                  >
                    查看并处理
                  </a>
                </article>
              ))}
            </div>
            {page.nextCursor && (
              <button
                className="secondary-button"
                disabled={busy || loading}
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
                  {deliveryStatusLabel[order.status]}
                </span>
                <h2>{order.title}</h2>
                <p>
                  {order.number} · {order.agreement.quantity} 篇
                </p>
                <DeliveryScheduleView schedule={order.schedule} />
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
              {!admin &&
                !order.delivery.assigneeAccountId &&
                order.status === "PENDING_HANDLING" && (
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
                !order.delivery.startedAt &&
                !order.resolution.stopped &&
                order.status !== "CLOSED" &&
                order.status !== "COMPLETED" && (
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
                  {order.status === "COMPLETED"
                    ? "所有已购发布已完成。仍可按真实情况纠正录入错误，纠正不改变已购承诺。"
                    : order.resolution.stopped
                      ? "剩余发布已停止，保留已有结果及其纠正入口。"
                      : order.status === "EXCEPTION_HANDLING"
                        ? "请先处理下方异常或记录协商方案。"
                        : "可在下方逐项处理发布内容或直接录入已发布结果。"}
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
            {(admin ||
              order.delivery.assigneeAccountId === session.account.id) && (
              <a
                className="secondary-button"
                href={`${admin ? "/admin" : "/operations"}/support?orderId=${order.id}`}
              >
                订单问题与沟通
              </a>
            )}
            {admin && session.kind === "ready" && (
              <AdminOrderSettlementPanel
                orderId={order.id}
                actorId={session.account.id}
                revision={order.delivery.revision}
              />
            )}
            <DeliveryResolutionPanel
              key={`${order.id}:${session.account.id}`}
              order={order}
              actorAccountId={session.account.id}
              admin={admin}
              canWrite={
                !admin &&
                order.delivery.assigneeAccountId === session.account.id
              }
              onChanged={() => refresh()}
            />
            <PublicationWorkPanel
              key={order.id}
              order={order}
              canWrite={
                !admin &&
                order.delivery.assigneeAccountId === session.account.id
              }
              onChanged={() => refresh()}
            />
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
