import "reflect-metadata";

import { randomBytes } from "node:crypto";
import { loadAlipayRechargeApiConfiguration } from "./recharge/alipay-recharge.runtime-config.js";
import type { RechargePaymentGateway } from "./recharge/application/provider-payment.js";

const configuration = loadAlipayRechargeApiConfiguration();
if (
  !configuration ||
  !configuration.controlled ||
  configuration.preparation.createEnabled ||
  configuration.channel.provider !== "ALIPAY"
)
  throw new Error("RECHARGE_ALIPAY_VERIFY_MODE_REQUIRED");

const merchantOrderNo =
  `GEOV${Date.now().toString(36)}${randomBytes(4).toString("hex")}`
    .toUpperCase()
    .slice(0, 32);
const gateway = configuration.channel.gateway as RechargePaymentGateway;
try {
  const result = await gateway.query({
    merchantId: configuration.channel.merchantId,
    appId: configuration.channel.appId,
    merchantOrderNo,
    amountFen: 1,
  });
  const verified = !result.ok && result.error.code === "TRADE_NOT_FOUND";
  process.stdout.write(
    `${JSON.stringify({
      process: "alipay-recharge-verify",
      provider: "ALIPAY",
      verified,
      result: result.ok ? "UNEXPECTED_ORDER" : result.error.code,
      recovery:
        result.ok || !("recovery" in result.error)
          ? "REVIEW"
          : result.error.recovery,
    })}\n`,
  );
  if (!verified) process.exitCode = 1;
} finally {
  await gateway.dispose?.();
}
