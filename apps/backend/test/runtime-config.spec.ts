import { describe, expect, it } from "vitest";

import {
  loadApiConfig,
  loadWorkerConfig,
} from "../src/config/runtime-config.js";

describe("process-scoped configuration", () => {
  it("lets the API start without worker-only Redis configuration", () => {
    const api = loadApiConfig({ DATABASE_URL: "postgresql://example/api" });
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
});
