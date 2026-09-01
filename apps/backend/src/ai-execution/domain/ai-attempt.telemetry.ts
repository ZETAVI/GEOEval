import type {
  AiAdapterResult,
  ResolvedAiAttemptRequest,
} from "./ai-attempt.types.js";

export const AI_ATTEMPT_TELEMETRY = Symbol("AI_ATTEMPT_TELEMETRY");

export interface AiAttemptTelemetryHandle {
  finish(result: AiAdapterResult, latencyMs: number): void;
}

export interface AiAttemptTelemetry {
  start(request: ResolvedAiAttemptRequest): AiAttemptTelemetryHandle;
}

export class NoopAiAttemptTelemetry implements AiAttemptTelemetry {
  start(): AiAttemptTelemetryHandle {
    return { finish: () => undefined };
  }
}

export class SafeAiAttemptTelemetry implements AiAttemptTelemetry {
  private readonly noop = new NoopAiAttemptTelemetry();

  constructor(private readonly delegate: AiAttemptTelemetry) {}

  start(request: ResolvedAiAttemptRequest): AiAttemptTelemetryHandle {
    try {
      const handle = this.delegate.start(request);
      return {
        finish: (result, latencyMs) => {
          try {
            handle.finish(result, latencyMs);
          } catch (error) {
            this.writeFailure(request.correlationId, error);
          }
        },
      };
    } catch (error) {
      this.writeFailure(request.correlationId, error);
      return this.noop.start();
    }
  }

  private writeFailure(correlationId: string, error: unknown) {
    process.stderr.write(
      `${JSON.stringify({
        level: "warn",
        kind: "ai_telemetry_failed",
        correlationId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      })}\n`,
    );
  }
}
