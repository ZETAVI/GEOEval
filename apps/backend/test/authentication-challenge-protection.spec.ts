import { describe, expect, it } from "vitest";

import type { ApiConfig } from "../src/config/runtime-config.js";
import { HumanVerificationPolicy } from "../src/identity/application/human-verification.policy.js";
import { DeterministicChallengeCodeGenerator } from "../src/identity/infrastructure/deterministic-challenge-code-generator.js";
import { SecureChallengeCodeGenerator } from "../src/identity/infrastructure/secure-challenge-code-generator.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();

describe("authentication Challenge protection contracts", () => {
  it("uses the configured deterministic code outside production", () => {
    expect(new DeterministicChallengeCodeGenerator(config).generate()).toBe(
      config.authDeterministicCode,
    );
  });

  it("generates zero-padded six-digit real codes", () => {
    const generator = new SecureChallengeCodeGenerator();
    const values = Array.from({ length: 100 }, () => generator.generate());
    expect(values.every((value) => /^\d{6}$/.test(value))).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it("fails closed for normal CAPTCHA rejection and resets unavailable state", () => {
    const policy = new HumanVerificationPolicy(limitedConfig(2));
    expect(
      policy.decide({ outcome: "unavailable", reason: "TIMEOUT" }),
    ).toEqual({ outcome: "allow", degraded: true });
    expect(policy.decide({ outcome: "rejected", reason: "REPLAYED" })).toEqual({
      outcome: "deny",
      reason: "REJECTED",
    });
    expect(
      policy.decide({ outcome: "unavailable", reason: "NETWORK" }),
    ).toEqual({ outcome: "allow", degraded: true });
  });

  it("allows only the finite configured unavailable budget", () => {
    const policy = new HumanVerificationPolicy(limitedConfig(2));
    expect(
      policy.decide({ outcome: "unavailable", reason: "TIMEOUT" }),
    ).toEqual({ outcome: "allow", degraded: true });
    expect(
      policy.decide({ outcome: "unavailable", reason: "PROVIDER_SERVER" }),
    ).toEqual({ outcome: "allow", degraded: true });
    expect(
      policy.decide({ outcome: "unavailable", reason: "NETWORK" }),
    ).toEqual({ outcome: "deny", reason: "UNAVAILABLE" });
    expect(policy.decide({ outcome: "verified" })).toEqual({
      outcome: "allow",
      degraded: false,
    });
    expect(
      policy.decide({ outcome: "unavailable", reason: "TIMEOUT" }),
    ).toEqual({ outcome: "allow", degraded: true });
  });

  it("denies the first unavailable result when degradation is disabled", () => {
    const policy = new HumanVerificationPolicy({
      ...config,
      authHumanVerificationPolicy: {
        unavailableMode: "deny",
        maximumConsecutiveUnavailable: 0,
      },
    });
    expect(
      policy.decide({ outcome: "unavailable", reason: "NETWORK" }),
    ).toEqual({ outcome: "deny", reason: "UNAVAILABLE" });
  });
});

function limitedConfig(maximumConsecutiveUnavailable: number): ApiConfig {
  return {
    ...config,
    authHumanVerificationPolicy: {
      unavailableMode: "limited",
      maximumConsecutiveUnavailable,
    },
  };
}
