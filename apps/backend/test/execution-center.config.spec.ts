import { describe, expect, it } from "vitest";
import { parserExecutionCenterConfig } from "../src/ai-execution/infrastructure/execution-center.config.js";

const fixture = {
  AI_EXECUTION_CENTER_ENABLED: "true",
  AI_EXECUTION_CENTER_URL: "http://127.0.0.1:4612",
  AI_EXECUTION_CENTER_CALLER_TOKEN: "synthetic-token",
  AI_EXECUTION_CENTER_ENDPOINTS: JSON.stringify({
    "model-studio:chat-completions": {
      endpointRef: "parser",
      endpointVersion: "1",
      operation: "chat",
    },
  }),
};
describe("delegated Parser composition gate", () => {
  it("defaults closed and keeps in-flight connection when only new submissions are disabled", () => {
    expect(parserExecutionCenterConfig({}, "deterministic")).toBeUndefined();
    expect(
      parserExecutionCenterConfig(
        { ...fixture, AI_EXECUTION_CENTER_ENABLED: "false" },
        "real",
      )?.enabled,
    ).toBe(false);
  });
  it("enables only real semantics and registered references", () => {
    expect(parserExecutionCenterConfig(fixture, "real")?.enabled).toBe(true);
    expect(() => parserExecutionCenterConfig(fixture, "deterministic")).toThrow(
      "real route semantics",
    );
    expect(() =>
      parserExecutionCenterConfig(
        { ...fixture, AI_EXECUTION_CENTER_ENDPOINTS: "{}" },
        "real",
      ),
    ).toThrow("registered");
    expect(() =>
      parserExecutionCenterConfig(
        {
          ...fixture,
          AI_EXECUTION_CENTER_ENDPOINTS: JSON.stringify({
            route: {
              ...JSON.parse(fixture.AI_EXECUTION_CENTER_ENDPOINTS)[
                "model-studio:chat-completions"
              ],
              url: "https://arbitrary.invalid",
            },
          }),
        },
        "real",
      ),
    ).toThrow("reference");
  });
  it("matches client URL rules and never echoes credential input in configuration errors", () => {
    for (const url of [
      "http://[::1]:4612",
      "http://8.138.100.3:4612",
      "https://user:secret@fixture.invalid",
      "https://fixture.invalid/?token=secret",
      "invalid-secret-url",
    ]) {
      try {
        parserExecutionCenterConfig(
          { ...fixture, AI_EXECUTION_CENTER_URL: url },
          "real",
        );
        expect.fail("unsafe config accepted");
      } catch (error) {
        expect(String(error)).not.toContain(url);
        expect(String(error)).not.toContain("secret");
      }
    }
    expect(
      parserExecutionCenterConfig(
        { ...fixture, AI_EXECUTION_CENTER_URL: "https://fixture.invalid" },
        "real",
      )?.baseUrl,
    ).toBe("https://fixture.invalid");
  });
  it("rejects missing auth, malformed mappings and invalid timeout before networking", () => {
    for (const change of [
      { AI_EXECUTION_CENTER_CALLER_TOKEN: "" },
      { AI_EXECUTION_CENTER_ENABLED: "yes" },
      { AI_EXECUTION_CENTER_ENDPOINTS: "not-json" },
      { AI_EXECUTION_CENTER_ENDPOINTS: "[]" },
      { AI_EXECUTION_CENTER_HTTP_TIMEOUT_MS: "0" },
      { AI_EXECUTION_CENTER_CALLER_TOKEN: "value\nline" },
    ])
      expect(() =>
        parserExecutionCenterConfig({ ...fixture, ...change }, "real"),
      ).toThrow();
  });
});
