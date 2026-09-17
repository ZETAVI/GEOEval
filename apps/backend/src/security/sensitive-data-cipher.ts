import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export class SensitiveDataUnavailableError extends Error {
  constructor() {
    super("SENSITIVE_DATA_KEY_UNAVAILABLE");
  }
}

export class SensitiveDataCipherError extends Error {
  constructor() {
    super("SENSITIVE_DATA_CIPHERTEXT_INVALID");
  }
}

export interface SensitiveDataCipher {
  seal(value: string, context: string): string;
  open(envelope: string, context: string): string;
}

/** Small authenticated-encryption boundary. Domain masking and access stay with callers. */
export class AesGcmSensitiveDataCipher implements SensitiveDataCipher {
  private readonly key: Buffer | null;

  constructor(keyHex: string) {
    this.key = /^[0-9a-f]{64}$/i.test(keyHex)
      ? Buffer.from(keyHex, "hex")
      : null;
  }

  seal(value: string, context: string): string {
    const key = this.requireKey();
    if (!value || !context) throw new SensitiveDataCipherError();
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(Buffer.from(context, "utf8"));
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    return [
      "v1",
      nonce.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  open(envelope: string, context: string): string {
    const key = this.requireKey();
    try {
      const [version, nonce, tag, encrypted, extra] = envelope.split(".");
      if (version !== "v1" || !nonce || !tag || !encrypted || extra)
        throw new Error("shape");
      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(nonce, "base64url"),
      );
      decipher.setAAD(Buffer.from(context, "utf8"));
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(encrypted, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    } catch (error) {
      if (error instanceof SensitiveDataUnavailableError) throw error;
      throw new SensitiveDataCipherError();
    }
  }

  private requireKey(): Buffer {
    if (!this.key) throw new SensitiveDataUnavailableError();
    return this.key;
  }
}
