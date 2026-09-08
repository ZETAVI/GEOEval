import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { ModulesContainer, NestFactory } from "@nestjs/core";
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
import { AccountDirectoryService } from "../src/identity/application/account-directory.service.js";
import { PersistenceModule } from "../src/infrastructure/persistence.module.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { MAX_POINTS } from "../src/publishing-commerce/domain/point-account.js";
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { PostgresPointAccountRepository } from "../src/publishing-commerce/infrastructure/postgres-point-account.repository.js";
import { RechargeCoreService } from "../src/recharge/application/recharge-core.service.js";
import {
  NOTIFICATION_INBOX,
  type NotificationIdentity,
  type NotificationInbox,
} from "../src/recharge/application/notification-inbox.js";
import type {
  RechargeConfig,
  RechargeOrder,
} from "../src/recharge/domain/recharge-order.js";
import { PostgresRechargeRepository } from "../src/recharge/infrastructure/postgres-recharge.repository.js";
import { WechatPayGateway } from "../src/recharge/infrastructure/wechat/wechat-pay.gateway.js";
import { RechargeCoreModule } from "../src/recharge/recharge-core.module.js";
import { RechargeNotificationModule } from "../src/recharge/recharge-notification.module.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { wechatFixture } from "./wechat-pay.fixture.js";

const config = loadIntegrationApiConfig(),
  fixture = wechatFixture();
const policy: RechargeConfig = {
  merchantId: fixture.order.merchantId,
  appId: fixture.order.appId,
  minAmountYuan: 1,
  maxAmountYuan: 100,
  maxActiveOrders: 3,
  paymentWindowSeconds: 600,
};
const gateway = new WechatPayGateway(fixture.config());

