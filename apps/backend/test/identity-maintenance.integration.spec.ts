import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { IdentityMaintenanceService } from "../src/identity/application/identity-maintenance.service.js";
import { PostgresIdentityRepository } from "../src/identity/infrastructure/postgres-identity.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();

describe("Identity lifecycle cleanup", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const maintenance = new IdentityMaintenanceService(
    new PostgresIdentityRepository(prisma),
    {
      sessionRetentionMs: 30 * 24 * 60 * 60 * 1000,
      challengeRetentionMs: 24 * 60 * 60 * 1000,
      batchSize: 1,
    },
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => clearCustomerData(prisma));

  it("deletes only terminal records in bounded batches and never governance audit", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const oldSessionTime = new Date("2026-07-01T00:00:00.000Z");
    const oldChallengeTime = new Date("2026-09-01T00:00:00.000Z");
    const recentTime = new Date("2026-09-04T11:00:00.000Z");
    const futureTime = new Date("2026-09-10T00:00:00.000Z");
    const account = await prisma.account.create({
      data: { mobile: "+8613800138301", role: "ADMINISTRATOR" },
    });

    await Promise.all([
      createSession(prisma, account.id, "a", {
        expiresAt: futureTime,
        idleExpiresAt: futureTime,
      }),
      createSession(prisma, account.id, "b", {
        expiresAt: futureTime,
        idleExpiresAt: futureTime,
        revokedAt: oldSessionTime,
      }),
      createSession(prisma, account.id, "c", {
        expiresAt: oldSessionTime,
        idleExpiresAt: oldSessionTime,
      }),
      createSession(prisma, account.id, "d", {
        expiresAt: futureTime,
        idleExpiresAt: futureTime,
        revokedAt: recentTime,
      }),
    ]);
    await Promise.all([
      createChallenge(prisma, "+8613800138301", futureTime),
      createChallenge(prisma, "+8613800138302", futureTime, {
        consumedAt: oldChallengeTime,
      }),
      createChallenge(prisma, "+8613800138303", futureTime, {
        supersededAt: oldChallengeTime,
      }),
      createChallenge(prisma, "+8613800138304", oldChallengeTime),
    ]);
    await prisma.mobileChallengeRateLimit.createMany({
      data: [
        {
          mobile: "+8613800138302",
          windowStartedAt: oldChallengeTime,
          lastIssuedAt: oldChallengeTime,
          requestCount: 1,
        },
        {
          mobile: "+8613800138301",
          windowStartedAt: recentTime,
          lastIssuedAt: recentTime,
          requestCount: 1,
        },
      ],
    });
    await prisma.identityGovernanceAudit.create({
      data: {
        actorKind: "ACCOUNT",
        actorAccountId: account.id,
        targetAccountId: account.id,
        action: "REVOKE_ACCOUNT_SESSIONS",
        reason: "保留治理审计记录",
        afterState: {
          role: "ADMINISTRATOR",
          status: "ACTIVE",
          revision: 1,
        },
      },
    });

    const results = [];
    for (let index = 0; index < 4; index += 1) {
      results.push(await maintenance.cleanup(now));
    }

    expect(results.every((result) => result.deletedSessions <= 1)).toBe(true);
    expect(results.every((result) => result.deletedChallenges <= 1)).toBe(true);
    expect(
      results.every((result) => result.deletedChallengeRateLimits <= 1),
    ).toBe(true);
    expect(sum(results, "deletedSessions")).toBe(2);
    expect(sum(results, "deletedChallenges")).toBe(3);
    expect(sum(results, "deletedChallengeRateLimits")).toBe(1);
    expect(await prisma.accountSession.count()).toBe(2);
    expect(await prisma.mobileChallenge.count()).toBe(1);
    expect(await prisma.mobileChallengeRateLimit.count()).toBe(1);
    expect(await prisma.identityGovernanceAudit.count()).toBe(1);
  });
});

async function createSession(
  prisma: PrismaService,
  accountId: string,
  digestCharacter: string,
  input: {
    expiresAt: Date;
    idleExpiresAt: Date;
    revokedAt?: Date;
  },
): Promise<void> {
  await prisma.accountSession.create({
    data: {
      accountId,
      tokenDigest: digestCharacter.repeat(64),
      expiresAt: input.expiresAt,
      idleExpiresAt: input.idleExpiresAt,
      lastSeenAt: new Date("2026-09-04T10:00:00.000Z"),
      ...(input.revokedAt
        ? { revokedAt: input.revokedAt, revokedReason: "USER_LOGOUT" }
        : {}),
    },
  });
}

async function createChallenge(
  prisma: PrismaService,
  mobile: string,
  expiresAt: Date,
  input: { consumedAt?: Date; supersededAt?: Date } = {},
): Promise<void> {
  await prisma.mobileChallenge.create({
    data: {
      id: randomUUID(),
      mobile,
      codeDigest: "e".repeat(64),
      expiresAt,
      ...input,
    },
  });
}

function sum(
  results: Array<{
    deletedSessions: number;
    deletedChallenges: number;
    deletedChallengeRateLimits: number;
  }>,
  key: "deletedSessions" | "deletedChallenges" | "deletedChallengeRateLimits",
): number {
  return results.reduce((total, result) => total + result[key], 0);
}
