import "reflect-metadata";

import { createRechargeCallbackApp } from "./recharge/recharge-callback.module.js";
import { loadRechargeCallbackConfiguration } from "./recharge/recharge.runtime-config.js";

const configuration = loadRechargeCallbackConfiguration();
if (!configuration) throw new Error("RECHARGE_CALLBACK_RUNTIME_DISABLED");
const app = await createRechargeCallbackApp(configuration);
await app.listen(configuration.port, "127.0.0.1");
process.stdout.write(
  `${JSON.stringify({
    level: "info",
    process: "recharge-callback",
    port: configuration.port,
    pid: process.pid,
  })}\n`,
);
