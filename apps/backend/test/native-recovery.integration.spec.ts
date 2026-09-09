import { randomUUID } from "node:crypto";
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
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { createNativeRecoveryRuntime } from "../src/recharge/native-recovery.runtime.js";
import { PostgresRechargeRepository } from "../src/recharge/infrastructure/postgres-recharge.repository.js";
import { PostgresNativeRecoveryRepository } from "../src/recharge/infrastructure/postgres-native-recovery.repository.js";
import { PrismaNotificationInbox } from "../src/recharge/infrastructure/prisma-notification-inbox.js";
import { WechatPayGateway } from "../src/recharge/infrastructure/wechat/wechat-pay.gateway.js";
import type { WechatHttpRequest } from "../src/recharge/infrastructure/wechat/wechat-https.js";
import type {
  NativeClaim,
  NativeRecoveryPolicy,
} from "../src/recharge/application/native-recovery.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { wechatFixture } from "./wechat-pay.fixture.js";

const config = loadIntegrationApiConfig(),
  f = wechatFixture();
const recharge = {
  merchantId: f.order.merchantId,
  appId: f.order.appId,
  minAmountYuan: 1,
  maxAmountYuan: 100,
  maxActiveOrders: 3,
  paymentWindowSeconds: 10_800,
};
const preparation = {
  description: "GEO 积分充值",
  notifyUrl: f.config().notifyUrl,
  createEnabled: true,
};
const policy: NativeRecoveryPolicy = {
  initiationEnabled: true,
  minimumDispatchWindowMs: 80_000,
  leaseMs: 30_000,
  queryIntervalMs: 5_000,
  retryDelayMs: 10_000,
  maxFailures: 3,
};

