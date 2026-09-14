import { AuthenticationService } from "../src/identity/application/authentication.service.js";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { AgencyCustomerService } from "../src/agency/application/customer-service.js";
import { PostgresCustomerServiceRepository } from "../src/agency/infrastructure/postgres-customer-service.repository.js";
import { PostgresAcquisitionRepository } from "../src/agency/infrastructure/postgres-acquisition.repository.js";
import { AgencyCustomerIdentityReader } from "../src/identity/infrastructure/agency-customer-identity-access.js";
import { BrandService } from "../src/brand/application/brand.service.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loginWithDevelopmentChallenge as login } from "./identity-http-fixtures.js";
import { agencyReportFixture } from "./agency-report.fixture.js";
const config = {
  ...loadIntegrationApiConfig(),
  agencyAcquisitionEnabled: true,
  geoOptimizationWriterMode: "deterministic" as const,
};

describe("current agency customer service and atomic transfer", () => {
  const db = new PrismaService(config.databaseUrl);
  let app: INestApplication,
    url: string,
    repo: PostgresCustomerServiceRepository,
    service: AgencyCustomerService;
  let admin: string, a: string, b: string, c: string;
  beforeAll(async () => {
    await db.$connect();
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    url = await app.getUrl();
    repo = app.get(PostgresCustomerServiceRepository);
    service = app.get(AgencyCustomerService);
  });
  afterAll(async () => {
    await clearCustomerData(db);
    await app.close();
    await db.$disconnect();
  });
  afterEach(() => vi.restoreAllMocks());
  beforeEach(async () => {
    await clearCustomerData(db);
    admin = (
      await db.account.create({
        data: { mobile: "+8613900010201", role: "ADMINISTRATOR" },
      })
    ).id;
    a = (
      await db.account.create({
        data: { mobile: "+8613900010202", role: "AGENT" },
      })
    ).id;
    b = (
      await db.account.create({
        data: { mobile: "+8613900010203", role: "AGENT" },
      })
    ).id;
    c = (await db.account.create({ data: { mobile: "+8613900010204" } })).id;
  });
  const transfer = (
    agentAccountId: string | null,
    expectedRevision: number,
    extra = {},
  ) => ({
    agentAccountId,
    expectedRevision,
    reason: "服务交接",
    requestId: randomUUID(),
    ...extra,
  });
  it("serializes a previously public customer's competing assignments", async () => {
    const otherAdmin = (
      await db.account.create({
        data: { mobile: "+8613900010210", role: "ADMINISTRATOR" },
      })
    ).id;
    const results = await Promise.allSettled([
      repo.transfer(admin, c, transfer(a, 0)),
      repo.transfer(otherAdmin, c, transfer(b, 0)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.agencyCustomerAttribution.count()).toBe(1);
    expect(await db.agencyAudit.count({ where: { action: "REASSIGN" } })).toBe(
      1,
    );
    expect(
      (
        await db.agencyCustomerAttribution.findUniqueOrThrow({
          where: { accountId: c },
        })
      ).entryKey,
    ).toBeNull();
  });
  it("recovers an old successful request without overwriting later migration or duplicating audit", async () => {
    const request = transfer(a, 0);
    const first = await repo.transfer(admin, c, request);
    await repo.transfer(admin, c, transfer(b, 1));
    expect(await repo.transfer(admin, c, request)).toMatchObject({
      ...first,
      outcome: "REPLAYED",
    });
    expect((await repo.adminState(admin, c)).agentAccountId).toBe(b);
    expect((await service.adminState(admin, c)).events[0]).toMatchObject({
      actorMobile: "+8613900010201",
      beforeAgentMobile: "+8613900010202",
      agentMobile: "+8613900010203",
    });
    expect(await db.agencyAudit.count({ where: { action: "REASSIGN" } })).toBe(
      2,
    );
    await expect(
      repo.transfer(admin, c, { ...request, reason: "changed" }),
    ).rejects.toThrow("不同");
    await expect(repo.transfer(admin, c, transfer(a, 0))).rejects.toThrow(
      "已变化",
    );
    expect((await repo.transfer(admin, c, transfer(b, 2))).outcome).toBe(
      "UNCHANGED",
    );
  });
  it("preserves acquisition evidence and stable share link through A to B to public", async () => {
    const entry = app.get(PostgresAcquisitionRepository);
    const key = (await entry.issueLink(admin, a)).entryKey;
    await db.agencyCustomerAttribution.create({
      data: { accountId: c, agentAccountId: a, entryKey: key },
    });
    const before = await db.account.findUnique({ where: { id: c } });
    await repo.transfer(admin, c, transfer(b, 1));
    await repo.transfer(admin, c, transfer(null, 2));
    expect(
      await db.agencyCustomerAttribution.findUnique({
        where: { accountId: c },
      }),
    ).toMatchObject({ agentAccountId: null, entryKey: key, revision: 3 });
    expect(await db.account.findUnique({ where: { id: c } })).toEqual(before);
    expect(await entry.issueLink(admin, a)).toEqual({ entryKey: key });
    await expect(service.detail(a, c)).rejects.toThrow("不可访问");
    await expect(service.detail(b, c)).rejects.toThrow("不可访问");
  });
  it("does not let the stable acquisition link reclaim migrated customers and still acquires new customers", async () => {
    const entry = app.get(PostgresAcquisitionRepository),
      auth = app.get(AuthenticationService);
    const key = (await entry.issueLink(admin, a)).entryKey;
    await repo.transfer(admin, c, transfer(b, 0));
    const visit = await entry.resolve({ entryKey: key });
    for (const mobile of ["13900010204", "13900010209"]) {
      const ch = await auth.requestChallenge(mobile, visit.visitToken!);
      await auth.completeChallenge({
        mobile,
        challengeId: ch.challengeId,
        code: ch.developmentCode!,
      });
    }
    expect((await repo.adminState(admin, c)).agentAccountId).toBe(b);
    const fresh = await db.account.findUniqueOrThrow({
      where: { mobile: "+8613900010209" },
    });
    expect((await repo.adminState(admin, fresh.id)).agentAccountId).toBe(a);
  });
  it("rejects invalid targets and a disabled agent, without changing the customer", async () => {
    await expect(repo.transfer(admin, c, transfer(c, 0))).rejects.toThrow(
      "不可用",
    );
    await db.account.update({ where: { id: a }, data: { status: "INACTIVE" } });
    await expect(repo.transfer(admin, c, transfer(a, 0))).rejects.toThrow(
      "不可用",
    );
    await expect(service.list(a)).rejects.toThrow("不可访问");
    expect(await db.agencyCustomerAttribution.count()).toBe(0);
  });
  it("rolls back relationship creation when audit persistence fails", async () => {
    await db.$executeRawUnsafe(
      `CREATE FUNCTION agency_test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='REASSIGN' THEN RAISE EXCEPTION 'controlled audit failure'; END IF; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      "CREATE TRIGGER agency_test_fail BEFORE INSERT ON agency_audits FOR EACH ROW EXECUTE FUNCTION agency_test_fail_audit()",
    );
    try {
      await expect(repo.transfer(admin, c, transfer(a, 0))).rejects.toThrow();
      expect(await db.agencyCustomerAttribution.count()).toBe(0);
      expect(await db.agencyAudit.count()).toBe(0);
    } finally {
      await db.$executeRawUnsafe(
        "DROP TRIGGER agency_test_fail ON agency_audits",
      );
      await db.$executeRawUnsafe("DROP FUNCTION agency_test_fail_audit()");
    }
  });
  it("rejects former-agent detail if migration occurs during the owner read", async () => {
    await repo.transfer(admin, c, transfer(a, 0));
    const brands = app.get(BrandService);
    const original = brands.list.bind(brands);
    let entered!: () => void, release!: () => void;
    const atRead = new Promise<void>((r) => (entered = r)),
      barrier = new Promise<void>((r) => (release = r));
    vi.spyOn(brands, "list").mockImplementationOnce(async (id) => {
      entered();
      await barrier;
      return original(id);
    });
    const read = service.detail(a, c);
    const checked = expect(read).rejects.toThrow("不可访问");
    await atRead;
    await repo.transfer(admin, c, transfer(b, 1));
    release();
    await checked;
    expect((await service.detail(b, c)).customer.mobile).toBe("+8613900010204");
  });
  it("filters a migrated customer out of an in-flight contact list", async () => {
    await repo.transfer(admin, c, transfer(a, 0));
    const identity = app.get(AgencyCustomerIdentityReader);
    const original = identity.customers.bind(identity);
    let entered!: () => void, release!: () => void;
    const atRead = new Promise<void>((r) => (entered = r)),
      barrier = new Promise<void>((r) => (release = r));
    vi.spyOn(identity, "customers").mockImplementationOnce(async (ids) => {
      const data = await original(ids);
      entered();
      await barrier;
      return data;
    });
    const read = service.list(a);
    await atRead;
    await repo.transfer(admin, c, transfer(b, 1));
    release();
    expect((await read).items).toEqual([]);
  });
  it("limits pageable contacts to the current agent and hides disabled customers", async () => {
    const ids = [];
    for (let i = 0; i < 22; i++) {
      const row = await db.account.create({
        data: { mobile: `+861390002${String(i).padStart(4, "0")}` },
      });
      ids.push(row.id);
      await db.agencyCustomerAttribution.create({
        data: { accountId: row.id, agentAccountId: a },
      });
    }
    const first = await service.list(a);
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).not.toBeNull();
    const second = await service.list(a, first.nextCursor!);
    expect(second.items).toHaveLength(2);
    expect(
      new Set([...first.items, ...second.items].map((x) => x.id)).size,
    ).toBe(22);
    expect((await service.list(b, first.nextCursor!)).items).toEqual([]);
    await db.account.update({
      where: { id: ids[0]! },
      data: { status: "INACTIVE" },
    });
    await expect(service.detail(a, ids[0]!)).rejects.toThrow("不可访问");
  });
  it("enforces HTTP roles, revoked old URLs, full contacts and existing customer write restrictions", async () => {
    const sa = await login(url, "13900010202"),
      sb = await login(url, "13900010203"),
      sc = await login(url, "13900010204"),
      sm = await login(url, "13900010201");
    const path = `/agency/admin/customers/${c}/reassign`;
    for (const cookie of [sa.cookie, sc.cookie])
      expect(
        (
          await fetch(url + path, {
            method: "POST",
            headers: { ...browserMutationHeaders(), cookie },
            body: JSON.stringify(transfer(a, 0)),
          })
        ).status,
      ).toBe(403);
    expect(
      (
        await fetch(url + path, {
          method: "POST",
          headers: { ...browserMutationHeaders(), cookie: sm.cookie },
          body: JSON.stringify(transfer(a, 0)),
        })
      ).status,
    ).toBe(201);
    const brand = await app.get(BrandService).create(c, {
      companyName: "小林咖啡",
      contactName: "小林",
      contactMobile: "+8613800010204",
    });
    const old = `${url}/agency/customers/${c}/brands`;
    const response = await fetch(old, { headers: { cookie: sa.cookie } });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const data = await response.json();
    expect(data.customer.mobile).toBe("+8613900010204");
    expect(data.brands[0]).toMatchObject({
      contactName: "小林",
      contactMobile: "+8613800010204",
    });
    expect(JSON.stringify(data)).not.toMatch(
      /evaluationFingerprint|writingContextFingerprint|activeSessionCount|fundedBalance/,
    );
    await repo.transfer(admin, c, transfer(b, 1));
    for (const suffix of [
      "",
      `/${brand.id}/report`,
      `/${brand.id}/reports`,
      `/${brand.id}/reports/${randomUUID()}`,
    ])
      expect(
        (await fetch(old + suffix, { headers: { cookie: sa.cookie } })).status,
      ).toBe(404);
    expect((await fetch(old, { headers: { cookie: sb.cookie } })).status).toBe(
      200,
    );
    expect(
      (
        await fetch(`${url}/brands/${brand.id}`, {
          method: "PATCH",
          headers: { ...browserMutationHeaders(), cookie: sb.cookie },
          body: JSON.stringify({ companyName: "forged" }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(`${url}/agency/customers/${a}/brands`, {
          headers: { cookie: sb.cookie },
        })
      ).status,
    ).toBe(404);
  });
  it("hands over all brands and a previously created customer report using the same public projection", async () => {
    const { brand, report } = await agencyReportFixture(app, db, c);
    await app.get(BrandService).create(c, { companyName: "另一品牌" });
    await repo.transfer(admin, c, transfer(a, 0));
    const before = await service.report(a, c, brand.id, report.id);
    await repo.transfer(admin, c, transfer(b, 1));
    expect((await service.detail(b, c)).brands).toHaveLength(2);
    expect(await service.report(b, c, brand.id, report.id)).toEqual(before);
    expect(JSON.stringify(before)).toContain("合成原始回答");
    expect(JSON.stringify(before)).not.toMatch(
      /INTERNAL_PROMPT_MARKER|INTERNAL_SOURCE_MARKER|fixture-private-model/,
    );
    expect((await service.current(b, c, brand.id)).report).toBeNull();
    expect(await service.history(b, c, brand.id)).toMatchObject({
      items: [expect.objectContaining({ id: report.id })],
      nextCursor: null,
    });
    await expect(service.report(a, c, brand.id, report.id)).rejects.toThrow(
      "不可访问",
    );
    await expect(
      service.report(b, c, randomUUID(), report.id),
    ).rejects.toThrow();
  });
});
