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
    corsOrigins: ["http://127.0.0.1:3290", "http://127.0.0.1:3200"],
    authChallengePolicy: { ...config.authChallengePolicy, resendIntervalMs: 0 },
  },
  false,
);
const db = app.get(PrismaService);
const accounts = [];
for (const [mobile, role] of [
  ["13900010720", "ADMINISTRATOR"],
  ["13900010721", "TERMINAL_CUSTOMER"],
  ["13900010722", "OPERATIONS"],
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
const context = await publishingContextFixture(
  app,
  db,
  accounts[1]!.id,
  "售后验收咖啡",
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
  amount: 300,
  reason: "合成浏览器验收",
  idempotencyKey: randomUUID(),
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
for (let slot = 1; slot <= 3; slot++) {
  const row = await db.publicationDelivery.findUniqueOrThrow({
    where: { orderId: order.id },
  });
  await http(`/delivery/orders/${order.id}/work/${slot}`, 2, "POST", {
    action: "RECORD_RESULT",
    expectedRevision: row.revision,
    expectedItemRevision: 0,
    idempotencyKey: randomUUID(),
    platformId: platform.id,
    result: {
      title: `发布验收${slot}`,
      url: `https://example.com/${order.id}/${slot}`,
      publishedAt: new Date(Date.now() - 1000).toISOString(),
      internalChannel: "本地合成",
      internalNote: "非真实发布",
    },
  });
}
console.log(
  JSON.stringify({
    orderId: order.id,
    customerMobile: "13900010721",
    operatorMobile: "13900010722",
    adminMobile: "13900010720",
    customerUrl: `http://127.0.0.1:3290/orders/${order.id}`,
    note: "Synthetic paid-order fixture, no real payment/provider/media publication",
  }),
);
