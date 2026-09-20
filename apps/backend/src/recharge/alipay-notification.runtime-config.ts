import { z } from "zod";
import { AlipayNotificationAdapter } from "./infrastructure/alipay/alipay-notification.adapter.js";
import { AlipayRechargeNotificationVerifier } from "./infrastructure/alipay/alipay-notification.gateway.js";
import { protectedPem } from "./runtime-config.shared.js";

const activationSchema = z
  .object({
    RECHARGE_ALIPAY_ACTIVATION: z
      .enum(["disabled", "verify", "sandbox", "live"])
      .default("disabled"),
  })
  .passthrough();

const notificationConfigurationSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    RECHARGE_ALIPAY_ACTIVATION: z.enum(["verify", "sandbox", "live"]),
    RECHARGE_ALIPAY_APP_ID: z.string().regex(/^\d{16,32}$/),
    RECHARGE_ALIPAY_MERCHANT_ID: z.string().regex(/^2088\d{12}$/),
    RECHARGE_ALIPAY_PUBLIC_KEY_FILE: z.string().min(1),
  })
  .passthrough();

export function loadAlipayRechargeNotificationVerifier(
  environment: NodeJS.ProcessEnv = process.env,
): AlipayRechargeNotificationVerifier | null {
  const activation =
    activationSchema.parse(environment).RECHARGE_ALIPAY_ACTIVATION;
  if (activation === "disabled") return null;
  const parsed = notificationConfigurationSchema.parse(environment);
  if (parsed.NODE_ENV === "production" && activation === "sandbox")
    throw new Error("RECHARGE_SANDBOX_FORBIDDEN_IN_PRODUCTION");
  try {
    return new AlipayRechargeNotificationVerifier(
      new AlipayNotificationAdapter({
        appId: parsed.RECHARGE_ALIPAY_APP_ID,
        merchantId: parsed.RECHARGE_ALIPAY_MERCHANT_ID,
        publicKey: protectedPem(parsed.RECHARGE_ALIPAY_PUBLIC_KEY_FILE),
      }),
    );
  } catch {
    throw new Error("RECHARGE_ALIPAY_KEY_MATERIAL_INVALID");
  }
}
