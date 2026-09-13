import type { EvaluationBrandSnapshot } from "./evaluation-brand-snapshot.js";

export type EvaluationQuestionKind =
  | "BRAND_DIRECTED"
  | "INDUSTRY_RECOMMENDATION"
  | "CHARACTERISTIC_ONE"
  | "CHARACTERISTIC_TWO";

export type { EvaluationBrandSnapshot } from "./evaluation-brand-snapshot.js";

export type GeneratedEvaluationQuestion = {
  kind: EvaluationQuestionKind;
  ordinal: number;
  content: string;
};

export type EvaluationQuestionView = {
  id: string;
  kind: EvaluationQuestionKind;
  ordinal: number;
  content: string;
};

export type EvaluationPlatformPolicy = {
  key: string;
  label: string;
  routePolicyId: string;
  model: string;
  searchMode: "AUTO";
};

export type EvaluationRunView = {
  id: string;
  definitionId: string;
  brandId: string;
  status: "EVALUATING" | "COMPLETED" | "PLEASE_RETRY";
  expectedSampleCount: number;
  processedSampleCount: number;
  validSampleCount: number;
  unavailableSampleCount: number;
  phase:
    | "ACQUIRING_ANSWERS"
    | "ANALYZING_CONTENT"
    | "RESOLVING_BRANDS"
    | "COMPOSING_REPORT"
    | "COMPLETED"
    | "ACTION_REQUIRED";
  platformProgress: Array<{
    platformKey: string;
    platformLabel: string;
    expectedSampleCount: number;
    acquiredSampleCount: number;
    analyzedSampleCount: number;
    unavailableSampleCount: number;
  }>;
  correlationId: string;
  startedAt: Date;
  updatedAt: Date;
};

export type EvaluationDefinitionView = {
  id: string;
  accountId: string;
  brandId: string;
  inputFingerprint: string;
  brandSnapshot: EvaluationBrandSnapshot;
  questionGenerator: { id: string; version: string; contentHash: string };
  objectivityProfile: {
    id: string;
    version: string;
    contentHash: string;
    content: string;
  };
  platforms: EvaluationPlatformPolicy[];
  questions: EvaluationQuestionView[];
  run: EvaluationRunView | null;
  createdAt: Date;
};

export type EvaluationDefinitionInput = Omit<
  EvaluationDefinitionView,
  "id" | "questions" | "run" | "createdAt"
> & {
  questions: Array<Omit<EvaluationQuestionView, "id">>;
};

export type StartEvaluationOutcome =
  | { kind: "STARTED" | "DUPLICATE"; run: EvaluationRunView }
  | { kind: "NOT_FOUND" | "STALE" | "ACTIVE_OTHER" | "ALREADY_USED" };

export type RetryEvaluationOutcome =
  | { kind: "STARTED" | "DUPLICATE"; run: EvaluationRunView }
  | { kind: "NOT_FOUND" | "NOT_RETRYABLE" };
