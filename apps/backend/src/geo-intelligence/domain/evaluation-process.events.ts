export type EvaluationSamplePurpose =
  "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION";

export function sampleWorkRequestedEvent(input: {
  runId: string;
  cycleId: string;
  sampleId: string;
  purpose: EvaluationSamplePurpose;
  attemptNumber: number;
  correlationId: string;
}) {
  const stage =
    input.purpose === "EVALUATION_ACQUISITION"
      ? "acquisition"
      : "interpretation";
  return {
    businessKey: `evaluation-run:${input.runId}:cycle:${input.cycleId}:sample:${input.sampleId}:${stage}:${input.attemptNumber}`,
    aggregateType: "evaluation_sample",
    aggregateId: input.sampleId,
    eventType:
      input.purpose === "EVALUATION_ACQUISITION"
        ? "evaluation.sample.acquire.requested"
        : "evaluation.sample.interpret.requested",
    payload: {
      runId: input.runId,
      cycleId: input.cycleId,
      sampleId: input.sampleId,
      attemptNumber: input.attemptNumber,
    },
    correlationId: input.correlationId,
  };
}

export function evaluationReadinessRequestedEvent(input: {
  runId: string;
  cycleId: string;
  sourceSampleId?: string;
  correlationId: string;
}) {
  const source = input.sourceSampleId
    ? `sample:${input.sourceSampleId}`
    : "reconcile";
  return {
    businessKey: `evaluation-run:${input.runId}:cycle:${input.cycleId}:${source}:readiness`,
    aggregateType: "evaluation_run",
    aggregateId: input.runId,
    eventType: "evaluation.run.readiness.requested",
    payload: { runId: input.runId, cycleId: input.cycleId },
    correlationId: input.correlationId,
  };
}

export function evaluationRetryRequiredEvent(input: {
  accountId: string;
  brandId: string;
  brandName: string;
  runId: string;
  cycleId: string;
  stage: "EVIDENCE" | "SYNTHESIS";
  correlationId: string;
}) {
  return {
    businessKey: `evaluation-run:${input.runId}:cycle:${input.cycleId}:retry-required`,
    aggregateType: "evaluation_run",
    aggregateId: input.runId,
    eventType: "evaluation.retry.required",
    payload: {
      accountId: input.accountId,
      brandId: input.brandId,
      brandName: input.brandName,
      runId: input.runId,
      cycleId: input.cycleId,
      stage: input.stage,
    },
    correlationId: input.correlationId,
  };
}
