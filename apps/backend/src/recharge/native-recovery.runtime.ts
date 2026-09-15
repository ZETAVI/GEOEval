import { z } from "zod";
import type { PrismaService } from "../infrastructure/prisma.service.js";
import { NativeRecoveryService } from "./application/native-recovery.service.js";
import type {
  NativeChannel,
  NativePreparation,
  NativeRecoveryPolicy,
} from "./application/native-recovery.js";
import type {
  PaymentGateway,
  PaymentNotificationVerifier,
} from "./application/payment-gateway.js";
import {
  WechatRechargePaymentGateway,
  providerForMethod,
  type RechargePaymentGateway,
} from "./application/provider-payment.js";
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
  channel: Omit<NativeChannel, "gateway"> & {
    gateway:
      RechargePaymentGateway | (PaymentGateway & PaymentNotificationVerifier);
  };
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
        actionKind: z.enum(["QR_CODE", "CASHIER_PAGE"]).optional(),
      })
      .strict()
      .parse(input.preparation),
  );
  const gateway =
      "provider" in input.channel.gateway &&
      "actionKind" in input.channel.gateway
        ? input.channel.gateway
        : new WechatRechargePaymentGateway(input.channel.gateway),
    method = input.channel.method ?? recharge.method,
    provider = input.channel.provider ?? providerForMethod(method),
    actionKind = preparation.actionKind ?? gateway.actionKind,
    channel = Object.freeze({
      ...input.channel,
      gateway,
      method,
      provider,
    });
  if (
    recharge.merchantId !== channel.merchantId ||
    recharge.appId !== channel.appId ||
    recharge.method !== method ||
    provider !== providerForMethod(method) ||
    gateway.provider !== provider ||
    gateway.method !== method ||
    actionKind !== gateway.actionKind ||
    preparation.notifyUrl !== channel.notifyUrl
  )
    throw new Error("NATIVE_CHANNEL_CONFIGURATION");
  if (
    recharge.paymentWindowSeconds * 1000 <
    input.recovery.minimumDispatchWindowMs
  )
    throw new Error("NATIVE_DISPATCH_WINDOW");
  const repository = new PostgresRechargeRepository(input.prisma, {
    ...preparation,
    actionKind,
  });
  const core = new RechargeCoreService(repository, recharge);
  const recoveryRepository = new PostgresNativeRecoveryRepository(
    input.prisma,
    repository,
  );
  return new NativeRecoveryService(
    core,
    recoveryRepository,
    channel,
    input.recovery,
    input.clock,
  );
}
