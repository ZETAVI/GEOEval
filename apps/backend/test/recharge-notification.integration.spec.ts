import "reflect-metadata";
import { request as httpRequest } from "node:http";
import { gzipSync } from "node:zlib";
import { Controller, Module, Post } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Client } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { IdentityModule } from "../src/identity/identity.module.js";
import { PersistenceModule } from "../src/infrastructure/persistence.module.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { NOTIFICATION_INBOX } from "../src/recharge/application/notification-inbox.js";
import { paymentFactsSha256 } from "../src/recharge/application/payment-facts.js";
import type { AuthenticatedPaymentNotification } from "../src/recharge/application/payment-gateway.js";
import { PrismaNotificationInbox } from "../src/recharge/infrastructure/prisma-notification-inbox.js";
import { WechatPayGateway } from "../src/recharge/infrastructure/wechat/wechat-pay.gateway.js";
import { RechargeNotificationModule } from "../src/recharge/recharge-notification.module.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { wechatFixture } from "./wechat-pay.fixture.js";

const config = loadIntegrationApiConfig();
const fixture = wechatFixture();
const gateway = new WechatPayGateway(fixture.config());
const identity = {
  provider: "WECHAT" as const,
  merchantId: fixture.order.merchantId,
  notificationId: "EV_77",
};
const route = "/recharges/providers/wechat/notify";

class PrivateProbeController {
  mutate() {
    return { accepted: true };
  }
}
// Tests live outside the backend decorator tsconfig; apply the same Nest metadata explicitly.
Controller("private-probe")(PrivateProbeController);
Post()(
  PrivateProbeController.prototype,
  "mutate",
  Object.getOwnPropertyDescriptor(PrivateProbeController.prototype, "mutate")!,
);

