import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AccountGovernanceService } from "../src/identity/application/account-governance.service.js";
import { PostgresIdentityRepository } from "../src/identity/infrastructure/postgres-identity.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();

describe("administrator account governance", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const governance = new AccountGovernanceService(
    new PostgresIdentityRepository(prisma),
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => clearCustomerData(prisma));

  it("keeps post-migration Session writes compatible with the previous writer", async () => {
    const account = await prisma.account.create({
      data: { mobile: "+8613800138199" },
    });
    const session = await prisma.accountSession.create({
      data: {
        accountId: account.id,
        tokenDigest: "f".repeat(64),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    expect(session.idleExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(session.lastSeenAt).toBeInstanceOf(Date);
  });

  it("creates one fixed-role internal account and records a bounded audit", async () => {
    const administrator = await createAdministrator(prisma, 1);

    const created = await governance.createInternalAccount({
      actorAccountId: administrator.id,
      mobile: "13800138101",
      role: "OPERATIONS",
      reason: "建立运营账号",
    });

    expect(created).toMatchObject({
      mobile: "+8613800138101",
      role: "OPERATIONS",
      status: "ACTIVE",
      revision: 1,
    });
    const audit = await prisma.identityGovernanceAudit.findFirstOrThrow();
    expect(audit).toMatchObject({
      actorAccountId: administrator.id,
      targetAccountId: created.id,
      action: "CREATE_INTERNAL_ACCOUNT",
      reason: "建立运营账号",
      beforeState: null,
      afterState: { role: "OPERATIONS", status: "ACTIVE", revision: 1 },
    });
    expect(JSON.stringify(audit)).not.toContain("13800138101");
  });

  it("changes an internal role and atomically revokes every target session", async () => {
    const administrator = await createAdministrator(prisma, 2);
    const target = await prisma.account.create({
      data: { mobile: "+8613800138112", role: "OPERATIONS" },
    });
    await createSession(prisma, target.id, "a".repeat(64));
    await createSession(prisma, target.id, "b".repeat(64));

    const changed = await governance.changeAccount({
      actorAccountId: administrator.id,
      targetAccountId: target.id,
      expectedRevision: 1,
      reason: "调整为代理商职责",
      mutation: { kind: "ROLE", role: "AGENT" },
    });

    expect(changed).toMatchObject({ role: "AGENT", revision: 2 });
    expect(
      await prisma.accountSession.count({
        where: { accountId: target.id, revokedReason: "ROLE_CHANGED" },
      }),
    ).toBe(2);
    expect(
      await prisma.identityGovernanceAudit.count({
        where: { targetAccountId: target.id, action: "CHANGE_INTERNAL_ROLE" },
      }),
    ).toBe(1);
  });

  it("rejects customer conversion, stale writes, and administrative self-action", async () => {
    const administrator = await createAdministrator(prisma, 3);
    const customer = await prisma.account.create({
      data: { mobile: "+8613800138123" },
    });
    const operations = await prisma.account.create({
      data: { mobile: "+8613800138124", role: "OPERATIONS", revision: 2 },
    });

    await expect(
      governance.changeAccount({
        actorAccountId: administrator.id,
        targetAccountId: customer.id,
        expectedRevision: 1,
        reason: "不允许的客户转换",
        mutation: { kind: "ROLE", role: "AGENT" },
      }),
    ).rejects.toMatchObject({
      response: { code: "ROLE_FAMILY_CONVERSION_FORBIDDEN" },
    });
    await expect(
      governance.changeAccount({
        actorAccountId: administrator.id,
        targetAccountId: operations.id,
        expectedRevision: 1,
        reason: "过期页面提交",
        mutation: { kind: "STATUS", status: "INACTIVE" },
      }),
    ).rejects.toMatchObject({ response: { code: "STALE_REVISION" } });
    await expect(
      governance.changeAccount({
        actorAccountId: administrator.id,
        targetAccountId: administrator.id,
        expectedRevision: 1,
        reason: "管理员不能自我治理",
        mutation: { kind: "STATUS", status: "INACTIVE" },
      }),
    ).rejects.toMatchObject({
      response: { code: "SELF_GOVERNANCE_FORBIDDEN" },
    });
    expect(await prisma.identityGovernanceAudit.count()).toBe(0);
  });

  it("serializes competing demotions and always retains one active administrator", async () => {
    const first = await createAdministrator(prisma, 4);
    const second = await createAdministrator(prisma, 5);

    const results = await Promise.allSettled([
      governance.changeAccount({
        actorAccountId: first.id,
        targetAccountId: second.id,
        expectedRevision: 1,
        reason: "并发调整第二名管理员",
        mutation: { kind: "ROLE", role: "OPERATIONS" },
      }),
      governance.changeAccount({
        actorAccountId: second.id,
        targetAccountId: first.id,
        expectedRevision: 1,
        reason: "并发调整第一名管理员",
        mutation: { kind: "ROLE", role: "OPERATIONS" },
      }),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      await prisma.account.count({
        where: { role: "ADMINISTRATOR", status: "ACTIVE" },
      }),
    ).toBe(1);
    expect(await prisma.identityGovernanceAudit.count()).toBe(1);
  });
});

async function createAdministrator(prisma: PrismaService, suffix: number) {
  return prisma.account.create({
    data: {
      mobile: `+86138001382${String(suffix).padStart(2, "0")}`,
      role: "ADMINISTRATOR",
    },
  });
}

async function createSession(
  prisma: PrismaService,
  accountId: string,
  tokenDigest: string,
): Promise<void> {
  const now = new Date();
  await prisma.accountSession.create({
    data: {
      accountId,
      tokenDigest,
      expiresAt: new Date(now.getTime() + 60_000),
      idleExpiresAt: new Date(now.getTime() + 60_000),
      lastSeenAt: now,
    },
  });
}
