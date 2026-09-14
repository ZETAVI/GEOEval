import type { EvaluationReportView } from "../domain/evaluation-report.view.js";
import { publicEvaluationBrandSnapshot } from "../domain/evaluation-brand-snapshot.js";

export function presentReport(report: EvaluationReportView) {
  return {
    id: report.id,
    runId: report.runId,
    definitionId: report.definitionId,
    brandId: report.brandId,
    brandSnapshot: publicEvaluationBrandSnapshot(report.brandSnapshot),
    brandInformationChanged: report.brandInformationChanged,
    startedAt: report.startedAt,
    acceptedAt: report.acceptedAt,
    document: report.document,
    questions: report.questions,
  };
}
