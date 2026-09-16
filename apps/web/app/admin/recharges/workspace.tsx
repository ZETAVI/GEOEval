"use client";
import { BusinessRecordsNavigation } from "../records/navigation.js";
import { useEffect, useRef, useState } from "react";
import {
  ApiRequestError,
  getCurrentAccount,
  getAdminRecharge,
  listAdminAccounts,
  listAdminRecharges,
  type AdminRechargeFilter,
  type AdminRechargeDetail,
} from "@geoeval/api-client";
import { AdminSidebar } from "../admin-sidebar.js";
import { loadRoleSession, WorkspaceAccessPanel } from "../../session-access.js";
import {
  rechargeLabels,
  rechargeMethodLabels,
} from "../../recharges/recharge-status.js";
import {
  AdminRechargeController,
  type AdminRechargeState,
} from "./controller.js";
import styles from "./recharges.module.css";
const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
const initial: AdminRechargeState = {
  session: { kind: "loading" },
  busy: false,
  error: "",
  page: null,
  detail: null,
  accounts: [],
};
export function AdminRechargeWorkspace({ orderId }: { orderId?: string }) {
  const [state, setState] = useState(initial);
  const controller = useRef<AdminRechargeController | null>(null);
  useEffect(() => {
    const c = new AdminRechargeController(
      {
        session: () => loadRoleSession(base, "ADMINISTRATOR"),
        list: (actor, filter, signal) =>
          listAdminRecharges(base, actor, filter, signal),
        detail: (actor, id, signal) =>
          getAdminRecharge(base, actor, id, signal),
        accounts: async (actor, search, signal) => {
          const page = await listAdminAccounts(base, {
            search,
            role: "TERMINAL_CUSTOMER",
            limit: 20,
          });
          const account = await getCurrentAccount(base);
          if (
            signal.aborted ||
            account.id !== actor ||
            account.role !== "ADMINISTRATOR"
          )
            throw new ApiRequestError("登录账号已变化", 409, "ACCOUNT_CHANGED");
          return page.items;
        },
      },
      setState,
      orderId,
    );
    controller.current = c;
    void c.bootstrap();
    return () => c.destroy();
  }, [orderId]);
  if (state.session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={
          state.error ? { kind: "error", message: state.error } : state.session
        }
        expectedRole="ADMINISTRATOR"
        workspaceName="充值记录"
        loadingDetail="正在读取充值记录"
        apiBaseUrl={base}
        onRetry={() => void controller.current?.bootstrap()}
      />
    );
  return (
    <div className="app-shell">
      <AdminSidebar account={state.session.account} active="recharges" />
      <main className={styles.main}>
        <header className={styles.heading}>
          <div>
            <p className="eyebrow">充值记录</p>
            <h1>{orderId ? "充值详情" : "客户充值"}</h1>
            <p>查看付款确认与积分到账记录</p>
          </div>
          <button
            className="secondary-button"
            disabled={state.busy}
            onClick={() => void controller.current?.refresh()}
          >
            刷新
          </button>
        </header>
        <BusinessRecordsNavigation active="recharges" />
        {state.error && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}
        {orderId ? (
          <>
            <a href="/admin/recharges">返回充值记录</a>
            {state.detail && <RechargeAdminDetail order={state.detail} />}
          </>
        ) : (
          <RechargeAdminList
            state={state}
            onSearch={(search) =>
              void controller.current?.searchAccounts(search)
            }
            onFilter={(filter) => void controller.current?.load(filter)}
            onNext={() => void controller.current?.load(undefined, true)}
          />
        )}
      </main>
    </div>
  );
}
function time(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-CN") : "—";
}
export function RechargeAdminDetail({ order }: { order: AdminRechargeDetail }) {
  const fields = [
    ["充值单号", order.id],
    ["客户账号", order.accountMobile],
    ["充值金额", `¥${order.amountYuan.toFixed(2)}`],
    ["对应积分", String(order.points)],
    ["支付方式", rechargeMethodLabels[order.method]],
    ["订单状态", rechargeLabels[order.status]],
    ["创建时间", time(order.createdAt)],
    ["付款截止时间", time(order.paymentExpiresAt)],
    ["关闭时间", time(order.closedAt)],
    ["商户订单号", order.merchantOrderNo],
    ["渠道交易号", order.providerTransactionId ?? "尚未确认"],
    [
      "付款时间",
      order.paidAt
        ? time(order.paidAt)
        : order.status === "SUCCESSFUL"
          ? "渠道未返回"
          : "尚未确认",
    ],
    [
      "到账积分",
      order.creditedPoints === null ? "尚未到账" : String(order.creditedPoints),
    ],
    ["到账流水号", order.ledgerId ?? "—"],
    ["到账记录时间", time(order.creditedAt)],
    ["最近核验时间", time(order.lastQueriedAt)],
    [
      "到账消息",
      order.notificationState === "DELIVERED"
        ? "已投递"
        : order.notificationState === "PENDING"
          ? "待投递"
          : "—",
    ],
    ["消息投递时间", time(order.notificationDeliveredAt)],
  ];
  return (
    <section className={styles.panel}>
      <p>
        <a href={`/admin/records?referenceId=${order.id}`}>查看到账积分流水</a>
      </p>
      <div className={styles.detailTitle}>
        <h2>订单与到账</h2>
        <span>{rechargeLabels[order.status]}</span>
      </div>
      {order.diagnostic && (
        <p className={styles.diagnostic}>{order.diagnostic}</p>
      )}
      <dl className={styles.details}>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function RechargeAdminList({
  state,
  onSearch,
  onFilter,
  onNext,
}: {
  state: AdminRechargeState;
  onSearch: (search: string) => void;
  onFilter: (filter: AdminRechargeFilter) => void;
  onNext: () => void;
}) {
  const [search, setSearch] = useState(""),
    [customer, setCustomer] = useState(""),
    [id, setId] = useState(""),
    [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [until, setUntil] = useState("");
  const [invalid, setInvalid] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    setInvalid("");
    if (from && until && from > until) {
      setInvalid("开始日期不能晚于结束日期");
      return;
    }
    const before = until ? new Date(`${until}T00:00:00`) : null;
    before?.setDate(before.getDate() + 1);
    onFilter({
      ...(customer ? { accountId: customer } : {}),
      ...(id.trim() ? { orderId: id.trim() } : {}),
      ...(status
        ? { status: status as NonNullable<AdminRechargeFilter["status"]> }
        : {}),
      ...(from
        ? { createdFrom: new Date(`${from}T00:00:00`).toISOString() }
        : {}),
      ...(before ? { createdBefore: before.toISOString() } : {}),
    });
  }
  return (
    <>
      <section className={styles.panel}>
        <form
          className={styles.customerSearch}
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(search.trim());
          }}
        >
          <label>
            查找客户
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="客户手机号"
              maxLength={30}
            />
          </label>
          <button className="secondary-button" disabled={state.busy}>
            搜索客户
          </button>
        </form>
        <form className={styles.filters} onSubmit={submit}>
          <label>
            客户
            <select
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            >
              <option value="">全部客户</option>
              {customer && !state.accounts.some((a) => a.id === customer) && (
                <option value={customer}>已选客户</option>
              )}
              {state.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.mobile}
                  {a.status === "INACTIVE" ? "（已停用）" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            充值单号
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="完整充值单号"
              maxLength={36}
            />
          </label>
          <label>
            订单状态
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部状态</option>
              {Object.entries(rechargeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            创建日期（起）
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            创建日期（止）
            <input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          <button className="primary-button" disabled={state.busy}>
            查询
          </button>
        </form>
        {invalid && <p role="alert">{invalid}</p>}
      </section>
      <section className={styles.panel} aria-busy={state.busy}>
        <h2>充值列表</h2>
        {state.page ? (
          state.page.items.length ? (
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    {[
                      "充值单号",
                      "客户账号",
                      "金额",
                      "积分",
                      "支付方式",
                      "状态",
                      "创建时间",
                      "",
                    ].map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.page.items.map((o) => (
                    <tr key={o.id}>
                      <td className={styles.orderId}>{o.id}</td>
                      <td>{o.accountMobile}</td>
                      <td>¥{o.amountYuan.toFixed(2)}</td>
                      <td>{o.points}</td>
                      <td>{rechargeMethodLabels[o.method]}</td>
                      <td>{rechargeLabels[o.status]}</td>
                      <td>{time(o.createdAt)}</td>
                      <td>
                        <a href={`/admin/recharges/${o.id}`}>查看详情</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>暂无符合条件的充值记录</p>
          )
        ) : (
          <p>{state.busy ? "正在加载…" : "请重新查询"}</p>
        )}
        {state.page?.nextCursor && (
          <button
            className="secondary-button"
            disabled={state.busy}
            onClick={onNext}
          >
            加载更多
          </button>
        )}
      </section>
    </>
  );
}
