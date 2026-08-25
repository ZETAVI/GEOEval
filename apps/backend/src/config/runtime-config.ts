import { z } from "zod";

const localDatabaseUrl =
  "postgresql://geoeval:geoeval_local_only@127.0.0.1:55432/geoeval";
const localRedisUrl = "redis://127.0.0.1:56379";

const commonSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GEOEVAL_TELEMETRY_FAIL: z.enum(["0", "1"]).default("0"),
});

const apiSchema = commonSchema.extend({
  PORT: z.coerce.number().int().positive().default(3300),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .default("http://127.0.0.1:3100,http://127.0.0.1:3200"),
});

const workerSchema = commonSchema.extend({
  REDIS_URL: z.string().min(1),
});

export type ApiConfig = {
  databaseUrl: string;
  port: number;
  corsOrigins: string[];
  telemetryShouldFail: boolean;
};

export type WorkerConfig = {
  databaseUrl: string;
  redisUrl: string;
  telemetryShouldFail: boolean;
};

function withLocalDefaults(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (environment.GEOEVAL_LOCAL_DEFAULTS !== "1") {
    return environment;
  }

  return {
    ...environment,
    DATABASE_URL: environment.DATABASE_URL ?? localDatabaseUrl,
    REDIS_URL: environment.REDIS_URL ?? localRedisUrl,
  };
}

export function loadApiConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ApiConfig {
  const parsed = apiSchema.parse(withLocalDefaults(environment));
  return {
    databaseUrl: parsed.DATABASE_URL,
    port: parsed.PORT,
    corsOrigins: parsed.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
    telemetryShouldFail: parsed.GEOEVAL_TELEMETRY_FAIL === "1",
  };
}

export function loadWorkerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): WorkerConfig {
  const parsed = workerSchema.parse(withLocalDefaults(environment));
  return {
    databaseUrl: parsed.DATABASE_URL,
    redisUrl: parsed.REDIS_URL,
    telemetryShouldFail: parsed.GEOEVAL_TELEMETRY_FAIL === "1",
  };
}
