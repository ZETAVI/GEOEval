export type EvaluationProcessResult =
  { kind: "COMPLETED" } | { kind: "DEFERRED"; resumeAt: Date };

export const EVALUATION_PROCESS_COMPLETED = {
  kind: "COMPLETED",
} as const satisfies EvaluationProcessResult;
