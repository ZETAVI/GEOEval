export function synthesisRequestedEvent(input: {
  runId: string;
  cycleId: string;
  attemptNumber: number;
  purpose: "BRAND_NAME_RESOLUTION" | "REPORT_COMPOSITION";
  correlationId: string;
}) {
  return {
    businessKey: `evaluation-run:${input.runId}:cycle:${input.cycleId}:analysis:${input.purpose}:${input.attemptNumber}`,
    aggregateType: "evaluation_run",
    aggregateId: input.runId,
    eventType: "evaluation.run.synthesize.requested",
    payload: {
      runId: input.runId,
      cycleId: input.cycleId,
      attemptNumber: input.attemptNumber,
      purpose: input.purpose,
    },
    correlationId: input.correlationId,
  };
}
