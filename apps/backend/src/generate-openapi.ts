import "reflect-metadata";

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

process.env.GEOEVAL_LOCAL_DEFAULTS ??= "1";
process.env.GEOEVAL_SKIP_DATABASE_CONNECT = "1";

const { createApiApp } = await import("./api-app.js");
const { loadApiConfig } = await import("./config/runtime-config.js");

const app = await createApiApp(loadApiConfig(), false);
await app.init();
const document = SwaggerModule.createDocument(
  app,
  new DocumentBuilder()
    .setTitle("GEOEval Foundation API")
    .setVersion("0.0.0")
    .build(),
);
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const target = resolve(currentDirectory, "../openapi.json");
await writeFile(target, `${JSON.stringify(document, null, 2)}\n`, "utf8");
await app.close();
