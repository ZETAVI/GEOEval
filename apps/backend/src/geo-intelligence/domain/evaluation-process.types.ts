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
  correlationId: string;
  evidence: { answerContent: string } | null;
};

export type AcceptedEvidence = {
  answerContent: string;
  answerFormat: "MARKDOWN";
  sourceMetadata: Array<Record<string, unknown>>;
  searchUsed: boolean;
  returnedModel: string;
};

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
