import { createPrivateKey, createPublicKey } from "node:crypto";
import { z } from "zod";
import type { RechargeSingleChannelApiConfiguration } from "./recharge-api.module.js";
import { WechatRechargeNotificationVerifier } from "./application/provider-payment.js";
import type { RechargeWorkerConfiguration } from "./recharge-worker.module.js";
import {
  WechatPayGateway,
  WechatPayNotificationVerifier,
} from "./infrastructure/wechat/wechat-pay.gateway.js";
import { WECHAT_API_ORIGINS } from "./infrastructure/wechat/wechat-https.js";
import {
  httpsUrl,
  protectedFile,
  protectedPem,
  recoveryPolicy,
  sharedRechargeRuntimeSchema,
  validateSharedRechargePolicy,
  workerScheduling,
} from "./runtime-config.shared.js";

const activationSchema = z
  .object({
    RECHARGE_WECHAT_ACTIVATION: z
      .enum(["disabled", "verify", "live"])
      .default("disabled"),
  })
  .passthrough();

const configurationSchema = sharedRechargeRuntimeSchema.extend({
  RECHARGE_WECHAT_ACTIVATION: z.enum(["verify", "live"]),
  RECHARGE_WECHAT_MERCHANT_ID: z.string().regex(/^\d{1,32}$/),
  RECHARGE_WECHAT_APP_ID: z.string().regex(/^wx[A-Za-z0-9]{16}$/),
  RECHARGE_WECHAT_MERCHANT_CERT_SERIAL: z.string().regex(/^[A-Fa-f0-9]{1,64}$/),
  RECHARGE_WECHAT_PRIVATE_KEY_FILE: z.string().min(1),
  RECHARGE_WECHAT_PUBLIC_KEY_ID: z.string().regex(/^PUB_KEY_ID_\d+$/),
  RECHARGE_WECHAT_PUBLIC_KEY_FILE: z.string().min(1),
  RECHARGE_WECHAT_API_V3_KEY_FILE: z.string().min(1),
  RECHARGE_WECHAT_NOTIFY_URL: z.string().url(),
  RECHARGE_WECHAT_API_ORIGIN: z
    .enum(WECHAT_API_ORIGINS)
    .default(WECHAT_API_ORIGINS[0]),
  RECHARGE_WECHAT_IP_FAMILY: z.enum(["auto", "ipv4", "ipv6"]).default("auto"),
  RECHARGE_WECHAT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(30_000)
    .default(8000),
});

const notificationConfigurationSchema = z
  .object({
    RECHARGE_WECHAT_ACTIVATION: z.enum(["verify", "live"]),
    RECHARGE_WECHAT_PUBLIC_KEY_ID: z.string().regex(/^PUB_KEY_ID_\d+$/),
    RECHARGE_WECHAT_PUBLIC_KEY_FILE: z.string().min(1),
    RECHARGE_WECHAT_API_V3_KEY_FILE: z.string().min(1),
  })
  .passthrough();

function apiV3Key(path: string) {
  const value = protectedFile(path, 128).toString("utf8").trim();
  if (!/^[A-Za-z0-9]{32}$/.test(value))
    throw new Error("RECHARGE_WECHAT_API_V3_KEY_INVALID");
  return Buffer.from(value);
}

