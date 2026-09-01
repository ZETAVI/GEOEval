export function questionGenerationRequestedEvent(input: {
  preparationId: string;
  sequence: number;
  attemptNumber: number;
  correlationId: string;
}) {
  return {
    businessKey: `evaluation-question-preparation:${input.preparationId}:sequence:${input.sequence}:attempt:${input.attemptNumber}`,
    aggregateType: "evaluation_question_preparation",
    aggregateId: input.preparationId,
    eventType: "evaluation.definition.prepare.requested",
    payload: {
      preparationId: input.preparationId,
      sequence: input.sequence,
      attemptNumber: input.attemptNumber,
    },
    correlationId: input.correlationId,
  };
}
