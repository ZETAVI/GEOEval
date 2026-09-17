import { describe, expect, it } from "vitest";

import {
  AesGcmSensitiveDataCipher,
  SensitiveDataCipherError,
  SensitiveDataUnavailableError,
} from "../src/security/sensitive-data-cipher.js";

describe("versioned sensitive data cipher", () => {
  const key = "ab".repeat(32);

  it("round-trips with record context without exposing plaintext", () => {
    const cipher = new AesGcmSensitiveDataCipher(key);
    const sealed = cipher.seal("6222021234567890", "payout:agent-a");
    expect(sealed).toMatch(/^v1\./);
    expect(sealed).not.toContain("6222021234567890");
    expect(cipher.open(sealed, "payout:agent-a")).toBe("6222021234567890");
  });

  it("rejects ciphertext copied to another record or changed in storage", () => {
    const cipher = new AesGcmSensitiveDataCipher(key);
    const sealed = cipher.seal("6222021234567890", "payout:agent-a");
    expect(() => cipher.open(sealed, "payout:agent-b")).toThrow(
      SensitiveDataCipherError,
    );
    expect(() => cipher.open(`${sealed}x`, "payout:agent-a")).toThrow(
      SensitiveDataCipherError,
    );
  });

  it("fails closed when no configured key is available", () => {
    const cipher = new AesGcmSensitiveDataCipher("");
    expect(() => cipher.seal("6222021234567890", "payout:agent-a")).toThrow(
      SensitiveDataUnavailableError,
    );
  });
});
