import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { loadWorkerConfig } from "./config/runtime-config.js";
import { WorkerModule } from "./worker.module.js";

async function bootstrap(): Promise<void> {
  const config = loadWorkerConfig();
  const application = await NestFactory.createApplicationContext(
    WorkerModule.register(config),
    { logger: ["error", "warn", "log"] },
  );
  application.enableShutdownHooks();
  process.stdout.write(
    `${JSON.stringify({
      level: "info",
      process: "worker",
      status: "ready",
      pid: process.pid,
    })}\n`,
  );
}

await bootstrap();
