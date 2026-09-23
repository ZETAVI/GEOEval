import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApiApp } from "../src/api-app.js";
import { ApiModule } from "../src/api.module.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import { loginWithDevelopmentChallenge as login } from "./identity-http-fixtures.js";

const base = loadIntegrationApiConfig();
const config = {
  ...base,
  agencyAcquisitionEnabled: true,
  authChallengePolicy: { ...base.authChallengePolicy, resendIntervalMs: 0 },
};
describe("agency HTTP authority and default activation", () => {
  const db = new PrismaService(config.databaseUrl);
  let app: INestApplication, url: string;
  beforeAll(async () => {
    await db.$connect();
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    url = await app.getUrl();
  });
  afterAll(async () => {
    await app.close();
    await clearCustomerData(db);
    await db.$disconnect();
  });
  beforeEach(() => clearCustomerData(db));
  async function provision(
    role: "AGENT" | "ADMINISTRATOR" | "OPERATIONS",
    mobile: string,
  ) {
    await db.account.create({ data: { mobile: `+86${mobile}`, role } });
    return login(url, mobile);
  }
  async function post(path: string, body: unknown, cookie?: string) {
    return fetch(`${url}${path}`, {
      method: "POST",
      headers: { ...browserMutationHeaders(), ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    });
  }
  it("allows only administrators to issue an agent entry and only the agent to read its own", async () => {
    const agent = await provision("AGENT", "13900010201");
    const admin = await provision("ADMINISTRATOR", "13900010202");
    const customer = await login(url, "13900010203");
    const operator = await provision("OPERATIONS", "13900010204");
    const path = `/agency/agents/${agent.account.id}/entry`;
    for (const cookie of [agent.cookie, customer.cookie, operator.cookie])
      expect((await post(path, {}, cookie)).status).toBe(403);
    expect((await post(path, {})).status).toBe(401);
    const response = await post(path, {}, admin.cookie);
    expect(response.status).toBe(201);
    const data = await response.json();
    const own = await fetch(`${url}/agency/entry`, {
      headers: { cookie: agent.cookie },
    });
    expect(own.status).toBe(200);
    expect(await own.json()).toEqual(data);
    expect(
      (
        await fetch(`${url}/agency/entry`, {
          headers: { cookie: customer.cookie },
        })
      ).status,
    ).toBe(403);
    expect(await db.agencyAudit.count()).toBe(1);
  });
  it("keeps public context protected by normal origin/header checks and stores only a credential digest", async () => {
    expect(
      (
        await fetch(`${url}/agency/entry/resolve`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        })
      ).status,
    ).toBe(403);
    const publicResult = await post("/agency/entry/resolve", {});
    expect(publicResult.status).toBe(201);
    const { entryKey } = await publicResult.json();
    const visit = await (
      await post("/agency/entry/resolve", { entryKey })
    ).json();
    const row = await db.agencyEntryVisit.findFirstOrThrow();
    expect(row.tokenDigest).not.toBe(visit.visitToken);
    expect(Object.keys(visit).sort()).toEqual([
      "entryKey",
      "expiresAt",
      "visitToken",
    ]);
    const challengeResponse = await post("/identity/challenges", {
      mobile: "13900010205",
      acquisitionVisitToken: visit.visitToken,
    });
    expect(challengeResponse.status).toBe(201);
    const challenge = await challengeResponse.json();
    const completed = await post("/identity/sessions", {
      mobile: "13900010205",
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
      agentAccountId: "forged",
    });
    expect(completed.status).toBe(201);
    expect(completed.headers.get("set-cookie")).toContain("HttpOnly");
    const account = await completed.json();
    expect(
      await db.agencyCustomerAttribution.findUnique({
        where: { accountId: account.id },
      }),
    ).toMatchObject({ agentAccountId: null });
  });
  it("rejects non-string source credentials without issuing a challenge", async () => {
    for (const acquisitionVisitToken of [
      null,
      ["T".repeat(43)],
      { token: "T".repeat(43) },
    ]) {
      const response = await post("/identity/challenges", {
        mobile: "13900010206",
        acquisitionVisitToken,
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        code: "ENTRY_UNAVAILABLE",
      });
    }
    expect(await db.mobileChallenge.count()).toBe(0);
  });
  it("defaults closed and permits explicit production pilot activation", async () => {
    expect(base.agencyAcquisitionEnabled).toBe(false);
    expect(() =>
      ApiModule.register({
        ...config,
        runtimeEnvironment: "production",
        geoOptimizationWriterMode: "demo",
      }),
    ).not.toThrow();
    const disabled = await createApiApp(base, false);
    await disabled.listen(0, "127.0.0.1");
    try {
      const response = await fetch(
        `${await disabled.getUrl()}/agency/entry/resolve`,
        { method: "POST", headers: browserMutationHeaders(), body: "{}" },
      );
      expect(response.status).toBe(503);
    } finally {
      await disabled.close();
    }
  });
});
