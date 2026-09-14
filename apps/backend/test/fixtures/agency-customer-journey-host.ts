import { agencyReportFixture } from "../agency-report.fixture.js";
import { PostgresCustomerServiceRepository } from "../../src/agency/infrastructure/postgres-customer-service.repository.js";
import { randomUUID } from "node:crypto";
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
    geoOptimizationWriterMode: "deterministic",
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
const b = await db.account.upsert({
  where: { mobile: "+8613900010804" },
  create: { mobile: "+8613900010804", role: "AGENT" },
  update: {},
});
const customer = await db.account.upsert({
  where: { mobile: "+8613900010803" },
  create: { mobile: "+8613900010803" },
  update: {},
});
if (!(await db.brandProfile.count({ where: { accountId: customer.id } })))
  await agencyReportFixture(app, db, customer.id, "小林咖啡");
const relation = await db.agencyCustomerAttribution.findUnique({
  where: { accountId: customer.id },
});
if (!relation)
  await app
    .get(PostgresCustomerServiceRepository)
    .transfer(admin.id, customer.id, {
      agentAccountId: agent.id,
      expectedRevision: 0,
      reason: "合成本地验收分配",
      requestId: randomUUID(),
    });
const brand = await db.brandProfile.findFirstOrThrow({
  where: { accountId: customer.id },
});
const report = await db.evaluationReport.findFirstOrThrow({
  where: { run: { brandId: brand.id } },
});
await app.listen(3390, "127.0.0.1");
console.log(
  JSON.stringify({
    url: "http://127.0.0.1:3290/e/" + link.entryKey,
    agentId: agent.id,
    otherAgentId: b.id,
    customerId: customer.id,
    customerUrl: "http://127.0.0.1:3290/agent/customers/" + customer.id,
    reportUrl: `http://127.0.0.1:3290/agent/customers/${customer.id}/brands/${brand.id}/reports/${report.id}`,
    otherAgentMobile: "13900010804",
    customerMobile: "13900010803",
    adminMobile: "13900010801",
    agentMobile: "13900010802",
    note: "synthetic local data; no provider or payment",
  }),
);
