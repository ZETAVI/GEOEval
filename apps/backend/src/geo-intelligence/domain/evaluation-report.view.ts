import type { EvaluationReportDocument } from "./evaluation-report.document.js";
import type {
  EvaluationBrandSnapshot,
  EvaluationQuestionKind,
} from "./evaluation.types.js";

export type EvaluationHighlightKind =
  "TARGET" | "POSITIVE" | "NEGATIVE" | "MIXED";

export type EvaluationHighlightRange = {
  start: number;
  end: number;
  exactText: string;
  kind: EvaluationHighlightKind;
};

export type EvaluationReportSampleView = {
  id: string;
  platformKey: string;
  platformLabel: string;
  availability: "INCLUDED" | "NOT_INCLUDED";
  mentioned: boolean | null;
  position: number | null;
  cardInterpretation: string | null;
  originalAnswer: string | null;
  highlightUnavailable: boolean;
  highlights: EvaluationHighlightRange[];
};

export type EvaluationReportQuestionView = {
  id: string;
  kind: EvaluationQuestionKind;
  ordinal: number;
  content: string;
  samples: EvaluationReportSampleView[];
};

export type EvaluationReportView = {
  id: string;
  runId: string;
  definitionId: string;
  brandId: string;
  brandSnapshot: EvaluationBrandSnapshot;
  brandInformationChanged: boolean;
  startedAt: Date;
  acceptedAt: Date;
  document: EvaluationReportDocument;
  questions: EvaluationReportQuestionView[];
};

export type EvaluationReportSummaryView = {
  id: string;
  runId: string;
  brandId: string;
  brandName: string;
  brandInformationChanged: boolean;
  startedAt: Date;
  acceptedAt: Date;
  recommendationIndex: number;
  mentionRate: number;
  validSampleCount: number;
  totalSampleCount: number;
};

export type EvaluationReportHistoryCursor = {
  acceptedAt: Date;
  id: string;
};

export type EvaluationReportHistoryPage = {
  items: EvaluationReportSummaryView[];
  nextCursor: string | null;
};
