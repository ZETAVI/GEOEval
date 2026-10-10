import { z } from "zod";

import type { AiExecutionConfig } from "../ai-execution/infrastructure/ai-execution.config.js";
import { parserExecutionCenterConfig } from "../ai-execution/infrastructure/execution-center.config.js";
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
  INTERNAL_DEMO_MODE: z.enum(["0", "1"]).default("0"),
  PORT: z.coerce.number().int().positive().default(3300),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .default("http://127.0.0.1:3100,http://127.0.0.1:3200"),
  AGENCY_ACQUISITION_ENABLED: z.enum(["0", "1"]).default("0"),
  AGENCY_WITHDRAWAL_ENABLED: z.enum(["0", "1"]).default("0"),
  AGENCY_WITHDRAWAL_KEY_HEX: z.string().default(""),
  AUTH_CHALLENGE_MODE: z
    .enum(["deterministic", "aliyun"])
    .default("deterministic"),
  AUTH_CHALLENGE_SENDING_ENABLED: z.enum(["0", "1"]).default("0"),
  AUTH_DEMO_SMS_FORWARD_SOURCES: z.string().default(""),
  AUTH_DEMO_SMS_FORWARD_TO: z.string().default(""),
  AUTH_DEMO_SMS_FORWARD_UNTIL: z.string().default(""),
  AUTH_HUMAN_VERIFICATION_MODE: z
    .enum(["disabled", "aliyun"])
    .default("disabled"),
  AUTH_CAPTCHA_UNAVAILABLE_MODE: z.enum(["deny", "limited"]).default("deny"),
  AUTH_CAPTCHA_MAX_CONSECUTIVE_UNAVAILABLE: z.coerce
    .number()
    .int()
    .min(0)
    .max(20)
    .default(0),
  ALIBABA_CLOUD_ACCESS_KEY_ID: z.string().default(""),
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: z.string().default(""),
  ALIYUN_CAPTCHA_SCENE_ID: z
    .string()
    .regex(/^[A-Za-z0-9_-]*$/)
    .max(64)
    .default(""),
  ALIYUN_CAPTCHA_ENDPOINT: z
    .enum([
      "captcha.cn-shanghai.aliyuncs.com",
      "captcha-dualstack.cn-shanghai.aliyuncs.com",
      "captcha-vpc.cn-shanghai.aliyuncs.com",
    ])
    .default("captcha.cn-shanghai.aliyuncs.com"),
  ALIYUN_SMS_SIGN_NAME: z.string().trim().max(100).default(""),
  ALIYUN_SMS_TEMPLATE_CODE: z
    .string()
    .regex(/^(?:SMS_[0-9]+)?$/)
    .default(""),
  ALIYUN_SMS_ENDPOINT: z
    .literal("dysmsapi.aliyuncs.com")
    .default("dysmsapi.aliyuncs.com"),
  AUTH_ALIYUN_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(10000)
    .default(3000),
  AUTH_HASH_PEPPER: z.string().min(32),
  AUTH_DETERMINISTIC_CODE: z.string().default(""),
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
    .default(3600),
  AUTH_CHALLENGE_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5),
  AUTH_CHALLENGE_DAILY_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(100_000)
    .default(100),
  AUTH_CHALLENGE_MONTHLY_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .default(2500),
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
    .enum(["disabled", "deterministic", "demo"])
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
  internalDemoMode: boolean;
  agencyAcquisitionEnabled: boolean;
  agencyWithdrawal?: {
    enabled: boolean;
    encryptionKeyHex: string;
  };
  authChallengeMode: "deterministic" | "aliyun";
  authChallengeSendingEnabled: boolean;
  authDemoSmsForwarding: {
    sourceMobiles: readonly string[];
    destinationMobile: string;
    expiresAtMs: number;
  } | null;
  authHumanVerificationMode: "disabled" | "aliyun";
  authHumanVerificationPolicy: {
    unavailableMode: "deny" | "limited";
    maximumConsecutiveUnavailable: number;
  };
  authAliyun: {
    accessKeyId: string;
    accessKeySecret: string;
    requestTimeoutMs: number;
    captchaSceneId: string;
    captchaEndpoint: string;
    smsSignName: string;
    smsTemplateCode: string;
    smsEndpoint: string;
  };
  authHashPepper: string;
  authDeterministicCode: string;
  authCookieSecure: boolean;
  authChallengePolicy: {
    lifetimeMs: number;
    resendIntervalMs: number;
    windowMs: number;
    maximumRequestsPerWindow: number;
    dailyMaximumRequests: number;
    monthlyMaximumRequests: number;
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
  geoOptimizationWriterMode: "disabled" | "deterministic" | "demo";
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
    AUTH_CHALLENGE_SENDING_ENABLED:
      environment.AUTH_CHALLENGE_SENDING_ENABLED ?? "1",
    GEO_OPTIMIZATION_WRITER_MODE:
      environment.GEO_OPTIMIZATION_WRITER_MODE ?? "deterministic",
  };
}

