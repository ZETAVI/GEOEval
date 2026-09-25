import { Module, type DynamicModule } from "@nestjs/common";

import { AiExecutionModule } from "../ai-execution/ai-execution.module.js";
import type { AiExecutionConfig } from "../ai-execution/infrastructure/ai-execution.config.js";
import {
  BROWSER_SAMPLING_GATEWAY,
  type BrowserSamplingGateway,
} from "./domain/browser-sampling.gateway.js";
import { EvaluationProcessCoordinator } from "./application/evaluation-process.coordinator.js";
import { EvaluationQuestionPreparationCoordinator } from "./application/evaluation-question-preparation.coordinator.js";
import { EvaluationSynthesisCoordinator } from "./application/evaluation-synthesis.coordinator.js";
import { EVALUATION_PROCESS_REPOSITORY } from "./domain/evaluation-process.repository.js";
import { EVALUATION_QUESTION_PREPARATION_REPOSITORY } from "./domain/evaluation-question-preparation.repository.js";
import { EVALUATION_SYNTHESIS_REPOSITORY } from "./domain/evaluation-synthesis.repository.js";
import { PostgresEvaluationProcessRepository } from "./infrastructure/postgres-evaluation-process.repository.js";
import { PostgresEvaluationQuestionPreparationRepository } from "./infrastructure/postgres-evaluation-question-preparation.repository.js";
import { PostgresEvaluationSynthesisRepository } from "./infrastructure/postgres-evaluation-synthesis.repository.js";
import {
  BROWSER_SAMPLING_CONFIG,
  type BrowserSamplingConfig,
} from "./infrastructure/browser-sampling.config.js";
import { HttpBrowserSamplingGateway } from "./infrastructure/http-browser-sampling.gateway.js";

@Module({})
export class GeoIntelligenceProcessModule {
  static register(config: {
    aiExecution: AiExecutionConfig;
    evaluationSampling: BrowserSamplingConfig;
  }): DynamicModule {
    return {
      module: GeoIntelligenceProcessModule,
      imports: [AiExecutionModule.register(config.aiExecution)],
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
        {
          provide: BROWSER_SAMPLING_CONFIG,
          useValue: config.evaluationSampling,
        },
        {
          provide: BROWSER_SAMPLING_GATEWAY,
          useFactory: (): BrowserSamplingGateway =>
            config.evaluationSampling.mode === "browser-control-plane"
              ? new HttpBrowserSamplingGateway(config.evaluationSampling)
              : disabledBrowserSamplingGateway,
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

const disabledBrowserSamplingGateway: BrowserSamplingGateway = {
  async submitBatch() {
    throw new Error("Browser sampling is disabled");
  },
  async readBatch() {
    throw new Error("Browser sampling is disabled");
  },
};
