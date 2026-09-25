import { z } from "zod";

import type {
  EvaluationBrandSnapshot,
  EvaluationQuestionKind,
} from "./evaluation.types.js";
import type { SampleParserSemantic } from "./sample-parser.contract.js";

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
  evidence: { answerContent: string } | null;
};

const acquisitionAttemptOutputSchema = z
  .object({
    kind: z.literal("ACQUISITION"),
    answerContent: z.string().min(1),
    answerFormat: z.literal("MARKDOWN"),
    sourceMetadata: z.array(z.record(z.string(), z.unknown())),
    searchObservation: z.enum(["TRIGGERED", "NOT_TRIGGERED", "UNKNOWN"]),
    returnedModel: z.string().min(1),
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
