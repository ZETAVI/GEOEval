import { Inject, Injectable } from "@nestjs/common";

import {
  AI_ATTEMPT_ADAPTER,
  type AiAttemptAdapter,
} from "../domain/ai-attempt.adapter.js";
import {
  AI_ATTEMPT_REPOSITORY,
  type AiAttemptRepository,
} from "../domain/ai-attempt.repository.js";
import type {
  AiAttemptOutcome,
  AiAttemptRequest,
  StoredAiAttempt,
} from "../domain/ai-attempt.types.js";

@Injectable()
export class AiExecutionService {
  constructor(
    @Inject(AI_ATTEMPT_REPOSITORY)
    private readonly repository: AiAttemptRepository,
    @Inject(AI_ATTEMPT_ADAPTER)
    private readonly adapter: AiAttemptAdapter,
  ) {}

  async execute(request: AiAttemptRequest): Promise<AiAttemptOutcome> {
    const attempt = await this.repository.begin(request);
    const completed = completedOutcome(attempt);
    if (completed) return completed;

    const startedAt = performance.now();
    const result = await this.adapter.execute(request);
    const stored = await this.repository.finish(
      attempt.id,
      result,
      Math.max(0, Math.round(performance.now() - startedAt)),
    );
    const outcome = completedOutcome(stored);
    if (!outcome) throw new Error("AI attempt did not reach a terminal state");
    return outcome;
  }
}

function completedOutcome(
  attempt: StoredAiAttempt,
): AiAttemptOutcome | undefined {
  if (attempt.status === "SUCCEEDED" && attempt.responseEnvelope) {
    return {
      kind: "SUCCEEDED",
      attemptId: attempt.id,
      output: attempt.responseEnvelope,
    };
  }
  if (attempt.status === "FAILED" && attempt.failureClass) {
    return {
      kind: "FAILED",
      attemptId: attempt.id,
      failureClass: attempt.failureClass,
      retryable: attempt.retryable === true,
    };
  }
  return undefined;
}
