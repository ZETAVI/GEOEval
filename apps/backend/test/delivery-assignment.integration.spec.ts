import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import type { INestApplication } from "@nestjs/common";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { PublishingPackageService } from "../src/publishing-commerce/application/publishing-package.service.js";
import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import {
  commercialTerms,
  type SubmitPurchase,
} from "../src/publishing-commerce/domain/publishing-order.js";
import { PostgresDeliveryPurchaseAccess } from "../src/publication-delivery/infrastructure/postgres-delivery-purchase-access.js";
import { clearCustomerData } from "./customer-data.js";
import { publishingContextFixture } from "./publishing-context.fixture.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
describe("purchase admission and exclusive delivery responsibility", () => {
  const prisma = new PrismaService(config.databaseUrl);
  let app: INestApplication, url: string;
  let cookies: string[], ids: string[], input: SubmitPurchase;
  beforeAll(async () => {
    await prisma.$connect();
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    url = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await clearCustomerData(prisma);
    const roles = [
      "ADMINISTRATOR",
      "TERMINAL_CUSTOMER",
      "OPERATIONS",
      "OPERATIONS",
      "AGENT",
      "TERMINAL_CUSTOMER",
    ] as const;
    const accounts = await Promise.all(
      roles.map((role, i) =>
        prisma.account.create({ data: { mobile: `+861390000733${i}`, role } }),
      ),
    );
    ids = accounts.map((a) => a.id);
    cookies = await Promise.all(
      accounts.map(
        async (a) =>
          (await loginWithDevelopmentChallenge(url, a.mobile)).cookie,
      ),
    );
    const context = await publishingContextFixture(app, prisma, ids[1]!);
    const media = await app.get(MediaSupplyService).createPlatform(ids[0]!, {
      displayName: "履约测试媒体",
      categories: ["PORTAL_MEDIA"],
      status: "ACTIVE",
      pointPrice: 100,
    });
    const pack = await app.get(PublishingPackageService).create(ids[0]!, {
      name: "履约测试套餐",
      quantity: 3,
      pointPrice: 300,
      status: "ACTIVE",
      platformIds: [media.id],
    });
    await app.get(PointAccountService).adjust(ids[1]!, ids[0]!, {
      amount: 1000,
      reason: "隔离测试赠送",
      idempotencyKey: randomUUID(),
    });
    expect(
      (
        await http(
          `/publishing/brands/${context.brand.id}/selection`,
          1,
          "PUT",
          {
            expectedRevision: 0,
            articleId: context.article.id,
            articleRevision: context.article.revision,
            intent: { mode: "RANDOM", packageId: pack.id },
          },
        )
      ).status,
    ).toBe(200);
    const workspace = await (await http("/publishing/workspace", 1)).json();
    input = {
      idempotencyKey: randomUUID(),
      brandId: context.brand.id,
      articleId: context.article.id,
      articleRevision: context.article.revision,
      selectionRevision: workspace.selection.revision,
      acceptedTerms: commercialTerms(workspace.quote),
    };
  });
  function http(path: string, actor: number, method = "GET", body?: unknown) {
    return fetch(url + path, {
      method,
      headers: { ...browserMutationHeaders(), cookie: cookies[actor]! },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function buy() {
    const response = await http("/publishing/orders", 1, "POST", input);
    expect(response.status).toBe(200);
    return response.json() as Promise<{
      id: string;
      title: string;
      bodyMarkdown: string;
    }>;
  }
  function action(
    id: string,
    name: string,
    actor: number,
    expectedRevision: number,
    extra: object = {},
  ) {
    return http(`/delivery/orders/${id}/${name}`, actor, "POST", {
      expectedRevision,
      idempotencyKey: randomUUID(),
      ...extra,
    });
  }

  it("admits one aggregate atomically and excludes internal data from customer reads", async () => {
    const order = await buy();
    expect(await prisma.publicationDelivery.count()).toBe(1);
    expect(await prisma.publicationDeliveryAudit.count()).toBe(0);
    const pool = await (await http("/delivery/orders?scope=POOL", 2)).json();
    expect(pool.items[0]).toMatchObject({
      id: order.id,
      delivery: { revision: 1, assigneeAccountId: null, startedAt: null },
    });
    expect(pool.items[0]).not.toHaveProperty("bodyMarkdown");
    const owned = await (
      await http(`/publishing/orders/${order.id}`, 1)
    ).json();
    expect(owned.status).toBe("PENDING_HANDLING");
    expect(owned).not.toHaveProperty("delivery");
    expect(owned).not.toHaveProperty("assigneeAccountId");
    expect((await http(`/publishing/orders/${order.id}`, 5)).status).toBe(404);
    expect((await http("/publishing/orders", 1, "POST", input)).status).toBe(
      200,
    );
    expect(await prisma.publicationDelivery.count()).toBe(1);
  });

  it("rolls back purchase, spending and consumed selection if admission fails", async () => {
    const access = app.get(PostgresDeliveryPurchaseAccess),
      bind = access.bind.bind(access);
    const spy = vi.spyOn(access, "bind").mockImplementation((tx) => ({
      ...bind(tx),
      admit: async (id) => {
        await bind(tx).admit(id);
        throw new Error("controlled admission failure");
      },
    }));
    try {
      expect((await http("/publishing/orders", 1, "POST", input)).status).toBe(
        500,
      );
      expect(await prisma.publicationDelivery.count()).toBe(0);
      expect(await prisma.publishingOrder.count()).toBe(0);
      expect(
        await prisma.pointChange.count({ where: { kind: "PUBLISHING_ORDER" } }),
      ).toBe(0);
      expect(
        await app.get(PointAccountService).customerBalance(ids[1]!),
      ).toMatchObject({ balance: 1000 });
      expect(
        await prisma.publishingSelection.findUnique({
          where: { brandId: input.brandId },
        }),
      ).toMatchObject({ revision: 1 });
    } finally {
      spy.mockRestore();
    }
    await buy();
  });

  it("allows only one of two concurrent claims and reflects Publishing to the customer and purchase replay", async () => {
    const order = await buy();
    const replies = await Promise.all([
      action(order.id, "claim", 2, 1),
      action(order.id, "claim", 3, 1),
    ]);
    expect(replies.map((r) => r.status).sort()).toEqual([200, 409]);
    const winner = replies[0]!.status === 200 ? 2 : 3,
      loser = winner === 2 ? 3 : 2;
    expect((await http(`/delivery/orders/${order.id}`, loser)).status).toBe(
      404,
    );
    expect((await action(order.id, "start", loser, 2)).status).toBe(403);
    expect(
      (await (await http(`/publishing/orders/${order.id}`, 1)).json()).status,
    ).toBe("PUBLISHING");
    expect(
      (await (await http("/publishing/orders", 1, "POST", input)).json())
        .status,
    ).toBe("PUBLISHING");
    expect(await prisma.publicationDeliveryAudit.count()).toBe(1);
  });

  it("returns only unstarted work with reason, rejects stale views, and preserves immutable article", async () => {
    const order = await buy();
    expect((await action(order.id, "claim", 2, 1)).status).toBe(200);
    expect(
      (await action(order.id, "return", 2, 2, { reason: "排班调整" })).status,
    ).toBe(200);
    expect((await action(order.id, "claim", 3, 1)).status).toBe(409);
    expect((await action(order.id, "claim", 3, 3)).status).toBe(200);
    expect((await action(order.id, "start", 3, 4)).status).toBe(200);
    expect(
      (await action(order.id, "return", 3, 5, { reason: "已开始不能退池" }))
        .status,
    ).toBe(409);
    expect(
      await prisma.publishingOrder.findUnique({ where: { id: order.id } }),
    ).toMatchObject({ title: order.title, bodyMarkdown: order.bodyMarkdown });
  });

  it("administrator reassigns started work, preserving history and removing former-owner authority", async () => {
    const order = await buy();
    await action(order.id, "claim", 2, 1);
    await action(order.id, "start", 2, 2);
    expect(
      (
        await action(order.id, "reassign", 0, 3, {
          reason: "交接",
          assigneeAccountId: ids[3],
        })
      ).status,
    ).toBe(200);
    expect((await http(`/delivery/orders/${order.id}`, 2)).status).toBe(404);
    expect(
      (await action(order.id, "return", 2, 4, { reason: "旧责任人" })).status,
    ).toBe(403);
    const detail = await (await http(`/delivery/orders/${order.id}`, 3)).json();
    expect(detail.delivery.startedAt).not.toBeNull();
    expect(detail.delivery.history).toHaveLength(3);
  });

  it("recovers the same operation after a later reassignment without reclaiming ownership", async () => {
    const order = await buy(),
      idempotencyKey = randomUUID();
    const first = await action(order.id, "claim", 2, 1, { idempotencyKey });
    const original = await first.json();
    await action(order.id, "reassign", 0, 2, {
      reason: "重新分配",
      assigneeAccountId: ids[3],
    });
    expect(
      await (await action(order.id, "claim", 2, 1, { idempotencyKey })).json(),
    ).toEqual(original);
    expect(
      (await action(order.id, "claim", 2, 2, { idempotencyKey })).status,
    ).toBe(409);
    expect(
      (
        await prisma.publicationDelivery.findUniqueOrThrow({
          where: { orderId: order.id },
        })
      ).assigneeAccountId,
    ).toBe(ids[3]);
    expect(await prisma.publicationDeliveryAudit.count()).toBe(2);
  });

  it("rejects inactive/non-operations targets, wrong role, missing reason and ownership overrides", async () => {
    const order = await buy();
    await action(order.id, "claim", 2, 1);
    await prisma.account.update({
      where: { id: ids[3]! },
      data: { status: "INACTIVE" },
    });
    for (const target of [ids[3], ids[1]])
      expect(
        (
          await action(order.id, "reassign", 0, 2, {
            reason: "错误目标",
            assigneeAccountId: target,
          })
        ).status,
      ).toBe(409);
    expect((await action(order.id, "claim", 0, 1)).status).toBe(403);
    expect(
      (
        await action(order.id, "reassign", 2, 2, {
          reason: "越权",
          assigneeAccountId: ids[3],
        })
      ).status,
    ).toBe(403);
    expect((await action(order.id, "return", 2, 2)).status).toBe(400);
    expect(
      (await action(order.id, "start", 2, 2, { accountId: ids[0] })).status,
    ).toBe(400);
    for (const actor of [1, 4])
      expect((await http("/delivery/orders", actor)).status).toBe(403);
    expect((await http("/delivery/orders?scope=ALL", 2)).status).toBe(403);
    expect((await http("/delivery/orders?limit=51", 0)).status).toBe(400);
    expect((await http("/delivery/orders?accountId=x", 0)).status).toBe(400);
  });

  it("rolls back a claim if its audit insertion fails", async () => {
    const order = await buy();
    await prisma.$executeRawUnsafe(
      "CREATE FUNCTION issue73_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'controlled audit failure'; END $$",
    );
    await prisma.$executeRawUnsafe(
      "CREATE TRIGGER issue73_fail_audit BEFORE INSERT ON publication_delivery_audits FOR EACH ROW EXECUTE FUNCTION issue73_fail_audit()",
    );
    try {
      expect((await action(order.id, "claim", 2, 1)).status).toBe(500);
      expect(
        await prisma.publicationDelivery.findUnique({
          where: { orderId: order.id },
        }),
      ).toMatchObject({
        revision: 1,
        assigneeAccountId: null,
        status: "PENDING_HANDLING",
      });
    } finally {
      await prisma.$executeRawUnsafe(
        "DROP TRIGGER issue73_fail_audit ON publication_delivery_audits",
      );
      await prisma.$executeRawUnsafe("DROP FUNCTION issue73_fail_audit()");
    }
  });

  it.each(["valid", "missing-consumption", "wrong-amount"] as const)(
    "rehearses historical admission with %s history and restores the test schema",
    async (kind) => {
      const order = await buy();
      const client = new Client({ connectionString: config.databaseUrl });
      await client.connect();
      const migration = (
        await readFile(
          new URL(
            "../prisma/migrations/20260908043000_publication_delivery_admission/migration.sql",
            import.meta.url,
          ),
          "utf8",
        )
      )
        .replace(/^BEGIN;\s*/, "")
        .replace(/COMMIT;\s*$/, "");
      try {
        await client.query("BEGIN");
        await client.query(
          'DROP TABLE publication_delivery_audits; DROP TABLE publication_deliveries; DROP TYPE "PublicationDeliveryStatus"; CREATE TYPE "PublishingOrderStatus" AS ENUM (\'PENDING_HANDLING\'); ALTER TABLE publishing_orders ADD COLUMN status "PublishingOrderStatus" NOT NULL DEFAULT \'PENDING_HANDLING\'',
        );
        if (kind === "missing-consumption")
          await client.query(
            "DELETE FROM point_changes WHERE publishing_order_id=$1",
            [order.id],
          );
        if (kind === "wrong-amount")
          await client.query(
            "UPDATE publishing_orders SET agreement=jsonb_set(agreement,'{totalPoints}','301') WHERE id=$1",
            [order.id],
          );
        if (kind === "valid") {
          await client.query(migration);
          const admitted = await client.query(
            "SELECT d.order_id, d.status, d.created_at=o.created_at AS same_time FROM publication_deliveries d JOIN publishing_orders o ON o.id=d.order_id",
          );
          expect(admitted.rows).toEqual([
            { order_id: order.id, status: "PENDING_HANDLING", same_time: true },
          ]);
          const spent = await client.query(
            "SELECT count(*)::int AS n FROM point_changes WHERE publishing_order_id=$1",
            [order.id],
          );
          expect(spent.rows[0].n).toBe(1);
        } else {
          await expect(client.query(migration)).rejects.toThrow(
            "Original purchase consumption is missing or inconsistent",
          );
        }
      } finally {
        await client.query("ROLLBACK");
        await client.end();
      }
      expect(await prisma.publicationDelivery.count()).toBe(1);
    },
  );
});
