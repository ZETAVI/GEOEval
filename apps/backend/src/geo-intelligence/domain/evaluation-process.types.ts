import { z } from "zod";

import type {
  EvaluationBrandSnapshot,
  EvaluationQuestionKind,
} from "./evaluation.types.js";
import type { SampleParserSemantic } from "./sample-parser.contract.js";

export type EvaluationSamplingWindow = {
  startedAt: Date;
  fallbackDueAt: Date;
  deadlineAt: Date;
  closedAt: Date | null;
};

export type EvidenceAcceptanceResult =
  "ACCEPTED" | "ALREADY_ACCEPTED" | "STALE_CYCLE" | "DEADLINE_EXCEEDED";

export type EvaluationSampleWorkContext = {
  runId: string;
  cycleId: string;
  sampleId: string;
  status:
    | "PENDING"
    | "EVIDENCE_ACCEPTED"
    | "INTERPRETATION_ACCEPTED"
    | "ACQUISITION_EXHAUSTED"
    | "INTERPRETATION_EXHAUSTED";
  companyName: string;
  brandSnapshot: EvaluationBrandSnapshot;
  query: string;
  questionKind: EvaluationQuestionKind;
  questionOrdinal: number;
  platformKey: string;
  platformLabel: string;
  routePolicyId: string;
  requestedModel: string;
  objectivityInstruction: string;
  correlationId: string;
  samplingWindow?: EvaluationSamplingWindow | null;
  evidence: { answerContent: string; readingText?: string | null } | null;
};

const acquisitionAttemptOutputSchema = z
  .object({
    kind: z.literal("ACQUISITION"),
    answerContent: z.string().min(1),
    answerFormat: z.literal("MARKDOWN"),
    sourceMetadata: z.array(z.record(z.string(), z.unknown())),
    searchObservation: z.enum(["TRIGGERED", "NOT_TRIGGERED", "UNKNOWN"]),
    returnedModel: z.string().min(1),
    content: z.record(z.string(), z.unknown()).nullable().optional(),
    readingText: z.string().nullable().optional(),
    images: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  })
  .strict();

export type AcceptedEvidence = Omit<
  z.infer<typeof acquisitionAttemptOutputSchema>,
  "kind"
>;

export function parseAcceptedEvidence(input: unknown): AcceptedEvidence {
  const { kind: _kind, ...evidence } =
    acquisitionAttemptOutputSchema.parse(input);
  return evidence;
}

export type AcceptedInterpretation = {
  mentioned: boolean;
  position: number | null;
  semanticContractVersion: string;
  semanticPayload: SampleParserSemantic;
};

export type StageFailureInput = {
  executionChannel?: "API" | "WEB";
  runId: string;
  cycleId: string;
  sampleId: string;
  purpose: "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION";
  attemptId: string;
  attemptNumber: number;
  failureClass: string;
  reason: string;
  correlationId: string;
};

export type BrowserSamplingBatchContext = {
  batchId: string;
  runId: string;
  cycleId: string;
  platformKey: string;
  accountAlias: string;
  idempotencyKey: string;
  externalTaskId: string | null;
  status: "PENDING" | "SUBMITTED" | "COMPLETED";
  createdAt: Date;
  submittedAt: Date | null;
  correlationId: string;
  samples: Array<{
    sampleId: string;
    questionId: string;
    query: string;
    questionOrdinal: number;
    status:
      | "PENDING"
      | "EVIDENCE_ACCEPTED"
      | "INTERPRETATION_ACCEPTED"
      | "ACQUISITION_EXHAUSTED"
      | "INTERPRETATION_EXHAUSTED";
  }>;
};

export type ExecutionSamplingRequest = Record<string, unknown> & {
  contractVersion: "execution.v1";
  callerRequestRef: string;
  channel: "web";
  platform: string;
  accountAlias: string;
  deadlineAt: number;
  items: Array<{ itemId: string; userPrompt: string }>;
};

export type ExecutionSamplingSnapshot = Record<string, unknown> & {
  taskId: string;
  callerRequestRef: string;
  contractVersion: "execution.v1";
  channel: "web";
  deadlineAt: number;
  items: Array<Record<string, unknown> & { itemId: string; state: string }>;
};

export type ExecutionSamplingItem = {
  id: string;
  batchId: string;
  runId: string;
  cycleId: string;
  sampleId: string;
  attemptId: string;
  itemId: string;
  state: "RESERVING" | "WAITING" | "READY";
  snapshot:
    (Record<string, unknown> & { itemId: string; state: string }) | null;
  processedAt: Date | null;
};

export type ExecutionSamplingBatchContext = BrowserSamplingBatchContext & {
  centerRef: string;
  callerRequestRef: string;
  requestFingerprint: string;
  request: ExecutionSamplingRequest;
  deadlineAt: Date;
  items: ExecutionSamplingItem[];
};