describe("atomic recharge core with real protocol, Nest and PostgreSQL", () => {
  let app: NestExpressApplication,
    prisma: PrismaService,
    core: RechargeCoreService,
    repo: PostgresRechargeRepository,
    inbox: NotificationInbox,
    pointRepo: PostgresPointAccountRepository,
    pointService: PointAccountService,
    origin: string;
  let customerId: string, adminId: string, otherId: string;
  const control = new Client({ connectionString: config.databaseUrl });
  async function start() {
    class TestHost {}
    Module({
      imports: [
        PersistenceModule.register(config.databaseUrl),
        IdentityModule.register(config),
        RechargeCoreModule.register(policy),
        RechargeNotificationModule.register(gateway),
      ],
    })(TestHost);
    app = await NestFactory.create<NestExpressApplication>(TestHost, {
      rawBody: true,
      logger: false,
    });
    app.useBodyParser("json", { limit: "2mb", inflate: false });
    await app.listen(0, "127.0.0.1");
    origin = await app.getUrl();
    prisma = app.get(PrismaService);
    core = app.get(RechargeCoreService);
    inbox = app.get(NOTIFICATION_INBOX);
    repo = new PostgresRechargeRepository(prisma);
    pointRepo = new PostgresPointAccountRepository(prisma);
    pointService = new PointAccountService(
      pointRepo,
      app.get(AccountDirectoryService),
    );
  }
  beforeAll(async () => {
    await control.connect();
    await start();
  });
  beforeEach(async () => {
    await clearCustomerData(prisma);
    const rows = await Promise.all([
      prisma.account.create({
        data: { mobile: "+8613900007711", role: "TERMINAL_CUSTOMER" },
      }),
      prisma.account.create({
        data: { mobile: "+8613900007712", role: "ADMINISTRATOR" },
      }),
      prisma.account.create({
        data: { mobile: "+8613900007713", role: "TERMINAL_CUSTOMER" },
      }),
    ]);
    [customerId, adminId, otherId] = rows.map((r) => r.id);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await control.query("SELECT pg_advisory_unlock_all()");
    await control.query(
      "DROP TRIGGER IF EXISTS issue77_settlement_failure ON recharge_orders",
    );
    await control.query(
      "DROP TRIGGER IF EXISTS issue77_settlement_failure ON recharge_notification_receipts",
    );
    await control.query(
      "DROP TRIGGER IF EXISTS issue77_settlement_failure ON point_changes",
    );
    await control.query(
      "DROP TRIGGER IF EXISTS issue77_settlement_failure ON recharge_credit_reservations",
    );
    await control.query("DROP FUNCTION IF EXISTS issue77_settlement_failure()");
    await clearCustomerData(prisma);
  });
  afterAll(async () => {
    await app?.close();
    await control.end();
  });
  const create = (
    amountYuan = 1,
    idempotencyKey = randomUUID(),
    accountId = customerId,
  ) =>
    core.create(accountId, {
      amountYuan,
      idempotencyKey,
      method: "WECHAT_NATIVE",
    });
  const grant = (amount: number, key = randomUUID()) =>
    pointRepo.adjust(
      customerId,
      adminId,
      {
        amount,
        idempotencyKey: key,
        reason: "合成测试赠点",
        internalNote: null,
        businessReference: null,
      },
      true,
    );
  const wallet = (accountId = customerId) =>
    prisma.pointAccount.findUniqueOrThrow({ where: { accountId } });
  function notification(
    order: RechargeOrder,
    id = randomUUID(),
    extra: Record<string, unknown> = {},
  ) {
    const input = fixture.notification({
      envelope: { id },
      trade: {
        out_trade_no: order.merchantOrderNo,
        amount: {
          total: order.amountFen,
          currency: "CNY",
          payer_total: order.amountFen,
          payer_currency: "CNY",
        },
        ...extra,
      },
    });
    return {
      input,
      identity: {
        provider: "WECHAT" as const,
        merchantId: order.merchantId,
        notificationId: id,
      },
    };
  }
  async function receive(
    order: RechargeOrder,
    id = randomUUID(),
    extra: Record<string, unknown> = {},
  ): Promise<NotificationIdentity> {
    const n = notification(order, id, extra);
    const headers = Object.fromEntries(
      Object.entries(n.input.headers).map(([key, value]) => [key, value![0]!]),
    );
    const response = await fetch(
      `${origin}/recharges/providers/wechat/notify`,
      { method: "POST", headers, body: new Uint8Array(n.input.rawBody) },
    );
    expect(response.status).toBe(204);
    return n.identity;
  }
  async function query(
    order: RechargeOrder,
    extra: Record<string, unknown> = {},
  ) {
    const g = new WechatPayGateway(fixture.config(), async () =>
      fixture.response(
        fixture.trade({
          out_trade_no: order.merchantOrderNo,
          amount: { total: order.amountFen, currency: "CNY" },
          ...extra,
        }),
      ),
    );
    const result = await g.query({
      merchantId: order.merchantId,
      appId: order.appId,
      merchantOrderNo: order.merchantOrderNo,
      amountFen: order.amountFen,
    });
    if (!result.ok || result.value.state !== "SUCCESS")
      throw new Error("test query failed");
    return result.value;
  }

  it("composes without Publishing/Media/Delivery modules and never creates an HTTP recharge command", async () => {
    const names = [...app.get(ModulesContainer).values()].map(
      (m) => m.metatype.name,
    );
    for (const name of [
      "PublishingCommerceModule",
      "CommercePointsModule",
      "MediaSupplyModule",
      "PublicationDeliveryModule",
    ])
      expect(names).not.toContain(name);
    expect(
      (await fetch(`${origin}/recharges`, { method: "POST" })).status,
    ).toBe(404);
  });
  it("reserves only internal capacity and recovers one frozen intention under concurrent create", async () => {
    const key = randomUUID();
    const orders = await Promise.all(
      Array.from({ length: 6 }, () => create(2, key)),
    );
    expect(new Set(orders.map((o) => o.id)).size).toBe(1);
    expect(await wallet()).toMatchObject({
      fundedBalance: 0,
      grantedBalance: 0,
      revision: 0,
      reservedFundedPoints: 20,
      reservedLedgerSlots: 1,
    });
    expect(await prisma.pointChange.count()).toBe(0);
    expect(await prisma.rechargeCreditReservation.count()).toBe(1);
    expect(await pointService.customerBalance(customerId)).toEqual({
      balance: 0,
      revision: 0,
    });
    expect(await pointService.adminBalance(customerId)).not.toHaveProperty(
      "reservedFundedPoints",
    );
    await expect(create(3, key)).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
    });
  });
  it("limits new active orders under the wallet lock and rejects body ownership/amount overrides", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => create()),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(await wallet()).toMatchObject({
      reservedFundedPoints: 30,
      reservedLedgerSlots: 3,
    });
    for (const input of [0, 1.2, 101, NaN])
      await expect(
        Promise.resolve().then(() => create(input)),
      ).rejects.toBeDefined();
    expect(() =>
      core.create(customerId, {
        amountYuan: 1,
        idempotencyKey: randomUUID(),
        method: "WECHAT_NATIVE",
        fundedPoints: 10000,
      }),
    ).toThrow();
  });
  it("replays before changed account, merchant configuration or amount policy gates", async () => {
    const order = await create();
    await prisma.account.update({
      where: { id: customerId },
      data: { status: "INACTIVE" },
    });
    const changed = new RechargeCoreService(repo, {
      ...policy,
      minAmountYuan: 10,
      merchantId: "1900009999",
    });
    expect(
      await changed.create(customerId, {
        amountYuan: 1,
        idempotencyKey: order.idempotencyKey,
        method: "WECHAT_NATIVE",
      }),
    ).toEqual(order);
    await expect(create()).rejects.toMatchObject({
      code: "ACCOUNT_NOT_ACTIVE",
    });
  });
  it("applies a real authenticated HTTP notification exactly once with the order and receipt", async () => {
    const order = await create(2),
      identity = await receive(order);
    expect(await core.applyNotification(identity)).toMatchObject({
      kind: "APPLIED",
      order: { status: "SUCCESSFUL" },
    });
    expect(await core.applyNotification(identity)).toMatchObject({
      kind: "ALREADY_APPLIED",
    });
    expect(await wallet()).toMatchObject({
      fundedBalance: 20,
      grantedBalance: 0,
      revision: 1,
      reservedFundedPoints: 0,
      reservedLedgerSlots: 0,
    });
    expect(await prisma.pointChange.findMany()).toMatchObject([
      {
        kind: "RECHARGE",
        rechargeOrderId: order.id,
        actorKind: "SYSTEM",
        actorAccountId: null,
        idempotencyKey: null,
        fundedDelta: 20,
      },
    ]);
    expect(await inbox.getReceipt(identity)).toMatchObject({
      appliedRechargeOrderId: order.id,
      reviewReason: null,
      processedAt: expect.any(String),
    });
    const history = await pointService.history(customerId, {});
    expect(history.items[0]).toMatchObject({
      kind: "RECHARGE",
      rechargeOrderId: order.id,
      amount: 20,
    });
    for (const hidden of [
      "actorKind",
      "actorAccountId",
      "fundedDelta",
      "reservedFundedPoints",
    ])
      expect(history.items[0]).not.toHaveProperty(hidden);
    expect(
      (await pointService.adminHistory(customerId, {})).items[0],
    ).toMatchObject({
      actorKind: "SYSTEM",
      actorAccountId: null,
      idempotencyKey: null,
    });
  });
  it("different notification IDs and authenticated query race into one ledger", async () => {
    const order = await create();
    const [a, b, q] = await Promise.all([
      receive(order),
      receive(order),
      query(order),
    ]);
    const results = await Promise.all([
      core.applyNotification(a),
      core.applyNotification(b),
      core.applyAuthenticatedQuery(order.id, q.facts, q.proof),
    ]);
    expect(results.filter((r) => r.kind === "APPLIED")).toHaveLength(1);
    expect(results.filter((r) => r.kind === "ALREADY_APPLIED")).toHaveLength(2);
    expect(
      await prisma.pointChange.count({ where: { kind: "RECHARGE" } }),
    ).toBe(1);
    const observation =
      await prisma.rechargePaymentObservation.findFirstOrThrow({
        where: { sourceKind: "QUERY" },
      });
    expect(observation).toMatchObject({
      notificationId: null,
      notificationCreatedAt: null,
      payerTotalFen: null,
      payerCurrency: null,
      queriedOrderId: order.id,
    });
    expect(await inbox.listPending(10)).toEqual([]);
  });
  it("a system settlement key cannot be occupied by an existing client operation", async () => {
    const key = randomUUID();
    await grant(5, key);
    const order = await create(1, key);
    await grant(5, order.id);
    expect((await core.applyNotification(await receive(order))).kind).toBe(
      "APPLIED",
    );
    expect(await wallet()).toMatchObject({
      grantedBalance: 10,
      fundedBalance: 10,
      revision: 3,
    });
    await expect(grant(6, key)).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
    });
  });
  it("preserves a stopped customer's existing paid obligation without reactivating the account", async () => {
    const order = await create(),
      identity = await receive(order);
    await prisma.account.update({
      where: { id: customerId },
      data: { status: "INACTIVE" },
    });
    expect((await core.applyNotification(identity)).kind).toBe("APPLIED");
    expect(
      (await prisma.account.findUniqueOrThrow({ where: { id: customerId } }))
        .status,
    ).toBe("INACTIVE");
    await expect(create()).rejects.toMatchObject({
      code: "ACCOUNT_NOT_ACTIVE",
    });
  });
  it("rolls back a new order when its credit cannot be reserved", async () => {
    await grant(MAX_POINTS);
    await expect(create()).rejects.toMatchObject({
      code: "POINT_LIMIT_EXCEEDED",
    });
    expect(await prisma.rechargeOrder.count()).toBe(0);
    expect(await prisma.rechargeCreditReservation.count()).toBe(0);
    expect(await wallet()).toMatchObject({
      grantedBalance: MAX_POINTS,
      reservedFundedPoints: 0,
      reservedLedgerSlots: 0,
    });
  });
  it("protects reserved balance capacity against concurrent grants", async () => {
    await grant(MAX_POINTS - 20);
    const order = await create(2);
    await expect(grant(1)).rejects.toMatchObject({
      code: "POINT_LIMIT_EXCEEDED",
    });
    expect((await core.applyNotification(await receive(order))).kind).toBe(
      "APPLIED",
    );
    expect(await wallet()).toMatchObject({
      grantedBalance: MAX_POINTS - 20,
      fundedBalance: 20,
      reservedFundedPoints: 0,
    });
  });
  it("preserves the last ledger sequence for a reserved recharge, including against a negative adjustment", async () => {
    await grant(20);
    await prisma.pointAccount.update({
      where: { accountId: customerId },
      data: { revision: MAX_POINTS - 1 },
    });
    const order = await create();
    await expect(grant(-1)).rejects.toMatchObject({
      code: "POINT_LIMIT_EXCEEDED",
    });
    await core.applyNotification(await receive(order));
    expect(await wallet()).toMatchObject({
      revision: MAX_POINTS,
      reservedLedgerSlots: 0,
    });
    expect((await core.applyNotification(await receive(order))).kind).toBe(
      "ALREADY_APPLIED",
    );
  });
  it("releases UNSENT capacity once and retains late trusted payment for review", async () => {
    const order = await create();
    expect(await core.cancelUnsent(customerId, order.id)).toMatchObject({
      status: "CLOSED",
    });
    expect(await core.cancelUnsent(customerId, order.id)).toMatchObject({
      status: "CLOSED",
    });
    expect(await wallet()).toMatchObject({
      reservedFundedPoints: 0,
      reservedLedgerSlots: 0,
      revision: 0,
      fundedBalance: 0,
    });
    expect(await core.applyNotification(await receive(order))).toEqual({
      kind: "REVIEW_REQUIRED",
      reason: "CLOSED_ORDER",
    });
    expect(await prisma.pointChange.count()).toBe(0);
    expect(await core.findOwned(customerId, order.id)).toMatchObject({
      status: "CLOSED",
      reviewReason: "CLOSED_ORDER",
    });
  });
  it("does not release possibly dispatched orders or another customer's order", async () => {
    const order = await create();
    await prisma.rechargeOrder.update({
      where: { id: order.id },
      data: { dispatchState: "MAY_EXIST", status: "CONFIRMING" },
    });
    await expect(core.cancelUnsent(customerId, order.id)).rejects.toMatchObject(
      { code: "CANCELLATION_REQUIRES_VERIFICATION" },
    );
    await expect(core.cancelUnsent(otherId, order.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await core.findOwned(otherId, order.id)).toBeNull();
    expect(await wallet()).toMatchObject({
      reservedFundedPoints: 10,
      reservedLedgerSlots: 1,
    });
  });
  it.each([
    "recharge_orders",
    "recharge_notification_receipts",
    "point_changes",
    "recharge_credit_reservations",
  ])(
    "rolls back all credit when %s fails after point mutation",
    async (table) => {
      const order = await create(),
        identity = await receive(order);
      await control.query(
        "CREATE FUNCTION issue77_settlement_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected settlement failure'; END; $$",
      );
      const predicate =
        table === "recharge_orders"
          ? "NEW.status = 'SUCCESSFUL'"
          : table === "point_changes"
            ? "NEW.kind = 'RECHARGE'"
            : table === "recharge_credit_reservations"
              ? "NEW.state = 'CONSUMED'"
              : "NEW.processed_at IS NOT NULL";
      const event = table === "point_changes" ? "INSERT" : "UPDATE";
      await control.query(
        `CREATE TRIGGER issue77_settlement_failure BEFORE ${event} ON ${table} FOR EACH ROW WHEN (${predicate}) EXECUTE FUNCTION issue77_settlement_failure()`,
      );
      await expect(core.applyNotification(identity)).rejects.toThrow();
      expect(await wallet()).toMatchObject({
        fundedBalance: 0,
        revision: 0,
        reservedFundedPoints: 10,
        reservedLedgerSlots: 1,
      });
      expect(await prisma.pointChange.count()).toBe(0);
      expect(await core.findOwned(customerId, order.id)).toMatchObject({
        status: "PENDING_PAYMENT",
      });
      expect(await inbox.getReceipt(identity)).toMatchObject({
        processedAt: null,
        appliedRechargeOrderId: null,
      });
      await control.query(
        `DROP TRIGGER issue77_settlement_failure ON ${table}`,
      );
      expect((await core.applyNotification(identity)).kind).toBe("APPLIED");
    },
  );
  it("recovers committed success after discarded response and host replacement", async () => {
    const order = await create(),
      identity = await receive(order);
    await core.applyNotification(identity); // The caller discards the successful response.
    await app.close();
    await start();
    expect((await core.applyNotification(identity)).kind).toBe(
      "ALREADY_APPLIED",
    );
    expect(await prisma.pointChange.count()).toBe(1);
  });
  it("retains mismatched and unknown receipts for review while later valid work advances", async () => {
    const order = await create();
    const unknown = await receive({
      ...order,
      merchantOrderNo: "UNKNOWN_ORDER",
    });
    expect(await core.applyNotification(unknown)).toEqual({
      kind: "REVIEW_REQUIRED",
      reason: "UNKNOWN_ORDER",
    });
    const invalid = await receive(order, randomUUID(), {
      amount: {
        total: 200,
        currency: "CNY",
        payer_total: 200,
        payer_currency: "CNY",
      },
    });
    expect((await core.applyNotification(invalid)).kind).toBe(
      "REVIEW_REQUIRED",
    );
    expect(await core.findOwned(customerId, order.id)).toMatchObject({
      status: "CONFIRMING",
      reviewReason: "FACT_MISMATCH",
    });
    const valid = await create();
    await receive(valid, randomUUID(), { transaction_id: "420000_VALID" });
    const pending = await inbox.listPending(100);
    expect(pending).toHaveLength(1);
    expect((await core.applyNotification(pending[0]!)).kind).toBe("APPLIED");
    expect(await inbox.listReviewRequired(10)).toHaveLength(2);
  });
  it("rechecks a conflict committed after the worker's initial pending scan", async () => {
    const order = await create(),
      id = randomUUID(),
      identity = await receive(order, id);
    const pending = await inbox.listPending(1);
    expect(pending).toHaveLength(1);
    await receive(order, id, { transaction_id: "420000_CONFLICT" });
    expect(await core.applyNotification(identity)).toEqual({
      kind: "REVIEW_REQUIRED",
      reason: "RECEIPT_CONFLICT",
    });
    expect(await prisma.pointChange.count()).toBe(0);
  });
  it("one provider transaction cannot fund two accounts even under a race", async () => {
    const [a, b] = await Promise.all([
      create(),
      create(1, randomUUID(), otherId),
    ]);
    const identities = await Promise.all([receive(a), receive(b)]);
    const results = await Promise.all(
      identities.map((id) => core.applyNotification(id)),
    );
    expect(results.map((r) => r.kind).sort()).toEqual([
      "APPLIED",
      "REVIEW_REQUIRED",
    ]);
    expect(
      await prisma.pointChange.count({ where: { kind: "RECHARGE" } }),
    ).toBe(1);
    expect(
      (await prisma.pointAccount.findMany()).reduce(
        (sum, w) => sum + w.fundedBalance,
        0,
      ),
    ).toBe(10);
  });
  it("database checks reject drift, orphan success, rewritten facts and NULL legacy actor/key", async () => {
    await grant(1);
    const order = await create();
    await expect(
      control.query(
        "UPDATE point_accounts SET reserved_funded_points=0 WHERE account_id=$1",
        [customerId],
      ),
    ).rejects.toThrow("totals disagree");
    for (const field of ["actor_account_id", "idempotency_key"])
      await expect(
        control.query(
          `UPDATE point_changes SET ${field}=NULL WHERE kind='ADMIN_ADJUSTMENT'`,
        ),
      ).rejects.toThrow();
    await expect(
      control.query(
        "UPDATE recharge_orders SET status='SUCCESSFUL' WHERE id=$1",
        [order.id],
      ),
    ).rejects.toThrow();
    await expect(
      control.query("UPDATE recharge_orders SET amount_yuan=2 WHERE id=$1", [
        order.id,
      ]),
    ).rejects.toThrow("immutable");
    await core.applyNotification(await receive(order));
    const observation =
      await prisma.rechargePaymentObservation.findFirstOrThrow();
    for (const change of [
      { payerTotalFen: null },
      { tradeType: null },
      { notificationCreatedAt: null },
    ]) {
      await expect(
        prisma.rechargePaymentObservation.create({
          data: {
            ...observation,
            id: randomUUID(),
            notificationId: randomUUID(),
            ...change,
          },
        }),
      ).rejects.toThrow();
    }
    await expect(
      control.query("DELETE FROM point_changes WHERE kind='RECHARGE'"),
    ).rejects.toThrow("append-only");
    await expect(
      control.query(
        "UPDATE recharge_credit_reservations SET state='HELD',completed_at=NULL",
      ),
    ).rejects.toThrow("cannot be rewritten");
    await expect(
      control.query(
        "UPDATE recharge_payment_observations SET transaction_id='OTHER'",
      ),
    ).rejects.toThrow("append-only");
  });
});
