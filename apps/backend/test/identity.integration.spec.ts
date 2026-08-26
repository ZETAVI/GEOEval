import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { loadApiConfig } from "../src/config/runtime-config.js";
import { IdentityService } from "../src/identity/application/identity.service.js";
import { PostgresIdentityRepository } from "../src/identity/infrastructure/postgres-identity.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";

const config = loadApiConfig({ GEOEVAL_LOCAL_DEFAULTS: "1", NODE_ENV: "test" });

describe("terminal-customer passwordless entry", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const service = new IdentityService(
    new PostgresIdentityRepository(prisma),
    config,
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => {
    await clearCustomerData(prisma);
  });

  it("creates a terminal customer and authenticates an opaque session", async () => {
    const challenge = await service.requestChallenge("138 0013 8000");
    const completed = await service.completeChallenge({
      challengeId: challenge.challengeId,
      mobile: "13800138000",
      code: challenge.developmentCode!,
    });

    expect(completed.account).toMatchObject({
      mobile: "+8613800138000",
      role: "TERMINAL_CUSTOMER",
    });
    expect(await service.authenticate(completed.token)).toEqual(
      completed.account,
    );
    const stored = await prisma.accountSession.findFirstOrThrow();
    expect(stored.tokenDigest).not.toBe(completed.token);
  });

  it("counts a wrong code and never creates a session", async () => {
    const challenge = await service.requestChallenge("13800138001");
    await expect(
      service.completeChallenge({
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

  it("consumes a challenge once and revokes logout immediately", async () => {
    const challenge = await service.requestChallenge("13800138002");
    const input = {
      challengeId: challenge.challengeId,
      mobile: "13800138002",
      code: challenge.developmentCode!,
    };
    const completed = await service.completeChallenge(input);
    await expect(service.completeChallenge(input)).rejects.toThrow();
    await service.logout(completed.token);
    await expect(service.authenticate(completed.token)).rejects.toThrow(
      "登录状态已失效",
    );
  });
});
