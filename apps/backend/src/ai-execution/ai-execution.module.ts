import { Module } from "@nestjs/common";

import { AiExecutionService } from "./application/ai-execution.service.js";
import { AiSynthesisExecutionService } from "./application/ai-synthesis-execution.service.js";
import {
  AI_ATTEMPT_ADAPTER,
  DeterministicAiAttemptAdapter,
} from "./domain/ai-attempt.adapter.js";
import { AI_ATTEMPT_REPOSITORY } from "./domain/ai-attempt.repository.js";
import { AI_SYNTHESIS_ATTEMPT_REPOSITORY } from "./domain/ai-synthesis-attempt.repository.js";
import { PostgresAiAttemptRepository } from "./infrastructure/postgres-ai-attempt.repository.js";
import { PostgresAiSynthesisAttemptRepository } from "./infrastructure/postgres-ai-synthesis-attempt.repository.js";

@Module({
  providers: [
    PostgresAiAttemptRepository,
    PostgresAiSynthesisAttemptRepository,
    {
      provide: AI_ATTEMPT_REPOSITORY,
      useExisting: PostgresAiAttemptRepository,
    },
    {
      provide: AI_SYNTHESIS_ATTEMPT_REPOSITORY,
      useExisting: PostgresAiSynthesisAttemptRepository,
    },
    {
      provide: AI_ATTEMPT_ADAPTER,
      useFactory: () => new DeterministicAiAttemptAdapter(),
    },
    AiExecutionService,
    AiSynthesisExecutionService,
  ],
  exports: [AiExecutionService, AiSynthesisExecutionService],
})
export class AiExecutionModule {}