function parseDemoSmsForwarding(input: {
  AUTH_DEMO_SMS_FORWARD_SOURCES: string;
  AUTH_DEMO_SMS_FORWARD_TO: string;
  AUTH_DEMO_SMS_FORWARD_UNTIL: string;
  AUTH_CHALLENGE_MODE: "deterministic" | "aliyun";
  AUTH_HUMAN_VERIFICATION_MODE: "disabled" | "aliyun";
  INTERNAL_DEMO_MODE: "0" | "1";
}): ApiConfig["authDemoSmsForwarding"] {
  const sourcesText = input.AUTH_DEMO_SMS_FORWARD_SOURCES.trim();
  const destinationMobile = input.AUTH_DEMO_SMS_FORWARD_TO.trim();
  const untilText = input.AUTH_DEMO_SMS_FORWARD_UNTIL.trim();
  if (!sourcesText && !destinationMobile && !untilText) return null;
  if (
    !sourcesText ||
    !destinationMobile ||
    !untilText ||
    input.AUTH_CHALLENGE_MODE !== "aliyun" ||
    input.AUTH_HUMAN_VERIFICATION_MODE !== "aliyun" ||
    input.INTERNAL_DEMO_MODE !== "0"
  )
    throw new Error(
      "Demo SMS forwarding requires complete real-auth configuration",
    );

  const sourceMobiles = sourcesText.split(",").map((value) => value.trim());
  const mainlandMobile = /^\+861[3-9]\d{9}$/;
  if (
    sourceMobiles.length > 5 ||
    sourceMobiles.some((mobile) => !mainlandMobile.test(mobile)) ||
    new Set(sourceMobiles).size !== sourceMobiles.length ||
    !mainlandMobile.test(destinationMobile) ||
    sourceMobiles.includes(destinationMobile)
  )
    throw new Error(
      "Demo SMS forwarding mobiles must be distinct mainland numbers",
    );

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(untilText))
    throw new Error("Demo SMS forwarding expiry must be a UTC timestamp");
  const expiresAtMs = Date.parse(untilText);
  if (
    !Number.isFinite(expiresAtMs) ||
    expiresAtMs > Date.now() + 14 * 24 * 60 * 60 * 1000
  )
    throw new Error("Demo SMS forwarding expiry must be within 14 days");
  return { sourceMobiles, destinationMobile, expiresAtMs };
}

