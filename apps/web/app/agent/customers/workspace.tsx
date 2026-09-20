"use client";
import { useCallback } from "react";
import {
  listAgencyCustomers,
  getAgencyCustomer,
  getAgencyCurrentReport,
  getAgencyReportHistory,
  getAgencyReport,
  type AgencyCustomerList,
  type AgencyCustomerDetail,
  type EvaluationReport,
  type EvaluationReportHistory,
} from "@geoeval/api-client";
import {
  loadRoleSession,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../../session-access.js";
import { useAgencyRead } from "../../agency/use-agency-read.js";
import { EvaluationReportView } from "../../diagnosis/report-view.js";
import { formatChinaDateTime } from "../../china-time.js";
import styles from "../../agency/customer-service.module.css";
const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
type PageData = {
  session: RoleSessionState;
  list?: AgencyCustomerList;
  detail?: AgencyCustomerDetail;
  current?: EvaluationReport | null;
  history?: EvaluationReportHistory;
  report?: EvaluationReport;
};
export function AgentCustomersWorkspace({
  customerId,
  brandId,
  reportId,
  cursor,
}: {
  customerId?: string;
  brandId?: string;
  reportId?: string;
  cursor?: string;
}) {
  const scope = [customerId, brandId, reportId, cursor].join("/");
  const load = useCallback(async (): Promise<PageData> => {
    const session = await loadRoleSession(base, "AGENT");
    if (session.kind !== "ready") return { session };
    if (!customerId)
      return { session, list: await listAgencyCustomers(base, cursor) };
    const detail = await getAgencyCustomer(base, customerId);
    if (!brandId) return { session, detail };
    if (reportId)
      return {
        session,
        detail,
        report: await getAgencyReport(base, customerId, brandId, reportId),
      };
    const [current, history] = await Promise.all([
      getAgencyCurrentReport(base, customerId, brandId),
      getAgencyReportHistory(base, customerId, brandId, cursor),
    ]);
    return { session, detail, current: current.report, history };
  }, [customerId, brandId, reportId, cursor]);
  const { data, error, refresh } = useAgencyRead(scope, load);
  const customerPath = customerId
    ? `/agent/customers/${customerId}`
    : "/agent/customers";
  const brandPath = `${customerPath}/brands/${brandId}`;
  if (data && data.session.kind !== "ready")
    return (
      <WorkspaceAccessPanel
        state={data.session}
        expectedRole="AGENT"
        workspaceName="客户服务"
        loadingDetail="正在确认身份"
        apiBaseUrl={base}
        onRetry={() => void refresh()}
      />
    );
  const brand = data?.detail?.brands.find((b) => b.id === brandId);
  return (
    <main className={styles.workspace}>
      <nav className={styles.links}>
        <a href="/agent">代理商工作区</a>
        <a href="/agent/customers">客户列表</a>
        {customerId && <a href={customerPath}>客户品牌</a>}
        {reportId && <a href={brandPath}>报告列表</a>}
      </nav>
      <header className={styles.header}>
        <div>
          <p>客户服务 · 只读</p>
          <h1>
            {reportId
              ? "历史评测报告"
              : brandId
                ? (brand?.companyName ?? "品牌报告")
                : customerId
                  ? "客户与品牌"
                  : "我的客户"}
          </h1>
        </div>
        <button className="secondary-button" onClick={() => void refresh()}>
          刷新
        </button>
      </header>
      {error && (
        <div role="alert" className={styles.message}>
          {error} <a href="/agent/customers">返回客户列表</a>
        </div>
      )}
      {!data && !error && <p role="status">正在核对当前归属并读取资料…</p>}
      {data?.list && (
        <section className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>登录手机号</th>
                <th>注册时间</th>
                <th>客户资料</th>
              </tr>
            </thead>
            <tbody>
              {data.list.items.map((c) => (
                <tr key={c.id}>
                  <td>{c.mobile}</td>
                  <td>{formatChinaDateTime(c.createdAt)}</td>
                  <td>
                    <a href={`/agent/customers/${c.id}`}>查看品牌与报告</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.list.items.length && <p>当前页没有可查看的客户。</p>}
          <nav className={styles.links}>
            {cursor && <a href="/agent/customers">返回首页</a>}
            {data.list.nextCursor && (
              <a href={`?cursor=${encodeURIComponent(data.list.nextCursor)}`}>
                下一页
              </a>
            )}
          </nav>
        </section>
      )}
      {data?.detail && (
        <section className={styles.card}>
          <h2>客户联系方式</h2>
          <dl className={styles.facts}>
            <div>
              <dt>账号登录手机号</dt>
              <dd>{data.detail.customer.mobile}</dd>
            </div>
            <div>
              <dt>注册时间</dt>
              <dd>{formatChinaDateTime(data.detail.customer.createdAt)}</dd>
            </div>
          </dl>
        </section>
      )}
      {data?.detail && !brandId && (
        <section className={styles.card}>
          <h2>全部品牌</h2>
          {!data.detail.brands.length && <p>客户尚未建立品牌。</p>}
          <table className={styles.table}>
            <thead>
              <tr>
                <th>品牌</th>
                <th>业务联系人</th>
                <th>业务联系电话</th>
                <th>报告</th>
              </tr>
            </thead>
            <tbody>
              {data.detail.brands.map((b) => (
                <tr key={b.id}>
                  <td>{b.companyName}</td>
                  <td>{b.contactName ?? "未填写"}</td>
                  <td>{b.contactMobile ?? "未填写"}</td>
                  <td>
                    <a href={`${customerPath}/brands/${b.id}`}>查看报告</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {brand && (
        <section className={styles.card}>
          <h2>品牌资料</h2>
          <dl className={styles.facts}>
            <div>
              <dt>公司或品牌</dt>
              <dd>{brand.companyName}</dd>
            </div>
            <div>
              <dt>行业</dt>
              <dd>
                {[brand.primaryIndustryLabel, brand.secondaryIndustryLabel]
                  .filter(Boolean)
                  .join(" / ") || "未填写"}
              </dd>
            </div>
            <div>
              <dt>主营产品或服务</dt>
              <dd>{brand.flagshipProductOrService ?? "未填写"}</dd>
            </div>
            <div>
              <dt>业务联系人</dt>
              <dd>{brand.contactName ?? "未填写"}</dd>
            </div>
            <div>
              <dt>业务联系电话</dt>
              <dd>{brand.contactMobile ?? "未填写"}</dd>
            </div>
            <div>
              <dt>门店地址</dt>
              <dd>{brand.storeLocation?.formattedAddress ?? "未填写"}</dd>
            </div>
          </dl>
          <h3>补充业务信息</h3>
          <dl className={styles.facts}>
            <div>
              <dt>其他产品或服务</dt>
              <dd>{brand.otherProductOrService ?? "未填写"}</dd>
            </div>
            <div>
              <dt>价格信息</dt>
              <dd>
                {!brand.articleInformation.price
                  ? "未填写"
                  : brand.articleInformation.price.mode === "NEGOTIABLE"
                    ? "面议"
                    : `${brand.articleInformation.price.minimum} ～ ${brand.articleInformation.price.maximum}`}
              </dd>
            </div>
            <div>
              <dt>适合人群与场景</dt>
              <dd>
                {brand.articleInformation.suitableAudienceContexts.join("、") ||
                  "未填写"}
              </dd>
            </div>
            <div>
              <dt>补充背景</dt>
              <dd>
                {brand.articleInformation.supplementalBackground ?? "未填写"}
              </dd>
            </div>
            <div>
              <dt>期望品牌定位</dt>
              <dd>
                {brand.articleInformation.desiredPositioning.join("、") ||
                  "未填写"}
              </dd>
            </div>
          </dl>
          {brand.characteristics.map((c) => (
            <p key={c.id}>
              <b>{c.title}</b>
              {c.detail && `：${c.detail}`}
            </p>
          ))}
        </section>
      )}
      {data?.report && <EvaluationReportView report={data.report} readOnly />}
      {data?.history && (
        <>
          <section className={styles.card}>
            <h2>当前报告</h2>
            {data.current ? (
              <>
                <p>{formatChinaDateTime(data.current.acceptedAt)}</p>
                <a href={`${brandPath}/reports/${data.current.id}`}>
                  打开完整报告
                </a>
              </>
            ) : (
              <p>暂无可查看的当前报告。</p>
            )}
          </section>
          <section className={styles.card}>
            <h2>历史报告</h2>
            {!data.history.items.length && <p>暂无其他历史报告。</p>}
            <ul>
              {data.history.items.map((r) => (
                <li key={r.id}>
                  <a href={`${brandPath}/reports/${r.id}`}>
                    {formatChinaDateTime(r.acceptedAt)} · {r.brandName}
                  </a>
                </li>
              ))}
            </ul>
            {data.history.nextCursor && (
              <a
                href={`?cursor=${encodeURIComponent(data.history.nextCursor)}`}
              >
                下一页历史报告
              </a>
            )}
            {cursor && <a href={brandPath}>返回首屏</a>}
          </section>
        </>
      )}
    </main>
  );
}
