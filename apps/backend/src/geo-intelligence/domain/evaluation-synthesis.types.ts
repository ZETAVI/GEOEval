import type { EvaluationReportMetrics } from "./evaluation-report.policy.js";
import type {
  EvaluationBrandSnapshot,
  EvaluationQuestionKind,
} from "./evaluation.types.js";
import type { OverallSynthesisSampleContext } from "./overall-synthesis.contract.js";

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
    }
  >;
  metrics: EvaluationReportMetrics;
};

export type SynthesisFailureInput = {
  runId: string;
  cycleId: string;
  attemptId: string;
  attemptNumber: number;
  failureClass: string;
  reason: string;
  correlationId: string;
};
