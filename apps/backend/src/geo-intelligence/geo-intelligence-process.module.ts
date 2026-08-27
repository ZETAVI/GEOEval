import { Module } from "@nestjs/common";

import { AiExecutionModule } from "../ai-execution/ai-execution.module.js";
import { EvaluationProcessCoordinator } from "./application/evaluation-process.coordinator.js";
import { EVALUATION_PROCESS_REPOSITORY } from "./domain/evaluation-process.repository.js";
import { PostgresEvaluationProcessRepository } from "./infrastructure/postgres-evaluation-process.repository.js";

@Module({
  imports: [AiExecutionModule],
  providers: [
    PostgresEvaluationProcessRepository,
    {
      provide: EVALUATION_PROCESS_REPOSITORY,
      useExisting: PostgresEvaluationProcessRepository,
    },
    EvaluationProcessCoordinator,
  ],
  exports: [EvaluationProcessCoordinator],
})
export class GeoIntelligenceProcessModule {}
