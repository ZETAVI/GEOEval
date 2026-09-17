import { readFileSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { z } from "zod";

export const sharedRechargeRuntimeSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1).optional(),
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

export type SharedRechargeRuntime = z.infer<typeof sharedRechargeRuntimeSchema>;

export function protectedFile(path: string, maxBytes = 32 * 1024): Buffer {
  if (!isAbsolute(path)) throw new Error("RECHARGE_KEY_PATH_MUST_BE_ABSOLUTE");
  try {
    const metadata = statSync(path);
    if (!metadata.isFile() || (metadata.mode & 0o077) !== 0)
      throw new Error("RECHARGE_KEY_FILE_NOT_PRIVATE");
    if (metadata.size > maxBytes)
      throw new Error("RECHARGE_KEY_FILE_TOO_LARGE");
    return readFileSync(path);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("RECHARGE_KEY_FILE_")
    )
      throw error;
    throw new Error("RECHARGE_KEY_FILE_UNREADABLE");
  }
}

export function protectedPem(path: string): string {
  return protectedFile(path).toString("utf8");
}

export function httpsUrl(value: string, name: string): string {
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

export function parseShortcutAmounts(value: string): number[] {
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

export function validateSharedRechargePolicy(parsed: SharedRechargeRuntime) {
  if (parsed.RECHARGE_MIN_AMOUNT_YUAN > parsed.RECHARGE_MAX_AMOUNT_YUAN)
    throw new Error("RECHARGE_AMOUNT_POLICY_INVALID");
  const shortcutAmounts = parseShortcutAmounts(
    parsed.RECHARGE_SHORTCUT_AMOUNTS,
  );
  if (
    shortcutAmounts.some(
      (amount) =>
        amount < parsed.RECHARGE_MIN_AMOUNT_YUAN ||
        amount > parsed.RECHARGE_MAX_AMOUNT_YUAN,
    )
  )
    throw new Error("RECHARGE_SHORTCUT_AMOUNTS_OUT_OF_RANGE");
  return shortcutAmounts;
}

export function workerScheduling(parsed: SharedRechargeRuntime) {
  return {
    orderIntervalMs: parsed.RECHARGE_WORKER_ORDER_INTERVAL_MS,
    settlementIntervalMs: parsed.RECHARGE_WORKER_SETTLEMENT_INTERVAL_MS,
    notificationIntervalMs: parsed.RECHARGE_WORKER_NOTIFICATION_INTERVAL_MS,
    failureIntervalMs: parsed.RECHARGE_WORKER_FAILURE_INTERVAL_MS,
    drainWarningMs: parsed.RECHARGE_WORKER_DRAIN_WARNING_MS,
  };
}

export function recoveryPolicy(
  parsed: SharedRechargeRuntime,
  initiationEnabled: boolean,
) {
  return {
    initiationEnabled,
    minimumDispatchWindowMs: parsed.RECHARGE_MINIMUM_DISPATCH_WINDOW_MS,
    leaseMs: parsed.RECHARGE_OPERATION_LEASE_MS,
    queryIntervalMs: parsed.RECHARGE_QUERY_INTERVAL_MS,
    retryDelayMs: parsed.RECHARGE_RETRY_DELAY_MS,
    maxFailures: parsed.RECHARGE_MAX_FAILURES,
    slowRetryDelayMs: parsed.RECHARGE_SLOW_RETRY_DELAY_MS,
  };
}
