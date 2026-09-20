import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { ApiConfig } from "../src/config/runtime-config.js";
import { AuthenticationService } from "../src/identity/application/authentication.service.js";
import { HumanVerificationPolicy } from "../src/identity/application/human-verification.policy.js";
import { SessionService } from "../src/identity/application/session.service.js";
import {
  ChallengeDeliveryRejectedError,
  type ChallengeDeliveryPort,
} from "../src/identity/domain/challenge-delivery.port.js";
import type { ChallengeCodeGenerator } from "../src/identity/domain/challenge-code-generator.port.js";
import type { HumanVerificationPort } from "../src/identity/domain/human-verification.port.js";
import { DeterministicChallengeCodeGenerator } from "../src/identity/infrastructure/deterministic-challenge-code-generator.js";
import { DeterministicChallengeDelivery } from "../src/identity/infrastructure/deterministic-challenge-delivery.js";
import { DisabledHumanVerification } from "../src/identity/infrastructure/disabled-human-verification.js";
import { PostgresIdentityRepository } from "../src/identity/infrastructure/postgres-identity.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import {
  SafeTelemetry,
  type TelemetryEvent,
} from "../src/infrastructure/telemetry.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
const identityTestConfig = {
  ...config,
  authChallengePolicy: {
    ...config.authChallengePolicy,
    resendIntervalMs: 0,
  },
};

