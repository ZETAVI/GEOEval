import { Module, type DynamicModule } from "@nestjs/common";

import { AiExecutionService } from "./application/ai-execution.service.js";
import { AiSynthesisExecutionService } from "./application/ai-synthesis-execution.service.js";
import {
  AI_ATTEMPT_ADAPTER,
  AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS,
} from "./domain/ai-attempt.adapter.js";
import {
  AI_ATTEMPT_TELEMETRY,
  NoopAiAttemptTelemetry,
  SafeAiAttemptTelemetry,
} from "./domain/ai-attempt.telemetry.js";
import { AI_ATTEMPT_REPOSITORY } from "./domain/ai-attempt.repository.js";
import { AI_SYNTHESIS_ATTEMPT_REPOSITORY } from "./domain/ai-synthesis-attempt.repository.js";
import { PostgresAiAttemptRepository } from "./infrastructure/postgres-ai-attempt.repository.js";
import { PostgresAiSynthesisAttemptRepository } from "./infrastructure/postgres-ai-synthesis-attempt.repository.js";
import { DeterministicAiAttemptAdapter } from "./infrastructure/deterministic-ai-attempt.adapter.js";
import { AiTelemetryRuntime } from "./infrastructure/ai-telemetry.runtime.js";
import { LangfuseAiAttemptTelemetry } from "./infrastructure/langfuse-ai-attempt.telemetry.js";
import type { AiExecutionConfig } from "./infrastructure/ai-execution.config.js";
import { RealAiAttemptAdapter } from "./infrastructure/providers/real-ai-attempt.adapter.js";

@Module({})
export class AiExecutionModule {
  static register(config: AiExecutionConfig): DynamicModule {
    return {
      module: AiExecutionModule,
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
          useFactory: () =>
            config.mode === "real"
              ? new RealAiAttemptAdapter(config)
              : new DeterministicAiAttemptAdapter(),
        },
        {
          provide: AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS,
          useValue: config.ambiguityTimeoutMs,
        },
        {
          provide: AI_ATTEMPT_TELEMETRY,
          useFactory: () =>
            new SafeAiAttemptTelemetry(
              config.telemetry.mode === "langfuse"
                ? new LangfuseAiAttemptTelemetry()
                : new NoopAiAttemptTelemetry(),
            ),
        },
        {
          provide: AiTelemetryRuntime,
          useFactory: () => new AiTelemetryRuntime(config.telemetry),
        },
        AiExecutionService,
        AiSynthesisExecutionService,
      ],
      exports: [AiExecutionService, AiSynthesisExecutionService],
    };
  }
}
