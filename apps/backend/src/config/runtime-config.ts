import { z } from "zod";

import type { AiExecutionConfig } from "../ai-execution/infrastructure/ai-execution.config.js";
import type { StoreLocationRuntimeConfig } from "../brand/infrastructure/store-location.config.js";

const localDatabaseUrl =
  "postgresql://geoeval:geoeval_local_only@127.0.0.1:55432/geoeval";
const localRedisUrl = "redis://127.0.0.1:56379";
const localAuthHashPepper = "geoeval_local_auth_hash_pepper_2026";

const commonSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GEOEVAL_TELEMETRY_FAIL: z.enum(["0", "1"]).default("0"),
});

const identityCleanupSchema = z.object({
  AUTH_SESSION_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(180)
    .default(30),
  AUTH_CHALLENGE_RETENTION_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .default(24),
  AUTH_IDENTITY_CLEANUP_BATCH_SIZE: z.coerce
    .number()
    .int()
    .min(1)
    .max(5000)
    .default(500),
});

const apiSchema = commonSchema.extend({
  ...identityCleanupSchema.shape,
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3300),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .default("http://127.0.0.1:3100,http://127.0.0.1:3200"),
  AGENCY_ACQUISITION_ENABLED: z.enum(["0", "1"]).default("0"),
  AUTH_CHALLENGE_MODE: z.literal("deterministic").default("deterministic"),
  AUTH_HASH_PEPPER: z.string().min(32),
  AUTH_DETERMINISTIC_CODE: z.string().regex(/^\d{6}$/),
  AUTH_CHALLENGE_LIFETIME_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(900)
    .default(300),
  AUTH_CHALLENGE_RESEND_SECONDS: z.coerce
    .number()
    .int()
    .min(10)
    .max(300)
    .default(60),
  AUTH_CHALLENGE_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3600)
    .default(900),
  AUTH_CHALLENGE_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5),
  AUTH_CHALLENGE_MAX_FAILED_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5),
  AUTH_CUSTOMER_SESSION_ABSOLUTE_SECONDS: z.coerce
    .number()
    .int()
    .min(3600)
    .max(30 * 24 * 60 * 60)
    .default(7 * 24 * 60 * 60),
  AUTH_CUSTOMER_SESSION_IDLE_SECONDS: z.coerce
    .number()
    .int()
    .min(900)
    .max(7 * 24 * 60 * 60)
    .default(24 * 60 * 60),
  AUTH_INTERNAL_SESSION_ABSOLUTE_SECONDS: z.coerce
    .number()
    .int()
    .min(3600)
    .max(7 * 24 * 60 * 60)
    .default(12 * 60 * 60),
  AUTH_INTERNAL_SESSION_IDLE_SECONDS: z.coerce
    .number()
    .int()
    .min(300)
    .max(24 * 60 * 60)
    .default(30 * 60),
  AUTH_SESSION_TOUCH_INTERVAL_SECONDS: z.coerce
    .number()
    .int()
    .min(30)
    .max(15 * 60)
    .default(5 * 60),
  STORE_LOCATION_MODE: z
    .enum(["disabled", "deterministic", "amap"])
    .default("disabled"),
  GEO_OPTIMIZATION_WRITER_MODE: z
    .enum(["disabled", "deterministic"])
    .default("disabled"),
  STORE_LOCATION_RECEIPT_SIGNING_SECRET: z.string().default(""),
  STORE_LOCATION_RECEIPT_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(300)
    .max(1800)
    .default(900),
  STORE_LOCATION_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(30000)
    .default(5000),
  AMAP_WEB_SERVICE_BASE_URL: z
    .string()
    .url()
    .default("https://restapi.amap.com"),
  AMAP_WEB_SERVICE_KEY: z.string().default(""),
});

const workerSchema = commonSchema.extend({
  AGENCY_COMMISSION_ENABLED: z.enum(["true", "false"]).default("false"),
  ORDER_SETTLEMENT_ENABLED: z.enum(["true", "false"]).default("false"),
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

const identityMaintenanceSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ...identityCleanupSchema.shape,
});

const identityBootstrapSchema = z.object({
  DATABASE_URL: z.string().min(1),
  IDENTITY_BOOTSTRAP_SECRET_DIGEST: z.string().regex(/^[0-9a-f]{64}$/i),
});

