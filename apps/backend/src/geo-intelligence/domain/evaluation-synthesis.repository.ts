import type {
  EvaluationSynthesisContext,
  SynthesisFailureInput,
} from "./evaluation-synthesis.types.js";

export const EVALUATION_SYNTHESIS_REPOSITORY = Symbol(
  "EVALUATION_SYNTHESIS_REPOSITORY",
);

export interface EvaluationSynthesisRepository {
  getContext(
    runId: string,
    cycleId: string,
  ): Promise<EvaluationSynthesisContext | undefined>;
  acceptReport(input: {
    runId: string;
    cycleId: string;
    attemptId: string;
  }): Promise<void>;
  scheduleRetry(input: SynthesisFailureInput): Promise<void>;
  exhaust(input: SynthesisFailureInput): Promise<void>;
  reconcile(limit: number): Promise<number>;
}
