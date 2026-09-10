import {
  Module,
  type DynamicModule,
  type INestApplicationContext,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NotificationApplicationModule } from "../notification/notification-application.module.js";
import { NotificationEventHandler } from "../notification/application/notification-event.handler.js";
import { createRechargeNotificationRuntime } from "./recharge-notification.runtime.js";
import { PersistenceModule } from "../infrastructure/persistence.module.js";
import { PrismaService } from "../infrastructure/prisma.service.js";
import { createNativeRecoveryRuntime } from "./native-recovery.runtime.js";
import {
  RechargeWorkerRuntime,
  type RechargeWorkerPolicy,
} from "./recharge-worker.runtime.js";

export type RechargeWorkerConfiguration = {
  databaseUrl: string;
  runtimeEnvironment: "development" | "test" | "production";
  controlled: boolean;
  native: Omit<Parameters<typeof createNativeRecoveryRuntime>[0], "prisma">;
  scheduling: RechargeWorkerPolicy;
  notifications?: { retryDelayMs: number };
};

/** Explicit dedicated host: no customer controllers, Identity, AI, Redis or secret loader. */
@Module({})
export class RechargeWorkerModule {
  static register(input: RechargeWorkerConfiguration): DynamicModule {
    if (input.runtimeEnvironment === "production" && input.controlled)
      throw new Error("CONTROLLED_RECHARGE_IN_PRODUCTION");
    const native = {
      ...input.native,
      recharge: { ...input.native.recharge },
      preparation: { ...input.native.preparation },
      channel: { ...input.native.channel },
      recovery: { ...input.native.recovery },
    };
    const scheduling = { ...input.scheduling };
    const notificationRetryDelay = input.notifications?.retryDelayMs;
    if (
      (notificationRetryDelay !== undefined) !==
      (scheduling.notificationIntervalMs !== undefined)
    )
      throw new Error("INCOMPLETE_NOTIFICATION_LANE");
    return {
      module: RechargeWorkerModule,
      imports: [
        PersistenceModule.register(input.databaseUrl),
        ...(input.notifications ? [NotificationApplicationModule] : []),
      ],
      providers: [
        {
          provide: RechargeWorkerRuntime,
          inject: [
            PrismaService,
            ...(input.notifications ? [NotificationEventHandler] : []),
          ],
          useFactory: (
            prisma: PrismaService,
            notifications?: NotificationEventHandler,
          ) => {
            const recovery = createNativeRecoveryRuntime({ ...native, prisma });
            const delivery =
              notifications && notificationRetryDelay !== undefined
                ? createRechargeNotificationRuntime(
                    prisma,
                    notifications,
                    notificationRetryDelay,
                  )
                : undefined;
            return new RechargeWorkerRuntime(
              {
                runOrders: (limit, stop) => recovery.runOrders(limit, stop),
                runSettlements: (limit, stop) =>
                  recovery.runSettlements(limit, stop),
                ...(delivery
                  ? {
                      runNotifications: (limit: number, stop?: AbortSignal) =>
                        delivery.run(limit, stop),
                    }
                  : {}),
              },
              scheduling,
            );
          },
        },
      ],
      exports: [RechargeWorkerRuntime],
    };
  }
}

/** The caller supplies reviewed policy/merchant dependencies. No existing entry point calls this. */
export async function createRechargeWorkerApp(
  configuration: RechargeWorkerConfiguration,
  options: { handleSignals?: boolean } = {},
): Promise<INestApplicationContext> {
  const app = await NestFactory.createApplicationContext(
    RechargeWorkerModule.register(configuration),
    {
      logger: false,
      abortOnError: false,
    },
  );
  if (options.handleSignals !== false)
    app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
  return app;
}
