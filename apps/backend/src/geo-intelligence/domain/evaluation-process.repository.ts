import type {
  AcceptedEvidence,
  AcceptedInterpretation,
  BrowserSamplingBatchContext,
  EvaluationSampleWorkContext,
  StageFailureInput,
} from "./evaluation-process.types.js";

export const EVALUATION_PROCESS_REPOSITORY = Symbol(
  "EVALUATION_PROCESS_REPOSITORY",
);

export interface EvaluationProcessRepository {
  initializeRun(
    runId: string,
    cycleId: string,
    sampling:
      | { mode: "ai-provider" }
      | { mode: "browser-control-plane"; accountAlias: string },
  ): Promise<void>;
  getSampleContext(
    sampleId: string,
    runId: string,
    cycleId: string,
  ): Promise<EvaluationSampleWorkContext | undefined>;
  acceptEvidence(input: {
    context: EvaluationSampleWorkContext;
    attemptId: string;
    evidence: AcceptedEvidence;
  }): Promise<void>;
  acceptInterpretation(input: {
    context: EvaluationSampleWorkContext;
    attemptId: string;
    interpretation: AcceptedInterpretation;
  }): Promise<void>;
  scheduleRetry(input: StageFailureInput): Promise<void>;
  exhaustStage(input: StageFailureInput): Promise<void>;
  evaluateReadiness(runId: string, cycleId: string): Promise<void>;
  reconcile(limit: number): Promise<number>;
  getOrCreateBrowserSamplingBatch(input: {
    sampleId: string;
    runId: string;
    cycleId: string;
    accountAlias: string;
  }): Promise<BrowserSamplingBatchContext | undefined>;
  markBrowserSamplingBatchSubmitted(
    batchId: string,
    externalTaskId: string,
  ): Promise<void>;
  completeBrowserSamplingBatch(input: {
    batchId: string;
    acquiredCount: number;
    failedCount: number;
    lateCount: number;
  }): Promise<void>;
}
