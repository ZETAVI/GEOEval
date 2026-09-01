import { Module, type DynamicModule } from "@nestjs/common";

import { BrandModule } from "../brand/brand.module.js";
import type { StoreLocationRuntimeConfig } from "../brand/infrastructure/store-location.config.js";
import { EvaluationReportService } from "./application/evaluation-report.service.js";
import { EvaluationService } from "./application/evaluation.service.js";
import { EVALUATION_REPORT_REPOSITORY } from "./domain/evaluation-report.repository.js";
import { EVALUATION_QUESTION_PREPARATION_REPOSITORY } from "./domain/evaluation-question-preparation.repository.js";
import { EVALUATION_REPOSITORY } from "./domain/evaluation.repository.js";
import { PostgresEvaluationRepository } from "./infrastructure/postgres-evaluation.repository.js";
import { PostgresEvaluationQuestionPreparationRepository } from "./infrastructure/postgres-evaluation-question-preparation.repository.js";
import { PostgresEvaluationReportRepository } from "./infrastructure/postgres-evaluation-report.repository.js";
import { EvaluationController } from "./presentation/evaluation.controller.js";

@Module({})
export class GeoIntelligenceModule {
  static register(storeLocation: StoreLocationRuntimeConfig): DynamicModule {
    return {
      module: GeoIntelligenceModule,
      imports: [BrandModule.register(storeLocation)],
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
          provide: EVALUATION_QUESTION_PREPARATION_REPOSITORY,
          useExisting: PostgresEvaluationQuestionPreparationRepository,
        },
        EvaluationService,
        EvaluationReportService,
      ],
    };
  }
}
