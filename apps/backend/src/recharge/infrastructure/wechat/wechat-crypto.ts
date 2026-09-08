import {
  constants,
  createDecipheriv,
  createHash,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";
import type { PaymentProof } from "../../application/payment-gateway.js";
import {
  object,
  requireProtocol,
  strictBase64,
  WechatProtocolError,
} from "./wechat-protocol.js";

export const sha256 = (bytes: Buffer | string): string =>
  createHash("sha256").update(bytes).digest("hex");

export function signRequest(
  key: KeyObject,
  input: {
    method: string;
    path: string;
    timestamp: string;
    nonce: string;
    body: Buffer;
  },
): string {
  const bytes = Buffer.concat([
    Buffer.from(
      `${input.method}\n${input.path}\n${input.timestamp}\n${input.nonce}\n`,
    ),
    input.body,
    Buffer.from("\n"),
  ]);
  return sign("sha256", bytes, {
    key,
    padding: constants.RSA_PKCS1_PADDING,
  }).toString("base64");
}

export function verifyMessage(
  headers: Readonly<Record<string, readonly string[] | undefined>>,
  body: Buffer,
  keys: ReadonlyMap<string, KeyObject>,
  receivedAt: Date,
): PaymentProof {
  const one = (name: string): string => {
    const values = headers[name];
    requireProtocol(
      values?.length === 1 &&
        typeof values[0] === "string" &&
        values[0].length > 0,
      "AUTH_HEADERS",
    );
    return values[0];
  };
  const timestamp = one("wechatpay-timestamp"),
    nonce = one("wechatpay-nonce");
  const keyId = one("wechatpay-serial"),
    encoded = one("wechatpay-signature");
  requireProtocol(/^(0|[1-9][0-9]*)$/.test(timestamp), "AUTH_TIMESTAMP");
  const seconds = Number(timestamp);
  requireProtocol(
    Number.isSafeInteger(seconds) &&
      Math.abs(Math.floor(receivedAt.getTime() / 1000) - seconds) < 300,
    "AUTH_TIMESTAMP",
  );
  const key = keys.get(keyId);
  requireProtocol(key, "AUTH_KEY");
  const signature = strictBase64(encoded, "AUTH_SIGNATURE");
  const message = Buffer.concat([
    Buffer.from(`${timestamp}\n${nonce}\n`),
    body,
    Buffer.from("\n"),
  ]);
  requireProtocol(
    verify(
      "sha256",
      message,
      { key, padding: constants.RSA_PKCS1_PADDING },
      signature,
    ),
    "AUTH_SIGNATURE",
  );
  return {
    verificationKeyId: keyId,
    signedAtSeconds: seconds,
    receivedAt: receivedAt.toISOString(),
    bodySha256: sha256(body),
  };
}

export function decryptResource(value: unknown, apiV3Key: Buffer): Buffer {
  const resource = object(value);
  requireProtocol(
    resource.algorithm === "AEAD_AES_256_GCM" &&
      resource.original_type === "transaction",
    "DECRYPTION",
  );
  requireProtocol(
    typeof resource.nonce === "string" &&
      Buffer.byteLength(resource.nonce) === 12,
    "DECRYPTION",
  );
  requireProtocol(
    resource.associated_data === undefined ||
      (typeof resource.associated_data === "string" &&
        Buffer.byteLength(resource.associated_data) <= 16),
    "DECRYPTION",
  );
  const bytes = strictBase64(resource.ciphertext, "DECRYPTION");
  requireProtocol(bytes.length > 16 && apiV3Key.length === 32, "DECRYPTION");
  try {
    const decipher = createDecipheriv("aes-256-gcm", apiV3Key, resource.nonce, {
      authTagLength: 16,
    });
    decipher.setAAD(Buffer.from(resource.associated_data ?? ""));
    decipher.setAuthTag(bytes.subarray(-16));
    return Buffer.concat([
      decipher.update(bytes.subarray(0, -16)),
      decipher.final(),
    ]);
  } catch {
    throw new WechatProtocolError("DECRYPTION");
  }
}
