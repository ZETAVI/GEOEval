import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { PostgresAcquisitionRepository } from "../src/agency/infrastructure/postgres-acquisition.repository.js";
import { PostgresIdentityRepository } from "../src/identity/infrastructure/postgres-identity.repository.js";
import { AuthenticationService } from "../src/identity/application/authentication.service.js";
import { HumanVerificationPolicy } from "../src/identity/application/human-verification.policy.js";
import { DeterministicChallengeCodeGenerator } from "../src/identity/infrastructure/deterministic-challenge-code-generator.js";
import { DeterministicChallengeDelivery } from "../src/identity/infrastructure/deterministic-challenge-delivery.js";
import { DisabledHumanVerification } from "../src/identity/infrastructure/disabled-human-verification.js";
import type { ApiConfig } from "../src/config/runtime-config.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { clearCustomerData } from "./customer-data.js";
import { ACQUISITION_LIFETIME_MS } from "../src/agency/domain/acquisition.js";
import { SafeTelemetry } from "../src/infrastructure/telemetry.js";

const base = loadIntegrationApiConfig();
const config = {
  ...base,
  agencyAcquisitionEnabled: true,
  authChallengePolicy: { ...base.authChallengePolicy, resendIntervalMs: 0 },
};
describe("agency entry and atomic first registration", () => {
  const db = new PrismaService(config.databaseUrl);
  const entry = new PostgresAcquisitionRepository(db);
  const identity = new PostgresIdentityRepository(db);
  function authenticationFor(testConfig: ApiConfig) {
    return new AuthenticationService(
      identity,
      testConfig,
      new DeterministicChallengeDelivery(),
      new DisabledHumanVerification(),
      new HumanVerificationPolicy(testConfig),
      new DeterministicChallengeCodeGenerator(testConfig),
      new SafeTelemetry({ export: async () => undefined }),
    );
  }
  const auth = authenticationFor(config);
  let admin: string, a: string, b: string, ka: string, kb: string;
  beforeAll(() => db.$connect());
  afterAll(async () => {
    await clearCustomerData(db);
    await db.$disconnect();
  });
  beforeEach(async () => {
    await clearCustomerData(db);
    admin = (
      await db.account.create({
        data: { mobile: "+8613900010001", role: "ADMINISTRATOR" },
      })
    ).id;
    a = (
      await db.account.create({
        data: { mobile: "+8613900010002", role: "AGENT" },
      })
    ).id;
    b = (
      await db.account.create({
        data: { mobile: "+8613900010003", role: "AGENT" },
      })
    ).id;
    ka = (await entry.issueLink(admin, a)).entryKey;
    kb = (await entry.issueLink(admin, b)).entryKey;
  });
  async function challenge(token?: string, mobile = "13900010101") {
    const c = await auth.requestChallenge(mobile, token);
    return { mobile, challengeId: c.challengeId, code: c.developmentCode! };
  }
  it("homepage does not lock public attribution; retains A's exact key without renewal", async () => {
    const now = new Date();
    const homepage = await entry.resolve({}, now);
    expect(homepage.visitToken).toBeNull();
    expect(await db.agencyEntryVisit.count()).toBe(0);
    const publicVisit = await entry.resolve(
      { entryKey: homepage.entryKey },
      now,
    );
    const acquired = await entry.resolve(
      { entryKey: ka, visitToken: publicVisit.visitToken! },
      new Date(+now + 1000),
    );
    expect(acquired.entryKey).toBe(ka);
    const restored = await entry.resolve(
      { visitToken: acquired.visitToken! },
      new Date(+now + 5000),
    );
    expect(restored).toEqual(acquired);
    expect(Date.parse(acquired.expiresAt!)).toBe(
      +now + 1000 + ACQUISITION_LIFETIME_MS,
    );
    expect(
      (await entry.resolve({ entryKey: kb, visitToken: acquired.visitToken! }))
        .entryKey,
    ).toBe(ka);
  });
  it("serializes the first agent choice within one visit", async () => {
    const publicKey = (await entry.resolve({})).entryKey;
    const visit = await entry.resolve({ entryKey: publicKey });
    const results = await Promise.all(
      [ka, kb].map((key) =>
        entry.resolve({ entryKey: key, visitToken: visit.visitToken! }),
      ),
    );
    expect(new Set(results.map((x) => x.entryKey)).size).toBe(1);
    expect([ka, kb]).toContain(results[0]!.entryKey);
  });
  it("copies a public link without copying another visitor's credential", async () => {
    const one = await entry.resolve({ entryKey: ka });
    const two = await entry.resolve({ entryKey: ka });
    expect(one.entryKey).toBe(two.entryKey);
    expect(one.visitToken).not.toBe(two.visitToken);
    expect(Object.keys(one).sort()).toEqual([
      "entryKey",
      "expiresAt",
      "visitToken",
    ]);
  });
  it("expires at 30 days, allows a new source cycle, and preserves registered history on cleanup", async () => {
    const now = new Date();
    const visit = await entry.resolve({ entryKey: ka }, now);
    const account = await auth.completeChallenge(
      await challenge(visit.visitToken!),
    );
    const after = new Date(+now + ACQUISITION_LIFETIME_MS);
    expect(
      (await entry.resolve({ visitToken: visit.visitToken! }, after))
        .visitToken,
    ).toBeNull();
    expect(
      (
        await entry.resolve(
          { entryKey: kb, visitToken: visit.visitToken! },
          after,
        )
      ).entryKey,
    ).toBe(kb);
    await entry.cleanupExpired(after);
    expect(
      await db.agencyCustomerAttribution.findUnique({
        where: { accountId: account.account.id },
      }),
    ).toMatchObject({ agentAccountId: a });
  });
  it("binds only a genuinely new account, atomically with its session", async () => {
    const visit = await entry.resolve({ entryKey: ka });
    const request = await challenge(visit.visitToken!);
    const account = await auth.completeChallenge(request);
    expect(
      await db.agencyCustomerAttribution.findUnique({
        where: { accountId: account.account.id },
      }),
    ).toMatchObject({ agentAccountId: a, entryKey: ka });
    expect(
      await db.agencyAudit.count({ where: { action: "INITIAL_BIND" } }),
    ).toBe(1);
    const second = await entry.resolve({ entryKey: kb });
    await auth.completeChallenge(await challenge(second.visitToken!));
    expect(
      await db.agencyCustomerAttribution.findUnique({
        where: { accountId: account.account.id },
      }),
    ).toMatchObject({ agentAccountId: a });
    expect(
      await db.agencyAudit.count({ where: { action: "INITIAL_BIND" } }),
    ).toBe(1);
  });
  it("honors an accepted challenge after anonymous expiry and stopping new acquisition", async () => {
    const visit = await entry.resolve({ entryKey: ka });
    const request = await challenge(visit.visitToken!);
    const row = await db.agencyEntryVisit.findFirstOrThrow();
    await db.agencyEntryVisit.update({
      where: { tokenDigest: row.tokenDigest },
      data: { expiresAt: new Date(row.createdAt.getTime() + 1) },
    });
    const stopped = authenticationFor({
      ...config,
      agencyAcquisitionEnabled: false,
    });
    await expect(
      stopped.requestChallenge("13900010102", visit.visitToken!),
    ).rejects.toThrow("入口服务尚未开放");
    const account = await stopped.completeChallenge(request);
    expect(
      await db.agencyCustomerAttribution.findUnique({
        where: { accountId: account.account.id },
      }),
    ).toMatchObject({ agentAccountId: a });
  });

  it("keeps existing customers able to log in after their source is disabled", async () => {
    const visit = await entry.resolve({ entryKey: ka });
    const first = await auth.completeChallenge(
      await challenge(visit.visitToken!),
    );
    await db.account.update({ where: { id: a }, data: { status: "INACTIVE" } });
    await expect(
      entry.resolve({ visitToken: visit.visitToken! }),
    ).rejects.toThrow();
    const c = await auth.requestChallenge("13900010101", undefined, true);
    const login = await auth.completeChallenge({
      mobile: "13900010101",
      challengeId: c.challengeId,
      code: c.developmentCode!,
    });
    expect(login.account.id).toBe(first.account.id);
    expect(
      await db.agencyCustomerAttribution.findUnique({
        where: { accountId: first.account.id },
      }),
    ).toMatchObject({ agentAccountId: a });
    expect(
      await db.agencyAudit.count({ where: { action: "INITIAL_BIND" } }),
    ).toBe(1);
  });
  it("freezes login-only intent server-side and cannot create a new account", async () => {
    const c = await auth.requestChallenge("13900010101", undefined, true);
    expect(
      await db.mobileChallenge.findUnique({ where: { id: c.challengeId } }),
    ).toMatchObject({ existingAccountOnly: true });
    const input = {
      mobile: "13900010101",
      challengeId: c.challengeId,
      code: c.developmentCode!,
      existingAccountOnly: false,
    };
    await expect(auth.completeChallenge(input)).rejects.toMatchObject({
      response: { code: "ACCOUNT_NOT_REGISTERED" },
    });
    expect(
      await db.account.findUnique({ where: { mobile: "+8613900010101" } }),
    ).toBeNull();
    expect(await db.accountSession.count()).toBe(0);
  });
  it("never claims an existing public customer", async () => {
    const account = await auth.completeChallenge(await challenge());
    const visit = await entry.resolve({ entryKey: ka });
    await auth.completeChallenge(await challenge(visit.visitToken!));
    expect(
      await db.agencyCustomerAttribution.findUnique({
        where: { accountId: account.account.id },
      }),
    ).toBeNull();
  });
  it("freezes source per challenge even when public visit later enters A", async () => {
    const publicKey = (await entry.resolve({})).entryKey;
    const visit = await entry.resolve({ entryKey: publicKey });
    const request = await challenge(visit.visitToken!);
    await entry.resolve({ entryKey: ka, visitToken: visit.visitToken! });
    const account = await auth.completeChallenge(request);
    expect(
      await db.agencyCustomerAttribution.findUnique({
        where: { accountId: account.account.id },
      }),
    ).toMatchObject({ agentAccountId: null, entryKey: publicKey });
  });
  it("rolls back account and challenge consumption if the agent became inactive", async () => {
    const visit = await entry.resolve({ entryKey: ka });
    const request = await challenge(visit.visitToken!);
    await db.account.update({ where: { id: a }, data: { status: "INACTIVE" } });
    await expect(auth.completeChallenge(request)).rejects.toMatchObject({
      response: { code: "ENTRY_UNAVAILABLE" },
    });
    expect(
      await db.account.findUnique({ where: { mobile: "+8613900010101" } }),
    ).toBeNull();
    expect(
      (
        await db.mobileChallenge.findUniqueOrThrow({
          where: { id: request.challengeId },
        })
      ).consumedAt,
    ).toBeNull();
    await db.account.update({ where: { id: a }, data: { status: "ACTIVE" } });
    await auth.completeChallenge(request);
    expect(await db.agencyCustomerAttribution.count()).toBe(1);
  });
  it("commits a concurrent challenge once and permits same-account recovery after lost response", async () => {
    const visit = await entry.resolve({ entryKey: ka });
    const request = await challenge(visit.visitToken!);
    const results = await Promise.allSettled([
      auth.completeChallenge(request),
      auth.completeChallenge(request),
    ]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await db.agencyCustomerAttribution.count()).toBe(1);
    await auth.completeChallenge(await challenge(visit.visitToken!));
    expect(
      await db.agencyAudit.count({ where: { action: "INITIAL_BIND" } }),
    ).toBe(1);
  });
  it("requires current administrator and agent roles, issuing one stable link and audit", async () => {
    await expect(entry.issueLink(a, b)).rejects.toThrow("仅管理员");
    const links = await Promise.all([
      entry.issueLink(admin, a),
      entry.issueLink(admin, a),
    ]);
    expect(links).toEqual([{ entryKey: ka }, { entryKey: ka }]);
    expect(
      await db.agencyAudit.count({
        where: { action: "CREATE_LINK", targetAccountId: a },
      }),
    ).toBe(1);
    expect(await entry.ownLink(a)).toEqual({ entryKey: ka });
  });
  it("rejects an invalid entry without deleting an existing good source", async () => {
    const visit = await entry.resolve({ entryKey: ka });
    expect(
      (
        await entry.resolve({
          entryKey: "X".repeat(32),
          visitToken: visit.visitToken!,
        })
      ).entryKey,
    ).toBe(ka);
    await expect(
      entry.resolve({ entryKey: "X".repeat(32) }),
    ).rejects.toMatchObject({ response: { code: "ENTRY_UNAVAILABLE" } });
  });
});
