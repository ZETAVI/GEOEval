export type AiExecutionPurpose =
  | "EVALUATION_ACQUISITION"
  | "EVALUATION_INTERPRETATION"
  | "EVALUATION_QUESTION_GENERATION";

type AiAttemptRequestBase = {
  executionChannel?: "API" | "WEB";
  /** Absolute acquisition budget; Parser keeps its own independent deadline. */
  deadlineAt?: number;
  attemptNumber: number;
  routePolicyId: string;
  requestedModel: string;
  correlationId: string;
};

type EvaluationRunAttemptRequestBase = AiAttemptRequestBase & {
  runId: string;
  cycleId: string;
};

export type AcquisitionAttemptInput = {
  taskKind: "EVALUATION_ACQUISITION";
  systemInstruction: string;
  companyName: string;
  query: string;
  questionOrdinal: number;
  platformLabel: string;
  province: string;
  city: string;
};

export type BrowserAcquisitionAttemptInput = {
  taskKind: "BROWSER_EVALUATION_ACQUISITION";
  platformKey: string;
  questionId: string;
  externalTaskId: string;
  resultIndex: number;
};

export type StructuredOutputAttemptInput = {
  taskKind: "STRUCTURED_OUTPUT";
  systemInstruction: string;
  userContext: Record<string, unknown>;
  outputContract: {
    version: string;
    jsonSchema: Record<string, unknown>;
    enforcement?: "JSON_SCHEMA" | "JSON_OBJECT";
  };
};

export type AiAttemptRequest =
  | (EvaluationRunAttemptRequestBase & {
      sampleId: string;
      purpose: "EVALUATION_ACQUISITION";
      input: AcquisitionAttemptInput | BrowserAcquisitionAttemptInput;
    })
  | (EvaluationRunAttemptRequestBase & {
      sampleId: string;
      purpose: "EVALUATION_INTERPRETATION";
      input: StructuredOutputAttemptInput;
    })
  | (EvaluationRunAttemptRequestBase & {
      purpose: "OVERALL_SYNTHESIS";
      input: StructuredOutputAttemptInput;
    })
  | (EvaluationRunAttemptRequestBase & {
      purpose: "BRAND_NAME_RESOLUTION" | "REPORT_COMPOSITION";
      input: StructuredOutputAttemptInput;
    })
  | (AiAttemptRequestBase & {
      preparationId: string;
      sequence: number;
      purpose: "EVALUATION_QUESTION_GENERATION";
      input: StructuredOutputAttemptInput;
    });

export type SampleAiAttemptRequest = Extract<
  AiAttemptRequest,
  { sampleId: string }
>;

export type SynthesisAiAttemptRequest = Extract<
  AiAttemptRequest,
  {
    purpose:
      "OVERALL_SYNTHESIS" | "BRAND_NAME_RESOLUTION" | "REPORT_COMPOSITION";
  }
>;

export type QuestionGenerationAiAttemptRequest = Extract<
  AiAttemptRequest,
  { purpose: "EVALUATION_QUESTION_GENERATION" }
>;

export type ResolvedAiRoute = {
  providerKey: string;
  serviceClass: string;
  protocol: string;
  requestedModel: string;
};

export type ResolvedAiAttemptRequest = AiAttemptRequest & ResolvedAiRoute;

export type ResolvedSampleAiAttemptRequest = Extract<
  ResolvedAiAttemptRequest,
  { sampleId: string }
>;

export type ResolvedSynthesisAiAttemptRequest = Extract<
  ResolvedAiAttemptRequest,
  {
    purpose:
      "OVERALL_SYNTHESIS" | "BRAND_NAME_RESOLUTION" | "REPORT_COMPOSITION";
  }
>;

export type ResolvedQuestionGenerationAiAttemptRequest = Extract<
  ResolvedAiAttemptRequest,
  { purpose: "EVALUATION_QUESTION_GENERATION" }
>;

export type AiAttemptFailure = {
  kind: "FAILED";
  attemptId: string;
  failureClass: string;
  retryable: boolean;
};

export type AiAttemptSuccess = {
  kind: "SUCCEEDED";
  attemptId: string;
  output: Record<string, unknown>;
  providerEvidence?: AiProviderEvidence;
};

export type AiAttemptDeferred = {
  kind: "DEFERRED";
  resumeAt: Date;
};

export type AiAttemptOutcome =
  AiAttemptFailure | AiAttemptSuccess | AiAttemptDeferred;

export type SampleAiExecutionOutcome =
  | AiAttemptOutcome
  | {
      kind: "REMOTE_PENDING";
      attemptId: string;
    };

export type StoredAiAttempt = {
  id: string;
  executionChannel?: "API" | "WEB";
  executionDeadlineAt?: Date | null;
  executionTransport?: "DIRECT" | "EXECUTION_CENTER";
  status: "STARTED" | "SUCCEEDED" | "FAILED";
  responseEnvelope: Record<string, unknown> | null;
  failureClass: string | null;
  retryable: boolean | null;
  startedAt: Date;
};

export type BegunAiAttempt =
  | { kind: "ACQUIRED"; attempt: StoredAiAttempt }
  | { kind: "TERMINAL"; attempt: StoredAiAttempt }
  | { kind: "DEFERRED"; attempt: StoredAiAttempt; resumeAt: Date };

export type AiProviderEvidence = {
  providerKey: string;
  serviceClass: string;
  protocol: string;
  returnedModel?: string;
  requestId?: string;
  finishReason?: string;
  searchObservation?: "TRIGGERED" | "NOT_TRIGGERED" | "UNKNOWN";
  reasoningEvidenceKind?: "TEXT" | "SUMMARY" | "TOKEN_COUNT" | "NONE";
  sourceMetadata?: Array<Record<string, unknown>>;
  sanitizedRequest?: Record<string, unknown>;
  responseHeaders?: Record<string, string>;
  rawResponse?: unknown;
  failure?: Record<string, unknown>;
};

export type AiAdapterResult =
  | {
      kind: "SUCCEEDED";
      output: Record<string, unknown>;
      usage?: Record<string, unknown>;
      evidence?: AiProviderEvidence;
    }
  | {
      kind: "FAILED";
      failureClass: string;
      retryable: boolean;
      usage?: Record<string, unknown>;
      evidence?: AiProviderEvidence;
    };
