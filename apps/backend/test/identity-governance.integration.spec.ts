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
    await createAdministrator(prisma, 9);
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

  it("requires a second active administrator before reporting the remaining self-governance boundary", async () => {
    const administrator = await createAdministrator(prisma, 6);
    await createSession(prisma, administrator.id, "9".repeat(64));

    await expect(
      governance.changeAccount({
        actorAccountId: administrator.id,
        targetAccountId: administrator.id,
        expectedRevision: 1,
        reason: "唯一管理员尝试自我停用",
        mutation: { kind: "STATUS", status: "INACTIVE" },
      }),
    ).rejects.toMatchObject({
      response: { code: "LAST_ADMINISTRATOR_FORBIDDEN" },
    });
    expect(
      await prisma.account.findUniqueOrThrow({
        where: { id: administrator.id },
      }),
    ).toMatchObject({
      role: "ADMINISTRATOR",
      status: "ACTIVE",
      revision: 1,
    });
    expect(
      await prisma.accountSession.findFirstOrThrow({
        where: { accountId: administrator.id },
      }),
    ).toMatchObject({ revokedAt: null, revokedReason: null });
    expect(await prisma.identityGovernanceAudit.count()).toBe(0);
  });

  it("rejects a malformed governance target before it reaches PostgreSQL", async () => {
    const administrator = await createAdministrator(prisma, 10);

    await expect(
      governance.changeAccount({
        actorAccountId: administrator.id,
        targetAccountId: "not-an-account-id",
        expectedRevision: 1,
        reason: "拒绝非法目标标识",
        mutation: { kind: "STATUS", status: "INACTIVE" },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("serializes competing demotions and always retains one active administrator", async () => {
    const first = await createAdministrator(prisma, 4);
    const second = await createAdministrator(prisma, 5);
    await createSession(prisma, first.id, "c".repeat(64));
    await createSession(prisma, second.id, "d".repeat(64));

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
    expect(
      await prisma.account.count({
        where: { role: "OPERATIONS", status: "ACTIVE" },
      }),
    ).toBe(1);
    expect(
      await prisma.accountSession.count({
        where: { revokedReason: "ROLE_CHANGED" },
      }),
    ).toBe(1);
    expect(
      await prisma.accountSession.count({ where: { revokedAt: null } }),
    ).toBe(1);
    expect(await prisma.identityGovernanceAudit.count()).toBe(1);
  });

  it("rolls back account and audit when Session revocation fails", async () => {
    const administrator = await createAdministrator(prisma, 7);
    const target = await prisma.account.create({
      data: { mobile: "+8613800138271", role: "OPERATIONS" },
    });
    await createSession(prisma, target.id, "e".repeat(64));

    try {
      await installSessionRevocationFailure(prisma);
      await expect(
        governance.changeAccount({
          actorAccountId: administrator.id,
          targetAccountId: target.id,
          expectedRevision: 1,
          reason: "强制会话撤销失败",
          mutation: { kind: "ROLE", role: "AGENT" },
        }),
      ).rejects.toThrow("forced Session revocation failure");
    } finally {
      await removeSessionRevocationFailure(prisma);
    }

    expect(
      await prisma.account.findUniqueOrThrow({ where: { id: target.id } }),
    ).toMatchObject({ role: "OPERATIONS", status: "ACTIVE", revision: 1 });
    expect(
      await prisma.accountSession.findFirstOrThrow({
        where: { accountId: target.id },
      }),
    ).toMatchObject({ revokedAt: null, revokedReason: null });
    expect(await prisma.identityGovernanceAudit.count()).toBe(0);
  });

  it("rolls back account and Session when governance audit insertion fails", async () => {
    const administrator = await createAdministrator(prisma, 8);
    const target = await prisma.account.create({
      data: { mobile: "+8613800138281", role: "OPERATIONS" },
    });
    await createSession(prisma, target.id, "f".repeat(64));

    try {
      await installGovernanceAuditFailure(prisma);
      await expect(
        governance.changeAccount({
          actorAccountId: administrator.id,
          targetAccountId: target.id,
          expectedRevision: 1,
          reason: "FORCE_AUDIT_FAILURE",
          mutation: { kind: "STATUS", status: "INACTIVE" },
        }),
      ).rejects.toThrow("forced Governance audit failure");
    } finally {
      await removeGovernanceAuditFailure(prisma);
    }

    expect(
      await prisma.account.findUniqueOrThrow({ where: { id: target.id } }),
    ).toMatchObject({ role: "OPERATIONS", status: "ACTIVE", revision: 1 });
    expect(
      await prisma.accountSession.findFirstOrThrow({
        where: { accountId: target.id },
      }),
    ).toMatchObject({ revokedAt: null, revokedReason: null });
    expect(await prisma.identityGovernanceAudit.count()).toBe(0);
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

async function installSessionRevocationFailure(
  prisma: PrismaService,
): Promise<void> {
  await removeSessionRevocationFailure(prisma);
  await prisma.$executeRawUnsafe(`
    CREATE FUNCTION geoeval_test_fail_session_revocation()
    RETURNS trigger AS $$
    BEGIN
      IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
        RAISE EXCEPTION 'forced Session revocation failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER geoeval_test_fail_session_revocation
    BEFORE UPDATE ON account_sessions
    FOR EACH ROW EXECUTE FUNCTION geoeval_test_fail_session_revocation()
  `);
}

async function removeSessionRevocationFailure(
  prisma: PrismaService,
): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS geoeval_test_fail_session_revocation
    ON account_sessions
  `);
  await prisma.$executeRawUnsafe(
    "DROP FUNCTION IF EXISTS geoeval_test_fail_session_revocation()",
  );
}

async function installGovernanceAuditFailure(
  prisma: PrismaService,
): Promise<void> {
  await removeGovernanceAuditFailure(prisma);
  await prisma.$executeRawUnsafe(`
    CREATE FUNCTION geoeval_test_fail_governance_audit()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.reason = 'FORCE_AUDIT_FAILURE' THEN
        RAISE EXCEPTION 'forced Governance audit failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER geoeval_test_fail_governance_audit
    BEFORE INSERT ON identity_governance_audits
    FOR EACH ROW EXECUTE FUNCTION geoeval_test_fail_governance_audit()
  `);
}

async function removeGovernanceAuditFailure(
  prisma: PrismaService,
): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS geoeval_test_fail_governance_audit
    ON identity_governance_audits
  `);
  await prisma.$executeRawUnsafe(
    "DROP FUNCTION IF EXISTS geoeval_test_fail_governance_audit()",
  );
}
