import {
  Module,
  type DynamicModule,
  type INestApplicationContext,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
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
    return {
      module: RechargeWorkerModule,
      imports: [PersistenceModule.register(input.databaseUrl)],
      providers: [
        {
          provide: RechargeWorkerRuntime,
          inject: [PrismaService],
          useFactory: (prisma: PrismaService) =>
            new RechargeWorkerRuntime(
              createNativeRecoveryRuntime({ ...native, prisma }),
              scheduling,
            ),
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
