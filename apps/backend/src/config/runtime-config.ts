import { z } from "zod";

import type { AiExecutionConfig } from "../ai-execution/infrastructure/ai-execution.config.js";

const localDatabaseUrl =
  "postgresql://geoeval:geoeval_local_only@127.0.0.1:55432/geoeval";
const localRedisUrl = "redis://127.0.0.1:56379";
const localAuthHashPepper = "geoeval_local_auth_hash_pepper_2026";

const commonSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GEOEVAL_TELEMETRY_FAIL: z.enum(["0", "1"]).default("0"),
});

const apiSchema = commonSchema.extend({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3300),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .default("http://127.0.0.1:3100,http://127.0.0.1:3200"),
  AUTH_CHALLENGE_MODE: z.literal("deterministic").default("deterministic"),
  AUTH_HASH_PEPPER: z.string().min(32),
  AUTH_DETERMINISTIC_CODE: z.string().regex(/^\d{6}$/),
});

const workerSchema = commonSchema.extend({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  REDIS_URL: z.string().min(1),
  AI_EXECUTION_MODE: z.enum(["deterministic", "real"]).default("deterministic"),
  AI_PROVIDER_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(600_000)
    .default(180_000),
  AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(2_000)
    .max(900_000)
    .default(210_000),
  TOKENHUB_BASE_URL: z
    .string()
    .url()
    .default("https://tokenhub.tencentmaas.com/v1"),
  ARK_BASE_URL: z
    .string()
    .url()
    .default("https://ark.cn-beijing.volces.com/api/v3"),
  DASHSCOPE_BASE_URL: z
    .string()
    .url()
    .default("https://dashscope.aliyuncs.com/compatible-mode/v1"),
  QIANFAN_BASE_URL: z.string().url().default("https://qianfan.baidubce.com/v2"),
  TOKENHUB_API_KEY: z.string().default(""),
  ARK_API_KEY: z.string().default(""),
  DASHSCOPE_API_KEY: z.string().default(""),
  QIANFAN_API_KEY: z.string().default(""),
  AI_TELEMETRY_MODE: z.enum(["disabled", "langfuse"]).default("disabled"),
  AI_TELEMETRY_CONTENT_MODE: z
    .enum(["metadata-only", "local-diagnostic"])
    .default("metadata-only"),
  LANGFUSE_SECRET_KEY: z.string().default(""),
  LANGFUSE_PUBLIC_KEY: z.string().default(""),
  LANGFUSE_BASE_URL: z.string().url().default("https://us.cloud.langfuse.com"),
  LANGFUSE_TRACING_ENVIRONMENT: z.string().min(1).default("development"),
  LANGFUSE_RELEASE: z.string().trim().max(200).default(""),
});

export type ApiConfig = {
  databaseUrl: string;
  port: number;
  corsOrigins: string[];
  telemetryShouldFail: boolean;
  runtimeEnvironment: "development" | "test" | "production";
  authChallengeMode: "deterministic";
  authHashPepper: string;
  authDeterministicCode: string;
  authCookieSecure: boolean;
};

export type WorkerConfig = {
  databaseUrl: string;
  redisUrl: string;
  telemetryShouldFail: boolean;
  runtimeEnvironment: "development" | "test" | "production";
  aiExecution: AiExecutionConfig;
};

function withLocalDefaults(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (environment.GEOEVAL_LOCAL_DEFAULTS !== "1") {
    return environment;
  }

  return {
    ...environment,
    DATABASE_URL: environment.DATABASE_URL ?? localDatabaseUrl,
    REDIS_URL: environment.REDIS_URL ?? localRedisUrl,
    AUTH_HASH_PEPPER: environment.AUTH_HASH_PEPPER ?? localAuthHashPepper,
    AUTH_DETERMINISTIC_CODE: environment.AUTH_DETERMINISTIC_CODE ?? "246810",
  };
}

export function loadApiConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ApiConfig {
  const parsed = apiSchema.parse(withLocalDefaults(environment));
  if (
    parsed.NODE_ENV === "production" &&
    parsed.AUTH_CHALLENGE_MODE === "deterministic"
  ) {
    throw new Error(
      "Deterministic authentication challenge delivery is forbidden in production",
    );
  }
  return {
    databaseUrl: parsed.DATABASE_URL,
    port: parsed.PORT,
    corsOrigins: parsed.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
    telemetryShouldFail: parsed.GEOEVAL_TELEMETRY_FAIL === "1",
    runtimeEnvironment: parsed.NODE_ENV,
    authChallengeMode: parsed.AUTH_CHALLENGE_MODE,
    authHashPepper: parsed.AUTH_HASH_PEPPER,
    authDeterministicCode: parsed.AUTH_DETERMINISTIC_CODE,
    authCookieSecure: parsed.NODE_ENV === "production",
  };
}

