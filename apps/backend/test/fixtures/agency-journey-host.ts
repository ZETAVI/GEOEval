import "reflect-metadata";
import { createApiApp } from "../../src/api-app.js";
import { PrismaService } from "../../src/infrastructure/prisma.service.js";
import { PostgresAcquisitionRepository } from "../../src/agency/infrastructure/postgres-acquisition.repository.js";
import { loadIntegrationApiConfig } from "../integration-test-config.js";
const config = loadIntegrationApiConfig();
const database = new URL(config.databaseUrl),
  redis = new URL(process.env.REDIS_URL ?? "");
if (
  database.hostname !== "127.0.0.1" ||
  database.port !== "55432" ||
  database.pathname !== "/geoeval_issue100" ||
  redis.hostname !== "127.0.0.1" ||
  redis.port !== "56379" ||
  redis.pathname !== "/10"
)
  throw new Error("AGENCY_OWNED_BROWSER_TARGET_REQUIRED");
const app = await createApiApp(
  {
    ...config,
    agencyAcquisitionEnabled: true,
    corsOrigins: ["http://127.0.0.1:3290"],
    authChallengePolicy: { ...config.authChallengePolicy, resendIntervalMs: 0 },
  },
  false,
);
const db = app.get(PrismaService);
await db.$connect();
const admin = await db.account.upsert({
  where: { mobile: "+8613900010801" },
  create: { mobile: "+8613900010801", role: "ADMINISTRATOR" },
  update: {},
});
const agent = await db.account.upsert({
  where: { mobile: "+8613900010802" },
  create: { mobile: "+8613900010802", role: "AGENT" },
  update: {},
});
const link = await app
  .get(PostgresAcquisitionRepository)
  .issueLink(admin.id, agent.id);
await app.listen(3390, "127.0.0.1");
console.log(
  JSON.stringify({
    url: "http://127.0.0.1:3290/e/" + link.entryKey,
    agentId: agent.id,
    adminMobile: "13900010801",
    agentMobile: "13900010802",
    note: "synthetic local data; no provider or payment",
  }),
);
