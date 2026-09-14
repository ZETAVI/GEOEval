import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EvaluationReport } from "@geoeval/api-client";
import { EvaluationReportView } from "../app/diagnosis/report-view.js";
const report: EvaluationReport = {
  id: "r",
  runId: "run",
  definitionId: "d",
  brandId: "b",
  brandSnapshot: {
    companyName: "示例品牌",
    primaryIndustry: "行业",
    secondaryIndustry: "服务",
    characteristicOne: "特色一",
    characteristicTwo: "特色二",
    province: "广东",
    city: "广州",
    district: "海珠",
  },
  brandInformationChanged: true,
  startedAt: "2026-09-14T00:00:00Z",
  acceptedAt: "2026-09-14T00:00:00Z",
  document: {
    overview: {
      recommendationAssessment: "评测结果",
      brandPerception: "品牌认知",
      recommendationIndex: {
        score: 0,
        stars: 0,
        mentionRate: 0,
        mentionCount: 0,
        validOpenSampleCount: 0,
      },
      typicalPosition: { kind: "NONE" },
      coverage: {
        validSampleCount: 0,
        totalSampleCount: 1,
        missingSampleCount: 1,
      },
    },
    platforms: [],
    themes: { positive: [], negative: [] },
    competitors: [],
    directions: [],
    limitations: [],
  },
  questions: [
    {
      id: "q",
      kind: "BRAND_DIRECTED",
      ordinal: 1,
      content: "客户问题",
      samples: [
        {
          id: "s",
          platformKey: "fixture",
          platformLabel: "本地平台",
          availability: "NOT_INCLUDED",
          mentioned: null,
          position: null,
          cardInterpretation: null,
          originalAnswer: "原始回答仍完整保留",
          highlightUnavailable: true,
          highlights: [],
        },
      ],
    },
  ],
};
describe("agent read-only report presentation", () => {
  it("keeps the complete report and original answer while removing all customer action entry points", () => {
    const readonly = renderToStaticMarkup(
      <EvaluationReportView
        report={report}
        readOnly
        onStartNewEvaluation={() => {}}
      />,
    );
    expect(readonly).toContain("原始回答仍完整保留");
    expect(readonly).toContain("品牌认知");
    expect(readonly).not.toContain("/optimization?brandId=");
    expect(readonly).not.toContain('class="secondary-button"');
    const customer = renderToStaticMarkup(
      <EvaluationReportView report={report} onStartNewEvaluation={() => {}} />,
    );
    expect(customer).toContain("/optimization?brandId=b");
    expect(customer).toContain('class="secondary-button"');
  });
});
