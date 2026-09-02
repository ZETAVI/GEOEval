import {
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

import type { AiTelemetryConfig } from "./ai-execution.config.js";
import { maskTelemetryData } from "./ai-telemetry.mask.js";

export { maskTelemetryData } from "./ai-telemetry.mask.js";

@Injectable()
export class AiTelemetryRuntime
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private sdk: NodeSDK | undefined;

  constructor(private readonly config: AiTelemetryConfig) {}

  onApplicationBootstrap(): void {
    const config = this.config;
    if (config.mode === "disabled") return;
    try {
      this.sdk = new NodeSDK({
        spanProcessors: [
          new LangfuseSpanProcessor({
            publicKey: config.publicKey,
            secretKey: config.secretKey,
            baseUrl: config.baseUrl,
            environment: config.environment,
            ...(config.release ? { release: config.release } : {}),
            exportMode: "batched",
            mediaUploadEnabled: false,
            shouldExportSpan: ({ otelSpan }) => otelSpan.name.startsWith("ai."),
            mask: ({ data }) => maskTelemetryData(data, config.contentMode),
          }),
        ],
      });
      this.sdk.start();
    } catch (error) {
      this.sdk = undefined;
      this.writeFailure("start", error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.sdk) return;
    try {
      await this.sdk.shutdown();
    } catch (error) {
      this.writeFailure("shutdown", error);
    } finally {
      this.sdk = undefined;
    }
  }

  private writeFailure(stage: string, error: unknown) {
    process.stderr.write(
      `${JSON.stringify({
        level: "warn",
        kind: "ai_telemetry_runtime_failed",
        stage,
        errorName: error instanceof Error ? error.name : "UnknownError",
      })}\n`,
    );
  }
}
