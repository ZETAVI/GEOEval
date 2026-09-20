import { createPublicKey, createVerify, type KeyObject } from "node:crypto";
import type { AlipayResult } from "./alipay-result.js";
import { parseAlipayTrade, type AlipayTrade } from "./alipay-trade.js";
import {
  AlipayProtocolError,
  channelDate,
  decodeNotification,
  requireValue,
  sha256,
} from "./alipay-values.js";

export type AlipayNotificationConfig = Readonly<{
  appId: string;
  merchantId: string;
  publicKey: string;
}>;

function rsa(key: KeyObject): KeyObject {
  requireValue(
    key.asymmetricKeyType === "rsa" &&
      (key.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048,
    "INVALID_INPUT",
  );
  return key;
}

function publicId(key: KeyObject): string {
  return sha256(key.export({ type: "spki", format: "der" }));
}

function notificationSignature(
  data: Record<string, string>,
  publicKey: KeyObject,
): boolean {
  if (data.sign_type !== "RSA2" || !data.sign) return false;
  const signature = data.sign;
  const fields = { ...data };
  delete fields.sign;
  const verify = (input: Record<string, string>) =>
    createVerify("RSA-SHA256")
      .update(
        Object.keys(input)
          .sort()
          .map((key) => `${key}=${input[key]}`)
          .join("&"),
        "utf8",
      )
      .verify(publicKey, signature, "base64");
  if (verify(fields)) return true;
  // Match the pinned SDK's legacy-compatible checkNotifySignV2 behavior.
  delete fields.sign_type;
  return verify(fields);
}

function notificationFailure<T>(error: unknown): AlipayResult<T> {
  return {
    ok: false,
    error: {
      kind: "INVALID_NOTIFICATION",
      code:
        error instanceof AlipayProtocolError ? error.message : "PROTOCOL_ERROR",
      recovery: "REVIEW",
    },
  };
}

/** Passive form verifier: no merchant signing key, network client or payment action. */
export class AlipayNotificationAdapter {
  readonly #appId: string;
  readonly #merchantId: string;
  readonly #publicKey: KeyObject;
  readonly #keyId: string;

  constructor(
    config: AlipayNotificationConfig,
    readonly clock: () => Date = () => new Date(),
  ) {
    try {
      requireValue(
        /^\d{16,32}$/.test(config.appId) &&
          /^2088\d{12}$/.test(config.merchantId),
        "INVALID_INPUT",
      );
      this.#appId = config.appId;
      this.#merchantId = config.merchantId;
      this.#publicKey = rsa(createPublicKey(config.publicKey));
      this.#keyId = publicId(this.#publicKey);
    } catch {
      throw new AlipayProtocolError("ALIPAY_NOTIFICATION_CONFIG_INVALID");
    }
  }

  verifyNotification(rawBody: Buffer): AlipayResult<{
    trade: AlipayTrade;
    notificationId: string;
    notificationAt: string;
    proof: {
      kind: "ALIPAY_FORM_RSA2";
      verificationKeyId: string;
      receivedAt: string;
      bodySha256: string;
    };
  }> {
    try {
      const data = decodeNotification(rawBody);
      requireValue(
        notificationSignature(data, this.#publicKey),
        "AUTH_SIGNATURE",
      );
      requireValue(
        data.app_id === this.#appId && data.seller_id === this.#merchantId,
        "IDENTITY_MISMATCH",
      );
      requireValue(
        data.notify_type === "trade_status_sync",
        "INVALID_NOTIFICATION",
      );
      requireValue(
        typeof data.notify_id === "string" &&
          data.notify_id.length > 0 &&
          data.notify_id.length <= 128 &&
          !/[\u0000-\u001f\u007f]/.test(data.notify_id),
        "INVALID_NOTIFICATION",
      );
      const notificationAt = channelDate(data.notify_time);
      requireValue(notificationAt !== null, "INVALID_NOTIFICATION");
      return {
        ok: true,
        value: {
          trade: parseAlipayTrade(
            data,
            "NOTIFICATION",
            this.#appId,
            this.#merchantId,
          ),
          notificationId: data.notify_id,
          notificationAt,
          proof: {
            kind: "ALIPAY_FORM_RSA2",
            verificationKeyId: this.#keyId,
            receivedAt: this.clock().toISOString(),
            bodySha256: sha256(rawBody),
          },
        },
      };
    } catch (error) {
      return notificationFailure(error);
    }
  }
}
