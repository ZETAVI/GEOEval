import type {
  AcceptGeneratedEvaluationQuestionsInput,
  EnsureEvaluationQuestionPreparationOutcome,
  EvaluationQuestionPreparationContext,
  EvaluationQuestionPreparationFailure,
  EvaluationQuestionPreparationInput,
  EvaluationQuestionPreparationView,
  RetryEvaluationQuestionPreparationOutcome,
} from "./evaluation-question-preparation.types.js";

export const EVALUATION_QUESTION_PREPARATION_REPOSITORY = Symbol(
  "EVALUATION_QUESTION_PREPARATION_REPOSITORY",
);

export interface EvaluationQuestionPreparationRepository {
  find(input: {
    accountId: string;
    brandId: string;
    inputFingerprint: string;
  }): Promise<EvaluationQuestionPreparationView | undefined>;
  ensure(
    input: EvaluationQuestionPreparationInput,
  ): Promise<EnsureEvaluationQuestionPreparationOutcome>;
  getContext(
    preparationId: string,
    sequence: number,
  ): Promise<EvaluationQuestionPreparationContext | undefined>;
  accept(input: AcceptGeneratedEvaluationQuestionsInput): Promise<void>;
  scheduleRetry(input: EvaluationQuestionPreparationFailure): Promise<void>;
  exhaust(input: EvaluationQuestionPreparationFailure): Promise<void>;
  retry(input: {
    accountId: string;
    preparationId: string;
  }): Promise<RetryEvaluationQuestionPreparationOutcome>;
  reconcile(limit: number): Promise<number>;
}