describe("terminal-customer passwordless entry", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const repository = new PostgresIdentityRepository(prisma);
  function authenticationFor(
    testConfig: ApiConfig,
    options: {
      challengeCodeGenerator?: ChallengeCodeGenerator;
      delivery?: ChallengeDeliveryPort;
      humanVerification?: HumanVerificationPort;
      telemetry?: SafeTelemetry;
    } = {},
  ) {
    return new AuthenticationService(
      repository,
      testConfig,
      options.delivery ?? new DeterministicChallengeDelivery(),
      options.humanVerification ?? new DisabledHumanVerification(),
      new HumanVerificationPolicy(testConfig),
      options.challengeCodeGenerator ??
        new DeterministicChallengeCodeGenerator(testConfig),
      options.telemetry ?? new SafeTelemetry({ export: async () => undefined }),
    );
  }
  const authentication = authenticationFor(identityTestConfig);
  const sessions = new SessionService(repository, identityTestConfig);

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => {
    await clearCustomerData(prisma);
  });

  it("keeps missing and unknown credentials on the same authentication-required boundary", async () => {
    await expect(sessions.authenticate(undefined)).rejects.toMatchObject({
      response: { code: "AUTHENTICATION_REQUIRED", message: "请先登录" },
    });
    await expect(
      sessions.authenticate("unknown-session-credential"),
    ).rejects.toMatchObject({
      response: { code: "AUTHENTICATION_REQUIRED", message: "请先登录" },
    });
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
    await expect(sessions.authenticate(completed.token)).rejects.toMatchObject({
      response: { code: "SESSION_REVOKED" },
    });
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

    await expect(sessions.authenticate(first.token)).rejects.toMatchObject({
      response: { code: "SESSION_REVOKED" },
    });
    await expect(sessions.authenticate(second.token)).rejects.toMatchObject({
      response: { code: "SESSION_REVOKED" },
    });
    expect(
      await prisma.accountSession.count({
        where: { revokedReason: "USER_LOGOUT_ALL" },
      }),
    ).toBe(2);
  });

  it("classifies idle and absolute expiry from server state", async () => {
    const challenge = await authentication.requestChallenge("13800138005");
    const completed = await authentication.completeChallenge({
      challengeId: challenge.challengeId,
      mobile: "13800138005",
      code: challenge.developmentCode!,
    });
    await prisma.accountSession.updateMany({
      data: { idleExpiresAt: new Date(Date.now() - 1) },
    });

    await expect(sessions.authenticate(completed.token)).rejects.toMatchObject({
      response: { code: "SESSION_EXPIRED" },
    });

    await prisma.accountSession.updateMany({
      data: {
        idleExpiresAt: new Date(Date.now() + 60_000),
        expiresAt: new Date(Date.now() - 1),
      },
    });
    await expect(sessions.authenticate(completed.token)).rejects.toMatchObject({
      response: { code: "SESSION_EXPIRED" },
    });
  });

  it("classifies a known credential for an inactive account", async () => {
    const challenge = await authentication.requestChallenge("13800138015");
    const completed = await authentication.completeChallenge({
      challengeId: challenge.challengeId,
      mobile: "13800138015",
      code: challenge.developmentCode!,
    });
    await prisma.account.update({
      where: { id: completed.account.id },
      data: { status: "INACTIVE" },
    });

    await expect(sessions.authenticate(completed.token)).rejects.toMatchObject({
      response: { code: "ACCOUNT_INACTIVE" },
    });
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

  it("supersedes the earlier unconsumed challenge for the same mobile", async () => {
    const first = await authentication.requestChallenge("13800138007");
    const second = await authentication.requestChallenge("13800138007");

    await expect(
      authentication.completeChallenge({
        challengeId: first.challengeId,
        mobile: "13800138007",
        code: first.developmentCode!,
      }),
    ).rejects.toThrow("验证码无效或已过期");
    await expect(
      authentication.completeChallenge({
        challengeId: second.challengeId,
        mobile: "13800138007",
        code: second.developmentCode!,
      }),
    ).resolves.toMatchObject({
      account: { mobile: "+8613800138007" },
    });
    expect(
      (
        await prisma.mobileChallenge.findUniqueOrThrow({
          where: { id: first.challengeId },
        })
      ).supersededAt,
    ).toBeInstanceOf(Date);
  });

  it("checks the stop switch and human verification before creating a Challenge", async () => {
    let verificationCalls = 0;
    const stopped = authenticationFor(
      { ...identityTestConfig, authChallengeSendingEnabled: false },
      {
        humanVerification: {
          verify: async () => {
            verificationCalls += 1;
            return { outcome: "verified" };
          },
        },
      },
    );
    await expect(stopped.requestChallenge("13800138020")).rejects.toMatchObject(
      {
        status: 503,
        response: { code: "CHALLENGE_SENDING_DISABLED" },
      },
    );
    expect(verificationCalls).toBe(0);
    expect(await prisma.mobileChallenge.count()).toBe(0);

    const rejected = authenticationFor(identityTestConfig, {
      humanVerification: {
        verify: async () => ({
          outcome: "rejected",
          reason: "REPLAYED",
        }),
      },
    });
    await expect(
      rejected.requestChallenge("13800138021", undefined, false, "opaque"),
    ).rejects.toMatchObject({
      status: 403,
      response: { code: "HUMAN_VERIFICATION_REJECTED" },
    });
    expect(await prisma.mobileChallenge.count()).toBe(0);
  });

  it("bounds verification outage degradation before failing closed", async () => {
    const degraded = authenticationFor(
      {
        ...identityTestConfig,
        authHumanVerificationPolicy: {
          unavailableMode: "limited",
          maximumConsecutiveUnavailable: 1,
        },
      },
      {
        humanVerification: {
          verify: async () => ({
            outcome: "unavailable",
            reason: "TIMEOUT",
          }),
        },
      },
    );
    await expect(
      degraded.requestChallenge("13800138022", undefined, false, "opaque"),
    ).resolves.toMatchObject({ challengeId: expect.any(String) });
    await expect(
      degraded.requestChallenge("13800138023", undefined, false, "opaque"),
    ).rejects.toMatchObject({
      status: 503,
      response: { code: "HUMAN_VERIFICATION_UNAVAILABLE" },
    });
    expect(await prisma.mobileChallenge.count()).toBe(1);
  });

  it("does not retry explicit SMS rejection and preserves unknown submission", async () => {
    let rejectionCalls = 0;
    const rejected = authenticationFor(identityTestConfig, {
      delivery: {
        deliver: async () => {
          rejectionCalls += 1;
          throw new ChallengeDeliveryRejectedError("SIGNATURE");
        },
      },
    });
    await expect(
      rejected.requestChallenge("13800138024"),
    ).rejects.toMatchObject({
      status: 503,
      response: { code: "CHALLENGE_DELIVERY_UNAVAILABLE" },
    });
    expect(rejectionCalls).toBe(1);
    expect(await prisma.mobileChallenge.count()).toBe(1);

    let unknownCalls = 0;
    const unknown = authenticationFor(identityTestConfig, {
      delivery: {
        deliver: async () => {
          unknownCalls += 1;
          return { outcome: "unknown" };
        },
      },
    });
    await expect(unknown.requestChallenge("13800138025")).resolves.toEqual({
      challengeId: expect.any(String),
      expiresAt: expect.any(String),
    });
    expect(unknownCalls).toBe(1);
    expect(await prisma.mobileChallenge.count()).toBe(2);
  });

  it("observes bounded Challenge outcomes without mobile or plaintext code", async () => {
    const events: TelemetryEvent[] = [];
    const observed = authenticationFor(identityTestConfig, {
      telemetry: new SafeTelemetry({
        export: async (event) => {
          events.push(event);
        },
      }),
    });
    const challenge = await observed.requestChallenge("13800138026");
    expect(challenge.developmentCode).toBe("246810");
    expect(events).toEqual([
      {
        name: "identity.challenge.request",
        correlationId: challenge.challengeId,
        attributes: {
          humanProvider: "DISABLED",
          humanOutcome: "VERIFIED",
          humanReason: "NONE",
          deliveryProvider: "DETERMINISTIC",
          deliveryOutcome: "ACCEPTED",
          deliveryReason: "NONE",
          durationMs: expect.any(String),
        },
      },
    ]);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain("13800138026");
    expect(serialized).not.toContain("+8613800138026");
    expect(serialized).not.toContain("246810");
  });

  it("enforces the configured Challenge request window without creating extra rows", async () => {
    const limited = authenticationFor({
      ...identityTestConfig,
      authChallengePolicy: {
        ...identityTestConfig.authChallengePolicy,
        maximumRequestsPerWindow: 2,
      },
    });

    await limited.requestChallenge("13800138008");
    await limited.requestChallenge("13800138008");
    await expect(limited.requestChallenge("13800138008")).rejects.toMatchObject(
      {
        status: 429,
        response: {
          code: "CHALLENGE_RATE_LIMITED",
          retryAfterSeconds: expect.any(Number),
        },
      },
    );
    expect(await prisma.mobileChallenge.count()).toBe(2);
    expect(
      (
        await prisma.mobileChallengeRateLimit.findUniqueOrThrow({
          where: { mobile: "+8613800138008" },
        })
      ).requestCount,
    ).toBe(2);
  });

  it("serializes concurrent Challenge requests at the configured limit", async () => {
    const limited = authenticationFor({
      ...identityTestConfig,
      authChallengePolicy: {
        ...identityTestConfig.authChallengePolicy,
        maximumRequestsPerWindow: 1,
      },
    });

    const results = await Promise.allSettled([
      limited.requestChallenge("13800138009"),
      limited.requestChallenge("13800138009"),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1,
    );
    const rejection = results.find(({ status }) => status === "rejected");
    expect(rejection).toMatchObject({
      status: "rejected",
      reason: {
        status: 429,
        response: { code: "CHALLENGE_RATE_LIMITED" },
      },
    });
    expect(await prisma.mobileChallenge.count()).toBe(1);
  });

  it("enforces the resend interval without superseding the usable Challenge", async () => {
    const resendProtected = authenticationFor(config);
    const first = await resendProtected.requestChallenge("13800138010");

    await expect(
      resendProtected.requestChallenge("13800138010"),
    ).rejects.toMatchObject({
      status: 429,
      response: {
        code: "CHALLENGE_RATE_LIMITED",
        retryAfterSeconds: expect.any(Number),
      },
    });
    expect(await prisma.mobileChallenge.count()).toBe(1);
    expect(
      (
        await prisma.mobileChallenge.findUniqueOrThrow({
          where: { id: first.challengeId },
        })
      ).supersededAt,
    ).toBeNull();
  });

  it("caps failed verification attempts before a correct code can create a session", async () => {
    const twoAttempts = authenticationFor({
      ...identityTestConfig,
      authChallengePolicy: {
        ...identityTestConfig.authChallengePolicy,
        maximumFailedAttempts: 2,
      },
    });
    const challenge = await twoAttempts.requestChallenge("13800138011");
    const wrong = {
      challengeId: challenge.challengeId,
      mobile: "13800138011",
      code: "000000",
    };

    await expect(twoAttempts.completeChallenge(wrong)).rejects.toThrow(
      "验证码不正确",
    );
    await expect(twoAttempts.completeChallenge(wrong)).rejects.toThrow(
      "验证码不正确",
    );
    await expect(
      twoAttempts.completeChallenge({
        ...wrong,
        code: challenge.developmentCode!,
      }),
    ).rejects.toThrow("验证码无效或已过期");
    expect(
      (
        await prisma.mobileChallenge.findUniqueOrThrow({
          where: { id: challenge.challengeId },
        })
      ).failedAttempts,
    ).toBe(2);
    expect(await prisma.accountSession.count()).toBe(0);
  });
});
