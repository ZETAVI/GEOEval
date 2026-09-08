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
import { Prisma } from "../src/generated/prisma/client.js";
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { PublishingPackageService } from "../src/publishing-commerce/application/publishing-package.service.js";
import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import {
  commercialTerms,
  type SubmitPurchase,
} from "../src/publishing-commerce/domain/publishing-order.js";
import { PostgresDeliveryPurchaseAccess } from "../src/publication-delivery/infrastructure/postgres-delivery-purchase-access.js";
import {
  VARIANT_PREPARER,
  type VariantPreparer,
} from "../src/publication-delivery/domain/publication-item.js";
import { MockVariantPreparer } from "../src/publication-delivery/infrastructure/mock-variant-preparer.js";
import { PostgresPublicationWorkRepository } from "../src/publication-delivery/infrastructure/postgres-publication-work.repository.js";
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
    // Admission explicitly preserves the immutable purchase timestamp.
    expect(pool.items[0].delivery.createdAt).toBe(pool.items[0].createdAt);
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

  it("prioritizes active deadlines across pages and retains separate completed history", async () => {
    await app.get(PointAccountService).adjust(ids[1]!, ids[0]!, {
      amount: 1000,
      reason: "期限排序隔离样本",
      idempotencyKey: randomUUID(),
    });
    const orders: { id: string }[] = [];
    const selectionIntent = (
      await prisma.publishingSelection.findUniqueOrThrow({
        where: { brandId: input.brandId },
      })
    ).intent;
    for (let index = 0; index < 4; index++) {
      if (index > 0) {
        const selection = await prisma.publishingSelection.findUniqueOrThrow({
          where: { brandId: input.brandId },
        });
        expect(
          (
            await http(
              `/publishing/brands/${input.brandId}/selection`,
              1,
              "PUT",
              {
                expectedRevision: selection.revision,
                articleId: input.articleId,
                articleRevision: input.articleRevision,
                intent: selectionIntent,
              },
            )
          ).status,
        ).toBe(200);
        input = {
          ...input,
          selectionRevision: selection.revision + 1,
          idempotencyKey: randomUUID(),
        };
      }
      orders.push(await buy());
    }
    // Only fixture clock placement uses SQL. Purchases, responsibility and results
    // all use their normal HTTP commands; sequence is deliberately not time order.
    const now = Date.now();
    const ages = [1, 8, 6.5, 8];
    for (const [index, order] of orders.entries()) {
      const createdAt = new Date(now - ages[index]! * 24 * 60 * 60 * 1000);
      await prisma.$transaction([
        prisma.publishingOrder.update({
          where: { id: order.id },
          data: { createdAt },
        }),
        prisma.publicationDelivery.update({
          where: { orderId: order.id },
          data: { createdAt },
        }),
      ]);
      expect((await action(order.id, "claim", 2, 1)).status).toBe(200);
    }
    const originalPoints = await prisma.pointChange.findMany({
      orderBy: { id: "asc" },
    });
    const first = await (
      await http("/delivery/orders?scope=MINE&limit=1", 2)
    ).json();
    expect(first.items.map((row: { id: string }) => row.id)).toEqual([
      orders[1]!.id,
    ]);
    expect(first.items[0]).toMatchObject({
      status: "PUBLISHING",
      schedule: { urgency: "DELAYED" },
    });
    // Complete the cursor's order between pages. Its immutable cursor remains usable.
    for (let slot = 1; slot <= 3; slot++)
      expect((await work(orders[1]!.id, slot)).status).toBe(200);
    const query = new URLSearchParams({
      scope: "MINE",
      limit: "1",
      cursorCreatedAt: first.nextCursor.createdAt,
      cursorSequence: String(first.nextCursor.sequence),
    });
    const second = await (await http(`/delivery/orders?${query}`, 2)).json();
    expect(second.items.map((row: { id: string }) => row.id)).toEqual([
      orders[3]!.id,
    ]);
    query.set("cursorCreatedAt", second.nextCursor.createdAt);
    query.set("cursorSequence", String(second.nextCursor.sequence));
    const third = await (await http(`/delivery/orders?${query}`, 2)).json();
    expect(third.items[0]).toMatchObject({
      id: orders[2]!.id,
      schedule: { urgency: "NEARING_DEADLINE" },
    });
    query.set("cursorCreatedAt", third.nextCursor.createdAt);
    query.set("cursorSequence", String(third.nextCursor.sequence));
    const last = await (await http(`/delivery/orders?${query}`, 2)).json();
    expect(last.items[0]).toMatchObject({
      id: orders[0]!.id,
      schedule: { urgency: "NORMAL" },
    });
    expect(last.nextCursor).toBeNull();
    for (let slot = 1; slot <= 3; slot++)
      expect((await work(orders[0]!.id, slot)).status).toBe(200);
    const history = await (
      await http("/delivery/orders?scope=ALL&state=COMPLETED&limit=1", 0)
    ).json();
    expect(history.items[0]).toMatchObject({
      id: orders[0]!.id,
      status: "COMPLETED",
      schedule: { urgency: "COMPLETED" },
    });
    const nextHistory = new URLSearchParams({
      scope: "ALL",
      state: "COMPLETED",
      limit: "1",
      cursorCreatedAt: history.nextCursor.createdAt,
      cursorSequence: String(history.nextCursor.sequence),
    });
    const historical = await (
      await http(`/delivery/orders?${nextHistory}`, 0)
    ).json();
    expect(historical.items[0]).toMatchObject({
      id: orders[1]!.id,
      schedule: { urgency: "COMPLETED" },
    });
    expect(historical.nextCursor).toBeNull();
    expect(
      (await (await http("/delivery/orders?scope=MINE", 3)).json()).items,
    ).toHaveLength(0);
    expect(
      (await (await http("/delivery/orders?scope=POOL", 2)).json()).items,
    ).toHaveLength(0);
    expect(
      await prisma.pointChange.findMany({ orderBy: { id: "asc" } }),
    ).toEqual(originalPoints);
  });

  it("rolls back purchase, spending and consumed selection if admission fails", async () => {
    const access = app.get(PostgresDeliveryPurchaseAccess),
      bind = access.bind.bind(access);
    const spy = vi.spyOn(access, "bind").mockImplementation((tx) => ({
      ...bind(tx),
      admit: async (id, purchasedAt) => {
        await bind(tx).admit(id, purchasedAt);
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
          'DROP TABLE publication_work_audits; DROP TABLE publication_work_items; DROP TABLE publication_delivery_audits; DROP TABLE publication_deliveries; DROP TYPE "PublicationDeliveryStatus"; CREATE TYPE "PublishingOrderStatus" AS ENUM (\'PENDING_HANDLING\'); ALTER TABLE publishing_orders ADD COLUMN status "PublishingOrderStatus" NOT NULL DEFAULT \'PENDING_HANDLING\'',
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

  async function work(
    id: string,
    slot: number,
    actionName = "RECORD_RESULT",
    extra: Record<string, unknown> = {},
    actor = 2,
  ) {
    const row = await prisma.publicationDelivery.findUniqueOrThrow({
      where: { orderId: id },
    });
    const item = await prisma.publicationWorkItem.findUnique({
      where: { orderId_slot: { orderId: id, slot } },
    });
    return http(`/delivery/orders/${id}/work/${slot}`, actor, "POST", {
      action: actionName,
      expectedRevision: row.revision,
      expectedItemRevision: item?.revision ?? 0,
      platformId: input.acceptedTerms.scope[0]?.platformId,
      idempotencyKey: randomUUID(),
      ...(actionName === "RECORD_RESULT" || actionName === "CORRECT_RESULT"
        ? {
            result: {
              title: `发布结果 ${slot}`,
              url: `https://example.com/articles/${slot}`,
              publishedAt: "2026-09-01T12:00:00Z",
              internalChannel: "内部账号，不对客户公开",
              internalNote: "内部处理备注",
            },
          }
        : {}),
      ...extra,
    });
  }

  it("keeps work sparse, prepares honestly and accepts a live result without a generation prerequisite", async () => {
    const order = await buy();
    await action(order.id, "claim", 2, 1);
    const pending = await (
      await http(`/delivery/orders/${order.id}/work`, 2)
    ).json();
    expect(pending.items).toHaveLength(3);
    expect(pending.items.map((v: { state: string }) => v.state)).toEqual([
      "PENDING",
      "PENDING",
      "PENDING",
    ]);
    expect(await prisma.publicationWorkItem.count()).toBe(0);
    expect((await work(order.id, 1, "PREPARE_MOCK")).status).toBe(200);
    expect(
      await prisma.publicationDelivery.findUnique({
        where: { orderId: order.id },
      }),
    ).toMatchObject({ publishedQuantity: 0 });
    expect(
      (await action(order.id, "return", 2, 3, { reason: "已有实际准备" }))
        .status,
    ).toBe(409);
    const prepared = await (
      await http(`/delivery/orders/${order.id}/work`, 2)
    ).json();
    expect(prepared.items[0].preparation).toMatchObject({
      mode: "MOCK",
      title: order.title,
      bodyMarkdown: order.bodyMarkdown,
    });
    expect(prepared.items[0].state).toBe("PENDING");
    expect((await work(order.id, 2)).status).toBe(200);
    expect(await prisma.publicationWorkItem.count()).toBe(2);
    const customer = await (
      await http(`/publishing/orders/${order.id}/results`, 1)
    ).json();
    expect(customer).toMatchObject({
      publishedQuantity: 1,
      quantity: 3,
      status: "PUBLISHING",
    });
    expect(customer.items).toHaveLength(1);
    expect(customer.items[0].slot).toBe(2);
    expect(JSON.stringify(customer)).not.toMatch(
      /internalChannel|内部账号|internalNote|preparation|actorAccountId|bodyMarkdown/,
    );
    expect(
      (await http(`/publishing/orders/${order.id}/results`, 5)).status,
    ).toBe(404);
    expect(
      (await http(`/publishing/orders/${order.id}/results`, 0)).status,
    ).toBe(403);
  });

  it("records direct results as started, rejects duplicate URLs and retains correction history without extra progress", async () => {
    const order = await buy();
    await action(order.id, "claim", 2, 1);
    const idempotencyKey = randomUUID();
    const first = await work(order.id, 1, "RECORD_RESULT", { idempotencyKey });
    expect(first.status).toBe(200);
    const receipt = await first.json();
    const replay = await work(order.id, 1, "RECORD_RESULT", {
      idempotencyKey,
      expectedRevision: 2,
      expectedItemRevision: 0,
    });
    expect(await replay.json()).toEqual(receipt);
    expect(
      (await action(order.id, "return", 2, 3, { reason: "已有结果" })).status,
    ).toBe(409);
    expect(
      (
        await work(order.id, 2, "RECORD_RESULT", {
          result: {
            title: "重复链接",
            url: "https://EXAMPLE.com/articles/1#part",
            publishedAt: "2026-09-01T12:00:00Z",
          },
        })
      ).status,
    ).toBe(409);
    expect((await work(order.id, 1, "CORRECT_RESULT")).status).toBe(400);
    expect(
      (
        await work(order.id, 1, "CORRECT_RESULT", {
          reason: "纠正标题",
          result: {
            title: "准确标题",
            url: "https://example.com/articles/corrected",
            publishedAt: "2026-09-01T12:00:00Z",
          },
        })
      ).status,
    ).toBe(200);
    const row = await prisma.publicationDelivery.findUniqueOrThrow({
      where: { orderId: order.id },
    });
    expect(row.publishedQuantity).toBe(1);
    expect(row.startedAt).not.toBeNull();
    const history = await (
      await http(`/delivery/orders/${order.id}/work/1/history`, 2)
    ).json();
    expect(history).toHaveLength(2);
    expect(history[0].beforeState.result.title).toBe("发布结果 1");
    expect(history[0].afterState.result.title).toBe("准确标题");
    // Historical URL does not reserve a URL after the current result is corrected.
    expect(
      (
        await work(order.id, 2, "RECORD_RESULT", {
          result: {
            title: "另一篇结果",
            url: "https://example.com/articles/1",
            publishedAt: "2026-09-01T12:00:00Z",
          },
        })
      ).status,
    ).toBe(200);
    expect(await prisma.publicationWorkAudit.count()).toBe(3);
  });

  it("serializes the last results, completes automatically and preserves Completed through correction and reassignment", async () => {
    const order = await buy();
    await action(order.id, "claim", 2, 1);
    await work(order.id, 1);
    const concurrent = await Promise.all([
      work(order.id, 2, "RECORD_RESULT", { expectedRevision: 3 }),
      work(order.id, 3, "RECORD_RESULT", { expectedRevision: 3 }),
    ]);
    expect(concurrent.map((r) => r.status).sort()).toEqual([200, 409]);
    const losingSlot = concurrent[0]!.status === 200 ? 3 : 2;
    expect((await work(order.id, losingSlot)).status).toBe(200);
    let delivery = await prisma.publicationDelivery.findUniqueOrThrow({
      where: { orderId: order.id },
    });
    expect(delivery).toMatchObject({
      status: "COMPLETED",
      publishedQuantity: 3,
    });
    expect(
      await prisma.publicationWorkItem.count({
        where: { result: { not: Prisma.DbNull } },
      }),
    ).toBe(3);
    expect((await http(`/publishing/orders/${order.id}`, 1)).status).toBe(200);
    expect(
      (await (await http("/publishing/orders", 1, "POST", input)).json())
        .status,
    ).toBe("COMPLETED");
    expect(
      (
        await work(order.id, 1, "SAVE_DRAFT", {
          title: "不能重开",
          bodyMarkdown: "不能覆盖",
        })
      ).status,
    ).toBe(409);
    expect(
      (await work(order.id, 1, "CORRECT_RESULT", { reason: "修正已完成结果" }))
        .status,
    ).toBe(200);
    delivery = await prisma.publicationDelivery.findUniqueOrThrow({
      where: { orderId: order.id },
    });
    expect(
      (
        await action(order.id, "reassign", 0, delivery.revision, {
          reason: "结果维护交接",
          assigneeAccountId: ids[3],
        })
      ).status,
    ).toBe(200);
    expect(
      (await (await http(`/publishing/orders/${order.id}/results`, 1)).json())
        .status,
    ).toBe("COMPLETED");
    expect(
      (await work(order.id, 1, "CORRECT_RESULT", { reason: "旧责任人" }))
        .status,
    ).toBe(403);
  });

  it.each(["inactive", "role", "reassign", "item-edit", "complete"])(
    "discards a delayed Mock after %s without holding a transaction open",
    async (change) => {
      const order = await buy();
      await action(order.id, "claim", 2, 1);
      const entered = Promise.withResolvers<void>();
      const release = Promise.withResolvers<void>();
      const preparer = app.get<VariantPreparer>(VARIANT_PREPARER);
      const spy = vi
        .spyOn(preparer, "prepare")
        .mockImplementationOnce(async () => {
          entered.resolve();
          await release.promise;
          return {
            mode: "MOCK",
            title: "过期响应",
            bodyMarkdown: "不能覆盖后续内容",
          };
        });
      const pending = work(order.id, 1, "PREPARE_MOCK");
      try {
        await Promise.race([
          entered.promise,
          pending.then(async (response) => {
            throw new Error(
              `Mock did not start: ${response.status} ${await response.text()}`,
            );
          }),
        ]);
        if (change === "inactive")
          await prisma.account.update({
            where: { id: ids[2]! },
            data: { status: "INACTIVE" },
          });
        if (change === "role")
          await prisma.account.update({
            where: { id: ids[2]! },
            data: { role: "AGENT" },
          });
        if (change === "reassign")
          expect(
            (
              await action(order.id, "reassign", 0, 2, {
                reason: "准备期间交接",
                assigneeAccountId: ids[3],
              })
            ).status,
          ).toBe(200);
        if (change === "item-edit")
          expect(
            (
              await work(order.id, 1, "SAVE_DRAFT", {
                title: "已保存人工内容",
                bodyMarkdown: "人工正文",
              })
            ).status,
          ).toBe(200);
        if (change === "complete")
          for (const slot of [1, 2, 3])
            expect((await work(order.id, slot)).status).toBe(200);
        const before = await prisma.publicationDelivery.findUniqueOrThrow({
          where: { orderId: order.id },
        });
        const auditCount = await prisma.publicationWorkAudit.count();
        release.resolve();
        expect([403, 409]).toContain((await pending).status);
        expect(
          await prisma.publicationDelivery.findUnique({
            where: { orderId: order.id },
          }),
        ).toEqual(before);
        expect(await prisma.publicationWorkAudit.count()).toBe(auditCount);
        expect(
          JSON.stringify(await prisma.publicationWorkItem.findMany()),
        ).not.toContain("过期响应");
      } finally {
        release.resolve();
        spy.mockRestore();
        await pending;
      }
    },
  );

  it("fails closed for invalid results, foreign writers and a failed work audit", async () => {
    const order = await buy();
    await action(order.id, "claim", 2, 1);
    expect((await work(order.id, 1, "RECORD_RESULT", {}, 0)).status).toBe(403);
    expect((await work(order.id, 1, "RECORD_RESULT", {}, 3)).status).toBe(403);
    expect((await work(order.id, 4)).status).toBe(400);
    expect(
      (await work(order.id, 1, "RECORD_RESULT", { platformId: randomUUID() }))
        .status,
    ).toBe(400);
    for (const urlValue of [
      "javascript:alert(1)",
      "https://name:password@example.com/article",
      `https://example.com/${"文".repeat(1000)}`,
    ])
      expect(
        (
          await work(order.id, 1, "RECORD_RESULT", {
            result: {
              title: "错误链接",
              url: urlValue,
              publishedAt: "2026-09-01T12:00:00Z",
            },
          })
        ).status,
      ).toBe(400);
    expect(
      (
        await work(order.id, 1, "RECORD_RESULT", {
          result: {
            title: "尚未发布",
            url: "https://example.com/future",
            publishedAt: "2099-01-01T00:00:00Z",
          },
        })
      ).status,
    ).toBe(400);
    await prisma.$executeRawUnsafe(
      "CREATE FUNCTION issue73_fail_work_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'controlled work audit failure'; END $$",
    );
    await prisma.$executeRawUnsafe(
      "CREATE TRIGGER issue73_fail_work_audit BEFORE INSERT ON publication_work_audits FOR EACH ROW EXECUTE FUNCTION issue73_fail_work_audit()",
    );
    try {
      expect((await work(order.id, 1)).status).toBe(500);
      expect(await prisma.publicationWorkItem.count()).toBe(0);
      expect(
        await prisma.publicationDelivery.findUnique({
          where: { orderId: order.id },
        }),
      ).toMatchObject({ revision: 2, publishedQuantity: 0, startedAt: null });
    } finally {
      await prisma.$executeRawUnsafe(
        "DROP TRIGGER issue73_fail_work_audit ON publication_work_audits",
      );
      await prisma.$executeRawUnsafe("DROP FUNCTION issue73_fail_work_audit()");
    }
    await expect(
      new MockVariantPreparer(false).prepare({
        title: "x",
        bodyMarkdown: "x",
        quantity: 1,
        slot: 1,
        target: { platformId: randomUUID(), displayName: "x" },
      }),
    ).rejects.toThrow("尚未接入");
  });

  it.each(["work", "history"])(
    "does not disclose a new owner's internal content through a stale %s read",
    async (route) => {
      const order = await buy();
      await action(order.id, "claim", 2, 1);
      await work(order.id, 1, "SAVE_DRAFT", {
        title: "原责任人的草稿",
        bodyMarkdown: "旧正文",
      });
      const repository = app.get(PostgresPublicationWorkRepository);
      const read = repository.read.bind(repository),
        history = repository.history.bind(repository);
      const entered = Promise.withResolvers<void>(),
        release = Promise.withResolvers<void>();
      const pause = async () => {
        entered.resolve();
        await release.promise;
      };
      const spy =
        route === "work"
          ? vi
              .spyOn(repository, "read")
              .mockImplementationOnce(async (...args) => {
                await pause();
                return read(...args);
              })
          : vi
              .spyOn(repository, "history")
              .mockImplementationOnce(async (...args) => {
                await pause();
                return history(...args);
              });
      const pending = http(
        `/delivery/orders/${order.id}/work${route === "history" ? "/1/history" : ""}`,
        2,
      );
      try {
        await Promise.race([
          entered.promise,
          pending.then(async (response) => {
            throw new Error(
              `Read did not pause: ${response.status} ${await response.clone().text()}`,
            );
          }),
        ]);
        expect(
          (
            await action(order.id, "reassign", 0, 3, {
              reason: "读取期间改派",
              assigneeAccountId: ids[3],
            })
          ).status,
        ).toBe(200);
        expect(
          (
            await work(
              order.id,
              1,
              "RECORD_RESULT",
              {
                result: {
                  title: "新责任人结果",
                  url: "https://example.com/new-owner",
                  publishedAt: "2026-09-01T12:00:00Z",
                  internalNote: "新责任人内部内容",
                },
              },
              3,
            )
          ).status,
        ).toBe(200);
        release.resolve();
        const response = await pending;
        expect(response.status).toBe(404);
        expect(await response.text()).not.toContain("新责任人");
      } finally {
        release.resolve();
        spy.mockRestore();
        await pending;
      }
    },
  );

  async function buyAdditional(kind: "PRECISE" | "MAX") {
    const context = await publishingContextFixture(app, prisma, ids[1]!);
    const media = await app.get(MediaSupplyService).createPlatform(ids[0]!, {
      displayName: "边界测试媒体",
      categories: ["PORTAL_MEDIA"],
      status: "ACTIVE",
      pointPrice: 100,
    });
    const second = await app.get(MediaSupplyService).createPlatform(ids[0]!, {
      displayName: "另一指定媒体",
      categories: ["PORTAL_MEDIA"],
      status: "ACTIVE",
      pointPrice: 100,
    });
    const pack =
      kind === "MAX"
        ? await app.get(PublishingPackageService).create(ids[0]!, {
            name: "极大数量边界套餐",
            quantity: 2_147_483_647,
            pointPrice: 300,
            status: "ACTIVE",
            platformIds: [media.id],
          })
        : null;
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
            intent: pack
              ? { mode: "RANDOM", packageId: pack.id }
              : {
                  mode: "PRECISE",
                  lines: [
                    { platformId: media.id, quantity: 1 },
                    { platformId: second.id, quantity: 1 },
                  ],
                },
          },
        )
      ).status,
    ).toBe(200);
    const workspace = await (await http("/publishing/workspace", 1)).json();
    const terms = commercialTerms(workspace.quote);
    const response = await http("/publishing/orders", 1, "POST", {
      idempotencyKey: randomUUID(),
      brandId: context.brand.id,
      articleId: context.article.id,
      articleRevision: context.article.revision,
      selectionRevision: workspace.selection.revision,
      acceptedTerms: terms,
    });
    expect(response.status).toBe(200);
    return { order: await response.json(), terms };
  }

  it("preserves precise slot targets and returns pending targets without exposing internal preparation", async () => {
    const { order, terms } = await buyAdditional("PRECISE");
    await action(order.id, "claim", 2, 1);
    const [first, second] = terms.lines;
    const page = await (
      await http(`/delivery/orders/${order.id}/work?limit=1`, 2)
    ).json();
    expect(page.items[0].purchasedPlatformId).toBe(first!.platformId);
    expect(page.nextAfterSlot).toBe(1);
    expect(
      (
        await work(order.id, 1, "RECORD_RESULT", {
          platformId: second!.platformId,
        })
      ).status,
    ).toBe(400);
    expect(
      (await work(order.id, 1, "BEGIN", { platformId: first!.platformId }))
        .status,
    ).toBe(200);
    const started = await (
      await http(`/delivery/orders/${order.id}/work`, 2)
    ).json();
    expect(started.items[0].state).toBe("PUBLISHING");
    expect(
      (
        await work(order.id, 1, "RECORD_RESULT", {
          platformId: first!.platformId,
        })
      ).status,
    ).toBe(200);
    const customer = await (
      await http(`/publishing/orders/${order.id}/results?limit=1`, 1)
    ).json();
    expect(customer.items[0]).toMatchObject({
      targetName: first!.displayName,
      state: "PUBLISHED",
    });
    const next = await (
      await http(
        `/publishing/orders/${order.id}/results?afterSlot=1&limit=1`,
        1,
      )
    ).json();
    expect(next.items[0]).toMatchObject({
      targetName: second!.displayName,
      state: "IN_HANDLING",
      result: null,
    });
    expect(
      (
        await work(order.id, 1, "CORRECT_RESULT", {
          platformId: second!.platformId,
          reason: "不能借纠正换媒体",
        })
      ).status,
    ).toBe(400);
  });

  it("keeps maximum purchased quantity bounded through HTTP and never materializes untouched slots", async () => {
    const { order, terms } = await buyAdditional("MAX");
    await action(order.id, "claim", 2, 1);
    const deep = await (
      await http(
        `/delivery/orders/${order.id}/work?afterSlot=2147483600&limit=50`,
        2,
      )
    ).json();
    expect(deep.quantity).toBe(2_147_483_647);
    expect(deep.items).toHaveLength(47);
    expect(deep.items.at(-1).slot).toBe(2_147_483_647);
    expect(deep.nextAfterSlot).toBeNull();
    expect(
      (await http(`/delivery/orders/${order.id}/work?limit=51`, 2)).status,
    ).toBe(400);
    expect(await prisma.publicationWorkItem.count()).toBe(0);
    expect(
      (
        await work(order.id, 2_147_483_647, "RECORD_RESULT", {
          platformId: terms.scope[0]!.platformId,
        })
      ).status,
    ).toBe(200);
    const customer = await (
      await http(
        `/publishing/orders/${order.id}/results?afterSlot=2147483600&limit=50`,
        1,
      )
    ).json();
    expect(customer.items).toHaveLength(1);
    expect(customer).toMatchObject({
      publishedQuantity: 1,
      status: "PUBLISHING",
      nextAfterSlot: null,
    });
    expect(await prisma.publicationWorkItem.count()).toBe(1);
    const end = await (
      await http(
        `/delivery/orders/${order.id}/work?afterSlot=2147483647&limit=50`,
        2,
      )
    ).json();
    expect(end.items).toEqual([]);
    expect(end.nextAfterSlot).toBeNull();
  });
});
