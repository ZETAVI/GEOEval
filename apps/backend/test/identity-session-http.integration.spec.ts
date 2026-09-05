import type { INestApplication } from "@nestjs/common";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import {
  loginWithDevelopmentChallenge as login,
  requestDevelopmentChallenge,
  type HttpSessionFixture,
} from "./identity-http-fixtures.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const baseConfig = loadIntegrationApiConfig();
const config = {
  ...baseConfig,
  authChallengePolicy: {
    ...baseConfig.authChallengePolicy,
    resendIntervalMs: 0,
  },
};

describe("Identity HTTP Session lifecycle", () => {
  const prisma = new PrismaService(config.databaseUrl);
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    await prisma.$connect();
    app = await createApiApp(config, false);
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });
  beforeEach(async () => clearCustomerData(prisma));
  afterEach(async () => clearCustomerData(prisma));

  it("separates current logout from self logout-all across parallel Sessions", async () => {
    const first = await login(baseUrl, "13900005101");
    const second = await login(baseUrl, "13900005101");

    const currentLogout = await fetch(`${baseUrl}/identity/session`, {
      method: "DELETE",
      headers: browserMutationHeaders(first.cookie),
    });
    expect(currentLogout.status).toBe(204);
    expect(currentLogout.headers.get("set-cookie")).toContain("Max-Age=0");
    await expectSessionFailure(baseUrl, first.cookie, "SESSION_REVOKED");
    await expectSessionReady(baseUrl, second);

    const third = await login(baseUrl, "13900005101");
    const logoutAll = await fetch(`${baseUrl}/identity/sessions`, {
      method: "DELETE",
      headers: browserMutationHeaders(second.cookie),
    });
    expect(logoutAll.status).toBe(204);
    expect(logoutAll.headers.get("set-cookie")).toContain("Max-Age=0");
    await expectSessionFailure(baseUrl, second.cookie, "SESSION_REVOKED");
    await expectSessionFailure(baseUrl, third.cookie, "SESSION_REVOKED");

    expect(
      await prisma.accountSession.count({
        where: {
          accountId: first.account.id,
          revokedReason: "USER_LOGOUT",
        },
      }),
    ).toBe(1);
    expect(
      await prisma.accountSession.count({
        where: {
          accountId: first.account.id,
          revokedReason: "USER_LOGOUT_ALL",
        },
      }),
    ).toBe(2);
  });

  it("returns the same bounded expiry code for idle and absolute limits", async () => {
    const idle = await login(baseUrl, "13900005111");
    const absolute = await login(baseUrl, "13900005112");
    const now = Date.now();
    await prisma.accountSession.updateMany({
      where: { accountId: idle.account.id },
      data: {
        expiresAt: new Date(now + 60_000),
        idleExpiresAt: new Date(now - 1),
      },
    });
    await prisma.accountSession.updateMany({
      where: { accountId: absolute.account.id },
      data: {
        expiresAt: new Date(now - 1),
        idleExpiresAt: new Date(now + 60_000),
      },
    });

    await expectSessionFailure(baseUrl, idle.cookie, "SESSION_EXPIRED");
    await expectSessionFailure(baseUrl, absolute.cookie, "SESSION_EXPIRED");
  });

  it("revokes all target Sessions, then invalidates the next Session on role change", async () => {
    const administratorAccount = await prisma.account.create({
      data: { mobile: "+8613900005121", role: "ADMINISTRATOR" },
    });
    const operationsAccount = await prisma.account.create({
      data: { mobile: "+8613900005122", role: "OPERATIONS" },
    });
    const administrator = await login(baseUrl, "13900005121");
    const first = await login(baseUrl, "13900005122");
    const second = await login(baseUrl, "13900005122");

    const revoked = await fetch(
      `${baseUrl}/admin/accounts/${operationsAccount.id}/sessions`,
      {
        method: "DELETE",
        headers: browserMutationHeaders(administrator.cookie),
        body: JSON.stringify({
          expectedRevision: 1,
          reason: "验证管理员撤销全部会话",
        }),
      },
    );
    expect(revoked.status).toBe(200);
    expect(await revoked.json()).toMatchObject({ revision: 1 });
    await expectSessionFailure(baseUrl, first.cookie, "SESSION_REVOKED");
    await expectSessionFailure(baseUrl, second.cookie, "SESSION_REVOKED");

    const third = await login(baseUrl, "13900005122");
    const changed = await fetch(
      `${baseUrl}/admin/accounts/${operationsAccount.id}/role`,
      {
        method: "PATCH",
        headers: browserMutationHeaders(administrator.cookie),
        body: JSON.stringify({
          expectedRevision: 1,
          reason: "调整为代理商职责",
          role: "AGENT",
        }),
      },
    );
    expect(changed.status).toBe(200);
    expect(await changed.json()).toMatchObject({ role: "AGENT", revision: 2 });
    await expectSessionFailure(baseUrl, third.cookie, "SESSION_REVOKED");

    const fourth = await login(baseUrl, "13900005122");
    expect(fourth.account).toMatchObject({
      id: operationsAccount.id,
      role: "AGENT",
      revision: 2,
    });
    await expectSessionReady(baseUrl, administrator);
    expect(
      await prisma.accountSession.count({
        where: {
          accountId: operationsAccount.id,
          revokedReason: "ADMIN_REVOKE_ALL",
        },
      }),
    ).toBe(2);
    expect(
      await prisma.accountSession.count({
        where: {
          accountId: operationsAccount.id,
          revokedReason: "ROLE_CHANGED",
        },
      }),
    ).toBe(1);
    expect(
      await prisma.identityGovernanceAudit.count({
        where: {
          actorAccountId: administratorAccount.id,
          targetAccountId: operationsAccount.id,
        },
      }),
    ).toBe(2);
  });

  it("keeps deactivated Sessions dead after activation and permits new authentication", async () => {
    await prisma.account.create({
      data: { mobile: "+8613900005131", role: "ADMINISTRATOR" },
    });
    const operationsAccount = await prisma.account.create({
      data: { mobile: "+8613900005132", role: "OPERATIONS" },
    });
    const administrator = await login(baseUrl, "13900005131");
    const oldSession = await login(baseUrl, "13900005132");

    const deactivated = await fetch(
      `${baseUrl}/admin/accounts/${operationsAccount.id}/status`,
      {
        method: "PATCH",
        headers: browserMutationHeaders(administrator.cookie),
        body: JSON.stringify({
          expectedRevision: 1,
          reason: "验证停用会话失效",
          status: "INACTIVE",
        }),
      },
    );
    expect(deactivated.status).toBe(200);
    expect(await deactivated.json()).toMatchObject({
      status: "INACTIVE",
      revision: 2,
    });
    await expectSessionFailure(baseUrl, oldSession.cookie, "ACCOUNT_INACTIVE");

    const challenge = await requestDevelopmentChallenge(baseUrl, "13900005132");
    const blockedLogin = await fetch(`${baseUrl}/identity/sessions`, {
      method: "POST",
      headers: browserMutationHeaders(),
      body: JSON.stringify({
        challengeId: challenge.challengeId,
        mobile: "13900005132",
        code: challenge.developmentCode,
      }),
    });
    expect(blockedLogin.status).toBe(401);
    expect(
      await prisma.accountSession.count({
        where: { accountId: operationsAccount.id },
      }),
    ).toBe(1);

    const activated = await fetch(
      `${baseUrl}/admin/accounts/${operationsAccount.id}/status`,
      {
        method: "PATCH",
        headers: browserMutationHeaders(administrator.cookie),
        body: JSON.stringify({
          expectedRevision: 2,
          reason: "验证恢复后重新认证",
          status: "ACTIVE",
        }),
      },
    );
    expect(activated.status).toBe(200);
    expect(await activated.json()).toMatchObject({
      status: "ACTIVE",
      revision: 3,
    });
    await expectSessionFailure(baseUrl, oldSession.cookie, "SESSION_REVOKED");

    const newSession = await login(baseUrl, "13900005132");
    expect(newSession.account).toMatchObject({
      id: operationsAccount.id,
      role: "OPERATIONS",
      status: "ACTIVE",
      revision: 3,
    });
    expect(
      await prisma.accountSession.count({
        where: {
          accountId: operationsAccount.id,
          revokedReason: "ACCOUNT_DEACTIVATED",
        },
      }),
    ).toBe(1);
  });
});

async function expectSessionReady(
  baseUrl: string,
  session: HttpSessionFixture,
): Promise<void> {
  const response = await fetch(`${baseUrl}/identity/me`, {
    headers: { cookie: session.cookie },
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ id: session.account.id });
}

async function expectSessionFailure(
  baseUrl: string,
  cookie: string,
  code: "ACCOUNT_INACTIVE" | "SESSION_REVOKED" | "SESSION_EXPIRED",
): Promise<void> {
  const response = await fetch(`${baseUrl}/identity/me`, {
    headers: { cookie },
  });
  expect(response.status).toBe(401);
  expect(await response.json()).toMatchObject({ code });
}
