import "reflect-metadata";
import { createApiApp } from "../../src/api-app.js";
import { PrismaService } from "../../src/infrastructure/prisma.service.js";
import { loadIntegrationApiConfig } from "../integration-test-config.js";
import { rechargeApiFixture } from "../recharge-api.fixture.js";
const config = loadIntegrationApiConfig();
const dbTarget = new URL(config.databaseUrl);
if (
  dbTarget.hostname !== "127.0.0.1" ||
  dbTarget.port !== "55432" ||
  dbTarget.pathname !== "/geoeval_issue100" ||
  process.env.REDIS_URL !== "redis://127.0.0.1:56379/10"
)
  throw new Error("SUPPORT_OWNED_BROWSER_TARGET_REQUIRED");
const app = await createApiApp(
  {
    ...config,
    corsOrigins: ["http://127.0.0.1:3290"],
    authChallengePolicy: { ...config.authChallengePolicy, resendIntervalMs: 0 },
  },
  false,
  rechargeApiFixture().configuration,
);
const db = app.get(PrismaService);
for (const [mobile, role] of [
  ["13900010701", "TERMINAL_CUSTOMER"],
  ["13900010702", "OPERATIONS"],
  ["13900010703", "ADMINISTRATOR"],
] as const) {
  await db.account.upsert({
    where: { mobile: `+86${mobile}` },
    create: { mobile: `+86${mobile}`, role },
    update: {},
  });
}
await app.listen(3390, "127.0.0.1");
console.log(
  JSON.stringify({
    api: "http://127.0.0.1:3390",
    web: "http://127.0.0.1:3290",
    customerMobile: "13900010701",
    operatorMobile: "13900010702",
    adminMobile: "13900010703",
    note: "Synthetic local identities; deterministic login; controlled payment transport only",
  }),
);
