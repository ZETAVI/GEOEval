import type { EvaluationRun } from "@geoeval/api-client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EvaluationProgress } from "../app/diagnosis/evaluation-progress.js";
import {
  geoWaitingCards,
  getEvaluationProgressPresentation,
  getPlatformCompletionPercent,
} from "../app/diagnosis/evaluation-progress-model.js";

function run(overrides: Partial<EvaluationRun> = {}): EvaluationRun {
  return {
    id: "run-one",
    definitionId: "definition-one",
    brandId: "brand-one",
    status: "EVALUATING",
    expectedSampleCount: 20,
    processedSampleCount: 8,
    validSampleCount: 8,
    unavailableSampleCount: 0,
    phase: "ANALYZING_CONTENT",
    platformProgress: [
      {
        platformKey: "deepseek",
        platformLabel: "DeepSeek",
        expectedSampleCount: 4,
        acquiredSampleCount: 4,
        analyzedSampleCount: 3,
        unavailableSampleCount: 1,
      },
      {
        platformKey: "qwen",
        platformLabel: "千问",
        expectedSampleCount: 4,
        acquiredSampleCount: 4,
        analyzedSampleCount: 2,
        unavailableSampleCount: 0,
      },
    ],
    startedAt: "2026-09-13T08:00:00.000Z",
    updatedAt: "2026-09-13T08:02:00.000Z",
    ...overrides,
  };
}

describe("evaluation progress presentation", () => {
  it.each([
    ["ACQUIRING_ANSWERS", "获取平台回答", 0, 8, 58],
    ["ANALYZING_CONTENT", "理解回答内容", 1, 58, 86],
    ["RESOLVING_BRANDS", "整理品牌信息", 2, 90, 90],
    ["COMPOSING_REPORT", "生成评测报告", 3, 96, 96],
    ["COMPLETED", "评测完成", 4, 100, 100],
  ] as const)(
    "%s maps to customer copy and a bounded progress band",
    (phase, stageLabel, activeStage, minimum, maximum) => {
      const presentation = getEvaluationProgressPresentation(
        run({
          phase,
          status: phase === "COMPLETED" ? "COMPLETED" : "EVALUATING",
        }),
      );
      expect(presentation.stageLabel).toBe(stageLabel);
      expect(presentation.activeStage).toBe(activeStage);
      expect(presentation.percent).toBeGreaterThanOrEqual(minimum);
      expect(presentation.percent).toBeLessThanOrEqual(maximum);
    },
  );

  it("never reaches 100 before durable completion", () => {
    for (const phase of [
      "ACQUIRING_ANSWERS",
      "ANALYZING_CONTENT",
      "RESOLVING_BRANDS",
      "COMPOSING_REPORT",
    ] as const) {
      expect(
        getEvaluationProgressPresentation(run({ phase })).percent,
      ).toBeLessThan(100);
    }
  });

  it("does not invent an overall percentage after the run requires action", () => {
    expect(
      getEvaluationProgressPresentation(
        run({ phase: "ACTION_REQUIRED", status: "PLEASE_RETRY" }),
      ),
    ).toMatchObject({
      stageLabel: "需要重新尝试",
      percent: null,
      activeStage: null,
    });
  });

  it("uses acquired progress first and valid analyzed progress afterward", () => {
    expect(
      getPlatformCompletionPercent(
        run().platformProgress[0]!,
        "ANALYZING_CONTENT",
      ),
    ).toBe(75);
    expect(
      getPlatformCompletionPercent(
        run().platformProgress[1]!,
        "ANALYZING_CONTENT",
      ),
    ).toBe(50);
    expect(
      getPlatformCompletionPercent(
        run().platformProgress[1]!,
        "ACQUIRING_ANSWERS",
      ),
    ).toBe(100);
  });

  it("renders real platform counts, natural stages and customer-safe waiting content", () => {
    const html = renderToStaticMarkup(<EvaluationProgress run={run()} />);
    expect(html).toContain("正在理解回答中的品牌信息");
    expect(html).toContain("已收到 4 / 4 份回答");
    expect(html).toContain("已整理 3 / 4 份回答");
    expect(html).toContain("其中 1 份暂未获得有效结果");
    expect(html).toContain(geoWaitingCards[0].title);
    expect(html).not.toMatch(/Provider|模型|队列|重试次数|trace/i);
  });

  it("retains per-platform facts and the retry action without showing a fabricated overall percentage", () => {
    const html = renderToStaticMarkup(
      <EvaluationProgress
        run={run({ phase: "ACTION_REQUIRED", status: "PLEASE_RETRY" })}
        actions={<button type="button">重新评测</button>}
      />,
    );
    expect(html).toContain("需要重新尝试");
    expect(html).toContain("已收到 4 / 4 份回答");
    expect(html).toContain("重新评测");
    expect(html).not.toContain("整体评测进度");
    expect(html).not.toContain("等待时，了解一下 GEO");
  });
});
