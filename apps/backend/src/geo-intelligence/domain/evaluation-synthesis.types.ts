import type { EvaluationReportMetrics } from "./evaluation-report.policy.js";
import type {
  EvaluationBrandSnapshot,
  EvaluationQuestionKind,
} from "./evaluation.types.js";
import type { OverallSynthesisSampleContext } from "./overall-synthesis.contract.js";
import type { BrandNameResolutionOutput } from "./brand-name-resolution.contract.js";

export type EvaluationSynthesisContext = {
  runId: string;
  cycleId: string;
  correlationId: string;
  brand: EvaluationBrandSnapshot;
  questions: Array<{
    questionId: string;
    kind: EvaluationQuestionKind;
    ordinal: number;
    content: string;
  }>;
  samples: Array<
    OverallSynthesisSampleContext & {
      platformLabel: string;
      questionId: string;
      question: string;
      mentioned: boolean;
      position: number | null;
    }
  >;
  metrics: EvaluationReportMetrics;
  resolution: BrandNameResolutionOutput | null;
};

export type SynthesisFailureInput = {
  runId: string;
  cycleId: string;
  attemptId: string;
  attemptNumber: number;
  purpose: "BRAND_NAME_RESOLUTION" | "REPORT_COMPOSITION";
  failureClass: string;
  reason: string;
  correlationId: string;
};
