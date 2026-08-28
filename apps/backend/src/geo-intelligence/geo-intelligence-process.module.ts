import { Module } from "@nestjs/common";

import { AiExecutionModule } from "../ai-execution/ai-execution.module.js";
import { EvaluationProcessCoordinator } from "./application/evaluation-process.coordinator.js";
import { EvaluationSynthesisCoordinator } from "./application/evaluation-synthesis.coordinator.js";
import { EVALUATION_PROCESS_REPOSITORY } from "./domain/evaluation-process.repository.js";
import { EVALUATION_SYNTHESIS_REPOSITORY } from "./domain/evaluation-synthesis.repository.js";
import { PostgresEvaluationProcessRepository } from "./infrastructure/postgres-evaluation-process.repository.js";
import { PostgresEvaluationSynthesisRepository } from "./infrastructure/postgres-evaluation-synthesis.repository.js";

@Module({
  imports: [AiExecutionModule],
  providers: [
    PostgresEvaluationProcessRepository,
    PostgresEvaluationSynthesisRepository,
    {
      provide: EVALUATION_PROCESS_REPOSITORY,
      useExisting: PostgresEvaluationProcessRepository,
    },
    {
      provide: EVALUATION_SYNTHESIS_REPOSITORY,
      useExisting: PostgresEvaluationSynthesisRepository,
    },
    EvaluationSynthesisCoordinator,
    EvaluationProcessCoordinator,
  ],
  exports: [EvaluationProcessCoordinator],
})
export class GeoIntelligenceProcessModule {}
