import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { INestApplication } from "@nestjs/common";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { MediaSupplyService } from "../src/media-supply/application/media-supply.service.js";
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { PublishingPackageService } from "../src/publishing-commerce/application/publishing-package.service.js";
import { commercialTerms } from "../src/publishing-commerce/domain/publishing-order.js";
import { publishingContextFixture } from "./publishing-context.fixture.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

// This operational drill deliberately rewinds DDL inside a rollback-only
// transaction. Ordinary regression suites must never run it on their data.
function isRecoveryTarget() {
  try {
    const database = new URL(process.env.DATABASE_URL ?? "");
    const redis = new URL(process.env.REDIS_URL ?? "");
    return (
      database.hostname === "127.0.0.1" &&
      database.port === "55432" &&
      database.pathname === "/geoeval_issue73_recovery_verified" &&
      redis.hostname === "127.0.0.1" &&
      redis.port === "56573" &&
      redis.pathname === "/2"
    );
  } catch {
    return false;
  }
}

const config = loadIntegrationApiConfig();
const migrationNames = [
  "20260908043000_publication_delivery_admission",
  "20260908100000_publication_work_results",
  "20260908150000_delivery_workbench_ordering",
] as const;
const withoutTransaction = (sql: string) =>
  sql.replace(/^BEGIN;\s*/, "").replace(/COMMIT;\s*$/, "");

