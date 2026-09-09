import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { ApiModule } from "./api.module.js";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { RechargeApiConfiguration } from "./recharge/recharge-api.module.js";
import type { ApiConfig } from "./config/runtime-config.js";

export async function createApiApp(
  config: ApiConfig,
  logger: false | ("error" | "warn" | "log")[] = ["error", "warn", "log"],
  recharge: RechargeApiConfiguration | null = null,
): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(
    ApiModule.register(config, recharge),
    { logger, rawBody: recharge !== null },
  );
  if (recharge) app.useBodyParser("json", { limit: "2mb", inflate: false });
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle("GEOEval API")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("openapi", app, document);

  return app;
}
