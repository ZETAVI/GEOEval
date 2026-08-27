import { Module } from "@nestjs/common";

import { AiExecutionService } from "./application/ai-execution.service.js";
import {
  AI_ATTEMPT_ADAPTER,
  DeterministicAiAttemptAdapter,
} from "./domain/ai-attempt.adapter.js";
import { AI_ATTEMPT_REPOSITORY } from "./domain/ai-attempt.repository.js";
import { PostgresAiAttemptRepository } from "./infrastructure/postgres-ai-attempt.repository.js";

@Module({
  providers: [
    PostgresAiAttemptRepository,
    {
      provide: AI_ATTEMPT_REPOSITORY,
      useExisting: PostgresAiAttemptRepository,
    },
    {
      provide: AI_ATTEMPT_ADAPTER,
      useFactory: () => new DeterministicAiAttemptAdapter(),
    },
    AiExecutionService,
  ],
  exports: [AiExecutionService],
})
export class AiExecutionModule {}
