import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AuthenticationService } from "../src/identity/application/authentication.service.js";
import { SessionService } from "../src/identity/application/session.service.js";
import { PostgresIdentityRepository } from "../src/identity/infrastructure/postgres-identity.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();

describe("terminal-customer passwordless entry", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const repository = new PostgresIdentityRepository(prisma);
  const authentication = new AuthenticationService(repository, config);
  const sessions = new SessionService(repository, config);

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => {
    await clearCustomerData(prisma);
  });

  it("creates a terminal customer and authenticates an opaque session", async () => {
    const challenge = await authentication.requestChallenge("138 0013 8000");
    const completed = await authentication.completeChallenge({
      challengeId: challenge.challengeId,
      mobile: "13800138000",
      code: challenge.developmentCode!,
    });

    expect(completed.account).toMatchObject({
      mobile: "+8613800138000",
      role: "TERMINAL_CUSTOMER",
    });
    expect((await sessions.authenticate(completed.token)).account).toEqual(
      completed.account,
    );
    const stored = await prisma.accountSession.findFirstOrThrow();
    expect(stored.tokenDigest).not.toBe(completed.token);
  });

  it("counts a wrong code and never creates a session", async () => {
    const challenge = await authentication.requestChallenge("13800138001");
    await expect(
      authentication.completeChallenge({
        challengeId: challenge.challengeId,
        mobile: "13800138001",
        code: "000000",
      }),
    ).rejects.toThrow("验证码不正确");
    expect(
      (
        await prisma.mobileChallenge.findUniqueOrThrow({
          where: { id: challenge.challengeId },
        })
      ).failedAttempts,
    ).toBe(1);
    expect(await prisma.accountSession.count()).toBe(0);
  });

  it("creates a session for an existing administrator without granting customer access", async () => {
    await prisma.account.create({
      data: { mobile: "+8613800138003", role: "ADMINISTRATOR" },
    });
    const challenge = await authentication.requestChallenge("13800138003");
    const completed = await authentication.completeChallenge({
      challengeId: challenge.challengeId,
      mobile: "13800138003",
      code: challenge.developmentCode!,
    });

    expect(completed.account.role).toBe("ADMINISTRATOR");
    expect((await sessions.authenticate(completed.token)).account).toEqual(
      completed.account,
    );
  });

  it("consumes a challenge once and revokes logout immediately", async () => {
    const challenge = await authentication.requestChallenge("13800138002");
    const input = {
      challengeId: challenge.challengeId,
      mobile: "13800138002",
      code: challenge.developmentCode!,
    };
    const completed = await authentication.completeChallenge(input);
    await expect(authentication.completeChallenge(input)).rejects.toThrow();
    await sessions.logoutCurrent(completed.token);
    await expect(sessions.authenticate(completed.token)).rejects.toThrow(
      "登录状态已失效",
    );
    expect((await prisma.accountSession.findFirstOrThrow()).revokedReason).toBe(
      "USER_LOGOUT",
    );
  });

  it("revokes every parallel session on self logout-all", async () => {
    const firstChallenge = await authentication.requestChallenge("13800138004");
    const first = await authentication.completeChallenge({
      challengeId: firstChallenge.challengeId,
      mobile: "13800138004",
      code: firstChallenge.developmentCode!,
    });
    const secondChallenge =
      await authentication.requestChallenge("13800138004");
    const second = await authentication.completeChallenge({
      challengeId: secondChallenge.challengeId,
      mobile: "13800138004",
      code: secondChallenge.developmentCode!,
    });

    await sessions.logoutAll(first.account.id);

    await expect(sessions.authenticate(first.token)).rejects.toThrow(
      "登录状态已失效",
    );
    await expect(sessions.authenticate(second.token)).rejects.toThrow(
      "登录状态已失效",
    );
    expect(
      await prisma.accountSession.count({
        where: { revokedReason: "USER_LOGOUT_ALL" },
      }),
    ).toBe(2);
  });

  it("rejects an idle-expired credential from server state", async () => {
    const challenge = await authentication.requestChallenge("13800138005");
    const completed = await authentication.completeChallenge({
      challengeId: challenge.challengeId,
      mobile: "13800138005",
      code: challenge.developmentCode!,
    });
    await prisma.accountSession.updateMany({
      data: { idleExpiresAt: new Date(Date.now() - 1) },
    });

    await expect(sessions.authenticate(completed.token)).rejects.toThrow(
      "登录状态已失效",
    );
  });

  it("does not issue a session for an inactive pre-provisioned account", async () => {
    await prisma.account.create({
      data: {
        mobile: "+8613800138006",
        role: "OPERATIONS",
        status: "INACTIVE",
      },
    });
    const challenge = await authentication.requestChallenge("13800138006");

    await expect(
      authentication.completeChallenge({
        challengeId: challenge.challengeId,
        mobile: "13800138006",
        code: challenge.developmentCode!,
      }),
    ).rejects.toThrow("账号不可用");
    expect(await prisma.accountSession.count()).toBe(0);
  });
});
