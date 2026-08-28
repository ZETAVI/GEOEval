export function synthesisRequestedEvent(input: {
  runId: string;
  cycleId: string;
  attemptNumber: number;
  correlationId: string;
}) {
  return {
    businessKey: `evaluation-run:${input.runId}:cycle:${input.cycleId}:synthesis:${input.attemptNumber}`,
    aggregateType: "evaluation_run",
    aggregateId: input.runId,
    eventType: "evaluation.run.synthesize.requested",
    payload: {
      runId: input.runId,
      cycleId: input.cycleId,
      attemptNumber: input.attemptNumber,
    },
    correlationId: input.correlationId,
  };
}
