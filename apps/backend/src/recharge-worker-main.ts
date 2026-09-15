import "reflect-metadata";

import { loadAlipayRechargeWorkerConfiguration } from "./recharge/alipay-recharge.runtime-config.js";
import { createRechargeWorkerApp } from "./recharge/recharge-worker.module.js";

const configuration = loadAlipayRechargeWorkerConfiguration();
if (!configuration) throw new Error("RECHARGE_ALIPAY_RUNTIME_DISABLED");
await createRechargeWorkerApp(configuration);
process.stdout.write(
  `${JSON.stringify({
    level: "info",
    process: "recharge-worker",
    status: "ready",
    pid: process.pid,
  })}\n`,
);
