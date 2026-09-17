import { Module, type DynamicModule } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../infrastructure/prisma.service.js";
import { createNativeRecoveryRuntime } from "./native-recovery.runtime.js";
import { CustomerRechargeService } from "./application/customer-recharge.service.js";
import {
  RECHARGE_CUSTOMER_OPTIONS,
  RECHARGE_CUSTOMER_QUERIES,
  RECHARGE_CUSTOMER_RUNTIME,
  type RechargeCustomerOptions,
} from "./application/customer-recharge.js";
import type { PaymentNotificationVerifier } from "./application/payment-gateway.js";
import type { ProviderNotificationVerifier } from "./application/provider-payment.js";
import { providerForMethod } from "./application/provider-payment.js";
import {
  POINTS_PER_YUAN,
  rechargeConfigSchema,
} from "./domain/recharge-order.js";
import { PostgresRechargeRepository } from "./infrastructure/postgres-recharge.repository.js";
import { PostgresNativeRecoveryRepository } from "./infrastructure/postgres-native-recovery.repository.js";
import { CustomerRechargeController } from "./presentation/customer-recharge.controller.js";
import { RechargeNotificationModule } from "./recharge-notification.module.js";
import { RoutedRechargeCustomerRuntime } from "./application/recharge-customer-runtime.js";

export type RechargeChannelConfiguration = Omit<
  Parameters<typeof createNativeRecoveryRuntime>[0],
  "prisma"
> & {
  verifier: PaymentNotificationVerifier | ProviderNotificationVerifier;
};

export type RechargeSingleChannelApiConfiguration =
  RechargeChannelConfiguration & {
    controlled: boolean;
    shortcutAmounts: readonly number[];
    supportMessage: string;
  };

export type RechargeMultiChannelApiConfiguration = Readonly<{
  channels: readonly RechargeChannelConfiguration[];
  controlled: boolean;
  shortcutAmounts: readonly number[];
  supportMessage: string;
}>;

export type RechargeApiConfiguration =
  RechargeSingleChannelApiConfiguration | RechargeMultiChannelApiConfiguration;

function normalize(configuration: RechargeApiConfiguration) {
  const channels = (
    "channels" in configuration ? configuration.channels : [configuration]
  ).map((channel) => {
    const recharge = Object.freeze(
      rechargeConfigSchema.parse(channel.recharge),
    );
    return Object.freeze({
      ...channel,
      recharge,
      preparation: Object.freeze({ ...channel.preparation }),
      recovery: Object.freeze({ ...channel.recovery }),
      channel: Object.freeze({
        ...channel.channel,
        method: channel.channel.method ?? recharge.method,
        provider:
          channel.channel.provider ?? providerForMethod(recharge.method),
      }),
    });
  });
  if (channels.length < 1) throw new Error("RECHARGE_CHANNELS_REQUIRED");
  const methods = new Set(channels.map((channel) => channel.recharge.method));
  const providers = new Set(
    channels.map((channel) => channel.channel.provider),
  );
  if (methods.size !== channels.length || providers.size !== channels.length)
    throw new Error("RECHARGE_CHANNEL_DUPLICATE");
  const policy = channels[0]!.recharge;
  if (
    channels.some(
      (channel) =>
        channel.recharge.minAmountYuan !== policy.minAmountYuan ||
        channel.recharge.maxAmountYuan !== policy.maxAmountYuan ||
        channel.recharge.maxActiveOrders !== policy.maxActiveOrders,
    )
  )
    throw new Error("RECHARGE_CHANNEL_POLICY_MISMATCH");
  return Object.freeze({
    channels: Object.freeze(channels),
    controlled: configuration.controlled,
    shortcutAmounts: Object.freeze([...configuration.shortcutAmounts]),
    supportMessage: configuration.supportMessage,
  });
}

/** Read/replay routes stay available without a merchant. Real configuration is a later host-owned gate. */
@Module({})
export class RechargeApiModule {
  static register(
    configuration: RechargeApiConfiguration | null = null,
  ): DynamicModule {
    const host = configuration ? normalize(configuration) : null;
    let options: RechargeCustomerOptions = {
      available: false,
      controlled: false,
      minAmountYuan: null,
      maxAmountYuan: null,
      shortcutAmounts: [],
      methods: [],
      pointsPerYuan: POINTS_PER_YUAN,
      supportMessage: null,
    };
    if (host) {
      const shortcuts = z
        .array(z.number().int())
        .min(1)
        .max(10)
        .parse(host.shortcutAmounts);
      const policy = host.channels[0]!.recharge;
      if (
        new Set(shortcuts).size !== shortcuts.length ||
        shortcuts.some(
          (n) => n < policy.minAmountYuan || n > policy.maxAmountYuan,
        )
      )
        throw new Error("RECHARGE_SHORTCUT_POLICY");
      const availableChannels = host.channels.filter(
        (channel) =>
          channel.preparation.createEnabled &&
          ((channel.preparation.actionKind ?? "QR_CODE") === "CASHIER_PAGE" ||
            channel.recovery.initiationEnabled),
      );
      options = {
        available: availableChannels.length > 0,
        controlled: host.controlled,
        minAmountYuan: policy.minAmountYuan,
        maxAmountYuan: policy.maxAmountYuan,
        shortcutAmounts: Object.freeze([...shortcuts]),
        methods: availableChannels.map((channel) => channel.recharge.method),
        pointsPerYuan: POINTS_PER_YUAN,
        supportMessage: z
          .string()
          .trim()
          .min(1)
          .max(500)
          .parse(host.supportMessage),
      };
    }
    return {
      module: RechargeApiModule,
      imports: host
        ? [
            RechargeNotificationModule.register(
              host.channels.map((channel) => channel.verifier),
            ),
          ]
        : [],
      controllers: [CustomerRechargeController],
      providers: [
        {
          provide: RECHARGE_CUSTOMER_OPTIONS,
          useValue: Object.freeze(options),
        },
        {
          provide: RECHARGE_CUSTOMER_QUERIES,
          inject: [PrismaService],
          useFactory: (prisma: PrismaService) =>
            new PostgresNativeRecoveryRepository(
              prisma,
              new PostgresRechargeRepository(prisma),
            ),
        },
        {
          provide: RECHARGE_CUSTOMER_RUNTIME,
          inject: [PrismaService],
          useFactory: (prisma: PrismaService) =>
            host
              ? (() => {
                  const runtimes = host.channels.map((channel) =>
                    createNativeRecoveryRuntime({ ...channel, prisma }),
                  );
                  return runtimes.length === 1
                    ? runtimes[0]!
                    : new RoutedRechargeCustomerRuntime(runtimes);
                })()
              : null,
        },
        CustomerRechargeService,
      ],
      exports: [RECHARGE_CUSTOMER_RUNTIME],
    };
  }
}
