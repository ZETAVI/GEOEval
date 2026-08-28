import type { EvaluationReport } from "@geoeval/api-client";
import type { CSSProperties } from "react";

import { SafeMarkdown } from "./safe-markdown.js";

const questionLabels: Record<string, string> = {
  BRAND_DIRECTED: "品牌现状",
  INDUSTRY_RECOMMENDATION: "行业推荐",
  CHARACTERISTIC_ONE: "特色场景一",
  CHARACTERISTIC_TWO: "特色场景二",
};

export function EvaluationReportView({
  report,
  onStartNewEvaluation,
}: {
  report: EvaluationReport;
  onStartNewEvaluation?: () => void;
}) {
  const { overview } = report.document;
  return (
    <div className="evaluation-report">
      {report.brandInformationChanged && (
        <aside className="report-change-notice" role="status">
          <div>
            <strong>当前品牌资料已更新</strong>
            <span>
              本报告仍基于评测开始时的资料。新资料将在下一次正式评测时生效。
            </span>
          </div>
          {onStartNewEvaluation && (
            <button
              className="secondary-button"
              type="button"
              onClick={onStartNewEvaluation}
            >
              查看新评测问题
            </button>
          )}
        </aside>
      )}

      <section className="report-hero">
        <div className="report-index">
          <p className="step-label">AI 推荐指数</p>
          <div className="report-score-row">
            <strong>{overview.recommendationIndex.score.toFixed(1)}</strong>
            <span>/ 5.0</span>
          </div>
          <StarRating value={overview.recommendationIndex.stars} />
          <p>{overview.recommendationAssessment}</p>
        </div>
        <div className="report-key-metrics">
          <ReportMetric
            label="开放问题提及率"
            value={formatPercent(overview.recommendationIndex.mentionRate)}
            detail={`${overview.recommendationIndex.mentionCount} / ${overview.recommendationIndex.validOpenSampleCount} 条有效采样`}
          />
          <ReportMetric
            label="典型出现位置"
            value={formatPosition(overview.typicalPosition)}
            detail="仅统计被提及的开放问题采样"
          />
          <ReportMetric
            label="报告有效采样"
            value={`${overview.coverage.validSampleCount} / ${overview.coverage.totalSampleCount}`}
            detail={
              overview.coverage.missingSampleCount > 0
                ? `${overview.coverage.missingSampleCount} 条采样暂不可用`
                : "本次采样完整"
            }
          />
        </div>
      </section>

      <section className="report-summary report-section">
        <ReportSectionHeading
          label="评测结论"
          title="AI 如何认识这个品牌"
          detail={`本报告基于「${report.brandSnapshot.companyName}」在五个平台中的本轮真实采样。`}
        />
        <blockquote>{overview.brandPerception}</blockquote>
      </section>

      <section className="report-section">
        <ReportSectionHeading
          label="平台表现"
          title="先进入推荐名单，再争取更靠前"
          detail="提及率是主要指标，出现位置用于补充说明被推荐后的相对表现。"
        />
        <div className="platform-report-grid">
          {report.document.platforms.map((platform) => (
            <article
              className="platform-report-card"
              key={platform.platformKey}
            >
              <div>
                <strong>{platform.platformLabel}</strong>
                <span>
                  {platform.validSampleCount} / {platform.totalSampleCount}{" "}
                  条有效
                </span>
              </div>
              <b>{formatPercent(platform.mentionRate)}</b>
              <div className="metric-bar" aria-hidden="true">
                <i style={{ width: formatPercent(platform.mentionRate) }} />
              </div>
              <p>
                开放问题提及 {platform.mentionCount} /{" "}
                {platform.validOpenSampleCount} ·{" "}
                {formatPosition(platform.typicalPosition)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="report-section">
        <ReportSectionHeading
          label="品牌印象"
          title="回答中反复出现的评价"
          detail="相近表达已经归纳合并，最多各展示五项。"
        />
        <div className="theme-comparison">
          <ThemeColumn
            tone="positive"
            title="积极印象"
            emptyText="本轮没有形成稳定的积极主题"
            themes={report.document.themes.positive}
          />
          <ThemeColumn
            tone="negative"
            title="需要留意"
            emptyText="本轮没有形成稳定的负面主题"
            themes={report.document.themes.negative}
          />
        </div>
      </section>

      {report.document.competitors.length > 0 && (
        <section className="report-section">
          <ReportSectionHeading
            label="同场品牌"
            title="哪些品牌更常进入推荐范围"
            detail="同一品牌的相近名称已做归并，仅呈现本轮采样中较突出的结果。"
          />
          <div className="competitor-list">
            {report.document.competitors.map((competitor, index) => (
              <article key={competitor.groupId}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{competitor.displayName}</strong>
                  <small>
                    {formatPlatformLabels(
                      competitor.platforms,
                      report.document.platforms,
                    )}
                  </small>
                </div>
                <b>{competitor.occurrenceCount} 次</b>
                <em>{formatPosition(competitor.typicalPosition)}</em>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="report-section report-directions">
        <ReportSectionHeading
          label="优化方向"
          title="下一步可以从哪里着手"
          detail="这里只呈现当前最值得关注的方向，更完整的建议会作为后续文章优化的上下文。"
        />
        <div className="direction-grid">
          {report.document.directions.map((direction, index) => (
            <article key={direction.directionId}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <small>当前问题</small>
              <p>{direction.currentProblem}</p>
              <small>建议方向</small>
              <h3>{direction.recommendedDirection}</h3>
              <p>{direction.intendedImprovement}</p>
            </article>
          ))}
        </div>
        <button className="primary-button" type="button" disabled>
          进入搜索优化（后续开放）
        </button>
      </section>

      <section className="report-section sample-results">
        <ReportSectionHeading
          label="真实采样"
          title="四个问题在五个平台中的回答"
          detail="每张卡片保留平台原始回答；无法可靠定位的内容会保留原文但不强行高亮。"
        />
        <div className="question-result-list">
          {report.questions.map((question) => (
            <article className="question-result" key={question.id}>
              <header>
                <span>{String(question.ordinal).padStart(2, "0")}</span>
                <div>
                  <small>{questionLabels[question.kind]}</small>
                  <h3>{question.content}</h3>
                </div>
              </header>
              <div className="sample-card-grid">
                {question.samples.map((sample) => (
                  <details className="sample-card" key={sample.id}>
                    <summary>
                      <span>{sample.platformLabel}</span>
                      <b className={sampleStatusClass(sample)}>
                        {sampleStatus(sample)}
                      </b>
                    </summary>
                    {sample.availability === "INCLUDED" ? (
                      <div className="sample-card-body">
                        <p>{sample.cardInterpretation}</p>
                        <div className="sample-answer">
                          <small>平台原始回答</small>
                          {sample.originalAnswer ? (
                            <SafeMarkdown
                              markdown={sample.originalAnswer}
                              highlights={
                                sample.highlightUnavailable
                                  ? []
                                  : sample.highlights
                              }
                            />
                          ) : (
                            <p>本次没有可展示的原始回答。</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="sample-card-body sample-unavailable">
                        <p>本次采样暂不可用，不计入推荐指数。</p>
                        {sample.originalAnswer && (
                          <div className="sample-answer">
                            <small>已获得的平台原始回答</small>
                            <SafeMarkdown
                              markdown={sample.originalAnswer}
                              highlights={[]}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </details>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="report-footer">
        <span>
          评测时间：{new Date(report.acceptedAt).toLocaleString("zh-CN")}
        </span>
        {report.document.limitations.length > 0 && (
          <span>说明：{report.document.limitations.join("；")}</span>
        )}
      </footer>
    </div>
  );
}

function ReportMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ReportSectionHeading({
  label,
  title,
  detail,
}: {
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <header className="report-section-heading">
      <p className="step-label">{label}</p>
      <h2>{title}</h2>
      <p>{detail}</p>
    </header>
  );
}

function ThemeColumn({
  tone,
  title,
  emptyText,
  themes,
}: {
  tone: "positive" | "negative";
  title: string;
  emptyText: string;
  themes: EvaluationReport["document"]["themes"]["positive"];
}) {
  return (
    <div className={`theme-column theme-${tone}`}>
      <h3>{title}</h3>
      {themes.length === 0 ? (
        <p className="theme-empty">{emptyText}</p>
      ) : (
        themes.map((theme) => (
          <article key={theme.themeId}>
            <strong>{theme.label}</strong>
            <p>{theme.summary}</p>
            <small>来自 {theme.evidence.sampleCount} 条采样</small>
          </article>
        ))
      )}
    </div>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="report-stars" aria-label={`五颗星中的 ${value} 颗`}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, value - index));
        return (
          <span
            key={index}
            aria-hidden="true"
            style={{ "--star-fill": `${fill * 100}%` } as CSSProperties}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

function sampleStatus(
  sample: EvaluationReport["questions"][number]["samples"][number],
): string {
  if (sample.availability === "NOT_INCLUDED") return "暂不可用";
  if (!sample.mentioned) return "未提及";
  return sample.position ? `已提及 · 第 ${sample.position} 位` : "已提及";
}

function sampleStatusClass(
  sample: EvaluationReport["questions"][number]["samples"][number],
): string {
  if (sample.availability === "NOT_INCLUDED") return "sample-status-missing";
  return sample.mentioned ? "sample-status-mentioned" : "sample-status-absent";
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatPosition(
  position: EvaluationReport["document"]["overview"]["typicalPosition"],
): string {
  if (position.kind === "SINGLE" && position.position) {
    return `第 ${position.position} 位`;
  }
  if (position.kind === "RANGE" && position.first && position.second) {
    return `第 ${position.first}–${position.second} 位`;
  }
  return "暂无位置";
}

function formatPlatformLabels(
  keys: string[],
  platforms: EvaluationReport["document"]["platforms"],
): string {
  const labels = new Map(
    platforms.map((platform) => [platform.platformKey, platform.platformLabel]),
  );
  return keys.map((key) => labels.get(key) ?? key).join("、");
}
