import "reflect-metadata";

import { z } from "zod";
import { PrismaService } from "./infrastructure/prisma.service.js";
import { runWechatPrepayCloseAcceptance } from "./recharge/application/wechat-recharge-acceptance.js";
import { createNativeRecoveryRuntime } from "./recharge/native-recovery.runtime.js";
import { loadWechatRechargeWorkerConfiguration } from "./recharge/wechat-recharge.runtime-config.js";

const optionsSchema = z
  .object({
    mode: z.literal("prepay-close"),
    accountId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

function options(argv: string[]) {
  const values: Record<string, string> = { mode: argv[0] ?? "" };
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index],
      value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined)
      throw new Error("RECHARGE_ACCEPTANCE_OPTIONS_INVALID");
    values[
      key === "--account-id"
        ? "accountId"
        : key === "--idempotency-key"
          ? "idempotencyKey"
          : key
    ] = value;
  }
  return optionsSchema.parse(values);
}

async function main() {
  const input = options(process.argv.slice(2));
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
    const evidence = await runWechatPrepayCloseAcceptance(runtime, input);
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
