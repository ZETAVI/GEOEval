import { z } from "zod";
import type { RechargeSingleChannelApiConfiguration } from "./recharge-api.module.js";
import type { RechargeWorkerConfiguration } from "./recharge-worker.module.js";
import { AlipayPaymentAdapter } from "./infrastructure/alipay/alipay-payment.adapter.js";
import { AlipayRechargePaymentGateway } from "./infrastructure/alipay/alipay-recharge.gateway.js";
import {
  httpsUrl,
  protectedPem,
  recoveryPolicy,
  sharedRechargeRuntimeSchema,
  validateSharedRechargePolicy,
  workerScheduling,
} from "./runtime-config.shared.js";

const activationSchema = z
  .object({
    RECHARGE_ALIPAY_ACTIVATION: z
      .enum(["disabled", "verify", "sandbox", "live"])
      .default("disabled"),
  })
  .passthrough();

const configurationSchema = sharedRechargeRuntimeSchema.extend({
  RECHARGE_ALIPAY_ACTIVATION: z.enum(["verify", "sandbox", "live"]),
  RECHARGE_ALIPAY_ENVIRONMENT: z.enum(["production", "sandbox"]),
  RECHARGE_ALIPAY_APP_ID: z.string().regex(/^\d{16,32}$/),
  RECHARGE_ALIPAY_MERCHANT_ID: z.string().regex(/^2088\d{12}$/),
  RECHARGE_ALIPAY_PRIVATE_KEY_FILE: z.string().min(1),
  RECHARGE_ALIPAY_PUBLIC_KEY_FILE: z.string().min(1),
  RECHARGE_ALIPAY_NOTIFY_URL: z.string().url(),
  RECHARGE_ALIPAY_RETURN_URL: z.string().url(),
  RECHARGE_ALIPAY_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(30_000)
    .default(5000),
});

function assemble(environment: NodeJS.ProcessEnv) {
  const activation =
    activationSchema.parse(environment).RECHARGE_ALIPAY_ACTIVATION;
  if (activation === "disabled") return null;
  const parsed = configurationSchema.parse(environment);
  if (
    activation === "sandbox" &&
    parsed.RECHARGE_ALIPAY_ENVIRONMENT !== "sandbox"
  )
    throw new Error("RECHARGE_SANDBOX_GATEWAY_REQUIRED");
  if (
    activation === "live" &&
    parsed.RECHARGE_ALIPAY_ENVIRONMENT !== "production"
  )
    throw new Error("RECHARGE_LIVE_GATEWAY_REQUIRED");
  if (parsed.NODE_ENV === "production" && activation === "sandbox")
    throw new Error("RECHARGE_SANDBOX_FORBIDDEN_IN_PRODUCTION");
  const shortcutAmounts = validateSharedRechargePolicy(parsed);
  const notifyUrl = httpsUrl(
      parsed.RECHARGE_ALIPAY_NOTIFY_URL,
      "RECHARGE_ALIPAY_NOTIFY_URL",
    ),
    returnUrl = httpsUrl(
      parsed.RECHARGE_ALIPAY_RETURN_URL,
      "RECHARGE_ALIPAY_RETURN_URL",
    ),
    gateway = new AlipayRechargePaymentGateway(
      new AlipayPaymentAdapter({
        appId: parsed.RECHARGE_ALIPAY_APP_ID,
        merchantId: parsed.RECHARGE_ALIPAY_MERCHANT_ID,
        environment: parsed.RECHARGE_ALIPAY_ENVIRONMENT,
        privateKey: protectedPem(parsed.RECHARGE_ALIPAY_PRIVATE_KEY_FILE),
        verification: {
          mode: "PUBLIC_KEY",
          publicKey: protectedPem(parsed.RECHARGE_ALIPAY_PUBLIC_KEY_FILE),
        },
        notifyUrl,
        returnUrl,
        timeoutMs: parsed.RECHARGE_ALIPAY_TIMEOUT_MS,
      }),
    ),
    native = {
      recharge: {
        merchantId: parsed.RECHARGE_ALIPAY_MERCHANT_ID,
        appId: parsed.RECHARGE_ALIPAY_APP_ID,
        method: "ALIPAY_PC" as const,
        minAmountYuan: parsed.RECHARGE_MIN_AMOUNT_YUAN,
        maxAmountYuan: parsed.RECHARGE_MAX_AMOUNT_YUAN,
        maxActiveOrders: parsed.RECHARGE_MAX_ACTIVE_ORDERS,
        paymentWindowSeconds: parsed.RECHARGE_PAYMENT_WINDOW_SECONDS,
      },
      preparation: {
        description: parsed.RECHARGE_PAYMENT_DESCRIPTION,
        notifyUrl,
        createEnabled: activation === "sandbox" || activation === "live",
        actionKind: "CASHIER_PAGE" as const,
      },
      channel: {
        provider: "ALIPAY" as const,
        method: "ALIPAY_PC" as const,
        merchantId: parsed.RECHARGE_ALIPAY_MERCHANT_ID,
        appId: parsed.RECHARGE_ALIPAY_APP_ID,
        notifyUrl,
        gateway,
      },
      recovery: recoveryPolicy(parsed, false),
    };
  const controlled =
    activation === "sandbox" ||
    (activation === "verify" && parsed.NODE_ENV !== "production");
  return { activation, parsed, gateway, native, shortcutAmounts, controlled };
}

export function loadAlipayRechargeApiConfiguration(
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

export function loadAlipayRechargeWorkerConfiguration(
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
