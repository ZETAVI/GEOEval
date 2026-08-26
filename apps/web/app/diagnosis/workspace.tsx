"use client";

import {
  getCurrentAccount,
  listBrands,
  prepareEvaluationDefinition,
  startEvaluationRun,
  type Account,
  type Brand,
  type EvaluationDefinition,
} from "@geoeval/api-client";
import { useEffect, useState } from "react";
import { CustomerSidebar } from "../customer-sidebar.js";

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
  const [definition, setDefinition] = useState<EvaluationDefinition>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void Promise.all([getCurrentAccount(apiBaseUrl), listBrands(apiBaseUrl)])
      .then(async ([nextAccount, brands]) => {
        setAccount(nextAccount);
        const selected = brands.find((brand) => brand.isCurrent);
        setCurrent(selected);
        if (selected?.readyForEvaluation) {
          setDefinition(
            await prepareEvaluationDefinition(apiBaseUrl, selected.id),
          );
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

  async function start() {
    if (!definition) return;
    setBusy(true);
    setMessage("");
    try {
      const run = await startEvaluationRun(apiBaseUrl, definition.id);
      setDefinition({ ...definition, run });
      setMessage("评测已开始，你可以离开此页面");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "评测启动失败");
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
            <h1>{current ? `评测「${current.companyName}」` : "免费评测"}</h1>
            <p>用四个问题观察品牌在五个主流 AI 平台中的真实表现。</p>
          </div>
          {current && <span className="current-badge">当前品牌</span>}
        </header>
        {message && (
          <p className="toast-message" role="status">
            {message}
          </p>
        )}
        {!current ? (
          <DiagnosisPrerequisite
            title="还没有当前品牌"
            detail="先创建一份品牌资料，再开始免费评测。"
          />
        ) : !current.readyForEvaluation ? (
          <DiagnosisPrerequisite
            title="诊断资料还不完整"
            detail={`还需补充：${current.missingFields.join("、")}`}
          />
        ) : definition ? (
          definition.run ? (
            <section className="evaluation-running">
              <span className="loading-orbit" aria-hidden="true" />
              <p className="step-label">评测中</p>
              <h2>正在准备五平台评测</h2>
              <p>
                本次评测已经固定 {definition.questions.length} 个问题，共有{" "}
                {definition.run.expectedSampleCount}{" "}
                个采样位置。你可以离开页面，后续状态不会受影响。
              </p>
              <a className="secondary-button" href="/brands">
                返回我的品牌
              </a>
            </section>
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
