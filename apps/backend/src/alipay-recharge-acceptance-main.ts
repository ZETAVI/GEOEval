import "reflect-metadata";

import { chmod, writeFile } from "node:fs/promises";
import { PrismaService } from "./infrastructure/prisma.service.js";
import {
  prepareAlipayPaymentAcceptance,
  reconcileAlipayPaymentAcceptance,
} from "./recharge/application/alipay-recharge-acceptance.js";
import { createNativeRecoveryRuntime } from "./recharge/native-recovery.runtime.js";
import { parseAlipayRechargeAcceptanceOptions } from "./recharge/alipay-recharge-acceptance.options.js";
import { loadAlipayRechargeWorkerConfiguration } from "./recharge/alipay-recharge.runtime-config.js";

async function main() {
  const input = parseAlipayRechargeAcceptanceOptions(process.argv.slice(2));
  const configuration = loadAlipayRechargeWorkerConfiguration();
  if (
    !configuration ||
    configuration.runtimeEnvironment !== "production" ||
    configuration.controlled ||
    "channels" in configuration ||
    !configuration.native.preparation.createEnabled ||
    configuration.native.recharge.method !== "ALIPAY_PC" ||
    configuration.native.recharge.minAmountYuan !== 1 ||
    configuration.native.recharge.maxAmountYuan !== 1 ||
    configuration.native.recharge.maxActiveOrders !== 3 ||
    configuration.native.recharge.paymentWindowSeconds !== 900
  )
    throw new Error("RECHARGE_ACCEPTANCE_LIVE_CONFIGURATION_REQUIRED");

  const prisma = new PrismaService(configuration.databaseUrl);
  await prisma.$connect();
  let runtime: ReturnType<typeof createNativeRecoveryRuntime> | undefined;
  try {
    runtime = createNativeRecoveryRuntime({
      ...configuration.native,
      prisma,
    });
    if (input.mode === "prepare") {
      const result = await prepareAlipayPaymentAcceptance(
        runtime,
        input.request,
      );
      await writeFile(input.cashierFile, result.cashierHtml, {
        encoding: "utf8",
        mode: 0o600,
        flag: "wx",
      });
      await chmod(input.cashierFile, 0o600);
      process.stdout.write(
        `${JSON.stringify({
          process: "alipay-recharge-acceptance",
          mode: input.mode,
          ...result.evidence,
          cashierFile: input.cashierFile,
        })}\n`,
      );
    } else {
      const evidence = await reconcileAlipayPaymentAcceptance(
        runtime,
        input.request,
      );
      process.stdout.write(
        `${JSON.stringify({
          process: "alipay-recharge-acceptance",
          mode: input.mode,
          ...evidence,
        })}\n`,
      );
    }
  } finally {
    try {
      await runtime?.onApplicationShutdown();
    } finally {
      await prisma.$disconnect();
    }
  }
}

void main().catch((error: unknown) => {
  process.stdout.write(
    `${JSON.stringify({
      process: "alipay-recharge-acceptance",
      status: "FAILED",
      error: {
        code: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
    })}\n`,
  );
  process.exitCode = 1;
});
