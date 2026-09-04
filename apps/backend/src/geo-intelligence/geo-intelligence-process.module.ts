import { Module, type DynamicModule } from "@nestjs/common";

import { AiExecutionModule } from "../ai-execution/ai-execution.module.js";
import type { AiExecutionConfig } from "../ai-execution/infrastructure/ai-execution.config.js";
import { EvaluationProcessCoordinator } from "./application/evaluation-process.coordinator.js";
import { EvaluationQuestionPreparationCoordinator } from "./application/evaluation-question-preparation.coordinator.js";
import { EvaluationSynthesisCoordinator } from "./application/evaluation-synthesis.coordinator.js";
import { EVALUATION_PROCESS_REPOSITORY } from "./domain/evaluation-process.repository.js";
import { EVALUATION_QUESTION_PREPARATION_REPOSITORY } from "./domain/evaluation-question-preparation.repository.js";
import { EVALUATION_SYNTHESIS_REPOSITORY } from "./domain/evaluation-synthesis.repository.js";
import { PostgresEvaluationProcessRepository } from "./infrastructure/postgres-evaluation-process.repository.js";
import { PostgresEvaluationQuestionPreparationRepository } from "./infrastructure/postgres-evaluation-question-preparation.repository.js";
import { PostgresEvaluationSynthesisRepository } from "./infrastructure/postgres-evaluation-synthesis.repository.js";

@Module({})
export class GeoIntelligenceProcessModule {
  static register(config: AiExecutionConfig): DynamicModule {
    return {
      module: GeoIntelligenceProcessModule,
      imports: [AiExecutionModule.register(config)],
      providers: [
        PostgresEvaluationProcessRepository,
        PostgresEvaluationQuestionPreparationRepository,
        PostgresEvaluationSynthesisRepository,
        {
          provide: EVALUATION_PROCESS_REPOSITORY,
          useExisting: PostgresEvaluationProcessRepository,
        },
        {
          provide: EVALUATION_QUESTION_PREPARATION_REPOSITORY,
          useExisting: PostgresEvaluationQuestionPreparationRepository,
        },
        {
          provide: EVALUATION_SYNTHESIS_REPOSITORY,
          useExisting: PostgresEvaluationSynthesisRepository,
        },
        EvaluationSynthesisCoordinator,
        EvaluationProcessCoordinator,
        EvaluationQuestionPreparationCoordinator,
      ],
      exports: [
        EvaluationProcessCoordinator,
        EvaluationQuestionPreparationCoordinator,
      ],
    };
  }
}