export function loadApiConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ApiConfig {
  const parsed = apiSchema.parse(withLocalDefaults(environment));
  const authDemoSmsForwarding = parseDemoSmsForwarding(parsed);
  if (
    parsed.AUTH_CHALLENGE_MODE === "deterministic" &&
    !/^\d{6}$/.test(parsed.AUTH_DETERMINISTIC_CODE)
  ) {
    throw new Error(
      "AUTH_DETERMINISTIC_CODE must be a six-digit code in deterministic mode",
    );
  }
  if (
    parsed.AGENCY_WITHDRAWAL_ENABLED === "1" &&
    !/^[0-9a-f]{64}$/i.test(parsed.AGENCY_WITHDRAWAL_KEY_HEX)
  ) {
    throw new Error(
      "AGENCY_WITHDRAWAL_KEY_HEX must contain 32-byte hex when withdrawals are enabled",
    );
  }
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
    parsed.AUTH_CHALLENGE_MODE === "deterministic" &&
    parsed.INTERNAL_DEMO_MODE !== "1"
  ) {
    throw new Error(
      "Deterministic authentication challenge delivery is forbidden in production",
    );
  }
  if (
    parsed.NODE_ENV === "production" &&
    parsed.AUTH_HUMAN_VERIFICATION_MODE !== "aliyun" &&
    parsed.INTERNAL_DEMO_MODE !== "1"
  ) {
    throw new Error(
      "Alibaba human verification is required for production authentication challenges",
    );
  }
  if (
    parsed.NODE_ENV === "production" &&
    parsed.INTERNAL_DEMO_MODE === "1" &&
    (parsed.AUTH_CHALLENGE_MODE !== "deterministic" ||
      parsed.AUTH_HUMAN_VERIFICATION_MODE !== "disabled")
  ) {
    throw new Error(
      "Internal demo authentication requires deterministic Challenge delivery and disabled human verification",
    );
  }
  if (
    (parsed.AUTH_CHALLENGE_MODE === "aliyun" ||
      parsed.AUTH_HUMAN_VERIFICATION_MODE === "aliyun") &&
    (!parsed.ALIBABA_CLOUD_ACCESS_KEY_ID.trim() ||
      !parsed.ALIBABA_CLOUD_ACCESS_KEY_SECRET.trim())
  ) {
    throw new Error(
      "Alibaba Cloud credentials are required for real authentication protection",
    );
  }
  if (
    parsed.AUTH_HUMAN_VERIFICATION_MODE === "aliyun" &&
    !parsed.ALIYUN_CAPTCHA_SCENE_ID.trim()
  ) {
    throw new Error(
      "ALIYUN_CAPTCHA_SCENE_ID is required for Alibaba human verification",
    );
  }
  if (
    parsed.AUTH_CHALLENGE_MODE === "aliyun" &&
    (!parsed.ALIYUN_SMS_SIGN_NAME.trim() ||
      !parsed.ALIYUN_SMS_TEMPLATE_CODE.trim())
  ) {
    throw new Error(
      "Alibaba SMS sign and template are required for real Challenge delivery",
    );
  }
  if (
    parsed.AUTH_CAPTCHA_UNAVAILABLE_MODE === "limited" &&
    parsed.AUTH_CAPTCHA_MAX_CONSECUTIVE_UNAVAILABLE < 1
  ) {
    throw new Error(
      "Limited CAPTCHA degradation requires a positive unavailable budget",
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
  if (
    parsed.AUTH_CHALLENGE_DAILY_MAX_REQUESTS >
    parsed.AUTH_CHALLENGE_MONTHLY_MAX_REQUESTS
  ) {
    throw new Error(
      "AUTH_CHALLENGE_DAILY_MAX_REQUESTS must not exceed the monthly maximum",
    );
  }
  return {
    databaseUrl: parsed.DATABASE_URL,
    port: parsed.PORT,
    corsOrigins: parsed.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
    telemetryShouldFail: parsed.GEOEVAL_TELEMETRY_FAIL === "1",
    runtimeEnvironment: parsed.NODE_ENV,
    internalDemoMode: parsed.INTERNAL_DEMO_MODE === "1",
    agencyAcquisitionEnabled: parsed.AGENCY_ACQUISITION_ENABLED === "1",
    agencyWithdrawal: {
      enabled: parsed.AGENCY_WITHDRAWAL_ENABLED === "1",
      encryptionKeyHex: parsed.AGENCY_WITHDRAWAL_KEY_HEX.toLowerCase(),
    },
    authChallengeMode: parsed.AUTH_CHALLENGE_MODE,
    authChallengeSendingEnabled: parsed.AUTH_CHALLENGE_SENDING_ENABLED === "1",
    authDemoSmsForwarding,
    authHumanVerificationMode: parsed.AUTH_HUMAN_VERIFICATION_MODE,
    authHumanVerificationPolicy: {
      unavailableMode: parsed.AUTH_CAPTCHA_UNAVAILABLE_MODE,
      maximumConsecutiveUnavailable:
        parsed.AUTH_CAPTCHA_MAX_CONSECUTIVE_UNAVAILABLE,
    },
    authAliyun: {
      accessKeyId: parsed.ALIBABA_CLOUD_ACCESS_KEY_ID,
      accessKeySecret: parsed.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
      requestTimeoutMs: parsed.AUTH_ALIYUN_REQUEST_TIMEOUT_MS,
      captchaSceneId: parsed.ALIYUN_CAPTCHA_SCENE_ID,
      captchaEndpoint: parsed.ALIYUN_CAPTCHA_ENDPOINT,
      smsSignName: parsed.ALIYUN_SMS_SIGN_NAME,
      smsTemplateCode: parsed.ALIYUN_SMS_TEMPLATE_CODE,
      smsEndpoint: parsed.ALIYUN_SMS_ENDPOINT,
    },
    authHashPepper: parsed.AUTH_HASH_PEPPER,
    authDeterministicCode: parsed.AUTH_DETERMINISTIC_CODE,
    authCookieSecure: parsed.NODE_ENV === "production",
    authChallengePolicy: {
      lifetimeMs: parsed.AUTH_CHALLENGE_LIFETIME_SECONDS * 1000,
      resendIntervalMs: parsed.AUTH_CHALLENGE_RESEND_SECONDS * 1000,
      windowMs: parsed.AUTH_CHALLENGE_WINDOW_SECONDS * 1000,
      maximumRequestsPerWindow: parsed.AUTH_CHALLENGE_MAX_REQUESTS,
      dailyMaximumRequests: parsed.AUTH_CHALLENGE_DAILY_MAX_REQUESTS,
      monthlyMaximumRequests: parsed.AUTH_CHALLENGE_MONTHLY_MAX_REQUESTS,
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
  const executionCenter = parserExecutionCenterConfig(
    environment,
    aiExecution.mode,
  );
  if (executionCenter) aiExecution.executionCenter = executionCenter;
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
