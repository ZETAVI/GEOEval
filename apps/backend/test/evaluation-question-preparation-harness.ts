import { AiQuestionGenerationExecutionService } from "../src/ai-execution/application/ai-question-generation-execution.service.js";
import { DeterministicAiAttemptAdapter } from "../src/ai-execution/infrastructure/deterministic-ai-attempt.adapter.js";
import { PostgresAiQuestionGenerationAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-question-generation-attempt.repository.js";
import { EvaluationQuestionPreparationCoordinator } from "../src/geo-intelligence/application/evaluation-question-preparation.coordinator.js";
import type { EvaluationService } from "../src/geo-intelligence/application/evaluation.service.js";
import type { EvaluationDefinitionView } from "../src/geo-intelligence/domain/evaluation.types.js";
import { PostgresEvaluationQuestionPreparationRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-question-preparation.repository.js";
import type { PrismaService } from "../src/infrastructure/prisma.service.js";

export function createEvaluationQuestionPreparationHarness(
  prisma: PrismaService,
) {
  const repository = new PostgresEvaluationQuestionPreparationRepository(
    prisma,
  );
  const execution = new AiQuestionGenerationExecutionService(
    new PostgresAiQuestionGenerationAttemptRepository(prisma),
    new DeterministicAiAttemptAdapter(),
    2_000,
  );
  const coordinator = new EvaluationQuestionPreparationCoordinator(
    repository,
    execution,
  );
  async function processPreparation(
    preparationId: string,
    sequence = 1,
    attemptNumber = 1,
  ): Promise<void> {
    await coordinator.process({ preparationId, sequence, attemptNumber });
    await prisma.productOutboxEvent.updateMany({
      where: {
        aggregateId: preparationId,
        eventType: "evaluation.definition.prepare.requested",
        status: { not: "COMPLETED" },
      },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }
  return {
    repository,
    coordinator,
    processPreparation,
    async prepareReadyDefinition(
      evaluations: EvaluationService,
      accountId: string,
      brandId: string,
    ): Promise<EvaluationDefinitionView> {
      let state = await evaluations.prepareDefinition(accountId, brandId);
      if (state.status === "PREPARING") {
        await processPreparation(state.preparationId);
        state =
          (await evaluations.observeDefinition(accountId, brandId)) ?? state;
      }
      if (state.status !== "READY" || !state.definition) {
        throw new Error("Deterministic question preparation did not complete");
      }
      return state.definition;
    },
  };
}
