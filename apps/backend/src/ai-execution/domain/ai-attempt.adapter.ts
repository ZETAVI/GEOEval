import type {
  AiAdapterResult,
  AiAttemptRequest,
  ResolvedAiAttemptRequest,
  ResolvedAiRoute,
} from "./ai-attempt.types.js";

export const AI_ATTEMPT_ADAPTER = Symbol("AI_ATTEMPT_ADAPTER");
export const AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS = Symbol(
  "AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS",
);

export interface AiAttemptAdapter {
  resolve(request: AiAttemptRequest): ResolvedAiRoute;
  execute(request: ResolvedAiAttemptRequest): Promise<AiAdapterResult>;
}
