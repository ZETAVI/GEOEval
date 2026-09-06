import type {
  EvaluationReportHistoryCursor,
  EvaluationReportSummaryView,
  EvaluationReportView,
} from "./evaluation-report.view.js";
import type { EvaluationOptimizationGuidanceView } from "./evaluation-optimization-guidance.view.js";

export const EVALUATION_REPORT_REPOSITORY = Symbol(
  "EVALUATION_REPORT_REPOSITORY",
);

export interface EvaluationReportRepository {
  findLatestOptimizationGuidance(input: {
    accountId: string;
    brandId: string;
    currentInputFingerprint: string;
  }): Promise<EvaluationOptimizationGuidanceView | undefined>;
  findCurrent(input: {
    accountId: string;
    brandId: string;
    currentInputFingerprint: string;
  }): Promise<EvaluationReportView | undefined>;
  findHistory(input: {
    accountId: string;
    brandId: string;
    currentInputFingerprint: string;
    limit: number;
    cursor?: EvaluationReportHistoryCursor;
  }): Promise<{
    items: EvaluationReportSummaryView[];
    hasMore: boolean;
  }>;
  findById(input: {
    accountId: string;
    brandId: string;
    reportId: string;
    currentInputFingerprint: string;
  }): Promise<EvaluationReportView | undefined>;
}
