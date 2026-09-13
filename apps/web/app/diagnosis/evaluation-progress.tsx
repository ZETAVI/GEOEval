"use client";

import type { EvaluationRun } from "@geoeval/api-client";
import { type ReactNode, useEffect, useState } from "react";
import {
  evaluationStages,
  geoWaitingCards,
  getEvaluationProgressPresentation,
  getPlatformCompletionPercent,
} from "./evaluation-progress-model.js";

export function EvaluationProgress({
  run,
  actions,
}: {
  run: EvaluationRun;
  actions?: ReactNode;
}) {
  const [cardIndex, setCardIndex] = useState(0);
  const presentation = getEvaluationProgressPresentation(run);
  const completed = run.phase === "COMPLETED";
  const actionRequired = run.phase === "ACTION_REQUIRED";

  useEffect(() => {
    if (completed || actionRequired) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setCardIndex((current) => (current + 1) % geoWaitingCards.length);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [actionRequired, completed]);

  const waitingCard = geoWaitingCards[cardIndex] ?? geoWaitingCards[0];

  function showCard(nextIndex: number) {
    setCardIndex((nextIndex + geoWaitingCards.length) % geoWaitingCards.length);
  }

  return (
    <section className="evaluation-running evaluation-progress-shell">
      <div className="evaluation-progress-heading" role="status">
        {completed ? (
          <span className="evaluation-complete-mark" aria-hidden="true">
            ✓
          </span>
        ) : actionRequired ? (
          <span className="evaluation-action-mark" aria-hidden="true">
            !
          </span>
        ) : (
          <span className="loading-orbit" aria-hidden="true" />
        )}
        <div>
          <p className="step-label">{presentation.stageLabel}</p>
          <h2>{presentation.title}</h2>
          <p>{presentation.detail}</p>
        </div>
        {presentation.percent !== null && (
          <strong aria-hidden="true">{presentation.percent}%</strong>
        )}
      </div>

      {presentation.percent !== null && presentation.activeStage !== null && (
        <div className="evaluation-overall-progress">
          <div
            className="evaluation-progress-track"
            role="progressbar"
            aria-label="整体评测进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={presentation.percent}
          >
            <span style={{ width: `${presentation.percent}%` }} />
          </div>
          <ol aria-label="评测步骤">
            {evaluationStages.map((stage, index) => (
              <li
                key={stage}
                className={
                  index < presentation.activeStage!
                    ? "is-complete"
                    : index === presentation.activeStage
                      ? "is-active"
                      : undefined
                }
                {...(index === presentation.activeStage
                  ? { "aria-current": "step" as const }
                  : {})}
              >
                <span aria-hidden="true">{index + 1}</span>
                {stage}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="evaluation-platform-progress" aria-label="各平台评测进度">
        {run.platformProgress.map((platform) => {
          const percent = getPlatformCompletionPercent(platform, run.phase);
          return (
            <article key={platform.platformKey}>
              <header>
                <h3>{platform.platformLabel}</h3>
                <b>{percent}%</b>
              </header>
              <div
                className="platform-progress-track"
                role="progressbar"
                aria-label={`${platform.platformLabel}${
                  run.phase === "ACQUIRING_ANSWERS"
                    ? "回答获取进度"
                    : "内容整理进度"
                }`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <span style={{ width: `${percent}%` }} />
              </div>
              <p>
                <span>
                  已收到 {platform.acquiredSampleCount} /{" "}
                  {platform.expectedSampleCount} 份回答
                </span>
                <span>
                  已整理 {platform.analyzedSampleCount} /{" "}
                  {platform.expectedSampleCount} 份回答
                </span>
              </p>
              {platform.unavailableSampleCount > 0 && (
                <small>
                  其中 {platform.unavailableSampleCount} 份暂未获得有效结果
                </small>
              )}
            </article>
          );
        })}
      </div>

      {!actionRequired && (
        <aside className="geo-waiting-card" aria-label="GEO 小知识">
          <div>
            <p className="step-label">等待时，了解一下 GEO</p>
            <h3>{waitingCard.title}</h3>
            <p>{waitingCard.detail}</p>
          </div>
          <footer>
            <span>
              {cardIndex + 1} / {geoWaitingCards.length}
            </span>
            <div>
              <button
                type="button"
                aria-label="上一条 GEO 内容"
                onClick={() => showCard(cardIndex - 1)}
              >
                上一条
              </button>
              <button
                type="button"
                aria-label="下一条 GEO 内容"
                onClick={() => showCard(cardIndex + 1)}
              >
                下一条
              </button>
            </div>
          </footer>
        </aside>
      )}

      <div className="evaluation-progress-footer">
        <p>
          {completed
            ? "评测已经完成，报告加载后会自动呈现。"
            : actionRequired
              ? "已完成的回答和整理结果会保留，重新尝试不会从头采样。"
              : "你可以离开此页面，评测会继续进行，完成后可在通知中查看。"}
        </p>
        {actions ?? (
          <a className="secondary-button" href="/brands">
            返回我的品牌
          </a>
        )}
      </div>
    </section>
  );
}
