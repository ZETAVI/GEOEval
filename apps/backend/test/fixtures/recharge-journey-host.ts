import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { createApiApp } from "../../src/api-app.js";
import { PrismaService } from "../../src/infrastructure/prisma.service.js";
import { RECHARGE_CUSTOMER_RUNTIME } from "../../src/recharge/application/customer-recharge.js";
import { NativeRecoveryService } from "../../src/recharge/application/native-recovery.service.js";
import { MediaSupplyService } from "../../src/media-supply/application/media-supply.service.js";
import { PublishingPackageService } from "../../src/publishing-commerce/application/publishing-package.service.js";
import { PublishingSelectionService } from "../../src/publishing-commerce/application/publishing-selection.service.js";
import { loadIntegrationApiConfig } from "../integration-test-config.js";
import { publishingContextFixture } from "../publishing-context.fixture.js";
import { rechargeApiFixture } from "../recharge-api.fixture.js";

const config = loadIntegrationApiConfig();
const database = new URL(config.databaseUrl),
  redis = new URL(process.env.REDIS_URL ?? "");
if (
  database.hostname !== "127.0.0.1" ||
  database.port !== "55432" ||
  database.pathname !== "/geoeval_issue77_customer_browser_n2" ||
  redis.hostname !== "127.0.0.1" ||
  redis.port !== "56577" ||
  redis.pathname !== "/2"
)
  throw new Error("RECHARGE_BROWSER_TARGET_REQUIRED");
const fixture = rechargeApiFixture();
const app = (await createApiApp(
  { ...config, corsOrigins: [...config.corsOrigins, "http://localhost:32577"] },
  false,
  fixture.configuration,
)) as NestExpressApplication;
const prisma = app.get(PrismaService),
  runtime = app.get<NativeRecoveryService>(RECHARGE_CUSTOMER_RUNTIME);
await prisma.$connect();
if (await prisma.account.count())
  throw new Error("RECHARGE_BROWSER_SEED_REQUIRES_EMPTY_OWNED_DATABASE");
const customer = await prisma.account.create({
  data: { mobile: "+8613900007751", role: "TERMINAL_CUSTOMER" },
});
const admin = await prisma.account.create({
  data: { mobile: "+8613900007752", role: "ADMINISTRATOR" },
});
const context = await publishingContextFixture(
  app,
  prisma,
  customer.id,
  "充值联调咖啡（合成数据）",
);
const media = await app.get(MediaSupplyService).createPlatform(admin.id, {
  displayName: "联调媒体",
  categories: ["PORTAL_MEDIA"],
  status: "ACTIVE",
  pointPrice: 100,
});
const packages = app.get(PublishingPackageService);
let offer = await packages.create(admin.id, {
  name: "受控单篇发布套餐",
  quantity: 1,
  pointPrice: 100,
  status: "ACTIVE",
  platformIds: [media.id],
});
await app.get(PublishingSelectionService).save(customer.id, context.brand.id, {
  expectedRevision: 0,
  articleId: context.article.id,
  articleRevision: context.article.revision,
  intent: { mode: "RANDOM", packageId: offer.id },
});
let pause = false,
  dropCreate = false,
  orderWork: Promise<unknown> | null = null,
  settlementWork: Promise<unknown> | null = null;
// Test-only interruption after the actual customer create transaction, outside the production module.
app.use(
  (
    req: { method: string; path: string },
    res: { json: (value: unknown) => unknown; socket?: { destroy(): void } },
    next: () => void,
  ) => {
    if (req.method === "POST" && req.path === "/recharges") {
      const send = res.json.bind(res);
      res.json = (value) => {
        if (dropCreate) {
          dropCreate = false;
          res.socket?.destroy();
          return res;
        }
        return send(value);
      };
    }
    next();
  },
);
const server = app.getHttpAdapter().getInstance();
server.post(
  "/__test/pause",
  (_req: unknown, res: { json: (v: unknown) => unknown }) => {
    pause = true;
    res.json({ paused: true });
  },
);
server.post(
  "/__test/resume",
  (_req: unknown, res: { json: (v: unknown) => unknown }) => {
    pause = false;
    res.json({ paused: false });
  },
);
server.post(
  "/__test/drop-next-create",
  (_req: unknown, res: { json: (v: unknown) => unknown }) => {
    dropCreate = true;
    res.json({ armed: true });
  },
);
server.post(
  "/__test/pay/:id",
  async (
    req: { params: { id: string } },
    res: {
      status: (n: number) => { json: (v: unknown) => unknown };
      json: (v: unknown) => unknown;
    },
  ) => {
    try {
      const o = await prisma.rechargeOrder.findFirst({
        where: { id: req.params.id, accountId: customer.id },
      });
      if (!o) return res.status(404).json({ error: "OWN_TEST_ORDER_REQUIRED" });
      const signed = fixture.protocol.notification({
        envelope: { id: randomUUID() },
        trade: {
          out_trade_no: o.merchantOrderNo,
          transaction_id: o.merchantOrderNo,
          amount: {
            total: Number(o.amountFen),
            currency: "CNY",
            payer_total: Number(o.amountFen),
            payer_currency: "CNY",
          },
        },
      });
      fixture.setState("SUCCESS", o.merchantOrderNo);
      const response = await fetch(
        "http://127.0.0.1:33577/recharges/providers/wechat/notify",
        {
          method: "POST",
          headers: Object.fromEntries(
            Object.entries(signed.headers).map(([k, v]) => [k, v?.[0] ?? ""]),
          ),
          body: new Uint8Array(signed.rawBody),
        },
      );
      res.json({ notificationStatus: response.status });
    } catch {
      res.status(500).json({ error: "CONTROLLED_PAYMENT_FAILED" });
    }
  },
);
server.get(
  "/__test/state",
  async (_req: unknown, res: { json: (v: unknown) => unknown }) =>
    res.json({
      customerId: customer.id,
      brandId: context.brand.id,
      orders: await prisma.rechargeOrder.findMany({
        where: { accountId: customer.id },
        select: {
          id: true,
          status: true,
          amountYuan: true,
          nativeCancelRequestedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      balance: await prisma.pointAccount.findUnique({
        where: { accountId: customer.id },
        select: {
          grantedBalance: true,
          fundedBalance: true,
          reservedFundedPoints: true,
          revision: true,
        },
      }),
      ledger: await prisma.pointChange.findMany({
        where: { accountId: customer.id },
        select: {
          kind: true,
          fundedDelta: true,
          grantedDelta: true,
          sequence: true,
        },
      }),
      publishingOrders: await prisma.publishingOrder.count({
        where: { accountId: customer.id },
      }),
      calls: fixture.calls(),
    }),
);
await app.listen(33577, "127.0.0.1");
const timer = setInterval(() => {
  if (pause) return;
  if (!orderWork) {
    orderWork = runtime
      .runOrders(10)
      .catch(() => {})
      .finally(() => {
        orderWork = null;
      });
  }
  if (!settlementWork) {
    settlementWork = runtime
      .runSettlements(10)
      .catch(() => {})
      .finally(() => {
        settlementWork = null;
      });
  }
}, 500);
console.log(
  "Controlled recharge host http://localhost:33577; synthetic customer 13900007751; no real payment or external provider.",
);
async function stop() {
  clearInterval(timer);
  await Promise.allSettled([orderWork, settlementWork]);
  await app.close();
  process.exit(0);
}
process.once("SIGINT", () => void stop());
process.once("SIGTERM", () => void stop());
