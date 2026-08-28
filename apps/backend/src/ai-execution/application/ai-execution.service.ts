import { Inject, Injectable } from "@nestjs/common";

import {
  AI_ATTEMPT_ADAPTER,
  type AiAttemptAdapter,
} from "../domain/ai-attempt.adapter.js";
import {
  AI_ATTEMPT_REPOSITORY,
  type AiAttemptRepository,
} from "../domain/ai-attempt.repository.js";
import { toTerminalAiOutcome } from "../domain/ai-attempt.outcome.js";
import type {
  AiAttemptOutcome,
  SampleAiAttemptRequest,
} from "../domain/ai-attempt.types.js";

@Injectable()
export class AiExecutionService {
  constructor(
    @Inject(AI_ATTEMPT_REPOSITORY)
    private readonly repository: AiAttemptRepository,
    @Inject(AI_ATTEMPT_ADAPTER)
    private readonly adapter: AiAttemptAdapter,
  ) {}

  async execute(request: SampleAiAttemptRequest): Promise<AiAttemptOutcome> {
    const attempt = await this.repository.begin(request);
    const completed = toTerminalAiOutcome(attempt);
    if (completed) return completed;

    const startedAt = performance.now();
    const result = await this.adapter.execute(request);
    const stored = await this.repository.finish(
      attempt.id,
      result,
      Math.max(0, Math.round(performance.now() - startedAt)),
    );
    const outcome = toTerminalAiOutcome(stored);
    if (!outcome) throw new Error("AI attempt did not reach a terminal state");
    return outcome;
  }
}
