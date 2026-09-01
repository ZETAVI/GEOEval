import { describe, expect, it } from "vitest";

import { bullmqConnectionOptions } from "../src/background-work/bullmq-connection.js";
import {
  integrationTestEnvironment,
  loadIntegrationApiConfig,
  loadIntegrationWorkerConfig,
} from "./integration-test-config.js";

describe("worktree-scoped integration-test configuration", () => {
  it("preserves explicit PostgreSQL and Redis targets", () => {
    const environment = {
      DATABASE_URL: "postgresql://example/worktree_test",
      REDIS_URL: "redis://example:6379/11",
      NODE_ENV: "production",
      GEOEVAL_TELEMETRY_FAIL: "1",
      AUTH_HASH_PEPPER: "hostile-auth-pepper-with-at-least-32-characters",
      AUTH_DETERMINISTIC_CODE: "999999",
      AI_EXECUTION_MODE: "real",
      AI_TELEMETRY_MODE: "langfuse",
      TOKENHUB_API_KEY: "must-not-enter-test-composition",
    };

    expect(integrationTestEnvironment(environment)).toEqual({
      DATABASE_URL: environment.DATABASE_URL,
      REDIS_URL: environment.REDIS_URL,
      GEOEVAL_LOCAL_DEFAULTS: "1",
      NODE_ENV: "test",
      AI_EXECUTION_MODE: "deterministic",
      AI_TELEMETRY_MODE: "disabled",
    });
    expect(loadIntegrationApiConfig(environment)).toMatchObject({
      databaseUrl: environment.DATABASE_URL,
      runtimeEnvironment: "test",
      telemetryShouldFail: false,
      authDeterministicCode: "246810",
    });
    expect(loadIntegrationWorkerConfig(environment)).toMatchObject({
      databaseUrl: environment.DATABASE_URL,
      redisUrl: environment.REDIS_URL,
      telemetryShouldFail: false,
    });
    expect(bullmqConnectionOptions(environment.REDIS_URL)).toMatchObject({
      host: "example",
      port: 6379,
      db: 11,
    });
  });

  it.each([
    { DATABASE_URL: "postgresql://example/worktree_test" },
    { REDIS_URL: "redis://example:6379/11" },
  ])("rejects a partial resource override", (environment) => {
    expect(() => loadIntegrationApiConfig(environment)).toThrow(
      "require DATABASE_URL and REDIS_URL together",
    );
    expect(() => loadIntegrationWorkerConfig(environment)).toThrow(
      "require DATABASE_URL and REDIS_URL together",
    );
  });

  it("retains local defaults only when both targets are absent", () => {
    expect(loadIntegrationApiConfig({}).databaseUrl).toContain("/geoeval");
    expect(loadIntegrationWorkerConfig({})).toMatchObject({
      databaseUrl: expect.stringContaining("/geoeval"),
      redisUrl: "redis://127.0.0.1:56379",
    });
  });
});
