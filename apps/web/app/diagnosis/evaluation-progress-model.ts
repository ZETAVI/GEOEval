import type { EvaluationRun } from "@geoeval/api-client";

export type EvaluationProgressPresentation = {
  stageLabel: string;
  title: string;
  detail: string;
  percent: number | null;
  activeStage: number | null;
};

export const evaluationStages = [
  "获取平台回答",
  "理解回答内容",
  "整理品牌信息",
  "生成评测报告",
] as const;

export const geoWaitingCards = [
  {
    title: "用户寻找品牌的入口正在变化",
    detail:
      "越来越多的用户会先向 AI 描述自己的需求。品牌如果没有进入这些回答，就可能在用户做选择之前失去一次被了解的机会。",
  },
  {
    title: "AI 不理解，就很难准确推荐",
    detail:
      "AI 会先从公开内容中形成对品牌的认识，再组织回答。信息不够清晰时，优势可能被忽略，甚至被其他品牌替代。",
  },
  {
    title: "竞品正在占据新的回答入口",
    detail:
      "当其他品牌的信息更具体、更容易理解时，它们更容易出现在相关回答中。越晚开始观察，就越晚发现这些差距。",
  },
  {
    title: "GEO 不是购买一个固定排名",
    detail:
      "GEO 的核心是持续完善 AI 能理解和引用的品牌信息。越早建立清晰内容，越早有机会影响未来的回答。",
  },
  {
    title: "一次出现，不代表持续被理解",
    detail:
      "AI 平台、用户问题和公开信息都在变化。持续评测与优化，才能及时发现品牌认知正在变好还是被新的内容覆盖。",
  },
] as const;

function progressRatio(completed: number, expected: number) {
  if (expected <= 0) return 0;
  return Math.min(1, Math.max(0, completed / expected));
}

function roundedProgress(start: number, span: number, ratio: number) {
  return Math.round(start + span * ratio);
}

export function getEvaluationProgressPresentation(
  run: EvaluationRun,
): EvaluationProgressPresentation {
  const acquired = run.platformProgress.reduce(
    (total, platform) => total + platform.acquiredSampleCount,
    0,
  );
  const analyzedOrUnavailable = run.platformProgress.reduce(
    (total, platform) =>
      total +
      Math.min(
        platform.expectedSampleCount,
        platform.analyzedSampleCount + platform.unavailableSampleCount,
      ),
    0,
  );

  switch (run.phase) {
    case "ACQUIRING_ANSWERS":
      return {
        stageLabel: "获取平台回答",
        title: "正在收集五个平台的回答",
        detail: "每个平台将回答四个评测问题，收到后会继续整理内容。",
        percent: roundedProgress(
          8,
          50,
          progressRatio(acquired, run.expectedSampleCount),
        ),
        activeStage: 0,
      };
    case "ANALYZING_CONTENT":
      return {
        stageLabel: "理解回答内容",
        title: "正在理解回答中的品牌信息",
        detail: "回答获取阶段已经结束，系统正在整理已获得的品牌与相关内容。",
        percent: roundedProgress(
          58,
          28,
          progressRatio(analyzedOrUnavailable, run.expectedSampleCount),
        ),
        activeStage: 1,
      };
    case "RESOLVING_BRANDS":
      return {
        stageLabel: "整理品牌信息",
        title: "正在汇总同一品牌的相关内容",
        detail: "系统正在整理品牌名称与提及情况，为报告统计做准备。",
        percent: 90,
        activeStage: 2,
      };
    case "COMPOSING_REPORT":
      return {
        stageLabel: "生成评测报告",
        title: "正在生成你的评测报告",
        detail: "平台表现和品牌信息已经整理完成，报告即将呈现。",
        percent: 96,
        activeStage: 3,
      };
    case "COMPLETED":
      return {
        stageLabel: "评测完成",
        title: "评测已经完成",
        detail: "报告正在加载，请稍候片刻。",
        percent: 100,
        activeStage: 4,
      };
    case "ACTION_REQUIRED":
      return {
        stageLabel: "需要重新尝试",
        title: "本次评测还有内容未完成",
        detail: "重新评测会继续处理未完成的内容，不会消耗新的评测机会。",
        percent: null,
        activeStage: null,
      };
  }
}

export function getPlatformCompletionPercent(
  platform: EvaluationRun["platformProgress"][number],
  phase: EvaluationRun["phase"],
) {
  if (platform.expectedSampleCount <= 0) return 0;
  const completed =
    phase === "ACQUIRING_ANSWERS"
      ? platform.acquiredSampleCount
      : platform.analyzedSampleCount;
  return Math.round(
    progressRatio(completed, platform.expectedSampleCount) * 100,
  );
}