describe("durable Native recovery with PostgreSQL and authenticated controlled WeChat", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const core = new PostgresRechargeRepository(prisma, preparation);
  const repository = new PostgresNativeRecoveryRepository(prisma, core);
  const inbox = new PrismaNotificationInbox(prisma);
  let customer: string,
    other: string,
    now: Date,
    state: string,
    qr: string,
    transportFailure: boolean,
    requests: WechatHttpRequest[];
  const gateway = new WechatPayGateway(f.config(), async (req) => {
    requests.push(req);
    if (transportFailure) throw new Error("controlled disconnect");
    if (req.path.endsWith("/native")) return f.response({ code_url: qr });
    if (req.path.endsWith("/close")) {
      state = "CLOSED";
      return f.response({}, 204);
    }
    const no = decodeURIComponent(
      req.path.split("out-trade-no/")[1]!.split("?")[0]!,
    );
    if (state === "NOT_EXIST")
      return f.response({ code: "ORDER_NOT_EXIST" }, 404);
    return f.response(
      f.trade({
        out_trade_no: no,
        trade_state: state,
        transaction_id: no,
        success_time: "2026-09-08T10:00:00+08:00",
      }),
    );
  });
  const channel = {
    merchantId: recharge.merchantId,
    appId: recharge.appId,
    notifyUrl: preparation.notifyUrl,
    gateway,
  };
  const runtime = (
    overrides: Partial<NativeRecoveryPolicy> = {},
    createEnabled = true,
  ) =>
    createNativeRecoveryRuntime({
      prisma,
      recharge,
      preparation: { ...preparation, createEnabled },
      channel,
      recovery: { ...policy, ...overrides },
      clock: () => now,
    });
  const create = async (key = randomUUID()) => {
    const order = await runtime().create(customer, {
      amountYuan: 1,
      idempotencyKey: key,
      method: "WECHAT_NATIVE",
    });
    now = new Date(Math.max(now.getTime(), Date.now() + 1));
    return order;
  };
  const advance = (ms = policy.queryIntervalMs) => {
    now = new Date(now.getTime() + ms);
  };
  const stored = (id: string) =>
    prisma.rechargeOrder.findUniqueOrThrow({ where: { id } });
  const wallet = () =>
    prisma.pointAccount.findUniqueOrThrow({ where: { accountId: customer } });
  const claim = async (id: string): Promise<NativeClaim> => {
    const result = await repository.claim(id, channel, policy, now);
    expect(result).not.toBeNull();
    return result!;
  };
  beforeAll(() => prisma.$connect());
  beforeEach(async () => {
    await clearCustomerData(prisma);
    customer = (
      await prisma.account.create({
        data: { mobile: "+8613900007721", role: "TERMINAL_CUSTOMER" },
      })
    ).id;
    other = (
      await prisma.account.create({
        data: { mobile: "+8613900007722", role: "TERMINAL_CUSTOMER" },
      })
    ).id;
    now = new Date();
    state = "NOTPAY";
    qr = "weixin://wxpay/bizpayurl/up?pr=NATIVE77";
    requests = [];
    transportFailure = false;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await clearCustomerData(prisma);
  });
  afterAll(() => prisma.$disconnect());

  it("rejects a payment window too short for its explicit dispatch budget", () => {
    expect(() =>
      createNativeRecoveryRuntime({
        prisma,
        recharge: { ...recharge, paymentWindowSeconds: 60 },
        preparation,
        channel,
        recovery: policy,
      }),
    ).toThrow("NATIVE_DISPATCH_WINDOW");
  });

  it("commits order, frozen request, reservation and due work together; replays while creation is disabled", async () => {
    const o = await create();
    expect(requests).toHaveLength(0);
    expect(await stored(o.id)).toMatchObject({
      nativeDescription: preparation.description,
      nativeNotifyUrl: preparation.notifyUrl,
      nativeNextOperation: "INITIATE",
      dispatchState: "UNSENT",
    });
    expect((await wallet()).reservedFundedPoints).toBe(10);
    expect(
      await runtime({}, false).create(customer, {
        amountYuan: 1,
        idempotencyKey: o.idempotencyKey,
        method: "WECHAT_NATIVE",
      }),
    ).toEqual(o);
    await expect(
      runtime({}, false).create(customer, {
        amountYuan: 1,
        idempotencyKey: randomUUID(),
        method: "WECHAT_NATIVE",
      }),
    ).rejects.toMatchObject({ code: "CREATION_DISABLED" });
    expect(await prisma.rechargeOrder.count()).toBe(1);
  });

  it("claims once across concurrent workers and retains the frozen wire request", async () => {
    const o = await create();
    const result = await Promise.all([
      runtime().runOrders(5),
      runtime().runOrders(5),
    ]);
    expect(result.reduce((n, r) => n + r.claimed, 0)).toBe(1);
    expect(requests).toHaveLength(1);
    expect(JSON.parse(requests[0]!.body.toString())).toMatchObject({
      out_trade_no: o.merchantOrderNo,
      description: preparation.description,
      notify_url: preparation.notifyUrl,
      amount: { total: 100, currency: "CNY" },
      time_expire: o.expiresAt,
    });
    expect((await runtime().read(customer, o.id))?.qr?.value).toBe(qr);
  });

  it("recovers an uncommitted initiate response by querying the same order after the lease", async () => {
    const o = await create(),
      lost = await claim(o.id);
    expect(lost.kind).toBe("INITIATE");
    // Simulate the external call completing while the process dies before committing its result.
    await gateway.initiate(lost.order, {
      description: lost.description!,
      expiresAt: lost.paymentExpiresAt,
    });
    advance(policy.leaseMs);
    await runtime().runOrders(5);
    expect(requests.map((r) => r.method)).toEqual(["POST", "GET"]);
    expect(requests[1]!.path).toContain(o.merchantOrderNo);
    expect(await stored(o.id)).toMatchObject({
      dispatchState: "MAY_EXIST",
      nativeNextOperation: "INITIATE",
    });
    expect((await wallet()).reservedFundedPoints).toBe(10);
  });

  it("locally cancels only an unsent order and enforces customer ownership", async () => {
    const o = await create();
    expect(await runtime().read(other, o.id)).toBeNull();
    await expect(runtime().cancel(other, o.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(runtime().verify(other, o.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await runtime().cancel(customer, o.id))?.order.status).toBe(
      "CLOSED",
    );
    await runtime().runOrders(5);
    expect(requests).toHaveLength(0);
    expect((await wallet()).reservedFundedPoints).toBe(0);
  });

  it("does not release on ORDER_NOT_EXIST after cancellation, and fences a late QR", async () => {
    const o = await create(),
      old = await claim(o.id);
    await runtime().cancel(customer, o.id);
    state = "NOT_EXIST";
    await runtime().runOrders(5);
    await repository.complete(
      old,
      {
        kind: "INITIATE",
        response: await gateway.initiate(old.order, {
          description: old.description!,
          expiresAt: old.paymentExpiresAt,
        }),
      },
      policy,
      now,
    );
    expect((await runtime().read(customer, o.id))?.qr).toBeNull();
    expect((await stored(o.id)).status).toBe("CONFIRMING");
    expect((await wallet()).reservedFundedPoints).toBe(10);
    state = "SUCCESS";
    advance(policy.retryDelayMs);
    await runtime().runOrders(5);
    expect((await stored(o.id)).status).toBe("CONFIRMING");
    expect(await runtime().runSettlements(5)).toMatchObject({
      applied: 1,
      failed: 0,
    });
    expect((await wallet()).fundedBalance).toBe(10);
    expect(
      await prisma.pointChange.count({ where: { kind: "RECHARGE" } }),
    ).toBe(1);
  });

  it("requires a signed close result before releasing a dispatched reservation", async () => {
    const o = await create();
    await runtime().runOrders(5);
    await runtime().cancel(customer, o.id);
    await runtime().runOrders(5);
    expect((await stored(o.id)).nativeNextOperation).toBe("CLOSE");
    expect((await wallet()).reservedFundedPoints).toBe(10);
    await runtime().runOrders(5);
    const row = await stored(o.id);
    expect(row.status).toBe("CLOSED");
    expect(
      (
        await prisma.rechargeOperationAttempt.findUniqueOrThrow({
          where: { id: row.nativeCloseAttemptId! },
        })
      ).resultKind,
    ).toBe("CLOSED");
    expect((await wallet()).reservedFundedPoints).toBe(0);
    expect(requests.filter((r) => r.path.endsWith("/close"))).toHaveLength(1);
  });

  it("recovers when provider close succeeds but local result transaction fails", async () => {
    const o = await create();
    await runtime().runOrders(5);
    await runtime().cancel(customer, o.id);
    await runtime().runOrders(5);
    const closing = await claim(o.id),
      response = await gateway.close(closing.order);
    const update = vi
      .spyOn(prisma, "$transaction")
      .mockRejectedValueOnce(new Error("controlled database outage"));
    await expect(
      repository.complete(closing, { kind: "CLOSE", response }, policy, now),
    ).rejects.toThrow("controlled database outage");
    update.mockRestore();
    expect((await wallet()).reservedFundedPoints).toBe(10);
    advance(policy.leaseMs);
    await runtime().runOrders(5);
    expect((await stored(o.id)).status).toBe("CLOSED");
    expect((await wallet()).reservedFundedPoints).toBe(0);
    expect(requests.at(-1)?.method).toBe("GET");
  });

  it("replays persisted SUCCESS after restart and after the settlement marker commit is lost", async () => {
    const o = await create();
    await runtime().runOrders(5);
    state = "SUCCESS";
    advance();
    await runtime().runOrders(5);
    expect((await wallet()).fundedBalance).toBe(0);
    const item = (await repository.dueSettlements(now, 5))[0]!;
    expect(item.kind).toBe("QUERY");
    if (item.kind !== "QUERY") throw new Error("fixture");
    const marker = vi
      .spyOn(prisma.rechargeOperationAttempt, "updateMany")
      .mockRejectedValueOnce(new Error("marker lost"));
    await expect(repository.settleQuery(item.attemptId)).rejects.toThrow(
      "marker lost",
    );
    marker.mockRestore();
    expect((await wallet()).fundedBalance).toBe(10);
    expect(await runtime().runSettlements(5)).toMatchObject({
      applied: 1,
      failed: 0,
    });
    expect(
      await prisma.pointChange.count({ where: { kind: "RECHARGE" } }),
    ).toBe(1);
    expect(
      (
        await prisma.rechargeOperationAttempt.findUniqueOrThrow({
          where: { id: item.attemptId },
        })
      ).processingState,
    ).toBe("APPLIED");
  });

  it("settles a callback and a persisted query concurrently with one ledger effect", async () => {
    const o = await create();
    await runtime().runOrders(5);
    state = "SUCCESS";
    advance();
    await runtime().runOrders(5);
    const verified = gateway.verifyNotification(
      f.notification({
        trade: {
          out_trade_no: o.merchantOrderNo,
          transaction_id: o.merchantOrderNo,
        },
      }),
    );
    if (!verified.ok) throw new Error("fixture verification");
    await inbox.accept(verified.value);
    const results = await Promise.all([
      runtime().runSettlements(10),
      runtime().runSettlements(10),
    ]);
    expect(results.every((r) => r.failed === 0)).toBe(true);
    expect((await wallet()).fundedBalance).toBe(10);
    expect(
      await prisma.pointChange.count({ where: { kind: "RECHARGE" } }),
    ).toBe(1);
    expect(await repository.dueSettlements(now, 10)).toEqual([]);
  });

  it("keeps the original two-hour bound when WeChat repeats the same QR URI", async () => {
    const o = await create();
    await runtime().runOrders(5);
    const first = (await runtime().read(customer, o.id))!.qr!.expiresAt;
    advance(2 * 60 * 60 * 1000 + 1);
    await runtime().runOrders(5);
    await runtime().runOrders(5);
    expect((await stored(o.id)).nativeQrExpiresAt?.toISOString()).toBe(first);
    expect((await stored(o.id)).nativeReviewReason).toBe("QR_REFRESH_UNPROVEN");
    advance();
    await runtime().runOrders(5);
    expect((await stored(o.id)).nativeNextOperation).toBe("QUERY");
    expect((await runtime().read(customer, o.id))!.qr).toBeNull();
  });

  it("retains reservations on unexpected trade states and bounded transport retries", async () => {
    const o = await create();
    await runtime().runOrders(5);
    state = "REFUND";
    advance();
    await runtime().runOrders(5);
    expect((await stored(o.id)).nativeReviewReason).toBe(
      "UNEXPECTED_TRADE_STATE",
    );
    expect((await wallet()).reservedFundedPoints).toBe(10);
    const second = await create();
    transportFailure = true;
    for (let i = 0; i < 3; i++) {
      await runtime().runOrders(5);
      advance(policy.retryDelayMs);
    }
    expect((await stored(second.id)).nativeReviewReason).toBe(
      "RETRY_EXHAUSTED",
    );
    expect((await wallet()).reservedFundedPoints).toBe(20);
    expect(await runtime().runOrders(5)).toMatchObject({ claimed: 0 });
  });

  it("disabling initiation still allows old obligations to query and settle", async () => {
    const o = await create();
    await runtime().runOrders(5);
    state = "SUCCESS";
    advance();
    await runtime({ initiationEnabled: false }, false).runOrders(5);
    await runtime({ initiationEnabled: false }, false).runSettlements(5);
    expect((await stored(o.id)).status).toBe("SUCCESSFUL");
    const second = await create();
    await runtime({ initiationEnabled: false }).runOrders(5);
    expect((await stored(second.id)).dispatchState).toBe("UNSENT");
  });

  it("rejects unauthenticated closure and rewrites of stored request/result facts at the database boundary", async () => {
    const o = await create();
    await runtime().runOrders(5);
    await expect(
      prisma.rechargeOrder.update({
        where: { id: o.id },
        data: { status: "CLOSED", closedAt: now },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.rechargeOrder.update({
        where: { id: o.id },
        data: { nativeDescription: "changed" },
      }),
    ).rejects.toThrow();
    // A direct insert is also a new terminal fact, not grandfathered historical data.
    await expect(
      prisma.$transaction(async (tx) => {
        const id = randomUUID();
        await tx.rechargeOrder.create({
          data: {
            id,
            accountId: customer,
            idempotencyKey: randomUUID(),
            amountYuan: 1,
            amountFen: 100n,
            fundedPoints: 10,
            provider: "WECHAT",
            merchantId: recharge.merchantId,
            appId: recharge.appId,
            merchantOrderNo: id.replaceAll("-", ""),
            method: "WECHAT_NATIVE",
            currency: "CNY",
            status: "CLOSED",
            dispatchState: "MAY_EXIST",
            expiresAt: new Date(o.expiresAt),
            closedAt: now,
          },
        });
        await tx.rechargeCreditReservation.create({
          data: {
            rechargeOrderId: id,
            accountId: customer,
            points: 10,
            state: "RELEASED",
            completedAt: now,
          },
        });
      }),
    ).rejects.toThrow();
    const a = await prisma.rechargeOperationAttempt.findFirstOrThrow({
      where: { orderId: o.id },
    });
    await expect(
      prisma.rechargeOperationAttempt.update({
        where: { id: a.id },
        data: { resultSha256: "f".repeat(64) },
      }),
    ).rejects.toThrow();
    expect((await wallet()).reservedFundedPoints).toBe(10);
  });

  it("recovers persisted payment work with a new database connection and runtime", async () => {
    const o = await create();
    await runtime().runOrders(5);
    state = "SUCCESS";
    advance();
    await runtime().runOrders(5);
    const fresh = new PrismaService(config.databaseUrl);
    try {
      const restarted = createNativeRecoveryRuntime({
        prisma: fresh,
        recharge,
        preparation,
        channel,
        recovery: policy,
        clock: () => now,
      });
      expect(await restarted.runSettlements(5)).toMatchObject({
        applied: 1,
        failed: 0,
      });
      expect((await stored(o.id)).status).toBe("SUCCESSFUL");
      expect((await wallet()).fundedBalance).toBe(10);
    } finally {
      await fresh.$disconnect();
    }
  });

  it("rolls back the observation and attempt together if the final order update fails", async () => {
    const o = await create();
    await runtime().runOrders(5);
    state = "SUCCESS";
    advance();
    const work = await claim(o.id),
      response = await gateway.query(work.order);
    await prisma.$executeRawUnsafe(
      "CREATE FUNCTION issue77_native_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='CONFIRMING' THEN RAISE EXCEPTION 'controlled result commit failure'; END IF; RETURN NEW; END; $$",
    );
    await prisma.$executeRawUnsafe(
      "CREATE TRIGGER issue77_native_fail BEFORE UPDATE ON recharge_orders FOR EACH ROW EXECUTE FUNCTION issue77_native_fail()",
    );
    try {
      await expect(
        repository.complete(work, { kind: "QUERY", response }, policy, now),
      ).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe(
        "DROP TRIGGER issue77_native_fail ON recharge_orders",
      );
      await prisma.$executeRawUnsafe("DROP FUNCTION issue77_native_fail()");
    }
    expect(await prisma.rechargePaymentObservation.count()).toBe(0);
    expect(
      (
        await prisma.rechargeOperationAttempt.findUniqueOrThrow({
          where: { id: work.id },
        })
      ).finishedAt,
    ).toBeNull();
    expect((await wallet()).reservedFundedPoints).toBe(10);
    advance(policy.leaseMs);
    await runtime().runOrders(5);
    await runtime().runSettlements(5);
    expect((await stored(o.id)).status).toBe("SUCCESSFUL");
  });

  it("retains a stale SUCCESS across cancellation generation changes", async () => {
    const o = await create();
    await runtime().runOrders(5);
    advance();
    const old = await claim(o.id);
    state = "SUCCESS";
    const response = await gateway.query(old.order);
    await runtime().cancel(customer, o.id);
    await repository.complete(old, { kind: "QUERY", response }, policy, now);
    await runtime().runSettlements(5);
    expect((await stored(o.id)).status).toBe("SUCCESSFUL");
    expect((await wallet()).fundedBalance).toBe(10);
  });

  it("treats payment expiry as a trigger for query/close, not evidence of remote closure", async () => {
    const o = await create();
    await runtime().runOrders(5);
    now = new Date(new Date(o.expiresAt).getTime() + 1);
    await runtime().runOrders(5);
    expect((await stored(o.id)).status).toBe("CONFIRMING");
    expect((await stored(o.id)).nativeNextOperation).toBe("CLOSE");
    expect((await wallet()).reservedFundedPoints).toBe(10);
    await runtime().runOrders(5);
    expect((await stored(o.id)).status).toBe("CLOSED");
  });

  it("does not let a deferred receipt starve a later valid query at batch size one", async () => {
    const o = await create();
    await runtime().runOrders(5);
    const verified = gateway.verifyNotification(
      f.notification({ envelope: { id: "EV_UNKNOWN77" } }),
    );
    if (!verified.ok) throw new Error("fixture");
    await inbox.accept(verified.value);
    state = "SUCCESS";
    advance();
    await runtime().runOrders(5);
    const first = (await repository.dueSettlements(now, 1))[0]!;
    expect(first.kind).toBe("NOTIFICATION");
    await repository.deferSettlement(first, new Date(now.getTime() + 10_000));
    expect(await runtime().runSettlements(1)).toMatchObject({ applied: 1 });
    expect((await stored(o.id)).status).toBe("SUCCESSFUL");
  });

  it("defers a failed claim so it cannot occupy every size-one recovery batch", async () => {
    const first = await create(),
      second = await create();
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(
      new Error("controlled account lock timeout"),
    );
    expect(await runtime().runOrders(1)).toMatchObject({
      failed: 1,
      claimed: 0,
    });
    expect(
      (await stored(first.id)).nativeNextActionAt!.getTime(),
    ).toBeGreaterThan(now.getTime());
    expect(await runtime().runOrders(1)).toMatchObject({
      failed: 0,
      claimed: 1,
    });
    expect((await stored(second.id)).dispatchState).toBe("MAY_EXIST");
  });

  it("pauses authentication failures without releasing the uncertain reservation", async () => {
    const o = await create(),
      work = await claim(o.id);
    await repository.complete(
      work,
      {
        kind: "INITIATE",
        response: {
          ok: false,
          error: { kind: "UNRESOLVED", code: "AUTH_SIGNATURE" },
        },
      },
      policy,
      now,
    );
    expect((await stored(o.id)).nativeReviewReason).toBe("RESPONSE_REJECTED");
    expect((await wallet()).reservedFundedPoints).toBe(10);
    expect(await runtime().runOrders(5)).toMatchObject({ claimed: 0 });
  });

  it("preserves the reservation on channel drift instead of dispatching changed merchant parameters", async () => {
    const o = await create();
    expect(
      await repository.claim(
        o.id,
        { ...channel, notifyUrl: "https://changed.example.invalid/notify" },
        policy,
        now,
      ),
    ).toBeNull();
    expect((await stored(o.id)).dispatchState).toBe("UNSENT");
    expect((await stored(o.id)).nativeReviewReason).toBe("CHANNEL_MISMATCH");
    expect((await wallet()).reservedFundedPoints).toBe(10);
  });
});
