import "reflect-metadata";

import { loadRechargeWorkerConfiguration } from "./recharge/recharge.runtime-config.js";
import { createRechargeWorkerApp } from "./recharge/recharge-worker.module.js";

const configuration = loadRechargeWorkerConfiguration();
if (!configuration) throw new Error("RECHARGE_RUNTIME_DISABLED");
await createRechargeWorkerApp(configuration);
process.stdout.write(
  `${JSON.stringify({
    level: "info",
    process: "recharge-worker",
    status: "ready",
    pid: process.pid,
  })}\n`,
);
