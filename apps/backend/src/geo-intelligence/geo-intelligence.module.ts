import { Module } from "@nestjs/common";

import { BrandModule } from "../brand/brand.module.js";
import { EvaluationReportService } from "./application/evaluation-report.service.js";
import { EvaluationService } from "./application/evaluation.service.js";
import { EVALUATION_REPORT_REPOSITORY } from "./domain/evaluation-report.repository.js";
import { EVALUATION_REPOSITORY } from "./domain/evaluation.repository.js";
import {
  DeterministicEvaluationQuestionGenerator,
  QUESTION_GENERATOR,
} from "./domain/question-generator.js";
import { PostgresEvaluationRepository } from "./infrastructure/postgres-evaluation.repository.js";
import { PostgresEvaluationReportRepository } from "./infrastructure/postgres-evaluation-report.repository.js";
import { EvaluationController } from "./presentation/evaluation.controller.js";

@Module({
  imports: [BrandModule],
  controllers: [EvaluationController],
  providers: [
    PostgresEvaluationRepository,
    PostgresEvaluationReportRepository,
    {
      provide: EVALUATION_REPOSITORY,
      useExisting: PostgresEvaluationRepository,
    },
    {
      provide: EVALUATION_REPORT_REPOSITORY,
      useExisting: PostgresEvaluationReportRepository,
    },
    {
      provide: QUESTION_GENERATOR,
      useClass: DeterministicEvaluationQuestionGenerator,
    },
    EvaluationService,
    EvaluationReportService,
  ],
})
export class GeoIntelligenceModule {}