export type ApiConfig = {
  databaseUrl: string;
  port: number;
  corsOrigins: string[];
  telemetryShouldFail: boolean;
  runtimeEnvironment: "development" | "test" | "production";
  agencyAcquisitionEnabled: boolean;
  authChallengeMode: "deterministic";
  authHashPepper: string;
  authDeterministicCode: string;
  authCookieSecure: boolean;
  authChallengePolicy: {
    lifetimeMs: number;
    resendIntervalMs: number;
    windowMs: number;
    maximumRequestsPerWindow: number;
    maximumFailedAttempts: number;
  };
  authCleanupPolicy: IdentityCleanupPolicy;
  authSessionPolicy: {
    customerAbsoluteMs: number;
    customerIdleMs: number;
    internalAbsoluteMs: number;
    internalIdleMs: number;
    touchIntervalMs: number;
  };
  storeLocation: StoreLocationRuntimeConfig;
  geoOptimizationWriterMode: "disabled" | "deterministic";
};

export type IdentityCleanupPolicy = {
  sessionRetentionMs: number;
  challengeRetentionMs: number;
  batchSize: number;
};

export type IdentityMaintenanceConfig = {
  databaseUrl: string;
  authCleanupPolicy: IdentityCleanupPolicy;
};

export type IdentityBootstrapConfig = {
  databaseUrl: string;
  expectedSecretDigest: string;
};

export type WorkerConfig = {
  orderSettlementEnabled?: boolean;
  agencyCommissionEnabled?: boolean;
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
    GEO_OPTIMIZATION_WRITER_MODE:
      environment.GEO_OPTIMIZATION_WRITER_MODE ?? "deterministic",
  };
}