describe.skipIf(!isRecoveryTarget())(
  "isolated Delivery migration and recovery drill",
  () => {
    const prisma = new PrismaService(config.databaseUrl);
    let app: INestApplication;
    let baseUrl: string;
    let accounts: string[];
    let cookies: string[];
    let platformId: string;
    let packageId: string;
    let migrations: string[];
    const runLabel = randomUUID();

    async function startApi(readOnlyWindow = false) {
      app = await createApiApp(config, false);
      // Test-only HTTP ingress barrier, representing disabled mutation routes in
      // the approved recovery window. It is not a product maintenance mechanism.
      if (readOnlyWindow) {
        app.use(
          (
            request: { method: string },
            response: { status(code: number): { json(body: object): void } },
            next: () => void,
          ) => {
            if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
              response
                .status(503)
                .json({ message: "Controlled recovery read-only window" });
              return;
            }
            next();
          },
        );
      }
      await app.listen(0, "127.0.0.1");
      baseUrl = await app.getUrl();
    }

    function http(path: string, actor: number, method = "GET", body?: unknown) {
      return fetch(baseUrl + path, {
        method,
        headers: { ...browserMutationHeaders(), cookie: cookies[actor]! },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    }

    async function purchase() {
      const context = await publishingContextFixture(app, prisma, accounts[1]!);
      const saved = await http(
        `/publishing/brands/${context.brand.id}/selection`,
        1,
        "PUT",
        {
          expectedRevision: 0,
          articleId: context.article.id,
          articleRevision: context.article.revision,
          intent: { mode: "RANDOM", packageId },
        },
      );
      expect(saved.status).toBe(200);
      const workspace = await (await http("/publishing/workspace", 1)).json();
      const request = {
        idempotencyKey: randomUUID(),
        brandId: context.brand.id,
        articleId: context.article.id,
        articleRevision: context.article.revision,
        selectionRevision: workspace.selection.revision,
        acceptedTerms: commercialTerms(workspace.quote),
      };
      const response = await http("/publishing/orders", 1, "POST", request);
      expect(response.status).toBe(200);
      return response.json() as Promise<{ id: string }>;
    }

    async function retainedFacts(client: Client, orderId: string) {
      const result = await client.query<{ facts: Record<string, unknown> }>(
        `SELECT jsonb_build_object(
        'purchase', (SELECT to_jsonb(o) FROM publishing_orders o WHERE id=$1),
        'wallet', (SELECT to_jsonb(w) FROM point_accounts w WHERE account_id=$2),
        'spending', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.sequence) FROM point_changes c WHERE publishing_order_id=$1),
        'delivery', (SELECT to_jsonb(d) FROM publication_deliveries d WHERE order_id=$1),
        'items', (SELECT jsonb_agg(to_jsonb(i) ORDER BY i.slot) FROM publication_work_items i WHERE order_id=$1),
        'assignments', (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.revision) FROM publication_delivery_audits a WHERE order_id=$1),
        'workHistory', (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.slot,a.revision) FROM publication_work_audits a WHERE order_id=$1)
      ) AS facts`,
        [orderId, accounts[1]],
      );
      return result.rows[0]!.facts;
    }

    beforeAll(async () => {
      await prisma.$connect();
      const [target] = await prisma.$queryRaw<
        Array<{ name: string }>
      >`SELECT current_database() AS name`;
      expect(target?.name).toBe("geoeval_issue73_recovery_verified");
      migrations = await Promise.all(
        migrationNames.map(async (name) =>
          readFile(
            new URL(
              `../prisma/migrations/${name}/migration.sql`,
              import.meta.url,
            ),
            "utf8",
          ),
        ),
      );
      await startApi();
      const prefix = Date.now().toString().slice(-6);
      const rows = await Promise.all(
        (["ADMINISTRATOR", "TERMINAL_CUSTOMER", "OPERATIONS"] as const).map(
          (role, index) =>
            prisma.account.create({
              data: {
                role,
                mobile: `+86139${prefix}${String(index).padStart(2, "0")}`,
              },
            }),
        ),
      );
      accounts = rows.map((row) => row.id);
      cookies = await Promise.all(
        rows.map(
          async (row) =>
            (await loginWithDevelopmentChallenge(baseUrl, row.mobile)).cookie,
        ),
      );
      const platform = await app
        .get(MediaSupplyService)
        .createPlatform(accounts[0]!, {
          displayName: `恢复媒体 ${runLabel}`,
          categories: ["PORTAL_MEDIA"],
          status: "ACTIVE",
          pointPrice: 100,
        });
      platformId = platform.id;
      const pack = await app
        .get(PublishingPackageService)
        .create(accounts[0]!, {
          name: `恢复套餐 ${runLabel}`,
          quantity: 2,
          pointPrice: 200,
          status: "ACTIVE",
          platformIds: [platformId],
        });
      packageId = pack.id;
      await app.get(PointAccountService).adjust(accounts[1]!, accounts[0]!, {
        amount: 1000,
        reason: "独立恢复演练的合成积分",
        idempotencyKey: randomUUID(),
      });
    }, 30_000);

    afterAll(async () => {
      await app?.close();
      await prisma.$disconnect();
      // Deliberately retain all fixtures; no clearCustomerData or Redis cleanup.
    });

    it("rolls back an interrupted historical admission, then reapplies the exact migration bodies", async () => {
      const order = await purchase();
      const client = new Client({ connectionString: config.databaseUrl });
      await client.connect();
      const before = await retainedFacts(client, order.id);
      try {
        await client.query("BEGIN");
        // Reconstruct the former schema only inside this test transaction. The
        // final rollback also restores retained results and current indexes.
        await client.query(`
        DROP TABLE publication_work_audits;
        DROP TABLE publication_work_items;
        DROP TABLE publication_delivery_audits;
        DROP TABLE publication_deliveries;
        DROP TYPE "PublicationDeliveryStatus";
        CREATE TYPE "PublishingOrderStatus" AS ENUM ('PENDING_HANDLING');
        ALTER TABLE publishing_orders ADD COLUMN status "PublishingOrderStatus" NOT NULL DEFAULT 'PENDING_HANDLING';
      `);
        await client.query("SAVEPOINT legacy_schema");
        const admission = withoutTransaction(migrations[0]!);
        const retirement =
          'ALTER TABLE "publishing_orders" DROP COLUMN "status";';
        expect(admission).toContain(retirement);
        await client.query("SET LOCAL statement_timeout='150ms'");
        await expect(
          client.query(
            admission.replace(retirement, `SELECT pg_sleep(5);\n${retirement}`),
          ),
        ).rejects.toMatchObject({ code: "57014" });
        await client.query("ROLLBACK TO SAVEPOINT legacy_schema");
        expect(
          (
            await client.query(
              "SELECT to_regclass('publication_deliveries') AS receipt",
            )
          ).rows[0].receipt,
        ).toBeNull();
        expect(
          (
            await client.query(
              "SELECT status FROM publishing_orders WHERE id=$1",
              [order.id],
            )
          ).rows[0].status,
        ).toBe("PENDING_HANDLING");
        expect(
          (
            await client.query(
              "SELECT count(*)::int AS n FROM point_changes WHERE publishing_order_id=$1",
              [order.id],
            )
          ).rows[0].n,
        ).toBe(1);

        for (const migration of migrations)
          await client.query(withoutTransaction(migration));
        const accepted = await client.query(
          `
        SELECT d.status, d.published_quantity, d.created_at=o.created_at AS original_time,
          (SELECT count(*)::int FROM publication_work_items WHERE order_id=o.id) AS items
        FROM publication_deliveries d JOIN publishing_orders o ON o.id=d.order_id WHERE o.id=$1`,
          [order.id],
        );
        expect(accepted.rows).toEqual([
          {
            status: "PENDING_HANDLING",
            published_quantity: 0,
            original_time: true,
            items: 0,
          },
        ]);
        expect(
          (
            await client.query(`SELECT count(*)::int AS missing FROM publishing_orders o
        WHERE NOT EXISTS (SELECT 1 FROM publication_deliveries d WHERE d.order_id=o.id)`)
          ).rows[0].missing,
        ).toBe(0);
        expect(
          (
            await client.query(
              "SELECT jsonb_agg(to_jsonb(c) ORDER BY c.sequence) AS spending FROM point_changes c WHERE publishing_order_id=$1",
              [order.id],
            )
          ).rows[0].spending,
        ).toEqual(before.spending);
        expect(
          (
            await client.query(
              "SELECT to_jsonb(o)-'status' AS purchase FROM publishing_orders o WHERE id=$1",
              [order.id],
            )
          ).rows[0].purchase,
        ).toEqual(before.purchase);
      } finally {
        try {
          await client.query("ROLLBACK");
          expect(await retainedFacts(client, order.id)).toEqual(before);
        } finally {
          await client.end();
        }
      }
    }, 30_000);

    it("retains claimed work and published results through a compatible read-only window and forward recovery", async () => {
      const order = await purchase();
      expect(
        (
          await http(`/delivery/orders/${order.id}/claim`, 2, "POST", {
            expectedRevision: 1,
            idempotencyKey: randomUUID(),
          })
        ).status,
      ).toBe(200);
      const result = {
        title: "恢复前的真实录入结果",
        url: `https://example.com/recovery/${runLabel}`,
        publishedAt: "2026-09-01T12:00:00Z",
        internalChannel: "恢复演练内部渠道",
        internalNote: "保留恢复前的内部事实",
      };
      expect(
        (
          await http(`/delivery/orders/${order.id}/work/1`, 2, "POST", {
            action: "RECORD_RESULT",
            expectedRevision: 2,
            expectedItemRevision: 0,
            idempotencyKey: randomUUID(),
            platformId,
            result,
          })
        ).status,
      ).toBe(200);
      const client = new Client({ connectionString: config.databaseUrl });
      await client.connect();
      const before = await retainedFacts(client, order.id);
      try {
        await client.query("BEGIN");
        try {
          await client.query(`
          DROP INDEX publication_deliveries_assignee_deadline_idx;
          DROP INDEX publication_deliveries_deadline_idx;
          CREATE INDEX publication_deliveries_assignee_account_id_sequence_idx
            ON publication_deliveries(assignee_account_id,sequence);
        `);
          await client.query(
            "UPDATE publication_deliveries SET created_at=created_at + INTERVAL '1 millisecond' WHERE order_id=$1",
            [order.id],
          );
          expect(
            (
              await client.query(
                `SELECT d.created_at<>o.created_at AS drifted
          FROM publication_deliveries d JOIN publishing_orders o ON o.id=d.order_id WHERE o.id=$1`,
                [order.id],
              )
            ).rows[0].drifted,
          ).toBe(true);
          await client.query(withoutTransaction(migrations[2]!));
          expect(await retainedFacts(client, order.id)).toEqual(before);
        } finally {
          await client.query("ROLLBACK");
        }
        expect(await retainedFacts(client, order.id)).toEqual(before);
        await app.close();
        await startApi(true);
        const customerResponse = await http(
          `/publishing/orders/${order.id}/results`,
          1,
        );
        expect(customerResponse.status).toBe(200);
        const visible = await customerResponse.json();
        expect(visible).toMatchObject({
          status: "PUBLISHING",
          quantity: 2,
          publishedQuantity: 1,
        });
        expect(visible.items[0].result).toMatchObject({
          title: result.title,
          url: result.url,
        });
        expect(JSON.stringify(visible)).not.toContain(result.internalNote);
        const history = await http(
          `/delivery/orders/${order.id}/work/1/history`,
          2,
        );
        expect(history.status).toBe(200);
        expect(await history.json()).toHaveLength(1);
        expect(
          (await http(`/delivery/orders/${order.id}/work/1`, 2, "POST", {}))
            .status,
        ).toBe(503);
        await client.query("BEGIN READ ONLY");
        try {
          expect(await retainedFacts(client, order.id)).toEqual(before);
        } finally {
          await client.query("ROLLBACK");
        }

        await app.close();
        await startApi();
        const request = {
          action: "CORRECT_RESULT",
          expectedRevision: 3,
          expectedItemRevision: 1,
          idempotencyKey: randomUUID(),
          platformId,
          reason: "恢复后纠正标题录入",
          result: { ...result, title: "前向恢复后的纠正标题" },
        };
        const corrected = await http(
          `/delivery/orders/${order.id}/work/1`,
          2,
          "POST",
          request,
        );
        expect(corrected.status).toBe(200);
        const receipt = await corrected.json();
        expect(
          await (
            await http(
              `/delivery/orders/${order.id}/work/1`,
              2,
              "POST",
              request,
            )
          ).json(),
        ).toEqual(receipt);
        const after = await retainedFacts(client, order.id);
        expect(after.purchase).toEqual(before.purchase);
        expect(after.wallet).toEqual(before.wallet);
        expect(after.spending).toEqual(before.spending);
        expect(after.assignments).toEqual(before.assignments);
        expect(after.delivery).toMatchObject({
          status: "PUBLISHING",
          published_quantity: 1,
          assignee_account_id: accounts[2],
        });
        expect(after.workHistory).toHaveLength(2);
        const customer = await (
          await http(`/publishing/orders/${order.id}/results`, 1)
        ).json();
        expect(customer).toMatchObject({ quantity: 2, publishedQuantity: 1 });
        expect(customer.items[0].result).toMatchObject({
          title: request.result.title,
          url: result.url,
        });
      } finally {
        await client.end();
      }
    }, 30_000);
  },
);
