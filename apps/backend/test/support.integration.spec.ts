import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { PostgresSupportRepository } from "../src/support/infrastructure/postgres-support.repository.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import {
  loginWithDevelopmentChallenge,
  type HttpSessionFixture,
} from "./identity-http-fixtures.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { rechargeApiFixture } from "./recharge-api.fixture.js";
const config = loadIntegrationApiConfig();
describe("support API and PostgreSQL responsibility", () => {
  const db = new PrismaService(config.databaseUrl);
  let app: INestApplication, base: string, repo: PostgresSupportRepository;
  let customer: HttpSessionFixture,
    other: HttpSessionFixture,
    op: HttpSessionFixture,
    op2: HttpSessionFixture,
    admin: HttpSessionFixture,
    agent: HttpSessionFixture;
  const fixture = rechargeApiFixture();
  const input = () => ({
    subject: "使用咨询",
    message: "想了解服务进度",
    requestId: randomUUID(),
  });
  const headers = (s: HttpSessionFixture) => ({
    ...browserMutationHeaders(s.cookie),
    "x-geoeval-account": s.account.id,
  });
  const post = (path: string, body: unknown, s = customer) =>
    fetch(base + path, {
      method: "POST",
      headers: headers(s),
      body: JSON.stringify(body),
    });
  const get = (path: string, s = customer) =>
    fetch(base + path, {
      headers: { cookie: s.cookie, "x-geoeval-account": s.account.id },
    });
  async function create() {
    const res = await post("/support/tickets", input());
    expect(res.status).toBe(201);
    return (await res.json()) as { ticketId: string; revision: number };
  }
  const cmd = (
    id: string,
    action: string,
    revision: number,
    s = op,
    message = "问题已经说明",
    requestId = randomUUID(),
  ) =>
    post(
      `/support/tickets/${id}/actions`,
      {
        action,
        expectedRevision: revision,
        requestId,
        ...(action === "CLAIM" ? {} : { message }),
      },
      s,
    );
  beforeAll(async () => {
    await db.$connect();
    app = await createApiApp(config, false, fixture.configuration);
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
    repo = app.get(PostgresSupportRepository);
  });
  beforeEach(async () => {
    await clearCustomerData(db);
    const roles = [
      "TERMINAL_CUSTOMER",
      "TERMINAL_CUSTOMER",
      "OPERATIONS",
      "OPERATIONS",
      "ADMINISTRATOR",
      "AGENT",
    ] as const;
    const people: HttpSessionFixture[] = [];
    for (const [i, role] of roles.entries()) {
      const mobile = `1390000107${i}`;
      await db.account.create({ data: { mobile: `+86${mobile}`, role } });
      people.push(await loginWithDevelopmentChallenge(base, mobile));
    }
    [customer, other, op, op2, admin, agent] = people as [
      HttpSessionFixture,
      HttpSessionFixture,
      HttpSessionFixture,
      HttpSessionFixture,
      HttpSessionFixture,
      HttpSessionFixture,
    ];
  });
  afterAll(async () => {
    await app?.close();
    await clearCustomerData(db);
    await db.$disconnect();
  });
  it("requires login, customer creation, CSRF and matching browser identity", async () => {
    expect((await fetch(base + "/support/tickets")).status).toBe(401);
    for (const s of [op, admin, agent])
      expect((await post("/support/tickets", input(), s)).status).toBe(403);
    expect(
      (
        await fetch(base + "/support/tickets", {
          method: "POST",
          headers: {
            cookie: customer.cookie,
            "content-type": "application/json",
            "x-geoeval-account": customer.account.id,
          },
          body: JSON.stringify(input()),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(base + "/support/tickets", {
          headers: {
            cookie: customer.cookie,
            "x-geoeval-account": other.account.id,
          },
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await post("/support/tickets", {
          ...input(),
          customerAccountId: other.account.id,
        })
      ).status,
    ).toBe(400);
    expect((await get("/support/tickets", agent)).status).toBe(403);
    expect(await db.supportTicket.count()).toBe(0);
  });
  it("has one conversation and no financial change through create, claim, reply and resolve", async () => {
    const { ticketId: id } = await create();
    expect((await cmd(id, "CLAIM", 1)).status).toBe(201);
    expect((await cmd(id, "REPLY", 2, customer, "补充问题")).status).toBe(201);
    expect((await cmd(id, "REPLY", 3, op, "已电话沟通")).status).toBe(201);
    expect((await cmd(id, "RESOLVE", 4, op, "已说明服务范围")).status).toBe(
      201,
    );
    const response = await get(`/support/tickets/${id}`);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({
      status: "RESOLVED",
      revision: 5,
      events: [
        { action: "CREATE", author: "TERMINAL_CUSTOMER" },
        { action: "CLAIM", message: null },
        { message: "补充问题" },
        { message: "已电话沟通" },
        { action: "RESOLVE", message: "已说明服务范围" },
      ],
    });
    expect(await db.pointChange.count()).toBe(0);
    expect((await cmd(id, "REPLY", 5, customer)).status).toBe(409);
    expect((await cmd(id, "RESOLVE", 5)).status).toBe(409);
  });
  it("atomically recovers concurrent duplicate creation and rejects changed intent", async () => {
    const body = input();
    const responses = await Promise.all([
      post("/support/tickets", body),
      post("/support/tickets", body),
    ]);
    expect(responses.map((x) => x.status)).toEqual([201, 201]);
    const receipts = await Promise.all(responses.map((x) => x.json()));
    expect(receipts[0]).toEqual(receipts[1]);
    expect(await db.supportTicket.count()).toBe(1);
    expect(await db.supportEvent.count()).toBe(1);
    expect(
      (await post("/support/tickets", { ...body, message: "不同问题" })).status,
    ).toBe(409);
  });
  it("permits exactly one concurrent claimant and replays without extra events", async () => {
    const { ticketId: id } = await create();
    const responses = await Promise.all([
      cmd(id, "CLAIM", 1, op),
      cmd(id, "CLAIM", 1, op2),
    ]);
    expect(responses.map((x) => x.status).sort()).toEqual([201, 403]);
    const winner = responses[0].status === 201 ? op : op2;
    const key = randomUUID();
    const replies = await Promise.all([
      cmd(id, "REPLY", 2, winner, "同一次答复", key),
      cmd(id, "REPLY", 2, winner, "同一次答复", key),
    ]);
    expect(replies.map((x) => x.status)).toEqual([201, 201]);
    expect(await replies[0].json()).toEqual(await replies[1].json());
    expect(await db.supportEvent.count({ where: { ticketId: id } })).toBe(3);
    expect((await cmd(id, "REPLY", 2, winner, "改写旧请求", key)).status).toBe(
      409,
    );
  });
  it("shows only pool summaries before claim and rejects other customer/operator reads", async () => {
    const { ticketId: id } = await create();
    const pool = await (await get("/support/tickets?scope=pool", op)).json();
    expect(pool.items).toHaveLength(1);
    expect(pool.items[0]).not.toHaveProperty("events");
    expect(pool.items[0]).not.toHaveProperty("customerAccountId");
    expect((await get(`/support/tickets/${id}`, op)).status).toBe(404);
    expect((await get(`/support/tickets/${id}`, other)).status).toBe(404);
    expect((await get("/support/tickets?scope=all", op)).status).toBe(403);
    expect((await get("/support/tickets?scope=pool", customer)).status).toBe(
      403,
    );
    expect((await cmd(id, "CLAIM", 1)).status).toBe(201);
    expect((await get(`/support/tickets/${id}`, op2)).status).toBe(404);
    expect((await get(`/support/tickets/${id}`, admin)).status).toBe(200);
    expect((await cmd(id, "RESOLVE", 2, customer)).status).toBe(403);
  });
  it("admin release returns responsibility to pool, revokes old links and records reason", async () => {
    const { ticketId: id } = await create();
    const key = randomUUID();
    expect((await cmd(id, "CLAIM", 1, op, "", key)).status).toBe(201);
    expect((await cmd(id, "RELEASE", 2, op)).status).toBe(403);
    expect(
      (await cmd(id, "RELEASE", 2, admin, "原责任人休假，重新领取")).status,
    ).toBe(201);
    expect((await get(`/support/tickets/${id}`, op)).status).toBe(404);
    expect((await cmd(id, "CLAIM", 1, op, "", key)).status).toBe(404);
    expect((await cmd(id, "CLAIM", 3, op2)).status).toBe(201);
    const result = await (await get(`/support/tickets/${id}`, op2)).json();
    expect(result.events[2]).toMatchObject({
      author: "ADMINISTRATOR",
      action: "RELEASE",
      message: "原责任人休假，重新领取",
    });
  });
  it("checks inactive identities in the transaction, beyond the HTTP guard", async () => {
    const { ticketId: id } = await create();
    await db.account.update({
      where: { id: op.account.id },
      data: { status: "INACTIVE" },
    });
    await expect(
      repo.command(op.account.id, id, {
        action: "CLAIM",
        expectedRevision: 1,
        requestId: randomUUID(),
      }),
    ).rejects.toThrow("当前账号不能访问");
    expect((await get(`/support/tickets/${id}`, op)).status).toBe(401);
  });
  it("rejects stale resolution without appending a success reply", async () => {
    const { ticketId: id } = await create();
    await cmd(id, "CLAIM", 1);
    await cmd(id, "REPLY", 2, customer);
    expect((await cmd(id, "RESOLVE", 2)).status).toBe(409);
    const row = await db.supportTicket.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe("PROCESSING");
    expect(row.revision).toBe(3);
    expect(await db.supportEvent.count({ where: { ticketId: id } })).toBe(3);
  });
  it("rolls back ticket state when audit persistence fails and retries safely", async () => {
    const { ticketId: id } = await create();
    await cmd(id, "CLAIM", 1);
    await db.$executeRawUnsafe(
      `CREATE FUNCTION support_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='RESOLVE' THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER support_test_fail BEFORE INSERT ON support_events FOR EACH ROW EXECUTE FUNCTION support_test_fail()`,
    );
    const key = randomUUID();
    try {
      expect((await cmd(id, "RESOLVE", 2, op, "已协商完成", key)).status).toBe(
        500,
      );
    } finally {
      await db.$executeRawUnsafe(
        "DROP TRIGGER support_test_fail ON support_events",
      );
      await db.$executeRawUnsafe("DROP FUNCTION support_test_fail()");
    }
    expect(await db.supportTicket.findUnique({ where: { id } })).toMatchObject({
      revision: 2,
      status: "PROCESSING",
    });
    expect((await cmd(id, "RESOLVE", 2, op, "已协商完成", key)).status).toBe(
      201,
    );
    const event = await db.supportEvent.findFirstOrThrow({
      where: { ticketId: id },
    });
    await expect(
      db.supportEvent.update({
        where: { id: event.id },
        data: { message: "覆盖历史" },
      }),
    ).rejects.toThrow();
  });
  it("verifies copied recharge IDs without leaking another customer's order or modifying money", async () => {
    const rr = await post("/recharges", {
      amountYuan: 1,
      method: "WECHAT_NATIVE",
      idempotencyKey: randomUUID(),
    });
    expect(rr.status).toBe(200);
    const recharge = (await rr.json()).order;
    const wrong = await post(
      "/support/tickets",
      { ...input(), rechargeOrderId: recharge.id },
      other,
    );
    const missing = await post(
      "/support/tickets",
      { ...input(), rechargeOrderId: randomUUID() },
      other,
    );
    expect(wrong.status).toBe(404);
    expect(await wrong.json()).toEqual(await missing.json());
    const before = await db.rechargeOrder.findUniqueOrThrow({
      where: { id: recharge.id },
    });
    const response = await post("/support/tickets", {
      ...input(),
      rechargeOrderId: recharge.id,
    });
    expect(response.status).toBe(201);
    const id = (await response.json()).ticketId;
    expect(await (await get(`/support/tickets/${id}`)).json()).toMatchObject({
      kind: "RECHARGE",
      rechargeOrderId: recharge.id,
    });
    await cmd(id, "CLAIM", 1);
    await cmd(id, "RESOLVE", 2);
    expect(
      await db.rechargeOrder.findUnique({ where: { id: recharge.id } }),
    ).toEqual(before);
    expect(await db.pointChange.count()).toBe(0);
    await expect(
      db.supportTicket.create({
        data: {
          subject: "绕过引用归属",
          customerAccountId: other.account.id,
          rechargeOrderId: recharge.id,
        },
      }),
    ).rejects.toThrow();
  });
  it("rejects out-of-range database cursors as input errors", async () => {
    const { ticketId } = await create();
    expect((await get("/support/tickets?before=2147483648")).status).toBe(400);
    expect(
      (await get(`/support/tickets/${ticketId}?after=2147483648`)).status,
    ).toBe(400);
  });
  it("paginates lists and messages without changing responsibility or duplicating entries", async () => {
    const first = await create();
    await create();
    const page = await (await get("/support/tickets?limit=1")).json();
    expect(page.items).toHaveLength(1);
    expect(page.nextBefore).toBeTypeOf("number");
    const next = await (
      await get(`/support/tickets?limit=1&before=${page.nextBefore}`)
    ).json();
    expect(next.items[0].id).toBe(first.ticketId);
    expect(next.nextBefore).toBeNull();
    await cmd(first.ticketId, "CLAIM", 1);
    const messages = await (
      await get(`/support/tickets/${first.ticketId}?after=1`)
    ).json();
    expect(messages.events).toHaveLength(1);
    expect(messages.events[0].revision).toBe(2);
  });
});
