import { z } from "zod";
import type { PrismaService } from "../infrastructure/prisma.service.js";
import { NativeRecoveryService } from "./application/native-recovery.service.js";
import type {
  NativeChannel,
  NativePreparation,
  NativeRecoveryPolicy,
} from "./application/native-recovery.js";
import { RechargeCoreService } from "./application/recharge-core.service.js";
import {
  rechargeConfigSchema,
  type RechargeConfig,
} from "./domain/recharge-order.js";
import { PostgresNativeRecoveryRepository } from "./infrastructure/postgres-native-recovery.repository.js";
import { PostgresRechargeRepository } from "./infrastructure/postgres-recharge.repository.js";

/** Explicit host composition only: no env keys, app registration, public route, or background timer. */
export function createNativeRecoveryRuntime(input: {
  prisma: PrismaService;
  recharge: RechargeConfig;
  preparation: NativePreparation;
  channel: NativeChannel;
  recovery: NativeRecoveryPolicy;
  clock?: () => Date;
}) {
  const recharge = rechargeConfigSchema.parse(input.recharge);
  const preparation = Object.freeze(
    z
      .object({
        description: z
          .string()
          .min(1)
          .refine(
            (s) =>
              Buffer.byteLength(s, "utf8") <= 127 &&
              !/[\u0000-\u001f\u007f]/.test(s),
          ),
        notifyUrl: z
          .url()
          .max(256)
          .refine((s) => {
            const u = new URL(s);
            return (
              u.protocol === "https:" &&
              !u.username &&
              !u.password &&
              !u.search &&
              !u.hash &&
              !/[\\\s?#]/.test(s)
            );
          }),
        createEnabled: z.boolean(),
      })
      .strict()
      .parse(input.preparation),
  );
  if (
    recharge.merchantId !== input.channel.merchantId ||
    recharge.appId !== input.channel.appId ||
    preparation.notifyUrl !== input.channel.notifyUrl
  )
    throw new Error("NATIVE_CHANNEL_CONFIGURATION");
  if (
    recharge.paymentWindowSeconds * 1000 <
    input.recovery.minimumDispatchWindowMs
  )
    throw new Error("NATIVE_DISPATCH_WINDOW");
  const repository = new PostgresRechargeRepository(input.prisma, preparation);
  const core = new RechargeCoreService(repository, recharge);
  const recoveryRepository = new PostgresNativeRecoveryRepository(
    input.prisma,
    repository,
  );
  return new NativeRecoveryService(
    core,
    recoveryRepository,
    input.channel,
    input.recovery,
    input.clock,
  );
}
