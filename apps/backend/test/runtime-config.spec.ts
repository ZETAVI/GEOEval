import { describe, expect, it } from "vitest";

import {
  loadApiConfig,
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
  });

  it("rejects the same environment for the worker when Redis is absent", () => {
    expect(() =>
      loadWorkerConfig({ DATABASE_URL: "postgresql://example/worker" }),
    ).toThrow();
  });

  it("provides explicit local-only defaults only when opted in", () => {
    expect(loadWorkerConfig({ GEOEVAL_LOCAL_DEFAULTS: "1" }).redisUrl).toBe(
      "redis://127.0.0.1:56379",
    );
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

  it("rejects deterministic AI execution in a production worker", () => {
    expect(() =>
      loadWorkerConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://example/worker",
        REDIS_URL: "redis://example:6379",
      }),
    ).toThrow("forbidden in production");
  });
});
