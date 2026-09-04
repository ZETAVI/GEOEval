import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";

import { AiQuestionGenerationExecutionService } from "../../ai-execution/application/ai-question-generation-execution.service.js";
import {
  EVALUATION_QUESTION_PREPARATION_REPOSITORY,
  type EvaluationQuestionPreparationRepository,
} from "../domain/evaluation-question-preparation.repository.js";
import type { EvaluationQuestionPreparationContext } from "../domain/evaluation-question-preparation.types.js";
import {
  EVALUATION_QUESTION_GENERATION_MODEL_CONTRACT_VERSION,
  EVALUATION_QUESTION_SET_CONTRACT_VERSION,
  EvaluationQuestionGenerationSemanticError,
  parseAndProjectEvaluationQuestionModelOutput,
} from "../domain/evaluation-question-generation-model.contract.js";
import {
  EVALUATION_PROCESS_COMPLETED,
  type EvaluationProcessResult,
} from "../domain/evaluation-process.result.js";
import {
  buildFrozenEvaluationQuestionGenerationTask,
  evaluationQuestionGenerationTaskContext,
} from "../evaluation-question-generation.policy.js";
import {
  EVALUATION_OBJECTIVITY_PROFILE,
  EVALUATION_PLATFORM_POLICY,
} from "../evaluation-policy.js";

const QUESTION_GENERATION_ROUTES = [
  {
    routePolicyId: "evaluation.question-generation.qwen-primary@1",
    requestedModel: "qwen3.8-flash",
  },
  {
    routePolicyId: "evaluation.question-generation.qwen-primary@1",
    requestedModel: "qwen3.8-flash",
  },
  {
    routePolicyId: "evaluation.question-generation.hy3-fallback@1",
    requestedModel: "hy3",
  },
] as const;

const questionPreparationWorkSchema = z.object({
  preparationId: z.string().uuid(),
  sequence: z.number().int().min(1),
  attemptNumber: z.number().int().min(1).max(QUESTION_GENERATION_ROUTES.length),
});

@Injectable()
export class EvaluationQuestionPreparationCoordinator {
  constructor(
    @Inject(EVALUATION_QUESTION_PREPARATION_REPOSITORY)
    private readonly repository: EvaluationQuestionPreparationRepository,
    @Inject(AiQuestionGenerationExecutionService)
    private readonly aiExecution: AiQuestionGenerationExecutionService,
  ) {}

  async process(
    payload: Record<string, unknown>,
  ): Promise<EvaluationProcessResult> {
    const work = questionPreparationWorkSchema.parse(payload);
    const context = await this.repository.getContext(
      work.preparationId,
      work.sequence,
    );
    if (!context) return EVALUATION_PROCESS_COMPLETED;
    const route = QUESTION_GENERATION_ROUTES[work.attemptNumber - 1]!;
    const outcome = await this.aiExecution.execute({
      preparationId: context.id,
      sequence: context.currentSequence,
      purpose: "EVALUATION_QUESTION_GENERATION",
      attemptNumber: work.attemptNumber,
      routePolicyId: route.routePolicyId,
      requestedModel: route.requestedModel,
      correlationId: context.correlationId,
      input: buildFrozenEvaluationQuestionGenerationTask(
        evaluationQuestionGenerationTaskContext(context.brandSnapshot),
        {
          instruction: context.instruction,
          outputContract: context.outputContract,
        },
      ),
    });
    if (outcome.kind === "DEFERRED") return outcome;
    if (outcome.kind === "FAILED") {
      await this.handleFailure({
        context,
        attemptId: outcome.attemptId,
        attemptNumber: work.attemptNumber,
        failureClass: outcome.failureClass,
        retryable: outcome.retryable,
        reason: "Question generation execution failed",
      });
      return EVALUATION_PROCESS_COMPLETED;
    }

    let questions;
    try {
      questions = parseAndProjectEvaluationQuestionModelOutput(outcome.output, {
        companyName: context.brandSnapshot.companyName,
      });
    } catch (error) {
      if (
        !(error instanceof z.ZodError) &&
        !(error instanceof EvaluationQuestionGenerationSemanticError)
      ) {
        throw error;
      }
      await this.aiExecution.rejectSemantics(outcome.attemptId, {
        failureClass: "SEMANTIC_CONTRACT_REJECTED",
        modelContractVersion:
          EVALUATION_QUESTION_GENERATION_MODEL_CONTRACT_VERSION,
        domainContractVersion: EVALUATION_QUESTION_SET_CONTRACT_VERSION,
      });
      await this.handleFailure({
        context,
        attemptId: outcome.attemptId,
        attemptNumber: work.attemptNumber,
        failureClass: "SEMANTIC_CONTRACT_REJECTED",
        retryable: true,
        reason: "Question-generation output failed the accepted contract",
      });
      return EVALUATION_PROCESS_COMPLETED;
    }

    await this.repository.accept({
      preparationId: context.id,
      sequence: context.currentSequence,
      attemptId: outcome.attemptId,
      platforms: EVALUATION_PLATFORM_POLICY,
      objectivityProfile: EVALUATION_OBJECTIVITY_PROFILE,
      questions,
    });
    return EVALUATION_PROCESS_COMPLETED;
  }

  reconcile(limit: number): Promise<number> {
    return this.repository.reconcile(limit);
  }

  private async handleFailure(input: {
    context: EvaluationQuestionPreparationContext;
    attemptId: string;
    attemptNumber: number;
    failureClass: string;
    retryable: boolean;
    reason: string;
  }): Promise<void> {
    const failure = {
      preparationId: input.context.id,
      sequence: input.context.currentSequence,
      attemptId: input.attemptId,
      attemptNumber: input.attemptNumber,
      failureClass: input.failureClass,
      reason: input.reason,
      correlationId: input.context.correlationId,
    };
    if (
      input.retryable &&
      input.attemptNumber < QUESTION_GENERATION_ROUTES.length
    ) {
      await this.repository.scheduleRetry(failure);
      return;
    }
    await this.repository.exhaust(failure);
  }
}
