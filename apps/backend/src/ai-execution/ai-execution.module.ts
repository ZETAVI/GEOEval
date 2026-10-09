import { Module, type DynamicModule } from "@nestjs/common";
import {
  EXECUTION_CENTER_PARSER,
  DelegatedParserExecutionService,
} from "./application/delegated-parser-execution.service.js";
import { PostgresExecutionCenterReceiptRepository } from "./infrastructure/postgres-execution-center-receipt.repository.js";
import { ExecutionCenterClient } from "./infrastructure/execution-center.client.js";
import { ExecutionCenterEventRuntime } from "./infrastructure/execution-center-event.runtime.js";
import { RealAiNativeAttemptCodec } from "./infrastructure/providers/real-ai-native-attempt.codec.js";
import type { AiAttemptAdapter } from "./domain/ai-attempt.adapter.js";

import { AiExecutionService } from "./application/ai-execution.service.js";
import { AiQuestionGenerationExecutionService } from "./application/ai-question-generation-execution.service.js";
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
import { AI_QUESTION_GENERATION_ATTEMPT_REPOSITORY } from "./domain/ai-question-generation-attempt.repository.js";
import { AI_SYNTHESIS_ATTEMPT_REPOSITORY } from "./domain/ai-synthesis-attempt.repository.js";
import { PostgresAiAttemptRepository } from "./infrastructure/postgres-ai-attempt.repository.js";
import { PostgresAiQuestionGenerationAttemptRepository } from "./infrastructure/postgres-ai-question-generation-attempt.repository.js";
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
        PostgresExecutionCenterReceiptRepository,
        {
          provide: EXECUTION_CENTER_PARSER,
          inject: [
            PostgresAiAttemptRepository,
            PostgresExecutionCenterReceiptRepository,
            AI_ATTEMPT_ADAPTER,
          ],
          useFactory: (
            attempts: PostgresAiAttemptRepository,
            receipts: PostgresExecutionCenterReceiptRepository,
            adapter: AiAttemptAdapter,
          ) =>
            new DelegatedParserExecutionService(
              attempts,
              receipts,
              adapter,
              new RealAiNativeAttemptCodec(),
              config.executionCenter
                ? new ExecutionCenterClient(config.executionCenter)
                : null,
              config.executionCenter,
              config.requestTimeoutMs,
            ),
        },
        {
          provide: ExecutionCenterEventRuntime,
          inject: [
            PostgresExecutionCenterReceiptRepository,
            EXECUTION_CENTER_PARSER,
          ],
          useFactory: (
            receipts: PostgresExecutionCenterReceiptRepository,
            parser: DelegatedParserExecutionService,
          ) =>
            new ExecutionCenterEventRuntime(
              receipts,
              config.executionCenter
                ? new ExecutionCenterClient(config.executionCenter)
                : null,
              parser,
              config.executionCenter?.centerRef,
            ),
        },
        PostgresAiAttemptRepository,
        PostgresAiQuestionGenerationAttemptRepository,
        PostgresAiSynthesisAttemptRepository,
        {
          provide: AI_ATTEMPT_REPOSITORY,
          useExisting: PostgresAiAttemptRepository,
        },
        {
          provide: AI_QUESTION_GENERATION_ATTEMPT_REPOSITORY,
          useExisting: PostgresAiQuestionGenerationAttemptRepository,
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
                ? new LangfuseAiAttemptTelemetry(config.telemetry.contentMode)
                : new NoopAiAttemptTelemetry(),
            ),
        },
        {
          provide: AiTelemetryRuntime,
          useFactory: () => new AiTelemetryRuntime(config.telemetry),
        },
        AiExecutionService,
        AiQuestionGenerationExecutionService,
        AiSynthesisExecutionService,
      ],
      exports: [
        AiExecutionService,
        AiQuestionGenerationExecutionService,
        AiSynthesisExecutionService,
      ],
    };
  }
}
