export type AiExecutionPurpose =
  "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION";

export type AiAttemptRequest = {
  cycleId: string;
  sampleId: string;
  purpose: AiExecutionPurpose;
  attemptNumber: number;
  routePolicyId: string;
  providerKey: string;
  requestedModel: string;
  correlationId: string;
  input: Record<string, unknown>;
};

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
