"use client";

import {
  getCurrentAccount,
  getEvaluationReport,
  type Account,
  type EvaluationReport,
} from "@geoeval/api-client";
import { useEffect, useState } from "react";
import { CustomerSidebar } from "../../../customer-sidebar.js";
import { EvaluationReportView } from "../../report-view.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

export function ReportDetailWorkspace({
  reportId,
  brandId,
}: {
  reportId: string;
  brandId: string;
}) {
  const [account, setAccount] = useState<Account>();
  const [report, setReport] = useState<EvaluationReport>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!brandId) {
      setMessage("报告地址不完整，请返回诊断页面重新打开");
      return;
    }
    void Promise.all([
      getCurrentAccount(apiBaseUrl),
      getEvaluationReport(apiBaseUrl, brandId, reportId),
    ])
      .then(([nextAccount, nextReport]) => {
        setAccount(nextAccount);
        setReport(nextReport);
      })
      .catch((error) => {
        if (error instanceof Error && error.message.includes("登录")) {
          window.location.assign("/enter");
          return;
        }
        setMessage(error instanceof Error ? error.message : "报告加载失败");
      });
  }, [brandId, reportId]);

  return (
    <div className="app-shell">
      <CustomerSidebar account={account} activePath="/diagnosis" />
      <main className="workspace diagnosis-workspace">
        <header className="workspace-header report-detail-header">
          <div>
            <p className="eyebrow">历史评测报告</p>
            <h1>
              {report
                ? `「${report.brandSnapshot.companyName}」评测报告`
                : "评测报告"}
            </h1>
            <p>本页保留该次评测使用的品牌资料、问题与平台回答。</p>
          </div>
          <a className="secondary-button" href="/diagnosis">
            返回诊断
          </a>
        </header>
        {message && <p className="toast-message">{message}</p>}
        {!message && !report && (
          <section className="evaluation-running">
            <span className="loading-orbit" aria-hidden="true" />
            <p className="step-label">正在加载</p>
            <h2>正在读取评测报告</h2>
          </section>
        )}
        {report && <EvaluationReportView report={report} />}
      </main>
    </div>
  );
}
