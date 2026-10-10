import type {
  AcceptedEvidence,
  AcceptedInterpretation,
  BrowserSamplingBatchContext,
  EvidenceAcceptanceResult,
  ExecutionSamplingBatchContext,
  ExecutionSamplingItem,
  ExecutionSamplingSnapshot,
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
    sampling?:
      | { mode: "ai-provider" }
      | { mode: "browser-control-plane"; accountAlias: string }
      | { mode: "execution-center"; accountAlias: string; centerRef: string },
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
    observedAt?: Date;
  }): Promise<EvidenceAcceptanceResult>;
  acceptInterpretation(input: {
    context: EvaluationSampleWorkContext;
    attemptId: string;
    interpretation: AcceptedInterpretation;
  }): Promise<void>;
  scheduleRetry(input: StageFailureInput): Promise<void>;
  exhaustStage(input: StageFailureInput): Promise<void>;
  evaluateReadiness(runId: string, cycleId: string): Promise<void>;
  reconcile(limit: number): Promise<number>;
  reconcileSamplingWindows(limit?: number, now?: Date): Promise<number>;
  hasOpenSamplingWindows(): Promise<boolean>;
  getOrCreateExecutionSamplingBatch(input: {
    sampleId: string;
    runId: string;
    cycleId: string;
    accountAlias: string;
    centerRef: string;
  }): Promise<ExecutionSamplingBatchContext | undefined>;
  listExecutionSamplingBatches(input: {
    limit: number;
    afterId?: string;
  }): Promise<ExecutionSamplingBatchContext[]>;
  recordExecutionSamplingSnapshot(input: {
    batchId: string;
    snapshot: ExecutionSamplingSnapshot;
  }): Promise<ExecutionSamplingBatchContext | undefined>;
  getExecutionSamplingItem(input: {
    sampleId: string;
    runId: string;
    cycleId: string;
  }): Promise<ExecutionSamplingItem | undefined>;
  markExecutionSamplingItemProcessed(itemId: string): Promise<void>;
  scheduleSamplingFallback(input: {
    runId: string;
    cycleId: string;
    sampleId?: string;
    reason: "FALLBACK_DUE" | "WEB_UNAVAILABLE";
    now?: Date;
  }): Promise<number>;
  closeSamplingAtDeadline(input: {
    runId: string;
    cycleId: string;
    now?: Date;
  }): Promise<number>;
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