export function loadApiConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ApiConfig {
  const parsed = apiSchema.parse(withLocalDefaults(environment));
  if (
    parsed.NODE_ENV === "production" &&
    parsed.STORE_LOCATION_MODE === "deterministic"
  ) {
    throw new Error(
      "Deterministic Store Location provider is forbidden in production",
    );
  }
  if (
    parsed.STORE_LOCATION_MODE !== "disabled" &&
    parsed.STORE_LOCATION_RECEIPT_SIGNING_SECRET.length < 32
  ) {
    throw new Error(
      "STORE_LOCATION_RECEIPT_SIGNING_SECRET must contain at least 32 characters",
    );
  }
  if (
    parsed.STORE_LOCATION_MODE === "amap" &&
    !parsed.AMAP_WEB_SERVICE_KEY.trim()
  ) {
    throw new Error("AMAP_WEB_SERVICE_KEY is required in Amap mode");
  }
  const amapBaseUrl = new URL(parsed.AMAP_WEB_SERVICE_BASE_URL);
  if (
    parsed.STORE_LOCATION_MODE === "amap" &&
    parsed.NODE_ENV !== "test" &&
    amapBaseUrl.protocol !== "https:"
  ) {
    throw new Error("AMAP_WEB_SERVICE_BASE_URL must use HTTPS in Amap mode");
  }
  if (
    parsed.NODE_ENV === "production" &&
    parsed.AUTH_CHALLENGE_MODE === "deterministic"
  ) {
    throw new Error(
      "Deterministic authentication challenge delivery is forbidden in production",
    );
  }
  if (
    parsed.NODE_ENV === "production" &&
    parsed.GEO_OPTIMIZATION_WRITER_MODE === "deterministic"
  ) {
    throw new Error(
      "Deterministic Core Article Writer is forbidden in production",
    );
  }
  if (
    parsed.AUTH_CUSTOMER_SESSION_IDLE_SECONDS >
      parsed.AUTH_CUSTOMER_SESSION_ABSOLUTE_SECONDS ||
    parsed.AUTH_INTERNAL_SESSION_IDLE_SECONDS >
      parsed.AUTH_INTERNAL_SESSION_ABSOLUTE_SECONDS
  ) {
    throw new Error(
      "Authentication Session idle timeout must not exceed its absolute timeout",
    );
  }
  if (
    parsed.AUTH_CHALLENGE_RESEND_SECONDS > parsed.AUTH_CHALLENGE_WINDOW_SECONDS
  ) {
    throw new Error(
      "AUTH_CHALLENGE_RESEND_SECONDS must not exceed AUTH_CHALLENGE_WINDOW_SECONDS",
    );
  }
  return {
    databaseUrl: parsed.DATABASE_URL,
    port: parsed.PORT,
    corsOrigins: parsed.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
    telemetryShouldFail: parsed.GEOEVAL_TELEMETRY_FAIL === "1",
    runtimeEnvironment: parsed.NODE_ENV,
    agencyAcquisitionEnabled: parsed.AGENCY_ACQUISITION_ENABLED === "1",
    authChallengeMode: parsed.AUTH_CHALLENGE_MODE,
    authHashPepper: parsed.AUTH_HASH_PEPPER,
    authDeterministicCode: parsed.AUTH_DETERMINISTIC_CODE,
    authCookieSecure: parsed.NODE_ENV === "production",
    authChallengePolicy: {
      lifetimeMs: parsed.AUTH_CHALLENGE_LIFETIME_SECONDS * 1000,
      resendIntervalMs: parsed.AUTH_CHALLENGE_RESEND_SECONDS * 1000,
      windowMs: parsed.AUTH_CHALLENGE_WINDOW_SECONDS * 1000,
      maximumRequestsPerWindow: parsed.AUTH_CHALLENGE_MAX_REQUESTS,
      maximumFailedAttempts: parsed.AUTH_CHALLENGE_MAX_FAILED_ATTEMPTS,
    },
    authCleanupPolicy: cleanupPolicy(parsed),
    authSessionPolicy: {
      customerAbsoluteMs: parsed.AUTH_CUSTOMER_SESSION_ABSOLUTE_SECONDS * 1000,
      customerIdleMs: parsed.AUTH_CUSTOMER_SESSION_IDLE_SECONDS * 1000,
      internalAbsoluteMs: parsed.AUTH_INTERNAL_SESSION_ABSOLUTE_SECONDS * 1000,
      internalIdleMs: parsed.AUTH_INTERNAL_SESSION_IDLE_SECONDS * 1000,
      touchIntervalMs: parsed.AUTH_SESSION_TOUCH_INTERVAL_SECONDS * 1000,
    },
    storeLocation: {
      mode: parsed.STORE_LOCATION_MODE,
      receiptSigningSecret: parsed.STORE_LOCATION_RECEIPT_SIGNING_SECRET,
      receiptTtlSeconds: parsed.STORE_LOCATION_RECEIPT_TTL_SECONDS,
      requestTimeoutMs: parsed.STORE_LOCATION_REQUEST_TIMEOUT_MS,
      amapBaseUrl: parsed.AMAP_WEB_SERVICE_BASE_URL.replace(/\/$/, ""),
      amapWebServiceKey: parsed.AMAP_WEB_SERVICE_KEY,
    },
    geoOptimizationWriterMode: parsed.GEO_OPTIMIZATION_WRITER_MODE,
  };
}

export function loadIdentityMaintenanceConfig(
  environment: NodeJS.ProcessEnv = process.env,
): IdentityMaintenanceConfig {
  const parsed = identityMaintenanceSchema.parse(
    withLocalDefaults(environment),
  );
  return {
    databaseUrl: parsed.DATABASE_URL,
    authCleanupPolicy: cleanupPolicy(parsed),
  };
}

export function loadIdentityBootstrapConfig(
  environment: NodeJS.ProcessEnv = process.env,
): IdentityBootstrapConfig {
  const parsed = identityBootstrapSchema.parse(environment);
  return {
    databaseUrl: parsed.DATABASE_URL,
    expectedSecretDigest: parsed.IDENTITY_BOOTSTRAP_SECRET_DIGEST.toLowerCase(),
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
    orderSettlementEnabled: parsed.ORDER_SETTLEMENT_ENABLED === "true",
    agencyCommissionEnabled: parsed.AGENCY_COMMISSION_ENABLED === "true",
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

function cleanupPolicy(
  parsed: z.infer<typeof identityCleanupSchema>,
): IdentityCleanupPolicy {
  return {
    sessionRetentionMs:
      parsed.AUTH_SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    challengeRetentionMs:
      parsed.AUTH_CHALLENGE_RETENTION_HOURS * 60 * 60 * 1000,
    batchSize: parsed.AUTH_IDENTITY_CLEANUP_BATCH_SIZE,
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
