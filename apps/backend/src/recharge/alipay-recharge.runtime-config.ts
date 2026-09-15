import { readFileSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { z } from "zod";
import type { RechargeApiConfiguration } from "./recharge-api.module.js";
import type { RechargeWorkerConfiguration } from "./recharge-worker.module.js";
import { AlipayPaymentAdapter } from "./infrastructure/alipay/alipay-payment.adapter.js";
import { AlipayRechargePaymentGateway } from "./infrastructure/alipay/alipay-recharge.gateway.js";

const activationSchema = z
  .object({
    RECHARGE_ALIPAY_ACTIVATION: z
      .enum(["disabled", "verify", "sandbox", "live"])
      .default("disabled"),
  })
  .passthrough();

const configurationSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1).optional(),
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
  RECHARGE_MIN_AMOUNT_YUAN: z.coerce.number().int().positive(),
  RECHARGE_MAX_AMOUNT_YUAN: z.coerce.number().int().positive(),
  RECHARGE_SHORTCUT_AMOUNTS: z.string().min(1),
  RECHARGE_MAX_ACTIVE_ORDERS: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(3),
  RECHARGE_PAYMENT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(86_400)
    .default(900),
  RECHARGE_PAYMENT_DESCRIPTION: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .default("GEO优化服务积分充值"),
  RECHARGE_SUPPORT_MESSAGE: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .default("请保留充值单号并稍后刷新状态。"),
  RECHARGE_MINIMUM_DISPATCH_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(70_000)
    .default(80_000),
  RECHARGE_OPERATION_LEASE_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(30_000),
  RECHARGE_QUERY_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
  RECHARGE_RETRY_DELAY_MS: z.coerce.number().int().min(1000).default(5000),
  RECHARGE_MAX_FAILURES: z.coerce.number().int().min(1).max(100).default(3),
  RECHARGE_SLOW_RETRY_DELAY_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(86_400_000)
    .default(300_000),
  RECHARGE_WORKER_ORDER_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60_000)
    .default(2000),
  RECHARGE_WORKER_SETTLEMENT_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60_000)
    .default(1000),
  RECHARGE_WORKER_NOTIFICATION_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60_000)
    .default(1000),
  RECHARGE_WORKER_FAILURE_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(300_000)
    .default(10_000),
  RECHARGE_WORKER_DRAIN_WARNING_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(300_000)
    .default(10_000),
  RECHARGE_NOTIFICATION_RETRY_DELAY_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(86_400_000)
    .default(5000),
});

function protectedPem(path: string): string {
  if (!isAbsolute(path)) throw new Error("RECHARGE_KEY_PATH_MUST_BE_ABSOLUTE");
  try {
    const metadata = statSync(path);
    if (!metadata.isFile() || (metadata.mode & 0o077) !== 0)
      throw new Error("RECHARGE_KEY_FILE_NOT_PRIVATE");
    if (metadata.size > 32 * 1024)
      throw new Error("RECHARGE_KEY_FILE_TOO_LARGE");
    return readFileSync(path, "utf8");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("RECHARGE_KEY_FILE_")
    )
      throw error;
    throw new Error("RECHARGE_KEY_FILE_UNREADABLE");
  }
}

function httpsUrl(value: string, name: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(`${name}_MUST_BE_HTTPS`);
  return url.href;
}

function amounts(value: string): number[] {
  const parsed = value.split(",").map((item) => Number(item.trim()));
  if (
    parsed.length < 1 ||
    parsed.length > 10 ||
    parsed.some((item) => !Number.isInteger(item) || item <= 0) ||
    new Set(parsed).size !== parsed.length
  )
    throw new Error("RECHARGE_SHORTCUT_AMOUNTS_INVALID");
  return parsed;
}

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
  if (parsed.RECHARGE_MIN_AMOUNT_YUAN > parsed.RECHARGE_MAX_AMOUNT_YUAN)
    throw new Error("RECHARGE_AMOUNT_POLICY_INVALID");
  const shortcutAmounts = amounts(parsed.RECHARGE_SHORTCUT_AMOUNTS);
  if (
    shortcutAmounts.some(
      (amount) =>
        amount < parsed.RECHARGE_MIN_AMOUNT_YUAN ||
        amount > parsed.RECHARGE_MAX_AMOUNT_YUAN,
    )
  )
    throw new Error("RECHARGE_SHORTCUT_AMOUNTS_OUT_OF_RANGE");
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
      recovery: {
        initiationEnabled: false,
        minimumDispatchWindowMs: parsed.RECHARGE_MINIMUM_DISPATCH_WINDOW_MS,
        leaseMs: parsed.RECHARGE_OPERATION_LEASE_MS,
        queryIntervalMs: parsed.RECHARGE_QUERY_INTERVAL_MS,
        retryDelayMs: parsed.RECHARGE_RETRY_DELAY_MS,
        maxFailures: parsed.RECHARGE_MAX_FAILURES,
        slowRetryDelayMs: parsed.RECHARGE_SLOW_RETRY_DELAY_MS,
      },
    };
  const controlled =
    activation === "sandbox" ||
    (activation === "verify" && parsed.NODE_ENV !== "production");
  return { activation, parsed, gateway, native, shortcutAmounts, controlled };
}

export function loadAlipayRechargeApiConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): RechargeApiConfiguration | null {
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
    scheduling: {
      orderIntervalMs: value.parsed.RECHARGE_WORKER_ORDER_INTERVAL_MS,
      settlementIntervalMs: value.parsed.RECHARGE_WORKER_SETTLEMENT_INTERVAL_MS,
      notificationIntervalMs:
        value.parsed.RECHARGE_WORKER_NOTIFICATION_INTERVAL_MS,
      failureIntervalMs: value.parsed.RECHARGE_WORKER_FAILURE_INTERVAL_MS,
      drainWarningMs: value.parsed.RECHARGE_WORKER_DRAIN_WARNING_MS,
    },
    notifications: {
      retryDelayMs: value.parsed.RECHARGE_NOTIFICATION_RETRY_DELAY_MS,
    },
  };
}
