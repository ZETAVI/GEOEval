import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";

import { AiSynthesisExecutionService } from "../../ai-execution/application/ai-synthesis-execution.service.js";
import {
  EVALUATION_SYNTHESIS_REPOSITORY,
  type EvaluationSynthesisRepository,
} from "../domain/evaluation-synthesis.repository.js";
import type { EvaluationSynthesisContext } from "../domain/evaluation-synthesis.types.js";
import {
  EVALUATION_PROCESS_COMPLETED,
  type EvaluationProcessResult,
} from "../domain/evaluation-process.result.js";
import {
  OverallSynthesisSemanticError,
  parseOverallSynthesisOutput,
} from "../domain/overall-synthesis.contract.js";
import { buildOverallSynthesisTask } from "../overall-synthesis.policy.js";

const SYNTHESIS_ROUTES = [
  {
    routePolicyId: "evaluation.overall-synthesis.hy3-primary@1",
    requestedModel: "hy3",
  },
  {
    routePolicyId: "evaluation.overall-synthesis.hy3-primary@1",
    requestedModel: "hy3",
  },
  {
    routePolicyId: "evaluation.overall-synthesis.deepseek-fallback@1",
    requestedModel: "deepseek-v4-flash",
  },
] as const;

const synthesisWorkSchema = z.object({
  runId: z.string().uuid(),
  cycleId: z.string().uuid(),
  attemptNumber: z.number().int().min(1).max(SYNTHESIS_ROUTES.length),
});

@Injectable()
export class EvaluationSynthesisCoordinator {
  constructor(
    @Inject(EVALUATION_SYNTHESIS_REPOSITORY)
    private readonly repository: EvaluationSynthesisRepository,
    @Inject(AiSynthesisExecutionService)
    private readonly aiExecution: AiSynthesisExecutionService,
  ) {}

  async process(
    payload: Record<string, unknown>,
  ): Promise<EvaluationProcessResult> {
    const work = synthesisWorkSchema.parse(payload);
    const context = await this.repository.getContext(work.runId, work.cycleId);
    if (!context) return EVALUATION_PROCESS_COMPLETED;
    const route = SYNTHESIS_ROUTES[work.attemptNumber - 1]!;
    const outcome = await this.aiExecution.execute({
      runId: context.runId,
      cycleId: context.cycleId,
      purpose: "OVERALL_SYNTHESIS",
      attemptNumber: work.attemptNumber,
      routePolicyId: route.routePolicyId,
      requestedModel: route.requestedModel,
      correlationId: context.correlationId,
      input: buildOverallSynthesisTask(context),
    });
    if (outcome.kind === "DEFERRED") return outcome;
    if (outcome.kind === "FAILED") {
      await this.handleFailure({
        context,
        attemptId: outcome.attemptId,
        attemptNumber: work.attemptNumber,
        failureClass: outcome.failureClass,
        retryable: outcome.retryable,
        reason: "Overall analysis execution failed",
      });
      return EVALUATION_PROCESS_COMPLETED;
    }
    let synthesis;
    try {
      synthesis = parseOverallSynthesisOutput(outcome.output, context.samples);
    } catch (error) {
      if (
        !(error instanceof z.ZodError) &&
        !(error instanceof OverallSynthesisSemanticError)
      ) {
        throw error;
      }
      await this.handleFailure({
        context,
        attemptId: outcome.attemptId,
        attemptNumber: work.attemptNumber,
        failureClass: "SEMANTIC_CONTRACT_REJECTED",
        retryable: true,
        reason: "Overall analysis output failed the accepted semantic contract",
      });
      return EVALUATION_PROCESS_COMPLETED;
    }
    await this.repository.acceptReport({
      runId: context.runId,
      cycleId: context.cycleId,
      attemptId: outcome.attemptId,
      synthesis,
    });
    return EVALUATION_PROCESS_COMPLETED;
  }

  reconcile(limit: number): Promise<number> {
    return this.repository.reconcile(limit);
  }

  private async handleFailure(input: {
    context: EvaluationSynthesisContext;
    attemptId: string;
    attemptNumber: number;
    failureClass: string;
    retryable: boolean;
    reason: string;
  }): Promise<void> {
    const failure = {
      runId: input.context.runId,
      cycleId: input.context.cycleId,
      attemptId: input.attemptId,
      attemptNumber: input.attemptNumber,
      failureClass: input.failureClass,
      reason: input.reason,
      correlationId: input.context.correlationId,
    };
    if (input.retryable && input.attemptNumber < SYNTHESIS_ROUTES.length) {
      await this.repository.scheduleRetry(failure);
      return;
    }
    await this.repository.exhaust(failure);
  }
}
