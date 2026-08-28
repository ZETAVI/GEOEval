import type {
  EvaluationDefinitionInput,
  EvaluationDefinitionView,
  RetryEvaluationOutcome,
  StartEvaluationOutcome,
} from "./evaluation.types.js";

export const EVALUATION_REPOSITORY = Symbol("EVALUATION_REPOSITORY");

export interface EvaluationRepository {
  findDefinition(input: {
    accountId: string;
    brandId: string;
    inputFingerprint: string;
  }): Promise<EvaluationDefinitionView | undefined>;
  createDefinition(
    input: EvaluationDefinitionInput,
  ): Promise<EvaluationDefinitionView>;
  startRun(input: {
    accountId: string;
    definitionId: string;
  }): Promise<StartEvaluationOutcome>;
  retryRun(input: {
    accountId: string;
    runId: string;
  }): Promise<RetryEvaluationOutcome>;
}
