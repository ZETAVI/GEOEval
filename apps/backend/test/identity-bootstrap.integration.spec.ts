import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import openApi from "../openapi.json" with { type: "json" };
import { AccountGovernanceService } from "../src/identity/application/account-governance.service.js";
import { BootstrapService } from "../src/identity/application/bootstrap.service.js";
import { bootstrapSecretDigest } from "../src/identity/domain/identity.crypto.js";
import { PostgresIdentityRepository } from "../src/identity/infrastructure/postgres-identity.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
const bootstrapSecret = "fixture-bootstrap-secret-32-characters-minimum";
const expectedSecretDigest = bootstrapSecretDigest(bootstrapSecret);

describe("one-time administrator Bootstrap", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const repository = new PostgresIdentityRepository(prisma);
  const bootstrap = new BootstrapService(repository);
  const governance = new AccountGovernanceService(repository);

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => clearCustomerData(prisma));

  it("atomically creates the first administrator, control state, and audit", async () => {
    const completedAt = new Date("2026-09-04T12:00:00.000Z");
    const result = await bootstrap.bootstrap({
      mobile: "13800138401",
      keyId: "deploy/test/key-1",
      providedSecret: bootstrapSecret,
      expectedSecretDigest,
      now: completedAt,
    });

    expect(result).toMatchObject({
      status: "CREATED",
      account: {
        mobile: "+8613800138401",
        role: "ADMINISTRATOR",
        status: "ACTIVE",
      },
      completedAt,
      keyId: "deploy/test/key-1",
    });
    const control = await prisma.identityGovernanceControl.findUniqueOrThrow({
      where: { id: "GLOBAL" },
    });
    expect(control).toMatchObject({
      bootstrapAccountId: result.account.id,
      bootstrapSecretDigest: expectedSecretDigest,
      bootstrapKeyId: "deploy/test/key-1",
      bootstrapCompletedAt: completedAt,
      revision: 2,
    });
    expect(
      await prisma.identityGovernanceAudit.findFirstOrThrow(),
    ).toMatchObject({
      actorKind: "BOOTSTRAP",
      actorAccountId: null,
      actorKeyId: "deploy/test/key-1",
      targetAccountId: result.account.id,
      action: "BOOTSTRAP_ADMINISTRATOR",
      beforeState: null,
      afterState: {
        role: "ADMINISTRATOR",
        status: "ACTIVE",
        revision: 1,
      },
    });
    expect(JSON.stringify(result)).not.toContain(bootstrapSecret);
    expect(
      JSON.stringify(await prisma.identityGovernanceAudit.findMany()),
    ).not.toContain(bootstrapSecret);
  });

  it("returns deterministic no-change for an exact completed replay", async () => {
    const input = {
      mobile: "13800138402",
      keyId: "deploy/test/key-2",
      providedSecret: bootstrapSecret,
      expectedSecretDigest,
      now: new Date("2026-09-04T12:01:00.000Z"),
    };
    const first = await bootstrap.bootstrap(input);
    const replay = await bootstrap.bootstrap({
      ...input,
      now: new Date("2026-09-04T12:02:00.000Z"),
    });

    expect(replay).toMatchObject({
      status: "UNCHANGED",
      account: { id: first.account.id },
      completedAt: input.now,
      keyId: input.keyId,
    });
    expect(await prisma.account.count()).toBe(1);
    expect(await prisma.identityGovernanceAudit.count()).toBe(1);
  });

  it("rejects a replay with a different target, key, or current verifier", async () => {
    await bootstrap.bootstrap({
      mobile: "13800138403",
      keyId: "deploy/test/key-3",
      providedSecret: bootstrapSecret,
      expectedSecretDigest,
    });
    const differentSecret = "different-bootstrap-secret-32-characters-minimum";

    for (const input of [
      {
        mobile: "13800138404",
        keyId: "deploy/test/key-3",
        providedSecret: bootstrapSecret,
        expectedSecretDigest,
      },
      {
        mobile: "13800138403",
        keyId: "deploy/test/key-4",
        providedSecret: bootstrapSecret,
        expectedSecretDigest,
      },
      {
        mobile: "13800138403",
        keyId: "deploy/test/key-3",
        providedSecret: differentSecret,
        expectedSecretDigest: bootstrapSecretDigest(differentSecret),
      },
    ]) {
      await expect(bootstrap.bootstrap(input)).rejects.toMatchObject({
        code: "BOOTSTRAP_ALREADY_COMPLETED_CONFLICT",
      });
    }
    expect(await prisma.account.count()).toBe(1);
    expect(await prisma.identityGovernanceAudit.count()).toBe(1);
  });

  it("rejects an existing administrator or previously owned mobile", async () => {
    await prisma.account.create({
      data: { mobile: "+8613800138405", role: "ADMINISTRATOR" },
    });
    await expect(
      bootstrap.bootstrap({
        mobile: "13800138406",
        keyId: "deploy/test/key-5",
        providedSecret: bootstrapSecret,
        expectedSecretDigest,
      }),
    ).rejects.toMatchObject({
      code: "BOOTSTRAP_ACTIVE_ADMINISTRATOR_EXISTS",
    });

    await clearCustomerData(prisma);
    await prisma.account.create({ data: { mobile: "+8613800138406" } });
    await expect(
      bootstrap.bootstrap({
        mobile: "13800138406",
        keyId: "deploy/test/key-6",
        providedSecret: bootstrapSecret,
        expectedSecretDigest,
      }),
    ).rejects.toMatchObject({ code: "BOOTSTRAP_MOBILE_ALREADY_EXISTS" });
    expect(await prisma.identityGovernanceAudit.count()).toBe(0);
  });

  it("rejects an invalid secret before reading or writing Bootstrap state", async () => {
    expect(() =>
      bootstrap.bootstrap({
        mobile: "13800138407",
        keyId: "deploy/test/key-7",
        providedSecret: "wrong-secret-with-at-least-32-characters",
        expectedSecretDigest,
      }),
    ).toThrow("Bootstrap authorization failed");
    expect(await prisma.account.count()).toBe(0);
    expect(await prisma.identityGovernanceAudit.count()).toBe(0);
  });

  it("maps an invalid target mobile without leaking HTTP concerns into the CLI", () => {
    expect(() =>
      bootstrap.bootstrap({
        mobile: "invalid-mobile",
        keyId: "deploy/test/key-mobile",
        providedSecret: bootstrapSecret,
        expectedSecretDigest,
      }),
    ).toThrow("Bootstrap mobile is invalid");
  });

  it("serializes competing first-administrator attempts", async () => {
    const results = await Promise.allSettled([
      bootstrap.bootstrap({
        mobile: "13800138408",
        keyId: "deploy/test/key-8",
        providedSecret: bootstrapSecret,
        expectedSecretDigest,
      }),
      bootstrap.bootstrap({
        mobile: "13800138409",
        keyId: "deploy/test/key-9",
        providedSecret: bootstrapSecret,
        expectedSecretDigest,
      }),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1,
    );
    expect(await prisma.account.count()).toBe(1);
    expect(
      await prisma.account.count({
        where: { role: "ADMINISTRATOR", status: "ACTIVE" },
      }),
    ).toBe(1);
    expect(await prisma.identityGovernanceAudit.count()).toBe(1);
  });

  it("uses normal Governance to establish the recommended second administrator", async () => {
    const first = await bootstrap.bootstrap({
      mobile: "13800138410",
      keyId: "deploy/test/key-10",
      providedSecret: bootstrapSecret,
      expectedSecretDigest,
    });

    const second = await governance.createInternalAccount({
      actorAccountId: first.account.id,
      mobile: "13800138411",
      role: "ADMINISTRATOR",
      reason: "建立第二名有效管理员",
    });

    expect(second).toMatchObject({
      role: "ADMINISTRATOR",
      status: "ACTIVE",
    });
    expect(
      await prisma.account.count({
        where: { role: "ADMINISTRATOR", status: "ACTIVE" },
      }),
    ).toBe(2);
    expect(
      await prisma.identityGovernanceAudit.findMany({
        orderBy: { createdAt: "asc" },
        select: { action: true },
      }),
    ).toEqual([
      { action: "BOOTSTRAP_ADMINISTRATOR" },
      { action: "CREATE_INTERNAL_ACCOUNT" },
    ]);
  });

  it("has no Bootstrap or recovery HTTP surface", () => {
    expect(
      Object.keys(openApi.paths).filter((path) =>
        /bootstrap|recovery/i.test(path),
      ),
    ).toEqual([]);
  });
});
