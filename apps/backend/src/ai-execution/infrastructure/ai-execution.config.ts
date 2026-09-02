export type AiTelemetryContentMode = "metadata-only" | "local-diagnostic";

export type AiTelemetryConfig =
  | { mode: "disabled" }
  | {
      mode: "langfuse";
      publicKey: string;
      secretKey: string;
      baseUrl: string;
      environment: string;
      contentMode: AiTelemetryContentMode;
      release?: string;
    };

type CommonAiExecutionConfig = {
  requestTimeoutMs: number;
  ambiguityTimeoutMs: number;
  telemetry: AiTelemetryConfig;
};

export type DeterministicAiExecutionConfig = CommonAiExecutionConfig & {
  mode: "deterministic";
};

export type RealProviderConnection = {
  baseUrl: string;
  apiKey: string;
};

export type RealAiExecutionConfig = CommonAiExecutionConfig & {
  mode: "real";
  tokenHub: RealProviderConnection;
  ark: RealProviderConnection;
  modelStudio: RealProviderConnection;
  qianfan: RealProviderConnection;
};

export type AiExecutionConfig =
  DeterministicAiExecutionConfig | RealAiExecutionConfig;
