import {
  Global,
  Inject,
  Injectable,
  Module,
  type DynamicModule,
} from "@nestjs/common";

export const TELEMETRY_SINK = Symbol("TELEMETRY_SINK");

export type TelemetryEvent = {
  name: string;
  correlationId: string;
  attributes: Record<string, string>;
};

export interface TelemetrySink {
  export(event: TelemetryEvent): Promise<void>;
}

@Injectable()
class FoundationTelemetrySink implements TelemetrySink {
  constructor(private readonly shouldFail: boolean) {}

  async export(event: TelemetryEvent): Promise<void> {
    if (this.shouldFail) {
      throw new Error("controlled telemetry failure");
    }

    process.stdout.write(
      `${JSON.stringify({ level: "info", kind: "telemetry", ...event })}\n`,
    );
  }
}

@Injectable()
export class SafeTelemetry {
  constructor(@Inject(TELEMETRY_SINK) private readonly sink: TelemetrySink) {}

  async export(event: TelemetryEvent): Promise<void> {
    try {
      await this.sink.export(event);
    } catch (error) {
      process.stderr.write(
        `${JSON.stringify({
          level: "warn",
          kind: "telemetry_export_failed",
          correlationId: event.correlationId,
          message: error instanceof Error ? error.message : "unknown error",
        })}\n`,
      );
    }
  }
}

@Global()
@Module({})
export class TelemetryModule {
  static register(shouldFail: boolean): DynamicModule {
    return {
      module: TelemetryModule,
      providers: [
        {
          provide: TELEMETRY_SINK,
          useFactory: () => new FoundationTelemetrySink(shouldFail),
        },
        SafeTelemetry,
      ],
      exports: [SafeTelemetry],
    };
  }
}
