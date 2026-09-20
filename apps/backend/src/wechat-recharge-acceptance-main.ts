import "reflect-metadata";

import { PrismaService } from "./infrastructure/prisma.service.js";
import { runWechatPrepayCloseAcceptance } from "./recharge/application/wechat-recharge-acceptance.js";
import { createNativeRecoveryRuntime } from "./recharge/native-recovery.runtime.js";
import { parseWechatRechargeAcceptanceOptions } from "./recharge/wechat-recharge-acceptance.options.js";
import { loadWechatRechargeWorkerConfiguration } from "./recharge/wechat-recharge.runtime-config.js";

async function main() {
  const input = parseWechatRechargeAcceptanceOptions(process.argv.slice(2));
  const configuration = loadWechatRechargeWorkerConfiguration();
  if (
    !configuration ||
    configuration.runtimeEnvironment !== "production" ||
    configuration.controlled ||
    "channels" in configuration ||
    !configuration.native.preparation.createEnabled ||
    !configuration.native.recovery.initiationEnabled
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
    const evidence = await runWechatPrepayCloseAcceptance(
      runtime,
      input.request,
    );
    process.stdout.write(
      `${JSON.stringify({ process: "wechat-recharge-acceptance", mode: input.mode, ...evidence })}\n`,
    );
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
      process: "wechat-recharge-acceptance",
      status: "FAILED",
      error: {
        code: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
    })}\n`,
  );
  process.exitCode = 1;
});
