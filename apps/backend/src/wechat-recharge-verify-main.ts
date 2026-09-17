import "reflect-metadata";

import { randomBytes } from "node:crypto";
import { loadWechatRechargeApiConfiguration } from "./recharge/wechat-recharge.runtime-config.js";
import type { RechargePaymentGateway } from "./recharge/application/provider-payment.js";

const mode = process.argv[2];
if (mode !== "query") throw new Error("RECHARGE_WECHAT_VERIFY_MODE_REQUIRED");

const configuration = loadWechatRechargeApiConfiguration();
if (
  !configuration ||
  configuration.preparation.createEnabled ||
  configuration.channel.provider !== "WECHAT"
)
  throw new Error("RECHARGE_WECHAT_VERIFY_ACTIVATION_REQUIRED");

const merchantOrderNo =
  `GEOV${Date.now().toString(36)}${randomBytes(4).toString("hex")}`
    .toUpperCase()
    .slice(0, 32);
const gateway = configuration.channel.gateway as RechargePaymentGateway;
const order = {
  merchantId: configuration.channel.merchantId,
  appId: configuration.channel.appId,
  merchantOrderNo,
  amountFen: 1,
};

try {
  const result = await gateway.query(order);
  const verified =
    !result.ok &&
    result.error.code === "HTTP_ERROR" &&
    result.error.httpStatus === 404;
  process.stdout.write(
    `${JSON.stringify({
      process: "wechat-recharge-verify",
      mode,
      provider: "WECHAT",
      verified,
      result: result.ok
        ? "UNEXPECTED_ORDER"
        : `${result.error.code}:${result.error.httpStatus ?? "none"}`,
    })}\n`,
  );
  if (!verified) process.exitCode = 1;
} finally {
  await gateway.dispose?.();
}
