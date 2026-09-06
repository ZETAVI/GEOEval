import type { EvaluationReportDocument } from "./evaluation-report.document.js";
import type { OverallSynthesisGuidance } from "./overall-synthesis.contract.js";

type GuidanceItem = OverallSynthesisGuidance["priorities"][number];

export type EvaluationWriterGuidance = {
  summary: string;
  priorities: Array<Pick<GuidanceItem, "label" | "detail">>;
  writingAngles: Array<Pick<GuidanceItem, "label" | "detail">>;
  cautions: string[];
};

export type EvaluationOptimizationGuidanceView = {
  reference: {
    guidanceId: string;
    reportId: string;
    runId: string;
    acceptedAt: Date;
    evaluationInputFingerprint: string;
  };
  brandInformationChanged: boolean;
  customerDirections: EvaluationReportDocument["directions"];
  writerGuidance: EvaluationWriterGuidance;
};
