import {
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

import type { AiTelemetryConfig } from "./ai-execution.config.js";

@Injectable()
export class AiTelemetryRuntime
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private sdk: NodeSDK | undefined;

  constructor(private readonly config: AiTelemetryConfig) {}

  onApplicationBootstrap(): void {
    if (this.config.mode === "disabled") return;
    try {
      this.sdk = new NodeSDK({
        spanProcessors: [
          new LangfuseSpanProcessor({
            publicKey: this.config.publicKey,
            secretKey: this.config.secretKey,
            baseUrl: this.config.baseUrl,
            environment: this.config.environment,
            exportMode: "batched",
            mediaUploadEnabled: false,
            shouldExportSpan: ({ otelSpan }) => otelSpan.name.startsWith("ai."),
            mask: ({ data }) => maskTelemetryData(data),
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

export function maskTelemetryData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskTelemetryData);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      /(input|output|prompt|answer|content|raw|credential|authorization|secret|api.?key)/i.test(
        key,
      )
        ? "[redacted]"
        : maskTelemetryData(item),
    ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
