import { z } from "zod";
import type { RechargeCallbackConfiguration } from "./recharge-callback.module.js";
import { loadAlipayRechargeNotificationVerifier } from "./alipay-notification.runtime-config.js";
import { loadWechatRechargeNotificationVerifier } from "./wechat-recharge.runtime-config.js";

const callbackHostSchema = z.object({
  DATABASE_URL: z.string().min(1),
  RECHARGE_CALLBACK_PORT: z.coerce
    .number()
    .int()
    .min(1024)
    .max(65_535)
    .default(3300),
});

export function loadRechargeCallbackConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): RechargeCallbackConfiguration | null {
  const verifiers = [
    loadWechatRechargeNotificationVerifier(environment),
    loadAlipayRechargeNotificationVerifier(environment),
  ].filter((value): value is NonNullable<typeof value> => value !== null);
  if (verifiers.length < 1) return null;
  const host = callbackHostSchema.parse(environment);
  return {
    databaseUrl: host.DATABASE_URL,
    port: host.RECHARGE_CALLBACK_PORT,
    verifiers,
  };
}
