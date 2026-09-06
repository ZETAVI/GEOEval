import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { PointAccountService } from "../src/publishing-commerce/application/point-account.service.js";
import { PostgresPointAccountRepository } from "../src/publishing-commerce/infrastructure/postgres-point-account.repository.js";
import {
  adjustGranted,
  MAX_POINTS,
} from "../src/publishing-commerce/domain/point-account.js";
import { clearCustomerData } from "./customer-data.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loginWithDevelopmentChallenge } from "./identity-http-fixtures.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
describe("point account atomic adjustments and safe read models", () => {
  const prisma = new PrismaService(config.databaseUrl);
  let app: INestApplication,
    baseUrl: string,
    points: PointAccountService,
    repository: PostgresPointAccountRepository;
  let adminId: string,
    customerId: string,
    otherId: string,
    adminCookie: string,
    customerCookie: string,
    otherCookie: string,
    operationsCookie: string;
  beforeAll(async () => {
    await prisma.$connect();
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
    points = app.get(PointAccountService);
    repository = app.get(PostgresPointAccountRepository);
  });
  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await clearCustomerData(prisma);
    const rows = await Promise.all([
      prisma.account.create({
        data: { mobile: "+8613900006511", role: "ADMINISTRATOR" },
      }),
      prisma.account.create({
        data: { mobile: "+8613900006512", role: "TERMINAL_CUSTOMER" },
      }),
      prisma.account.create({
        data: { mobile: "+8613900006513", role: "TERMINAL_CUSTOMER" },
      }),
      prisma.account.create({
        data: { mobile: "+8613900006514", role: "OPERATIONS" },
      }),
    ]);
    [adminId, customerId, otherId] = rows.map((a) => a.id) as [
      string,
      string,
      string,
    ];
    const sessions = await Promise.all(
      rows.map((a) => loginWithDevelopmentChallenge(baseUrl, a.mobile)),
    );
    [adminCookie, customerCookie, otherCookie, operationsCookie] = sessions.map(
      (s) => s.cookie,
    ) as [string, string, string, string];
  });
  const input = (amount = 500) => ({
    amount,
    idempotencyKey: randomUUID(),
    reason: "测试赠送额度",
    internalNote: "仅管理员可见备注",
    businessReference: "内部关联单号",
  });
  function http(path: string, cookie?: string, method = "GET", body?: unknown) {
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...browserMutationHeaders(), ...(cookie ? { cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }
  function adjust(body: unknown, cookie = adminCookie, id = customerId) {
    return http(
      `/admin/points/accounts/${id}/adjustments`,
      cookie,
      "POST",
      body,
    );
  }

  it("returns zero without registering a wallet and exposes only each customer's own balance", async () => {
    expect(await (await http("/points", customerCookie)).json()).toEqual({
      balance: 0,
      revision: 0,
    });
    expect(
      await (await http("/points/changes", customerCookie)).json(),
    ).toEqual({ items: [], nextBeforeSequence: null });
    expect(await prisma.pointAccount.count()).toBe(0);
    await points.adjust(customerId, adminId, input(500));
    expect(
      await (await http(`/points?accountId=${customerId}`, otherCookie)).json(),
    ).toEqual({ balance: 0, revision: 0 });
    expect(await (await http("/points/changes", otherCookie)).json()).toEqual({
      items: [],
      nextBeforeSequence: null,
    });
  });

  it("records a normal HTTP grant and correction while keeping origin, actor and internal context private", async () => {
    const grant = await adjust(input(500));
    expect(grant.status).toBe(200);
    const recorded = await grant.json();
    expect(recorded).toMatchObject({
      accountId: customerId,
      actorAccountId: adminId,
      amount: 500,
      grantedDelta: 500,
      fundedDelta: 0,
      sequence: 1,
      balanceAfter: 500,
    });
    expect(
      (await adjust({ ...input(-120), reason: "更正赠送额度" })).status,
    ).toBe(200);
    const customer = await (
      await http("/points/changes", customerCookie)
    ).json();
    expect(
      customer.items.map((i: { sequence: number; amount: number }) => [
        i.sequence,
        i.amount,
      ]),
    ).toEqual([
      [2, -120],
      [1, 500],
    ]);
    expect(customer.items[0]).toMatchObject({
      balanceAfter: 380,
      reason: "更正赠送额度",
    });
    expect(Object.keys(customer.items[0]).sort()).toEqual(
      [
        "id",
        "sequence",
        "kind",
        "amount",
        "balanceAfter",
        "reason",
        "createdAt",
      ].sort(),
    );
    expect(JSON.stringify(customer)).not.toContain("仅管理员可见备注");
    expect(JSON.stringify(customer)).not.toContain(adminId);
    expect(await points.customerBalance(customerId)).toEqual({
      balance: 380,
      revision: 2,
    });
    const audit = await (
      await http(`/admin/points/accounts/${customerId}/changes`, adminCookie)
    ).json();
    expect(audit.items[0].internalNote).toBe("仅管理员可见备注");
  });

  it("rejects role misuse, ownership/origin overrides and invalid numeric requests before any ledger write", async () => {
    expect((await http("/points")).status).toBe(401);
    for (const cookie of [customerCookie, operationsCookie])
      expect((await adjust(input(), cookie)).status).toBe(403);
    expect((await http("/points", adminCookie)).status).toBe(403);
    expect((await adjust(input(), adminCookie, adminId)).status).toBe(404);
    for (const extra of [
      { actorAccountId: otherId },
      { accountId: otherId },
      { fundedDelta: 500 },
      { balance: 1000 },
    ])
      expect((await adjust({ ...input(), ...extra })).status).toBe(400);
    for (const amount of [0, 1.5, "500", true, MAX_POINTS + 1, -MAX_POINTS - 1])
      expect((await adjust({ ...input(), amount })).status).toBe(400);
    expect((await adjust(input(), adminCookie, "invalid-id")).status).toBe(400);
    expect(await prisma.pointAccount.count()).toBe(0);
    expect(await prisma.pointChange.count()).toBe(0);
  });

  it("concurrent same-key delivery and post-commit replay return one original result, not another credit", async () => {
    const request = input(500);
    const responses = await Promise.all(
      Array.from({ length: 4 }, () => adjust(request)),
    );
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    const rows = await Promise.all(responses.map((r) => r.json()));
    expect(new Set(rows.map((r) => r.id)).size).toBe(1);
    await points.adjust(customerId, adminId, input(-100));
    await prisma.account.update({
      where: { id: customerId },
      data: { status: "INACTIVE" },
    });
    const replay = await (await adjust(request)).json();
    expect(replay).toEqual(rows[0]);
    expect(await points.customerBalance(customerId)).toEqual({
      balance: 400,
      revision: 2,
    });
    expect(await prisma.pointChange.count()).toBe(2);
    expect((await adjust(input(10))).status).toBe(409);
  });

  it("rejects same-key changed amount, actor or reasons without another effect", async () => {
    const request = input();
    await points.adjust(customerId, adminId, request);
    for (const changed of [
      { amount: 600 },
      { reason: "不同的调整原因" },
      { internalNote: "另一个内部备注" },
    ]) {
      const response = await adjust({ ...request, ...changed });
      expect(response.status).toBe(409);
      expect((await response.json()).code).toBe("IDEMPOTENCY_CONFLICT");
    }
    await expect(points.adjust(customerId, otherId, request)).rejects.toThrow(
      "该请求标识已用于另一笔调整",
    );
    expect(await points.customerBalance(customerId)).toEqual({
      balance: 500,
      revision: 1,
    });
  });

  it("serializes different adjustments so concurrent negative requests cannot overdraw granted points", async () => {
    await points.adjust(customerId, adminId, input(100));
    const results = await Promise.all([adjust(input(-80)), adjust(input(-80))]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await points.customerBalance(customerId)).toEqual({
      balance: 20,
      revision: 2,
    });
    expect(() =>
      adjustGranted(
        { grantedBalance: 20, fundedBalance: 1000, revision: 2 },
        -30,
      ),
    ).toThrow("赠送积分不足");
    expect(
      adjustGranted(
        { grantedBalance: 20, fundedBalance: 1000, revision: 2 },
        -20,
      ),
    ).toEqual({ grantedBalance: 0, fundedBalance: 1000, revision: 3 });
  });

  it("rolls the wallet update back if ledger creation fails", async () => {
    await points.adjust(customerId, adminId, input(100));
    await expect(
      repository.adjust(customerId, randomUUID(), input(50), true),
    ).rejects.toThrow();
    expect(await points.customerBalance(customerId)).toEqual({
      balance: 100,
      revision: 1,
    });
    expect(await prisma.pointChange.count()).toBe(1);
    await expect(
      repository.adjust(otherId, randomUUID(), input(50), true),
    ).rejects.toThrow();
    expect(
      await prisma.pointAccount.findUnique({ where: { accountId: otherId } }),
    ).toBeNull();
  });

  it("enforces integer balance caps and preserves the original ledger", async () => {
    const first = await points.adjust(customerId, adminId, input(MAX_POINTS));
    const response = await adjust(input(1));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("POINT_LIMIT_EXCEEDED");
    expect(await points.customerBalance(customerId)).toEqual({
      balance: MAX_POINTS,
      revision: 1,
    });
    expect(
      await prisma.pointChange.findUniqueOrThrow({ where: { id: first.id } }),
    ).toMatchObject({ balanceAfter: MAX_POINTS, sequence: 1 });
    await expect(
      prisma.pointAccount.update({
        where: { accountId: customerId },
        data: { fundedBalance: 1 },
      }),
    ).rejects.toThrow();
  });

  it("paginates by immutable account sequence without leaking another account or duplicating new entries", async () => {
    for (let i = 0; i < 5; i++)
      await points.adjust(customerId, adminId, input(10));
    const first = await (
      await http("/points/changes?limit=2", customerCookie)
    ).json();
    expect(first.items.map((i: { sequence: number }) => i.sequence)).toEqual([
      5, 4,
    ]);
    await points.adjust(customerId, adminId, input(10));
    const second = await (
      await http(
        `/points/changes?limit=2&beforeSequence=${first.nextBeforeSequence}`,
        customerCookie,
      )
    ).json();
    expect(second.items.map((i: { sequence: number }) => i.sequence)).toEqual([
      3, 2,
    ]);
    const last = await (
      await http(
        `/points/changes?limit=2&beforeSequence=${second.nextBeforeSequence}`,
        customerCookie,
      )
    ).json();
    expect(last.items.map((i: { sequence: number }) => i.sequence)).toEqual([
      1,
    ]);
    expect(last.nextBeforeSequence).toBeNull();
    expect(
      (await http(`/points/changes?accountId=${otherId}`, customerCookie))
        .status,
    ).toBe(400);
    expect(
      (await http("/points/changes?limit=9999", customerCookie)).status,
    ).toBe(400);
  });

  it("documents explicit OpenAPI bodies and denies adjustment on an inactive target without registering a wallet", async () => {
    await prisma.account.update({
      where: { id: customerId },
      data: { status: "INACTIVE" },
    });
    expect((await adjust(input())).status).toBe(409);
    expect(await prisma.pointAccount.count()).toBe(0);
    const document = await (await fetch(`${baseUrl}/openapi-json`)).json();
    const operation =
      document.paths["/admin/points/accounts/{accountId}/adjustments"].post;
    expect(operation.requestBody).toBeDefined();
    expect(operation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "accountId",
          in: "path",
          required: true,
        }),
      ]),
    );
  });
});
