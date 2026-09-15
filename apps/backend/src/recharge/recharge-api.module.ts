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
import { POINTS_PER_YUAN } from "./domain/recharge-order.js";
import { PostgresRechargeRepository } from "./infrastructure/postgres-recharge.repository.js";
import { PostgresNativeRecoveryRepository } from "./infrastructure/postgres-native-recovery.repository.js";
import { CustomerRechargeController } from "./presentation/customer-recharge.controller.js";
import { RechargeNotificationModule } from "./recharge-notification.module.js";

export type RechargeApiConfiguration = Omit<
  Parameters<typeof createNativeRecoveryRuntime>[0],
  "prisma"
> & {
  verifier: PaymentNotificationVerifier | ProviderNotificationVerifier;
  controlled: boolean;
  shortcutAmounts: readonly number[];
  supportMessage: string;
};

/** Read/replay routes stay available without a merchant. Real configuration is a later host-owned gate. */
@Module({})
export class RechargeApiModule {
  static register(
    configuration: RechargeApiConfiguration | null = null,
  ): DynamicModule {
    if (configuration)
      configuration = Object.freeze({
        ...configuration,
        recharge: Object.freeze({ ...configuration.recharge }),
        preparation: Object.freeze({ ...configuration.preparation }),
        recovery: Object.freeze({ ...configuration.recovery }),
        channel: Object.freeze({ ...configuration.channel }),
        shortcutAmounts: Object.freeze([...configuration.shortcutAmounts]),
      });
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
    if (configuration) {
      const shortcuts = z
        .array(z.number().int())
        .min(1)
        .max(10)
        .parse(configuration.shortcutAmounts);
      if (
        new Set(shortcuts).size !== shortcuts.length ||
        shortcuts.some(
          (n) =>
            n < configuration.recharge.minAmountYuan ||
            n > configuration.recharge.maxAmountYuan,
        )
      )
        throw new Error("RECHARGE_SHORTCUT_POLICY");
      options = {
        available:
          configuration.preparation.createEnabled &&
          ((configuration.preparation.actionKind ?? "QR_CODE") ===
            "CASHIER_PAGE" ||
            configuration.recovery.initiationEnabled),
        controlled: configuration.controlled,
        minAmountYuan: configuration.recharge.minAmountYuan,
        maxAmountYuan: configuration.recharge.maxAmountYuan,
        shortcutAmounts: Object.freeze([...shortcuts]),
        methods: [configuration.recharge.method],
        pointsPerYuan: POINTS_PER_YUAN,
        supportMessage: z
          .string()
          .trim()
          .min(1)
          .max(500)
          .parse(configuration.supportMessage),
      };
    }
    return {
      module: RechargeApiModule,
      imports: configuration
        ? [RechargeNotificationModule.register(configuration.verifier)]
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
            configuration
              ? createNativeRecoveryRuntime({ ...configuration, prisma })
              : null,
        },
        CustomerRechargeService,
      ],
      exports: [RECHARGE_CUSTOMER_RUNTIME],
    };
  }
}
