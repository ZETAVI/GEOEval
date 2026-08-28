export type AiExecutionPurpose =
  "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION";

type AiAttemptRequestBase = {
  runId: string;
  cycleId: string;
  attemptNumber: number;
  routePolicyId: string;
  providerKey: string;
  requestedModel: string;
  correlationId: string;
};

export type AcquisitionAttemptInput = {
  taskKind: "EVALUATION_ACQUISITION";
  companyName: string;
  query: string;
  questionOrdinal: number;
  platformLabel: string;
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

export type AiAttemptOutcome = AiAttemptFailure | AiAttemptSuccess;

export type StoredAiAttempt = {
  id: string;
  status: "STARTED" | "SUCCEEDED" | "FAILED";
  responseEnvelope: Record<string, unknown> | null;
  failureClass: string | null;
  retryable: boolean | null;
};

export type AiAdapterResult =
  | {
      kind: "SUCCEEDED";
      output: Record<string, unknown>;
      usage?: Record<string, unknown>;
    }
  | { kind: "FAILED"; failureClass: string; retryable: boolean };
