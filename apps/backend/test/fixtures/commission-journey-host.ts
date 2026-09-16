import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { createApiApp } from "../../src/api-app.js";
import { PrismaService } from "../../src/infrastructure/prisma.service.js";
import { loadIntegrationApiConfig } from "../integration-test-config.js";
import { publishingContextFixture } from "../publishing-context.fixture.js";
import { MediaSupplyService } from "../../src/media-supply/application/media-supply.service.js";
import { PointAccountService } from "../../src/publishing-commerce/application/point-account.service.js";
import { commercialTerms } from "../../src/publishing-commerce/domain/publishing-order.js";
import { loginWithDevelopmentChallenge } from "../identity-http-fixtures.js";
import { browserMutationHeaders } from "../http-test-headers.js";
import { PostgresCustomerServiceRepository } from "../../src/agency/infrastructure/postgres-customer-service.repository.js";
import { PostgresCommissionTermsRepository } from "../../src/agency/infrastructure/postgres-commission-terms.repository.js";
import { FinalOrderSettlementService } from "../../src/application/final-order-settlement.service.js";
import { AgencyCommissionService } from "../../src/application/agency-commission.service.js";
import { clearCustomerData } from "../customer-data.js";
const config = loadIntegrationApiConfig();
const target = new URL(config.databaseUrl);
if (
  target.hostname !== "127.0.0.1" ||
  target.port !== "55432" ||
  target.pathname !== "/geoeval_issue100" ||
  process.env.REDIS_URL !== "redis://127.0.0.1:56379/10"
)
  throw new Error("SUPPORT_OWNED_BROWSER_TARGET_REQUIRED");
const app = await createApiApp(
  {
    ...config,
    agencyAcquisitionEnabled: true,
    corsOrigins: ["http://127.0.0.1:3290", "http://127.0.0.1:3200"],
    authChallengePolicy: { ...config.authChallengePolicy, resendIntervalMs: 0 },
  },
  false,
);
const db = app.get(PrismaService);
await clearCustomerData(db);
const accounts = [];
for (const [mobile, role] of [
  ["13900011020", "ADMINISTRATOR"],
  ["13900011021", "TERMINAL_CUSTOMER"],
  ["13900011022", "OPERATIONS"],
  ["13900011023", "AGENT"],
] as const)
  accounts.push(
    await db.account.upsert({
      where: { mobile: `+86${mobile}` },
      create: { mobile: `+86${mobile}`, role },
      update: {},
    }),
  );
await app.listen(3390, "127.0.0.1");
const cookies = [];
for (const a of accounts)
  cookies.push(
    (await loginWithDevelopmentChallenge("http://127.0.0.1:3390", a.mobile))
      .cookie,
  );
async function http(
  path: string,
  actor: number,
  method = "GET",
  body?: unknown,
) {
  const response = await fetch("http://127.0.0.1:3390" + path, {
    method,
    headers: {
      ...browserMutationHeaders(cookies[actor]!),
      "x-geoeval-account": accounts[actor]!.id,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
await app
  .get(PostgresCustomerServiceRepository)
  .transfer(accounts[0]!.id, accounts[1]!.id, {
    agentAccountId: accounts[3]!.id,
    expectedRevision: 0,
    reason: "受控佣金验收",
    requestId: randomUUID(),
  });
await app
  .get(PostgresCommissionTermsRepository)
  .update(accounts[0]!.id, accounts[3]!.id, {
    enabled: true,
    rateBps: 2000,
    expectedRevision: 0,
    reason: "受控佣金验收",
    requestId: randomUUID(),
  });
const context = await publishingContextFixture(
  app,
  db,
  accounts[1]!.id,
  "佣金验收咖啡",
);
const platform = await app
  .get(MediaSupplyService)
  .createPlatform(accounts[0]!.id, {
    displayName: `受控售后媒体${Date.now()}`,
    categories: ["PORTAL_MEDIA"],
    status: "ACTIVE",
    pointPrice: 100,
  });
await app.get(PointAccountService).adjust(accounts[1]!.id, accounts[0]!.id, {
  amount: 100,
  reason: "合成浏览器验收",
  idempotencyKey: randomUUID(),
});
// Synthetic funded fixture, not a real merchant payment.
await db.pointAccount.update({
  where: { accountId: accounts[1]!.id },
  data: { fundedBalance: 200 },
});
await http(`/publishing/brands/${context.brand.id}/selection`, 1, "PUT", {
  expectedRevision: 0,
  articleId: context.article.id,
  articleRevision: context.article.revision,
  intent: {
    mode: "PRECISE",
    lines: [{ platformId: platform.id, quantity: 3 }],
  },
});
const ws = await http("/publishing/workspace", 1);
const order = await http("/publishing/orders", 1, "POST", {
  idempotencyKey: randomUUID(),
  brandId: context.brand.id,
  articleId: context.article.id,
  articleRevision: context.article.revision,
  selectionRevision: ws.selection.revision,
  acceptedTerms: commercialTerms(ws.quote),
});
await http(`/delivery/orders/${order.id}/claim`, 2, "POST", {
  expectedRevision: 1,
  idempotencyKey: randomUUID(),
});

await http(`/delivery/orders/${order.id}/resolution`, 2, "POST", {
  expectedRevision: 2,
  idempotencyKey: randomUUID(),
  mode: "CONTINUE",
  points: 100,
  reason: "约定退回部分积分",
});
const ticket = await db.supportTicket.findFirstOrThrow({
  where: { publishingOrderId: order.id },
});
await http(`/support/tickets/${ticket.id}/actions`, 2, "POST", {
  action: "RESOLVE",
  expectedRevision: ticket.revision,
  requestId: randomUUID(),
  message: "协商已确认",
});
const past = new Date(Date.now() - 73 * 3600000);
await db.publicationDelivery.update({
  where: { orderId: order.id },
  data: {
    status: "CLOSED",
    closedAt: past,
    stoppedAt: past,
    resolutionMode: "TERMINATE",
  },
});
await app.get(FinalOrderSettlementService).settle(order.id);
await app.get(AgencyCommissionService).accrue(order.id);
console.log(
  JSON.stringify({
    orderId: order.id,
    agentId: accounts[3]!.id,
    agentMobile: "13900011023",
    adminMobile: "13900011020",
    code: "246810",
    note: "Synthetic commission browser evidence, no real funds/provider",
  }),
);