export function loadWorkerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): WorkerConfig {
  const parsed = workerSchema.parse(withLocalDefaults(environment));
  if (
    parsed.NODE_ENV === "production" &&
    parsed.AI_EXECUTION_MODE === "deterministic"
  ) {
    throw new Error(
      "Deterministic AI execution is forbidden in production until S6 replaces the adapter",
    );
  }
  if (parsed.AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS <= parsed.AI_PROVIDER_TIMEOUT_MS) {
    throw new Error(
      "AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS must be greater than AI_PROVIDER_TIMEOUT_MS",
    );
  }
  const aiExecution: AiExecutionConfig =
    parsed.AI_EXECUTION_MODE === "deterministic"
      ? {
          mode: "deterministic",
          requestTimeoutMs: parsed.AI_PROVIDER_TIMEOUT_MS,
          ambiguityTimeoutMs: parsed.AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS,
          telemetry: aiTelemetryConfig(parsed),
        }
      : {
          mode: "real",
          requestTimeoutMs: parsed.AI_PROVIDER_TIMEOUT_MS,
          ambiguityTimeoutMs: parsed.AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS,
          telemetry: aiTelemetryConfig(parsed),
          tokenHub: providerConnection(parsed, "TOKENHUB"),
          ark: providerConnection(parsed, "ARK"),
          modelStudio: providerConnection(parsed, "DASHSCOPE"),
          qianfan: providerConnection(parsed, "QIANFAN"),
        };
  if (
    aiExecution.mode === "real" &&
    parsed.NODE_ENV !== "test" &&
    new URL(aiExecution.modelStudio.baseUrl).hostname ===
      "dashscope.aliyuncs.com"
  ) {
    throw new Error(
      "Real AI execution requires the approved workspace-dedicated DASHSCOPE_BASE_URL",
    );
  }
  return {
    databaseUrl: parsed.DATABASE_URL,
    redisUrl: parsed.REDIS_URL,
    telemetryShouldFail: parsed.GEOEVAL_TELEMETRY_FAIL === "1",
    runtimeEnvironment: parsed.NODE_ENV,
    aiExecution,
  };
}

function aiTelemetryConfig(
  parsed: z.infer<typeof workerSchema>,
): AiExecutionConfig["telemetry"] {
  if (
    parsed.NODE_ENV === "production" &&
    parsed.AI_TELEMETRY_CONTENT_MODE === "local-diagnostic"
  ) {
    throw new Error(
      "AI_TELEMETRY_CONTENT_MODE=local-diagnostic is forbidden in production",
    );
  }
  if (parsed.AI_TELEMETRY_MODE === "disabled") return { mode: "disabled" };
  if (!parsed.LANGFUSE_PUBLIC_KEY.trim()) {
    throw new Error(
      "LANGFUSE_PUBLIC_KEY is required when AI_TELEMETRY_MODE=langfuse",
    );
  }
  if (!parsed.LANGFUSE_SECRET_KEY.trim()) {
    throw new Error(
      "LANGFUSE_SECRET_KEY is required when AI_TELEMETRY_MODE=langfuse",
    );
  }
  const baseUrl = new URL(parsed.LANGFUSE_BASE_URL);
  if (parsed.NODE_ENV !== "test" && baseUrl.protocol !== "https:") {
    throw new Error("LANGFUSE_BASE_URL must use HTTPS");
  }
  return {
    mode: "langfuse",
    publicKey: parsed.LANGFUSE_PUBLIC_KEY,
    secretKey: parsed.LANGFUSE_SECRET_KEY,
    baseUrl: parsed.LANGFUSE_BASE_URL.replace(/\/$/, ""),
    environment: parsed.LANGFUSE_TRACING_ENVIRONMENT,
    contentMode: parsed.AI_TELEMETRY_CONTENT_MODE,
    ...(parsed.LANGFUSE_RELEASE ? { release: parsed.LANGFUSE_RELEASE } : {}),
  };
}

function providerConnection(
  parsed: z.infer<typeof workerSchema>,
  prefix: "TOKENHUB" | "ARK" | "DASHSCOPE" | "QIANFAN",
): { baseUrl: string; apiKey: string } {
  const baseUrl = parsed[`${prefix}_BASE_URL`];
  const apiKey = parsed[`${prefix}_API_KEY`];
  if (!apiKey.trim()) {
    throw new Error(`${prefix}_API_KEY is required for real AI execution`);
  }
  const normalized = new URL(baseUrl);
  if (parsed.NODE_ENV !== "test" && normalized.protocol !== "https:") {
    throw new Error(`${prefix}_BASE_URL must use HTTPS for real AI execution`);
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}
