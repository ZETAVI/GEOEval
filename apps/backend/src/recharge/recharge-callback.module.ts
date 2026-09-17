import { Module, type DynamicModule } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { PersistenceModule } from "../infrastructure/persistence.module.js";
import type { ProviderNotificationVerifier } from "./application/provider-payment.js";
import { RechargeNotificationModule } from "./recharge-notification.module.js";

export type RechargeCallbackConfiguration = Readonly<{
  databaseUrl: string;
  port: number;
  verifiers: readonly ProviderNotificationVerifier[];
}>;

/** Dedicated public ingress: callback verification plus durable inbox only. */
@Module({})
export class RechargeCallbackModule {
  static register(configuration: RechargeCallbackConfiguration): DynamicModule {
    return {
      module: RechargeCallbackModule,
      imports: [
        PersistenceModule.register(configuration.databaseUrl),
        RechargeNotificationModule.register(configuration.verifiers),
      ],
    };
  }
}

export async function createRechargeCallbackApp(
  configuration: RechargeCallbackConfiguration,
  options: {
    handleSignals?: boolean;
    logger?: false | ("error" | "warn" | "log")[];
  } = {},
): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    RechargeCallbackModule.register(configuration),
    {
      logger: options.logger ?? ["error", "warn", "log"],
      rawBody: true,
      abortOnError: false,
    },
  );
  app.useBodyParser("json", { limit: "2mb", inflate: false });
  app.useBodyParser("urlencoded", {
    limit: "64kb",
    inflate: false,
    extended: false,
  });
  if (options.handleSignals !== false)
    app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
  return app;
}
