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
import type { NativeRecoveryService } from "./application/native-recovery.service.js";

export type RechargeWorkerConfiguration = {
  databaseUrl: string;
  runtimeEnvironment: "development" | "test" | "production";
  controlled: boolean;
  scheduling: RechargeWorkerPolicy;
  notifications?: { retryDelayMs: number };
} & (
  | {
      native: Omit<Parameters<typeof createNativeRecoveryRuntime>[0], "prisma">;
      channels?: never;
    }
  | {
      channels: readonly Omit<
        Parameters<typeof createNativeRecoveryRuntime>[0],
        "prisma"
      >[];
      native?: never;
    }
);

type RecoveryWork = Pick<
  NativeRecoveryService,
  "runOrders" | "runSettlements" | "onApplicationShutdown"
>;

/** Provider dispatch is parallel; provider-neutral settlement is scanned once. */
export function createRechargeRecoveryWork(
  recoveries: readonly RecoveryWork[],
) {
  if (recoveries.length < 1) throw new Error("RECHARGE_CHANNELS_REQUIRED");
  return {
    async runOrders(limit: number, stop?: AbortSignal) {
      const results = await Promise.all(
        recoveries.map((recovery) => recovery.runOrders(limit, stop)),
      );
      return results.reduce(
        (total, result) => ({
          claimed: total.claimed + result.claimed,
          failed: total.failed + result.failed,
        }),
        { claimed: 0, failed: 0 },
      );
    },
    runSettlements: (limit: number, stop?: AbortSignal) =>
      recoveries[0]!.runSettlements(limit, stop),
    dispose: () =>
      Promise.all(
        recoveries.map((recovery) => recovery.onApplicationShutdown()),
      ).then(() => undefined),
  };
}

/** Explicit dedicated host: no customer controllers, Identity, AI, Redis or secret loader. */
@Module({})
export class RechargeWorkerModule {
  static register(input: RechargeWorkerConfiguration): DynamicModule {
    if (input.runtimeEnvironment === "production" && input.controlled)
      throw new Error("CONTROLLED_RECHARGE_IN_PRODUCTION");
    const channels = (
      "channels" in input ? input.channels : [input.native]
    ).map((native) => ({
      ...native,
      recharge: { ...native.recharge },
      preparation: { ...native.preparation },
      channel: { ...native.channel },
      recovery: { ...native.recovery },
    }));
    if (channels.length < 1) throw new Error("RECHARGE_CHANNELS_REQUIRED");
    const methods = new Set(channels.map((channel) => channel.recharge.method));
    if (methods.size !== channels.length)
      throw new Error("RECHARGE_CHANNEL_DUPLICATE");
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
            const recoveries = channels.map((native) =>
              createNativeRecoveryRuntime({ ...native, prisma }),
            );
            const delivery =
              notifications && notificationRetryDelay !== undefined
                ? createRechargeNotificationRuntime(
                    prisma,
                    notifications,
                    notificationRetryDelay,
                  )
                : undefined;
            const recovery = createRechargeRecoveryWork(recoveries);
            return new RechargeWorkerRuntime(
              {
                ...recovery,
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