function verified(
  options: Parameters<typeof fixture.notification>[0] = {},
): AuthenticatedPaymentNotification {
  const result = gateway.verifyNotification(fixture.notification(options));
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

describe("Recharge durable notification ingress (real Nest, Identity and PostgreSQL)", () => {
  let app: NestExpressApplication,
    prisma: PrismaService,
    inbox: PrismaNotificationInbox,
    origin: string;
  const control = new Client({ connectionString: config.databaseUrl });

  async function start(rawBody = true) {
    class TestHost {}
    Module({
      imports: [
        PersistenceModule.register(config.databaseUrl),
        IdentityModule.register(config),
        RechargeNotificationModule.register(gateway),
      ],
      controllers: [PrivateProbeController],
    })(TestHost);
    app = await NestFactory.create<NestExpressApplication>(TestHost, {
      rawBody,
      logger: false,
    });
    app.useBodyParser("json", { limit: "2mb", inflate: false });
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
    prisma = app.get(PrismaService);
    inbox = app.get(NOTIFICATION_INBOX);
  }

  function send(
    input = fixture.notification(),
    path = route,
    extra: Record<string, string | string[]> = {},
  ) {
    const headers: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(input.headers))
      if (value) headers[key] = [...value];
    return new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = httpRequest(
        new URL(path, origin),
        { method: "POST", headers: { ...headers, ...extra } },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () =>
            resolve({
              status: res.statusCode!,
              body: Buffer.concat(chunks).toString(),
            }),
          );
        },
      );
      req.on("error", reject);
      req.end(input.rawBody);
    });
  }

  async function counts() {
    return [
      await prisma.rechargePaymentObservation.count(),
      await prisma.rechargeNotificationReceipt.count(),
    ];
  }

  beforeAll(async () => {
    await control.connect();
    await start();
  });
  beforeEach(async () => {
    // These are the two exclusive Recharge test tables in the supplied integration DB.
    await control.query(
      "TRUNCATE recharge_notification_receipts, recharge_payment_observations",
    );
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await control.query("SELECT pg_advisory_unlock_all()");
    await control.query(
      "DROP TRIGGER IF EXISTS issue77_receipt_barrier ON recharge_notification_receipts",
    );
    await control.query("DROP FUNCTION IF EXISTS issue77_receipt_barrier()");
  });
  afterAll(async () => {
    await app?.close();
    await control.end();
  });

  it("commits exact raw-body verified safe facts and returns an empty 204 without session/CSRF", async () => {
    const input = fixture.notification({ pretty: true });
    const expected = gateway.verifyNotification(input);
    expect(expected.ok).toBe(true);
    expect(await send(input)).toEqual({ status: 204, body: "" });
    expect(await counts()).toEqual([1, 1]);
    const stored = await inbox.getReceipt(identity);
    expect(stored?.canonical.facts).toEqual(
      expected.ok && expected.value.facts,
    );
    expect(stored?.canonical.proof.bodySha256).toBe(
      expected.ok && expected.value.proof.bodySha256,
    );
    expect(stored?.canonical.factsSha256).toBe(
      paymentFactsSha256(stored!.canonical.facts),
    );
    const rows = await control.query(
      "SELECT row_to_json(o) AS data FROM recharge_payment_observations o",
    );
    const serialized = JSON.stringify(rows.rows);
    for (const forbidden of [
      "never-persist-this-payer",
      "ciphertext",
      "openid",
      "privateKey",
      fixture.apiKey.toString("hex"),
    ])
      expect(serialized).not.toContain(forbidden);
    expect(await inbox.listPending(10)).toHaveLength(1);
    expect(await inbox.listConflicts(10)).toHaveLength(0);
  });

  it("does not ACK or expose rows before the actual PostgreSQL commit", async () => {
    await control.query(
      `CREATE FUNCTION issue77_receipt_barrier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(770801); RETURN NEW; END; $$`,
    );
    await control.query(
      "CREATE TRIGGER issue77_receipt_barrier BEFORE INSERT ON recharge_notification_receipts FOR EACH ROW EXECUTE FUNCTION issue77_receipt_barrier()",
    );
    await control.query("SELECT pg_advisory_lock(770801)");
    let responded = false;
    const response = send().then((r) => {
      responded = true;
      return r;
    });
    try {
      await vi.waitFor(
        async () => {
          const waiters = await control.query(
            "SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event = 'advisory'",
          );
          expect(waiters.rowCount).toBeGreaterThan(0);
        },
        { timeout: 800, interval: 10 },
      );
      expect(responded).toBe(false);
      expect(await counts()).toEqual([0, 0]);
    } finally {
      await control.query("SELECT pg_advisory_unlock(770801)");
    }
    expect((await response).status).toBe(204);
    expect(await counts()).toEqual([1, 1]);
  });

  it("bounds actual database lock waiting and retries the rolled-back receipt", async () => {
    await control.query(
      `CREATE FUNCTION issue77_receipt_barrier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(770801); RETURN NEW; END; $$`,
    );
    await control.query(
      "CREATE TRIGGER issue77_receipt_barrier BEFORE INSERT ON recharge_notification_receipts FOR EACH ROW EXECUTE FUNCTION issue77_receipt_barrier()",
    );
    await control.query("SELECT pg_advisory_lock(770801)");
    const startedAt = performance.now();
    const response = await send();
    expect(response.status).toBe(503);
    expect(performance.now() - startedAt).toBeLessThan(3500);
    expect(await counts()).toEqual([0, 0]);
    await control.query("SELECT pg_advisory_unlock(770801)");
    expect((await send()).status).toBe(204);
    expect(await counts()).toEqual([1, 1]);
  });

  it("rolls back observation when receipt insert fails and gives retryable 503", async () => {
    await control.query(
      `CREATE FUNCTION issue77_receipt_barrier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private database diagnostic must not escape'; END; $$`,
    );
    await control.query(
      "CREATE TRIGGER issue77_receipt_barrier BEFORE INSERT ON recharge_notification_receipts FOR EACH ROW EXECUTE FUNCTION issue77_receipt_barrier()",
    );
    const response = await send();
    expect(response.status).toBe(503);
    expect(response.body).not.toContain("private database diagnostic");
    expect(await counts()).toEqual([0, 0]);
  });

  it("concurrent retransmissions and re-encryption produce one canonical receipt", async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        send(fixture.notification({ pretty: i % 2 === 0 })),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual(Array(8).fill(204));
    expect(await counts()).toEqual([1, 1]);
    expect((await inbox.getReceipt(identity))?.hasConflict).toBe(false);
  });

  it("concurrent conflicting facts are retained, ACKed after storage, and excluded from automatic scanning", async () => {
    const responses = await Promise.all([
      send(),
      send(fixture.notification({ trade: { transaction_id: "420000000078" } })),
    ]);
    expect(responses.map((r) => r.status)).toEqual([204, 204]);
    expect(await counts()).toEqual([2, 1]);
    const receipt = await inbox.getReceipt(identity);
    expect(receipt?.hasConflict).toBe(true);
    expect(await inbox.listPending(10)).toEqual([]);
    expect(await inbox.listConflicts(10)).toHaveLength(1);
    expect((await send()).status).toBe(204);
    expect((await inbox.getReceipt(identity))?.canonical).toEqual(
      receipt?.canonical,
    );
  });

  it("a discarded response and host/connection replacement recover the same pending receipt", async () => {
    await send(); // Simulate the sender discarding the response after the server committed.
    const first = await inbox.getReceipt(identity);
    await app.close();
    await start();
    expect(await inbox.listPending(10)).toEqual([first]);
    expect((await send(fixture.notification({ pretty: true }))).status).toBe(
      204,
    );
    expect(await counts()).toEqual([1, 1]);
    expect(await inbox.getReceipt(identity)).toEqual(first);
  });

  it("a later commit is discovered without a persistent timestamp watermark", async () => {
    await inbox.accept(verified({ envelope: { id: "EV_NEW" } }));
    await prisma.$transaction(async (tx) => {
      const n = verified({ envelope: { id: "EV_LATE" } });
      const first = await prisma.rechargePaymentObservation.findFirstOrThrow();
      await tx.rechargePaymentObservation.create({
        data: {
          ...first,
          id: undefined,
          notificationId: n.notificationId,
          createdAt: new Date("2020-01-01T00:00:00Z"),
        },
      });
      await tx.rechargeNotificationReceipt.create({
        data: {
          ...identity,
          notificationId: n.notificationId,
          canonicalFactsSha256: n.factsSha256,
          createdAt: new Date("2020-01-01T00:00:00Z"),
        },
      });
      expect(
        (await inbox.listPending(10)).map((r) => r.notificationId),
      ).toEqual(["EV_NEW"]);
    });
    expect((await inbox.listPending(10)).map((r) => r.notificationId)).toEqual([
      "EV_LATE",
      "EV_NEW",
    ]);
  });

  it("different merchant namespaces sharing a notification id do not overwrite each other", async () => {
    await inbox.accept(verified());
    await inbox.accept(verified({ trade: { mchid: "1900007292" } }));
    expect(await counts()).toEqual([2, 2]);
    expect(await inbox.listPending(10)).toHaveLength(2);
  });

  it.each([
    [
      "bad signature",
      () => {
        const n = fixture.notification();
        return {
          ...n,
          headers: {
            ...n.headers,
            "wechatpay-signature": ["WECHATPAY/SIGNTEST/invalid"],
          },
        };
      },
      401,
    ],
    [
      "duplicate signature header",
      () => {
        const n = fixture.notification();
        return {
          ...n,
          headers: {
            ...n.headers,
            "wechatpay-signature": [
              ...n.headers["wechatpay-signature"]!,
              ...n.headers["wechatpay-signature"]!,
            ],
          },
        };
      },
      401,
    ],
    [
      "tampered bytes",
      () => {
        const n = fixture.notification();
        return { ...n, rawBody: Buffer.concat([n.rawBody, Buffer.from(" ")]) };
      },
      401,
    ],
    ["bad GCM tag", () => fixture.notification({ badTag: true }), 400],
    [
      "missing required total",
      () =>
        fixture.notification({
          trade: {
            amount: { currency: "CNY", payer_total: 80, payer_currency: "CNY" },
          },
        }),
      400,
    ],
  ])("rejects %s without any receipt", async (_name, make, status) => {
    expect((await send(make())).status).toBe(status);
    expect(await counts()).toEqual([0, 0]);
  });

  it("rejects compressed, oversized and non-JSON requests", async () => {
    const input = fixture.notification();
    expect(
      (
        await send({ ...input, rawBody: gzipSync(input.rawBody) }, route, {
          "content-encoding": "gzip",
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await send({
          ...input,
          rawBody: Buffer.from(
            JSON.stringify({ data: "x".repeat(2 * 1024 * 1024) }),
          ),
        })
      ).status,
    ).toBe(413);
    expect(
      (await send(input, route, { "content-type": "text/plain" })).status,
    ).toBe(415);
    expect(await counts()).toEqual([0, 0]);
  });

  it("fails closed when the host forgot rawBody", async () => {
    await app.close();
    await start(false);
    try {
      expect((await send()).status).toBe(503);
      expect(await counts()).toEqual([0, 0]);
    } finally {
      await app.close();
      await start();
    }
  });

  it("preserves real Identity session and CSRF enforcement on other mutators", async () => {
    expect((await send(fixture.notification(), "/private-probe")).status).toBe(
      403,
    );
    expect(
      (
        await send(fixture.notification(), "/private-probe", {
          "x-geoeval-request": "1",
          origin: config.corsOrigins[0]!,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await send(fixture.notification(), "/private-probe", {
          "x-geoeval-request": "1",
          origin: "https://untrusted.example.invalid",
        })
      ).status,
    ).toBe(403);
    expect(await counts()).toEqual([0, 0]);
  });

  it("retains safe integer precision above int32 and rejects inconsistent internal input", async () => {
    const n = verified({
      trade: {
        amount: {
          total: Number.MAX_SAFE_INTEGER,
          currency: "CNY",
          payer_total: 0,
          payer_currency: "CNY",
        },
      },
    });
    expect(await inbox.accept(n)).toBe("RECORDED");
    expect(
      (await inbox.getReceipt(identity))?.canonical.facts.orderTotalFen,
    ).toBe(Number.MAX_SAFE_INTEGER);
    await expect(
      inbox.accept({ ...n, facts: { ...n.facts, orderTotalFen: 100 } }),
    ).rejects.toThrow("RECHARGE_NOTIFICATION_INVARIANT");
    const noncanonical = { ...n.facts, successAt: "2026-09-08T10:00:00+08:00" };
    await expect(
      inbox.accept({
        ...n,
        facts: noncanonical,
        factsSha256: paymentFactsSha256(noncanonical),
      }),
    ).rejects.toThrow("RECHARGE_NOTIFICATION_INVARIANT");
    expect(await counts()).toEqual([1, 1]);
  });

  it("freezes its projection before awaiting the transaction", async () => {
    const n = verified();
    const accepted = inbox.accept(n);
    n.notificationId = "MUTATED";
    n.facts = { ...n.facts, merchantOrderNo: "MUTATED" };
    await accepted;
    expect(
      (await inbox.getReceipt(identity))?.canonical.facts.merchantOrderNo,
    ).toBe("ORDER_77");
  });

  it("database constraints preserve observations, canonical identity and conflict history", async () => {
    await inbox.accept(verified());
    await expect(
      control.query(
        "UPDATE recharge_payment_observations SET order_total_fen = 101",
      ),
    ).rejects.toThrow("append-only");
    await expect(
      control.query("DELETE FROM recharge_payment_observations"),
    ).rejects.toThrow();
    await expect(
      control.query("DELETE FROM recharge_notification_receipts"),
    ).rejects.toThrow("cannot be deleted");
    await expect(
      control.query(
        "UPDATE recharge_notification_receipts SET notification_id = 'OTHER'",
      ),
    ).rejects.toThrow("cannot be rewritten");
    await expect(
      control.query(
        "INSERT INTO recharge_notification_receipts SELECT provider, 'OTHER', notification_id, canonical_facts_sha256, false, NULL, created_at FROM recharge_notification_receipts",
      ),
    ).rejects.toThrow("foreign key");
    await inbox.accept(verified({ trade: { transaction_id: "420000000078" } }));
    await expect(
      control.query(
        "UPDATE recharge_notification_receipts SET has_conflict = false",
      ),
    ).rejects.toThrow("cannot be rewritten");
    const row = await prisma.rechargePaymentObservation.findFirstOrThrow();
    await expect(
      prisma.rechargePaymentObservation.create({
        data: {
          ...row,
          id: undefined,
          notificationId: "INVALID",
          orderTotalFen: 9007199254740992n,
        },
      }),
    ).rejects.toThrow();
  });

  it("bounds scan size and distinguishes missing receipts", async () => {
    expect(await inbox.getReceipt(identity)).toBeNull();
    for (const size of [0, 101, 1.5, NaN])
      await expect(inbox.listPending(size)).rejects.toThrow(
        "RECHARGE_RECEIPT_SCAN_LIMIT",
      );
  });
});
