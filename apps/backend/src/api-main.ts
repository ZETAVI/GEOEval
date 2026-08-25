import "reflect-metadata";

import { createApiApp } from "./api-app.js";
import { loadApiConfig } from "./config/runtime-config.js";

async function bootstrap(): Promise<void> {
  const config = loadApiConfig();
  const app = await createApiApp(config);
  await app.listen(config.port, "127.0.0.1");
  process.stdout.write(
    `${JSON.stringify({
      level: "info",
      process: "api",
      port: config.port,
      pid: process.pid,
    })}\n`,
  );
}

await bootstrap();
