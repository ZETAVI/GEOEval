import {
  loadApiConfig,
  loadWorkerConfig,
  type ApiConfig,
  type WorkerConfig,
} from "../src/config/runtime-config.js";

export function loadIntegrationApiConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ApiConfig {
  return loadApiConfig(integrationTestEnvironment(environment));
}

export function loadIntegrationWorkerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): WorkerConfig {
  return loadWorkerConfig(integrationTestEnvironment(environment));
}

export function integrationTestEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const targets = integrationTestTargets(environment);
  return {
    DATABASE_URL: targets.databaseUrl,
    REDIS_URL: targets.redisUrl,
    GEOEVAL_LOCAL_DEFAULTS: "1",
    NODE_ENV: "test",
    AI_EXECUTION_MODE: "deterministic",
    AI_TELEMETRY_MODE: "disabled",
    STORE_LOCATION_MODE: "deterministic",
    STORE_LOCATION_RECEIPT_SIGNING_SECRET:
      "geoeval_test_store_location_receipt_secret_2026",
  };
}

function integrationTestTargets(environment: NodeJS.ProcessEnv): {
  databaseUrl?: string;
  redisUrl?: string;
} {
  const databaseUrl = environment.DATABASE_URL?.trim() || undefined;
  const redisUrl = environment.REDIS_URL?.trim() || undefined;
  if (Boolean(databaseUrl) !== Boolean(redisUrl)) {
    throw new Error(
      "Integration tests require DATABASE_URL and REDIS_URL together",
    );
  }
  return { databaseUrl, redisUrl };
}
