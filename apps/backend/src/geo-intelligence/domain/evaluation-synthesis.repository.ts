import type {
  EvaluationSynthesisContext,
  SynthesisFailureInput,
} from "./evaluation-synthesis.types.js";
import type { OverallSynthesisOutput } from "./overall-synthesis.contract.js";

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
    synthesis: OverallSynthesisOutput;
  }): Promise<void>;
  scheduleRetry(input: SynthesisFailureInput): Promise<void>;
  exhaust(input: SynthesisFailureInput): Promise<void>;
  reconcile(limit: number): Promise<number>;
}
