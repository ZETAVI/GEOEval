import type { EvaluationBrandSnapshot } from "./evaluation-brand-snapshot.js";
import type {
  EvaluationDefinitionView,
  EvaluationPlatformPolicy,
  GeneratedEvaluationQuestion,
} from "./evaluation.types.js";

export type EvaluationQuestionPreparationStatus =
  "PREPARING" | "READY" | "PLEASE_RETRY";

export type EvaluationQuestionPreparationView = {
  id: string;
  brandId: string;
  inputFingerprint: string;
  status: EvaluationQuestionPreparationStatus;
  currentSequence: number;
  updatedAt: Date;
};

export type EvaluationDefinitionPreparationView =
  | {
      status: "PREPARING" | "PLEASE_RETRY";
      preparationId: string;
      definition: null;
    }
  | {
      status: "READY";
      preparationId: string | null;
      definition: EvaluationDefinitionView;
    };

export type EvaluationQuestionPreparationInput = {
  accountId: string;
  brandId: string;
  inputFingerprint: string;
  brandSnapshot: EvaluationBrandSnapshot;
  instruction: {
    id: string;
    version: string;
    contentHash: string;
    content: string;
  };
  outputContract: {
    version: string;
    jsonSchema: Record<string, unknown>;
  };
  correlationId: string;
};

export type EvaluationQuestionPreparationContext = {
  id: string;
  accountId: string;
  brandId: string;
  inputFingerprint: string;
  brandSnapshot: EvaluationBrandSnapshot;
  status: EvaluationQuestionPreparationStatus;
  currentSequence: number;
  instruction: {
    id: string;
    version: string;
    contentHash: string;
    content: string;
  };
  outputContract: {
    version: string;
    jsonSchema: Record<string, unknown>;
  };
  correlationId: string;
};

export type EnsureEvaluationQuestionPreparationOutcome =
  | { kind: "PREPARATION"; preparation: EvaluationQuestionPreparationView }
  | { kind: "DEFINITION_EXISTS" };

export type RetryEvaluationQuestionPreparationOutcome =
  | { kind: "STARTED"; preparation: EvaluationQuestionPreparationView }
  | { kind: "DUPLICATE"; preparation: EvaluationQuestionPreparationView }
  | { kind: "NOT_FOUND" }
  | { kind: "NOT_RETRYABLE" };

export type EvaluationQuestionPreparationFailure = {
  preparationId: string;
  sequence: number;
  attemptId: string;
  attemptNumber: number;
  failureClass: string;
  reason: string;
  correlationId: string;
};

export type AcceptGeneratedEvaluationQuestionsInput = {
  preparationId: string;
  sequence: number;
  attemptId: string;
  platforms: EvaluationPlatformPolicy[];
  objectivityProfile: {
    id: string;
    version: string;
    contentHash: string;
    content: string;
  };
  questions: GeneratedEvaluationQuestion[];
};
