"use client";
import styles from "../../agency/customer-service.module.css";
import { useCallback } from "react";
import {
  getCommission,
  listCommissions,
  type Commission,
  type CommissionPage,
  type CommissionFilter,
} from "@geoeval/api-client";
import {
  loadRoleSession,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../../session-access.js";
import { useAgencyRead } from "../../agency/use-agency-read.js";
import { AdminSidebar } from "../../admin/admin-sidebar.js";
import { BusinessRecordsNavigation } from "../../admin/records/navigation.js";
import { CommissionFacts, commissionMoney } from "./view.js";
const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
type Data = {
  session: RoleSessionState;
  page?: CommissionPage;
  record?: Commission;
};
export function CommissionWorkspace({
  role,
  filter = {},
  orderId,
  withdrawalEnabled = false,
}: {
  role: "AGENT" | "ADMINISTRATOR";
  filter?: CommissionFilter;
  orderId?: string;
  withdrawalEnabled?: boolean;
}) {
  const scope = JSON.stringify({ role, filter, orderId });
  const load = useCallback(async (): Promise<Data> => {
    const session = await loadRoleSession(base, role);
    if (session.kind !== "ready") return { session };
    return orderId
      ? {
          session,
          record: await getCommission(base, session.account.id, orderId),
        }
      : {
          session,
          page: await listCommissions(base, session.account.id, filter),
        };
  }, [scope]);
  const { data, error, refresh } = useAgencyRead(scope, load);
  const admin = role === "ADMINISTRATOR",
    root = admin ? "/admin/commissions" : "/agent/commissions";
  if (data && data.session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={data.session}
        expectedRole={role}
        workspaceName="佣金明细"
        loadingDetail="正在核对访问权限"
        apiBaseUrl={base}
        onRetry={() => void refresh()}
      />
    );
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filter))
    if (v !== undefined && k !== "cursor") q.set(k, String(v));
  const next = new URLSearchParams(q);
  if (data?.page?.nextCursor) next.set("cursor", data.page.nextCursor);
  return (
    <div className={admin ? "app-shell" : undefined}>
      {admin && data?.session.kind === "ready" && (
        <AdminSidebar account={data.session.account} active="records" />
      )}
      <main className={admin ? "workspace" : styles.workspace}>
        <nav className="commerce-actions">
          <a href={admin ? "/admin/records" : "/agent"}>
            {admin ? "业务记录" : "代理商工作区"}
          </a>
          {orderId && <a href={root}>佣金列表</a>}
        </nav>
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{admin ? "全量业务记录" : "我的收益"}</p>
            <h1>佣金明细</h1>
            <p>按订单最终保留的实付消费计算，赠送积分不计佣。</p>
          </div>
          <button className="secondary-button" onClick={() => void refresh()}>
            刷新
          </button>
        </header>
        {admin && (
          <BusinessRecordsNavigation
            active="commissions"
            withdrawalEnabled={withdrawalEnabled}
          />
        )}
        {!orderId && (
          <form className={styles.controls} action={root}>
            {admin && (
              <>
                <label>
                  代理商账号 ID
                  <input name="agentId" defaultValue={filter.agentId ?? ""} />
                </label>
                <label>
                  订单 ID
                  <input name="orderId" defaultValue={filter.orderId ?? ""} />
                </label>
              </>
            )}
            <label>
              佣金状态
              <select name="state" defaultValue={filter.state ?? ""}>
                <option value="">全部</option>
                <option value="PENDING">预计</option>
                <option value="BOOKED">已入账</option>
              </select>
            </label>
            <button className="primary-button" type="submit">
              查询
            </button>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
        {!data && !error && <p role="status">正在读取佣金记录…</p>}
        {data?.record && <CommissionFacts record={data.record} admin={admin} />}
        {data?.page && (
          <>
            <section className={styles.card}>
              <h2>当前筛选汇总</h2>
              <p>
                已入账 {commissionMoney(data.page.summary.bookedFen)}（
                {data.page.summary.bookedCount} 单）
              </p>
              <p>
                预计 {commissionMoney(data.page.summary.pendingFen)}（
                {data.page.summary.pendingCount} 单）
              </p>
            </section>
            <section className={styles.card}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>订单</th>
                    <th>佣金</th>
                    <th>状态</th>
                    <th>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {data.page.items.map((r) => (
                    <tr key={r.orderId}>
                      <td>
                        #{r.number} · {r.title}
                      </td>
                      <td>{commissionMoney(r.amountFen)}</td>
                      <td>{r.state === "BOOKED" ? "已入账" : "预计"}</td>
                      <td>
                        <a href={`${root}/${r.orderId}`}>查看明细</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.page.items.length && <p>当前筛选下暂无佣金记录。</p>}
              <nav className="commerce-actions">
                {filter.cursor && <a href={`${root}?${q}`}>返回首页</a>}
                {data.page.nextCursor && <a href={`${root}?${next}`}>下一页</a>}
              </nav>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
