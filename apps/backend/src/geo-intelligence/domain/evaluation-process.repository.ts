import type {
  AcceptedEvidence,
  AcceptedInterpretation,
  EvaluationSampleWorkContext,
  StageFailureInput,
} from "./evaluation-process.types.js";

export const EVALUATION_PROCESS_REPOSITORY = Symbol(
  "EVALUATION_PROCESS_REPOSITORY",
);

export interface EvaluationProcessRepository {
  initializeRun(runId: string, cycleId: string): Promise<void>;
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
}
