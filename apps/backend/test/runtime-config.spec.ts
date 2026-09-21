import { describe, expect, it } from "vitest";

import {
  loadApiConfig,
  loadIdentityBootstrapConfig,
  loadIdentityMaintenanceConfig,
  loadWorkerConfig,
} from "../src/config/runtime-config.js";

describe("process-scoped configuration", () => {
  it("lets the API start without worker-only Redis configuration", () => {
    const api = loadApiConfig({
      DATABASE_URL: "postgresql://example/api",
      AUTH_HASH_PEPPER: "test-auth-pepper-with-at-least-32-characters",
      AUTH_DETERMINISTIC_CODE: "246810",
    });
    expect(api.databaseUrl).toBe("postgresql://example/api");
    expect(api.geoOptimizationWriterMode).toBe("disabled");
    expect(api.authChallengeSendingEnabled).toBe(false);
    expect(api.authHumanVerificationMode).toBe("disabled");
  });

  it("requires an explicit demo Writer mode for production demonstration", () => {
    const production = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://example/api",
      AUTH_HASH_PEPPER: "test-auth-pepper-with-at-least-32-characters",
      AUTH_DETERMINISTIC_CODE: "246810",
      AUTH_CHALLENGE_MODE: "aliyun",
      AUTH_HUMAN_VERIFICATION_MODE: "aliyun",
      ALIBABA_CLOUD_ACCESS_KEY_ID: "access-key",
      ALIBABA_CLOUD_ACCESS_KEY_SECRET: "access-secret",
      ALIYUN_CAPTCHA_SCENE_ID: "18hnihr4",
      ALIYUN_SMS_SIGN_NAME: "approved-sign",
      ALIYUN_SMS_TEMPLATE_CODE: "SMS_123456",
    };
    const config = loadApiConfig({
      ...production,
      GEO_OPTIMIZATION_WRITER_MODE: "demo",
    });

    expect(config.geoOptimizationWriterMode).toBe("demo");
    expect(() =>
      loadApiConfig({
        ...production,
        GEO_OPTIMIZATION_WRITER_MODE: "deterministic",
      }),
    ).toThrow("forbidden in production");
  });

  it("rejects the same environment for the worker when Redis is absent", () => {
    expect(() =>
      loadWorkerConfig({ DATABASE_URL: "postgresql://example/worker" }),
    ).toThrow();
  });

  it("provides explicit local-only defaults only when opted in", () => {
    const worker = loadWorkerConfig({ GEOEVAL_LOCAL_DEFAULTS: "1" });
    expect(worker.redisUrl).toBe("redis://127.0.0.1:56379");
    expect(worker.orderSettlementEnabled).toBe(false);
    expect(worker.agencyCommissionEnabled).toBe(false);
    expect(
      loadWorkerConfig({
        GEOEVAL_LOCAL_DEFAULTS: "1",
        AGENCY_COMMISSION_ENABLED: "true",
      }).agencyCommissionEnabled,
    ).toBe(true);
    expect(
      loadWorkerConfig({
        GEOEVAL_LOCAL_DEFAULTS: "1",
        ORDER_SETTLEMENT_ENABLED: "true",
      }).orderSettlementEnabled,
    ).toBe(true);
    expect(worker.aiExecution).toMatchObject({
      mode: "deterministic",
      requestTimeoutMs: 180_000,
      ambiguityTimeoutMs: 210_000,
    });
    expect(
      loadApiConfig({ GEOEVAL_LOCAL_DEFAULTS: "1" }).geoOptimizationWriterMode,
    ).toBe("deterministic");
    expect(
      loadApiConfig({ GEOEVAL_LOCAL_DEFAULTS: "1" })
        .authChallengeSendingEnabled,
    ).toBe(true);
  });

  it("rejects deterministic challenge delivery in production", () => {
    expect(() =>
      loadApiConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://example/api",
        AUTH_HASH_PEPPER: "test-auth-pepper-with-at-least-32-characters",
        AUTH_DETERMINISTIC_CODE: "246810",
      }),
    ).toThrow("forbidden in production");
  });

  it("allows deterministic Challenge delivery only in the explicit internal demo", () => {
    const config = loadApiConfig({
      NODE_ENV: "production",
      INTERNAL_DEMO_MODE: "1",
      DATABASE_URL: "postgresql://example/api",
      AUTH_HASH_PEPPER: "test-auth-pepper-with-at-least-32-characters",
      AUTH_DETERMINISTIC_CODE: "246810",
      AUTH_CHALLENGE_MODE: "deterministic",
      AUTH_CHALLENGE_SENDING_ENABLED: "1",
      AUTH_HUMAN_VERIFICATION_MODE: "disabled",
      GEO_OPTIMIZATION_WRITER_MODE: "demo",
    });

    expect(config).toMatchObject({
      runtimeEnvironment: "production",
      internalDemoMode: true,
      authChallengeMode: "deterministic",
      authChallengeSendingEnabled: true,
      authHumanVerificationMode: "disabled",
      authCookieSecure: true,
      geoOptimizationWriterMode: "demo",
    });
    expect(() =>
      loadApiConfig({
        NODE_ENV: "production",
        INTERNAL_DEMO_MODE: "1",
        DATABASE_URL: "postgresql://example/api",
        AUTH_HASH_PEPPER: "test-auth-pepper-with-at-least-32-characters",
        AUTH_DETERMINISTIC_CODE: "246810",
        AUTH_CHALLENGE_MODE: "aliyun",
        AUTH_HUMAN_VERIFICATION_MODE: "disabled",
      }),
    ).toThrow("Internal demo authentication requires");
  });

  it("requires complete Alibaba authentication protection in production", () => {
    const base = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://example/api",
      AUTH_HASH_PEPPER: "test-auth-pepper-with-at-least-32-characters",
      AUTH_DETERMINISTIC_CODE: "246810",
      AUTH_CHALLENGE_MODE: "aliyun",
      AUTH_HUMAN_VERIFICATION_MODE: "aliyun",
    };
    expect(() => loadApiConfig(base)).toThrow("credentials are required");
    expect(
      loadApiConfig({
        ...base,
        ALIBABA_CLOUD_ACCESS_KEY_ID: "access-key",
        ALIBABA_CLOUD_ACCESS_KEY_SECRET: "access-secret",
        ALIYUN_CAPTCHA_SCENE_ID: "18hnihr4",
        ALIYUN_SMS_SIGN_NAME: "approved-sign",
        ALIYUN_SMS_TEMPLATE_CODE: "SMS_123456",
      }),
    ).toMatchObject({
      authChallengeMode: "aliyun",
      authHumanVerificationMode: "aliyun",
      authAliyun: {
        captchaSceneId: "18hnihr4",
        smsSignName: "approved-sign",
        smsTemplateCode: "SMS_123456",
        requestTimeoutMs: 3000,
      },
    });
  });

  it("requires a positive finite CAPTCHA unavailable budget", () => {
    const base = {
      DATABASE_URL: "postgresql://example/api",
      AUTH_HASH_PEPPER: "test-auth-pepper-with-at-least-32-characters",
      AUTH_DETERMINISTIC_CODE: "246810",
      AUTH_CAPTCHA_UNAVAILABLE_MODE: "limited",
    };
    expect(() => loadApiConfig(base)).toThrow("positive unavailable budget");
    expect(
      loadApiConfig({
        ...base,
        AUTH_CAPTCHA_MAX_CONSECUTIVE_UNAVAILABLE: "2",
      }).authHumanVerificationPolicy,
    ).toEqual({
      unavailableMode: "limited",
      maximumConsecutiveUnavailable: 2,
    });
  });

  it("bounds Challenge abuse and lifecycle cleanup configuration", () => {
    const base = {
      DATABASE_URL: "postgresql://example/api",
      AUTH_HASH_PEPPER: "test-auth-pepper-with-at-least-32-characters",
      AUTH_DETERMINISTIC_CODE: "246810",
    };
    expect(loadApiConfig(base)).toMatchObject({
      authChallengePolicy: {
        lifetimeMs: 300_000,
        resendIntervalMs: 60_000,
        windowMs: 3_600_000,
        maximumRequestsPerWindow: 5,
        maximumFailedAttempts: 5,
      },
      authCleanupPolicy: {
        sessionRetentionMs: 30 * 24 * 60 * 60 * 1000,
        challengeRetentionMs: 24 * 60 * 60 * 1000,
        batchSize: 500,
      },
    });
    expect(() =>
      loadApiConfig({
        ...base,
        AUTH_CHALLENGE_RESEND_SECONDS: "120",
        AUTH_CHALLENGE_WINDOW_SECONDS: "60",
      }),
    ).toThrow("must not exceed");
    expect(
      loadIdentityMaintenanceConfig({
        DATABASE_URL: "postgresql://example/maintenance",
        AUTH_IDENTITY_CLEANUP_BATCH_SIZE: "25",
      }),
    ).toEqual({
      databaseUrl: "postgresql://example/maintenance",
      authCleanupPolicy: {
        sessionRetentionMs: 30 * 24 * 60 * 60 * 1000,
        challengeRetentionMs: 24 * 60 * 60 * 1000,
        batchSize: 25,
      },
    });
  });

  it("does not couple Worker startup to Identity maintenance policy", () => {
    expect(
      loadWorkerConfig({
        DATABASE_URL: "postgresql://example/worker",
        REDIS_URL: "redis://example:6379",
        AUTH_SESSION_RETENTION_DAYS: "0",
        AUTH_CHALLENGE_RETENTION_HOURS: "0",
        AUTH_IDENTITY_CLEANUP_BATCH_SIZE: "0",
      }).aiExecution.mode,
    ).toBe("deterministic");
  });

  it("keeps withdrawal writes disabled and requires an exact encryption key when enabled", () => {
    const base = {
      DATABASE_URL: "postgresql://example/api",
      AUTH_HASH_PEPPER: "test-auth-pepper-with-at-least-32-characters",
      AUTH_DETERMINISTIC_CODE: "246810",
    };
    expect(loadApiConfig(base).agencyWithdrawal).toEqual({
      enabled: false,
      encryptionKeyHex: "",
    });
    expect(() =>
      loadApiConfig({ ...base, AGENCY_WITHDRAWAL_ENABLED: "1" }),
    ).toThrow("AGENCY_WITHDRAWAL_KEY_HEX");
    expect(
      loadApiConfig({
        ...base,
        AGENCY_WITHDRAWAL_ENABLED: "1",
        AGENCY_WITHDRAWAL_KEY_HEX: "AB".repeat(32),
      }).agencyWithdrawal,
    ).toEqual({ enabled: true, encryptionKeyHex: "ab".repeat(32) });
  });

  it("requires an explicit database and digest-only Bootstrap verifier", () => {
    const digest = "a".repeat(64);
    expect(
      loadIdentityBootstrapConfig({
        DATABASE_URL: "postgresql://example/bootstrap",
        IDENTITY_BOOTSTRAP_SECRET_DIGEST: digest.toUpperCase(),
      }),
    ).toEqual({
      databaseUrl: "postgresql://example/bootstrap",
      expectedSecretDigest: digest,
    });
    expect(() =>
      loadIdentityBootstrapConfig({
        GEOEVAL_LOCAL_DEFAULTS: "1",
        IDENTITY_BOOTSTRAP_SECRET_DIGEST: digest,
      }),
    ).toThrow();
    expect(() =>
      loadIdentityBootstrapConfig({
        DATABASE_URL: "postgresql://example/bootstrap",
        IDENTITY_BOOTSTRAP_SECRET_DIGEST: "plaintext-secret",
      }),
    ).toThrow();
  });

  it("keeps Store Location conditional and rejects unsafe activation", () => {
    const apiBase = {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://example/api",
      AUTH_HASH_PEPPER: "test-auth-pepper-with-at-least-32-characters",
      AUTH_DETERMINISTIC_CODE: "246810",
      STORE_LOCATION_RECEIPT_SIGNING_SECRET:
        "test-store-location-receipt-secret-2026",
    };
    expect(
      loadApiConfig({
        ...apiBase,
        STORE_LOCATION_MODE: "deterministic",
      }).storeLocation,
    ).toMatchObject({ mode: "deterministic", receiptTtlSeconds: 900 });
    expect(() =>
      loadApiConfig({
        ...apiBase,
        STORE_LOCATION_MODE: "amap",
        AMAP_WEB_SERVICE_KEY: "",
      }),
    ).toThrow("AMAP_WEB_SERVICE_KEY is required");
    expect(() =>
      loadApiConfig({
        ...apiBase,
        NODE_ENV: "production",
        STORE_LOCATION_MODE: "deterministic",
      }),
    ).toThrow("Deterministic Store Location provider is forbidden");
    expect(() =>
      loadApiConfig({
        ...apiBase,
        NODE_ENV: "production",
        STORE_LOCATION_MODE: "amap",
        AMAP_WEB_SERVICE_KEY: "fixture-server-key",
        AMAP_WEB_SERVICE_BASE_URL: "http://restapi.amap.test",
      }),
    ).toThrow("must use HTTPS");
  });

  it("rejects deterministic AI execution in a production worker", () => {
    expect(() =>
      loadWorkerConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://example/worker",
        REDIS_URL: "redis://example:6379",
      }),
    ).toThrow("forbidden in production");
  });

  it("requires complete real provider configuration and ordered deadlines", () => {
    const base = {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://example/worker",
      REDIS_URL: "redis://example:6379",
      AI_EXECUTION_MODE: "real",
      TOKENHUB_BASE_URL: "http://127.0.0.1:4101/v1",
      ARK_BASE_URL: "http://127.0.0.1:4102/api/v3",
      DASHSCOPE_BASE_URL: "http://127.0.0.1:4103/v1",
      QIANFAN_BASE_URL: "http://127.0.0.1:4104/v2",
      TOKENHUB_API_KEY: "tokenhub-test-key",
      ARK_API_KEY: "ark-test-key",
      DASHSCOPE_API_KEY: "dashscope-test-key",
      QIANFAN_API_KEY: "qianfan-test-key",
    };
    expect(loadWorkerConfig(base).aiExecution).toMatchObject({ mode: "real" });
    expect(() => loadWorkerConfig({ ...base, ARK_API_KEY: "" })).toThrow(
      "ARK_API_KEY is required",
    );
    expect(() =>
      loadWorkerConfig({
        ...base,
        AI_PROVIDER_TIMEOUT_MS: "5000",
        AI_ATTEMPT_AMBIGUITY_TIMEOUT_MS: "5000",
      }),
    ).toThrow("must be greater");
  });

  it("keeps Langfuse explicit and requires both keys when enabled", () => {
    const base = {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://example/worker",
      REDIS_URL: "redis://example:6379",
      AI_TELEMETRY_MODE: "langfuse",
      LANGFUSE_BASE_URL: "http://127.0.0.1:4200",
    };
    expect(() => loadWorkerConfig(base)).toThrow("LANGFUSE_PUBLIC_KEY");
    expect(
      loadWorkerConfig({
        ...base,
        LANGFUSE_PUBLIC_KEY: "public-test-key",
        LANGFUSE_SECRET_KEY: "secret-test-key",
      }).aiExecution.telemetry,
    ).toEqual({
      mode: "langfuse",
      publicKey: "public-test-key",
      secretKey: "secret-test-key",
      baseUrl: "http://127.0.0.1:4200",
      environment: "development",
      contentMode: "metadata-only",
    });

    expect(
      loadWorkerConfig({
        ...base,
        AI_TELEMETRY_CONTENT_MODE: "local-diagnostic",
        LANGFUSE_PUBLIC_KEY: "public-test-key",
        LANGFUSE_SECRET_KEY: "secret-test-key",
        LANGFUSE_RELEASE: "issue-44-test-revision",
      }).aiExecution.telemetry,
    ).toEqual({
      mode: "langfuse",
      publicKey: "public-test-key",
      secretKey: "secret-test-key",
      baseUrl: "http://127.0.0.1:4200",
      environment: "development",
      contentMode: "local-diagnostic",
      release: "issue-44-test-revision",
    });
  });

  it("rejects local diagnostic telemetry content in production", () => {
    expect(() =>
      loadWorkerConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://example/worker",
        REDIS_URL: "redis://example:6379",
        AI_EXECUTION_MODE: "real",
        AI_TELEMETRY_MODE: "disabled",
        AI_TELEMETRY_CONTENT_MODE: "local-diagnostic",
        TOKENHUB_BASE_URL: "https://tokenhub.example/v1",
        ARK_BASE_URL: "https://ark.example/v1",
        DASHSCOPE_BASE_URL: "https://model-studio.example/v1",
        QIANFAN_BASE_URL: "https://qianfan.example/v1",
        TOKENHUB_API_KEY: "tokenhub-test-key",
        ARK_API_KEY: "ark-test-key",
        DASHSCOPE_API_KEY: "dashscope-test-key",
        QIANFAN_API_KEY: "qianfan-test-key",
      }),
    ).toThrow("local-diagnostic is forbidden in production");
  });
});
