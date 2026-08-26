import { Module } from "@nestjs/common";

import { BrandModule } from "../brand/brand.module.js";
import { EvaluationService } from "./application/evaluation.service.js";
import { EVALUATION_REPOSITORY } from "./domain/evaluation.repository.js";
import {
  DeterministicEvaluationQuestionGenerator,
  QUESTION_GENERATOR,
} from "./domain/question-generator.js";
import { PostgresEvaluationRepository } from "./infrastructure/postgres-evaluation.repository.js";
import { EvaluationController } from "./presentation/evaluation.controller.js";

@Module({
  imports: [BrandModule],
  controllers: [EvaluationController],
  providers: [
    PostgresEvaluationRepository,
    {
      provide: EVALUATION_REPOSITORY,
      useExisting: PostgresEvaluationRepository,
    },
    {
      provide: QUESTION_GENERATOR,
      useClass: DeterministicEvaluationQuestionGenerator,
    },
    EvaluationService,
  ],
})
export class GeoIntelligenceModule {}