function assemble(environment: NodeJS.ProcessEnv) {
  const activation =
    activationSchema.parse(environment).RECHARGE_WECHAT_ACTIVATION;
  if (activation === "disabled") return null;
  const parsed = configurationSchema.parse(environment);
  const shortcutAmounts = validateSharedRechargePolicy(parsed);
  const notifyUrl = httpsUrl(
    parsed.RECHARGE_WECHAT_NOTIFY_URL,
    "RECHARGE_WECHAT_NOTIFY_URL",
  );
  const merchantPrivatePem = protectedPem(
      parsed.RECHARGE_WECHAT_PRIVATE_KEY_FILE,
    ),
    wechatPublicPem = protectedPem(parsed.RECHARGE_WECHAT_PUBLIC_KEY_FILE);
  let merchantPrivateKey, wechatPublicKey;
  try {
    merchantPrivateKey = createPrivateKey(merchantPrivatePem);
    wechatPublicKey = createPublicKey(wechatPublicPem);
  } catch {
    throw new Error("RECHARGE_WECHAT_KEY_MATERIAL_INVALID");
  }
  const gateway = new WechatPayGateway({
    merchantId: parsed.RECHARGE_WECHAT_MERCHANT_ID,
    appId: parsed.RECHARGE_WECHAT_APP_ID,
    merchantCertificateSerial: parsed.RECHARGE_WECHAT_MERCHANT_CERT_SERIAL,
    merchantPrivateKey,
    activeVerificationKeyId: parsed.RECHARGE_WECHAT_PUBLIC_KEY_ID,
    verificationKeys: [
      {
        id: parsed.RECHARGE_WECHAT_PUBLIC_KEY_ID,
        key: wechatPublicKey,
      },
    ],
    apiV3Key: apiV3Key(parsed.RECHARGE_WECHAT_API_V3_KEY_FILE),
    notifyUrl,
    origin: parsed.RECHARGE_WECHAT_API_ORIGIN,
    ...(parsed.RECHARGE_WECHAT_IP_FAMILY === "auto"
      ? {}
      : {
          ipFamily: parsed.RECHARGE_WECHAT_IP_FAMILY === "ipv4" ? 4 : 6,
        }),
    timeoutMs: parsed.RECHARGE_WECHAT_TIMEOUT_MS,
    report: (event) => {
      process.stdout.write(
        `${JSON.stringify({ process: "wechat-pay", ...event })}\n`,
      );
    },
  });
  const native = {
    recharge: {
      merchantId: parsed.RECHARGE_WECHAT_MERCHANT_ID,
      appId: parsed.RECHARGE_WECHAT_APP_ID,
      method: "WECHAT_NATIVE" as const,
      minAmountYuan: parsed.RECHARGE_MIN_AMOUNT_YUAN,
      maxAmountYuan: parsed.RECHARGE_MAX_AMOUNT_YUAN,
      maxActiveOrders: parsed.RECHARGE_MAX_ACTIVE_ORDERS,
      paymentWindowSeconds: parsed.RECHARGE_PAYMENT_WINDOW_SECONDS,
    },
    preparation: {
      description: parsed.RECHARGE_PAYMENT_DESCRIPTION,
      notifyUrl,
      createEnabled: activation === "live",
      actionKind: "QR_CODE" as const,
    },
    channel: {
      provider: "WECHAT" as const,
      method: "WECHAT_NATIVE" as const,
      merchantId: parsed.RECHARGE_WECHAT_MERCHANT_ID,
      appId: parsed.RECHARGE_WECHAT_APP_ID,
      notifyUrl,
      gateway,
    },
    recovery: recoveryPolicy(parsed, activation === "live"),
  };
  const controlled =
    activation === "verify" && parsed.NODE_ENV !== "production";
  return { parsed, native, gateway, shortcutAmounts, controlled };
}

export function loadWechatRechargeApiConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): RechargeSingleChannelApiConfiguration | null {
  const value = assemble(environment);
  if (!value) return null;
  return {
    ...value.native,
    verifier: value.gateway,
    controlled: value.controlled,
    shortcutAmounts: value.shortcutAmounts,
    supportMessage: value.parsed.RECHARGE_SUPPORT_MESSAGE,
  };
}

export function loadWechatRechargeNotificationVerifier(
  environment: NodeJS.ProcessEnv = process.env,
): WechatRechargeNotificationVerifier | null {
  const activation =
    activationSchema.parse(environment).RECHARGE_WECHAT_ACTIVATION;
  if (activation === "disabled") return null;
  const parsed = notificationConfigurationSchema.parse(environment);
  let publicKey;
  try {
    publicKey = createPublicKey(
      protectedPem(parsed.RECHARGE_WECHAT_PUBLIC_KEY_FILE),
    );
  } catch {
    throw new Error("RECHARGE_WECHAT_KEY_MATERIAL_INVALID");
  }
  return new WechatRechargeNotificationVerifier(
    new WechatPayNotificationVerifier({
      verificationKeys: [
        { id: parsed.RECHARGE_WECHAT_PUBLIC_KEY_ID, key: publicKey },
      ],
      apiV3Key: apiV3Key(parsed.RECHARGE_WECHAT_API_V3_KEY_FILE),
    }),
  );
}

export function loadWechatRechargeWorkerConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): RechargeWorkerConfiguration | null {
  const value = assemble(environment);
  if (!value) return null;
  if (!value.parsed.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  return {
    databaseUrl: value.parsed.DATABASE_URL,
    runtimeEnvironment: value.parsed.NODE_ENV,
    controlled: value.controlled,
    native: value.native,
    scheduling: workerScheduling(value.parsed),
    notifications: {
      retryDelayMs: value.parsed.RECHARGE_NOTIFICATION_RETRY_DELAY_MS,
    },
  };
}
