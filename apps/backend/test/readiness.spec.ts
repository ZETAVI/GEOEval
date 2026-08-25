import { describe, expect, it } from "vitest";

import { ReadinessState } from "../src/readiness.js";

describe("readiness lifecycle", () => {
  it("becomes unavailable before shutdown completes", async () => {
    const state = new ReadinessState();
    expect(state.assertReady()).toEqual({ status: "ready" });
    const shutdown = state.beforeApplicationShutdown();
    expect(() => state.assertReady()).toThrow("Process is shutting down");
    await shutdown;
  });
});
