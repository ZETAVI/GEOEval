"use client";

import {
  getCurrentAccount,
  getEvaluationDefinitionPreparation,
  getCurrentEvaluationReport,
  listEvaluationReportHistory,
  listBrands,
  prepareEvaluationDefinition,
  retryEvaluationDefinitionPreparation,
  startEvaluationRun,
  retryEvaluationRun,
  type Account,
  type Brand,
  type EvaluationDefinition,
  type EvaluationDefinitionPreparation,
  type EvaluationReport,
  type EvaluationReportSummary,
} from "@geoeval/api-client";
import { useEffect, useState } from "react";
import { CustomerSidebar } from "../customer-sidebar.js";
import { EvaluationProgress } from "./evaluation-progress.js";
import { EvaluationReportView } from "./report-view.js";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";

const questionLabels: Record<string, string> = {
  BRAND_DIRECTED: "品牌现状",
  INDUSTRY_RECOMMENDATION: "行业推荐",
  CHARACTERISTIC_ONE: "特色场景一",
  CHARACTERISTIC_TWO: "特色场景二",
};

export function DiagnosisWorkspace() {
  const [account, setAccount] = useState<Account>();
  const [current, setCurrent] = useState<Brand>();
  const [preparation, setPreparation] =
    useState<EvaluationDefinitionPreparation>();
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [history, setHistory] = useState<EvaluationReportSummary[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void Promise.all([getCurrentAccount(apiBaseUrl), listBrands(apiBaseUrl)])
      .then(async ([nextAccount, brands]) => {
        setAccount(nextAccount);
        const selected = brands.find((brand) => brand.isCurrent);
        setCurrent(selected);
        if (selected) {
          const [currentReport, nextPreparation, reportHistory] =
            await Promise.all([
              getCurrentEvaluationReport(apiBaseUrl, selected.id),
              selected.readyForEvaluation
                ? getEvaluationDefinitionPreparation(
                    apiBaseUrl,
                    selected.id,
                  ).then(
                    (observed) =>
                      observed ??
                      prepareEvaluationDefinition(apiBaseUrl, selected.id),
                  )
                : Promise.resolve(undefined),
              listEvaluationReportHistory(apiBaseUrl, selected.id),
            ]);
          setReport(currentReport);
          setPreparation(nextPreparation);
          setHistory(reportHistory.items);
        }
      })
      .catch((error) => {
        if (error instanceof Error && error.message.includes("登录")) {
          window.location.assign("/enter");
          return;
        }
        setMessage(error instanceof Error ? error.message : "诊断准备失败");
      })
      .finally(() => setLoading(false));
  }, []);

  const definition = preparation?.definition ?? undefined;

  useEffect(() => {
    if (
      !current ||
      (preparation?.status !== "PREPARING" &&
        definition?.run?.status !== "EVALUATING" &&
        definition?.run?.status !== "COMPLETED")
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      void getEvaluationDefinitionPreparation(apiBaseUrl, current.id)
        .then(async (nextPreparation) => {
          if (!nextPreparation) return;
          setPreparation(nextPreparation);
          if (nextPreparation.definition?.run?.status === "COMPLETED") {
            const [nextReport, reportHistory] = await Promise.all([
              getCurrentEvaluationReport(apiBaseUrl, current.id),
              listEvaluationReportHistory(apiBaseUrl, current.id),
            ]);
            setReport(nextReport);
            setHistory(reportHistory.items);
            setMessage("");
          }
        })
        .catch(() => undefined);
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [current, definition?.run?.status, preparation?.status]);

  async function start() {
    if (!definition) return;
    setBusy(true);
    setMessage("");
    try {
      const run = await startEvaluationRun(apiBaseUrl, definition.id);
      setReport(null);
      setPreparation((currentPreparation) =>
        currentPreparation
          ? {
              ...currentPreparation,
              definition: { ...definition, run },
            }
          : currentPreparation,
      );
      if (current) {
        setHistory(
          (await listEvaluationReportHistory(apiBaseUrl, current.id)).items,
        );
      }
      setMessage("评测已开始，你可以离开此页面");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "评测启动失败");
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (!definition?.run) return;
    setBusy(true);
    setMessage("");
    try {
      const run = await retryEvaluationRun(apiBaseUrl, definition.run.id);
      setPreparation((currentPreparation) =>
        currentPreparation
          ? {
              ...currentPreparation,
              definition: { ...definition, run },
            }
          : currentPreparation,
      );
      setMessage("已重新开始处理未完成的评测内容");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重试失败");
    } finally {
      setBusy(false);
    }
  }

  async function retryQuestionPreparation() {
    if (!preparation?.preparationId) return;
    setBusy(true);
    setMessage("");
    try {
      setPreparation(
        await retryEvaluationDefinitionPreparation(
          apiBaseUrl,
          preparation.preparationId,
        ),
      );
      setMessage("已重新准备评测问题");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重试失败");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="loading-page">
        <span className="loading-orbit" />
        正在准备诊断问题…
      </main>
    );
  }

  return (
    <div className="app-shell">
      <CustomerSidebar account={account} activePath="/diagnosis" />
      <main className="workspace diagnosis-workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">AI 搜索诊断</p>
            <h1>
              {report && current
                ? `「${current.companyName}」评测报告`
                : current
                  ? `评测「${current.companyName}」`
                  : "免费评测"}
            </h1>
            <p>用四个问题观察品牌在五个主流 AI 平台中的真实表现。</p>
          </div>
          <div className="workspace-header-actions">
            {history.length > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setHistoryOpen((value) => !value)}
              >
                {historyOpen ? "收起历史报告" : "历史报告"}
              </button>
            )}
            {current && <span className="current-badge">当前品牌</span>}
          </div>
        </header>
        {message && (
          <p className="toast-message" role="status">
            {message}
          </p>
        )}
        {historyOpen && current && (
          <ReportHistory brandId={current.id} items={history} />
        )}
        {!current ? (
          <DiagnosisPrerequisite
            title="还没有当前品牌"
            detail="先创建一份品牌资料，再开始免费评测。"
          />
        ) : report ? (
          <EvaluationReportView
            report={report}
            {...(report.brandInformationChanged && !definition?.run
              ? {
                  onStartNewEvaluation: () => {
                    setReport(null);
                    setMessage("");
                  },
                }
              : {})}
          />
        ) : !current.readyForEvaluation ? (
          <DiagnosisPrerequisite
            title="诊断资料还不完整"
            detail={`还需补充：${current.missingFields.join("、")}`}
          />
        ) : preparation?.status === "PREPARING" ? (
          <section className="evaluation-running">
            <span className="loading-orbit" aria-hidden="true" />
            <p className="step-label">准备中</p>
            <h2>正在准备本次评测问题</h2>
            <p>系统正在根据当前品牌资料准备四个问题，你可以离开此页面。</p>
            <a className="secondary-button" href="/brands">
              返回我的品牌
            </a>
          </section>
        ) : preparation?.status === "PLEASE_RETRY" ? (
          <section className="evaluation-running">
            <p className="step-label">请重试</p>
            <h2>评测问题暂未准备完成</h2>
            <p>本次准备未能完成，重新尝试不会消耗评测机会。</p>
            <div className="evaluation-actions">
              <button
                className="primary-button"
                type="button"
                disabled={busy}
                onClick={() => void retryQuestionPreparation()}
              >
                {busy ? "正在重试…" : "重新准备"}
              </button>
              <a className="secondary-button" href="/brands">
                返回我的品牌
              </a>
            </div>
          </section>
        ) : definition ? (
          definition.run?.status === "PLEASE_RETRY" ? (
            <EvaluationProgress
              run={definition.run}
              actions={
                <div className="evaluation-actions">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={busy}
                    onClick={() => void retry()}
                  >
                    {busy ? "正在重试…" : "重新评测"}
                  </button>
                  <a className="secondary-button" href="/brands">
                    返回我的品牌
                  </a>
                </div>
              }
            />
          ) : definition.run?.status === "COMPLETED" ? (
            <EvaluationProgress run={definition.run} />
          ) : definition.run ? (
            <EvaluationProgress run={definition.run} />
          ) : (
            <>
              <section className="definition-summary">
                <div>
                  <span>评测范围</span>
                  <b>4 个问题 × 5 个平台</b>
                </div>
                <div className="platform-list" aria-label="评测平台">
                  {definition.platforms.map((platform) => (
                    <span key={platform.key}>{platform.label}</span>
                  ))}
                </div>
              </section>
              <section className="question-review">
                <div className="section-heading">
                  <div>
                    <h2>请确认本次评测问题</h2>
                    <p>问题由当前品牌资料生成，开始后不会随资料修改而变化。</p>
                  </div>
                </div>
                <div className="question-list">
                  {definition.questions.map((question) => (
                    <article key={question.id}>
                      <span>{String(question.ordinal).padStart(2, "0")}</span>
                      <div>
                        <small>{questionLabels[question.kind]}</small>
                        <p>{question.content}</p>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="start-evaluation">
                  <p>
                    如果问题不符合实际，请先修改品牌资料。本版本不提供单独刷新问题的操作。
                  </p>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={busy}
                    onClick={() => void start()}
                  >
                    {busy ? "正在启动…" : "确认并开始评测"}
                  </button>
                </div>
              </section>
            </>
          )
        ) : (
          <DiagnosisPrerequisite
            title="暂时无法准备诊断"
            detail="请稍后重试，或返回品牌资料检查当前信息。"
          />
        )}
      </main>
    </div>
  );
}

function ReportHistory({
  brandId,
  items,
}: {
  brandId: string;
  items: EvaluationReportSummary[];
}) {
  return (
    <section className="report-history">
      <div className="section-heading">
        <div>
          <h2>历史报告</h2>
          <p>查看此前完成的评测，报告内容不会随品牌资料修改。</p>
        </div>
      </div>
      <div className="report-history-list">
        {items.map((item) => (
          <a
            key={item.id}
            href={`/diagnosis/reports/${item.id}?brandId=${brandId}`}
          >
            <span>
              <strong>{formatReportDate(item.acceptedAt)}</strong>
              {item.brandInformationChanged && <small>使用此前资料</small>}
            </span>
            <span>
              <b>{item.recommendationIndex.toFixed(1)}</b>
              <small>推荐指数</small>
            </span>
            <span>
              <b>{Math.round(item.mentionRate * 100)}%</b>
              <small>提及率</small>
            </span>
            <span>
              <b>
                {item.validSampleCount}/{item.totalSampleCount}
              </b>
              <small>有效采样</small>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function formatReportDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function DiagnosisPrerequisite({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <section className="empty-brand-state diagnosis-prerequisite">
      <div className="empty-visual" aria-hidden="true">
        <span>诊</span>
        <i />
        <i />
        <i />
      </div>
      <div>
        <p className="step-label">开始前</p>
        <h2>{title}</h2>
        <p>{detail}</p>
        <a className="primary-button" href="/brands">
          返回品牌资料
        </a>
      </div>
    </section>
  );
}
