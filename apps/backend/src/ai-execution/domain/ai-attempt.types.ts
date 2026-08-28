export type AiExecutionPurpose =
  "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION";

type AiAttemptRequestBase = {
  runId: string;
  cycleId: string;
  attemptNumber: number;
  routePolicyId: string;
  requestedModel: string;
  correlationId: string;
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

export type StructuredOutputAttemptInput = {
  taskKind: "STRUCTURED_OUTPUT";
  systemInstruction: string;
  userContext: Record<string, unknown>;
  outputContract: {
    version: string;
    jsonSchema: Record<string, unknown>;
  };
};

export type AiAttemptRequest =
  | (AiAttemptRequestBase & {
      sampleId: string;
      purpose: "EVALUATION_ACQUISITION";
      input: AcquisitionAttemptInput;
    })
  | (AiAttemptRequestBase & {
      sampleId: string;
      purpose: "EVALUATION_INTERPRETATION";
      input: StructuredOutputAttemptInput;
    })
  | (AiAttemptRequestBase & {
      purpose: "OVERALL_SYNTHESIS";
      input: StructuredOutputAttemptInput;
    });

export type SampleAiAttemptRequest = Extract<
  AiAttemptRequest,
  { sampleId: string }
>;

export type SynthesisAiAttemptRequest = Extract<
  AiAttemptRequest,
  { purpose: "OVERALL_SYNTHESIS" }
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
  { purpose: "OVERALL_SYNTHESIS" }
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
};

export type AiAttemptDeferred = {
  kind: "DEFERRED";
  resumeAt: Date;
};

export type AiAttemptOutcome =
  AiAttemptFailure | AiAttemptSuccess | AiAttemptDeferred;

export type StoredAiAttempt = {
  id: string;
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
