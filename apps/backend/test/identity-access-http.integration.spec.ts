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
import { sessionDigest } from "../src/identity/domain/identity.crypto.js";
import type { AccountRole } from "../src/identity/domain/identity.types.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { browserMutationHeaders } from "./http-test-headers.js";
import {
  loginWithDevelopmentChallenge as login,
  requestDevelopmentChallenge as requestChallenge,
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

describe("Identity HTTP role and forgery boundary", () => {
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

  it("keeps public signup and every pre-provisioned internal login on one fixed role", async () => {
    const customer = await login(baseUrl, "13900005001", {
      role: "ADMINISTRATOR",
      status: "ACTIVE",
    });
    expect(customer.account.role).toBe("TERMINAL_CUSTOMER");
    expect(customer.setCookie).toContain("Expires=");

    for (const [mobile, role] of [
      ["+8613900005002", "OPERATIONS"],
      ["+8613900005003", "ADMINISTRATOR"],
      ["+8613900005004", "AGENT"],
    ] as const) {
      const provisioned = await prisma.account.create({
        data: { mobile, role },
      });
      const authenticated = await login(baseUrl, mobile.slice(3), {
        role: "TERMINAL_CUSTOMER",
        accountId: customer.account.id,
      });

      expect(authenticated.account).toMatchObject({
        id: provisioned.id,
        mobile,
        role,
      });
      expect(authenticated.setCookie).not.toContain("Expires=");
    }

    expect(
      await prisma.account.count({
        where: { role: "TERMINAL_CUSTOMER" },
      }),
    ).toBe(1);
  });

  it("rejects valid Challenge completion for an inactive pre-provisioned account", async () => {
    const account = await prisma.account.create({
      data: {
        mobile: "+8613900005011",
        role: "OPERATIONS",
        status: "INACTIVE",
      },
    });
    const challenge = await requestChallenge(baseUrl, "13900005011");

    const response = await fetch(`${baseUrl}/identity/sessions`, {
      method: "POST",
      headers: browserMutationHeaders(),
      body: JSON.stringify({
        challengeId: challenge.challengeId,
        mobile: "13900005011",
        code: challenge.developmentCode,
      }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining("账号不可用"),
    });
    expect(
      await prisma.accountSession.count({ where: { accountId: account.id } }),
    ).toBe(0);
    expect(
      await prisma.account.findUniqueOrThrow({ where: { id: account.id } }),
    ).toMatchObject({ role: "OPERATIONS", status: "INACTIVE" });
  });

  it("enforces the four-role allow and deny matrix at HTTP boundaries", async () => {
    const sessions = await createRoleSessions(prisma, baseUrl);
    const surfaces = [
      {
        path: "/identity/me",
        allowed: allRoles,
      },
      {
        path: "/media-catalog/categories",
        allowed: allRoles,
      },
      {
        path: "/brands",
        allowed: ["TERMINAL_CUSTOMER"],
      },
      {
        path: "/notifications",
        allowed: ["TERMINAL_CUSTOMER", "AGENT"],
      },
      {
        path: "/admin/accounts",
        allowed: ["ADMINISTRATOR"],
      },
      {
        path: "/admin/media/platforms",
        allowed: ["ADMINISTRATOR"],
      },
    ] satisfies Array<{ path: string; allowed: AccountRole[] }>;

    for (const surface of surfaces) {
      for (const role of allRoles) {
        const response = await fetch(`${baseUrl}${surface.path}`, {
          headers: { cookie: sessions[role].cookie },
        });
        if (surface.allowed.includes(role)) {
          expect(response.status, `${role} -> ${surface.path}`).toBe(200);
        } else {
          expect(response.status, `${role} -> ${surface.path}`).toBe(403);
          expect(await response.json()).toMatchObject({
            code: "ACCOUNT_ROLE_FORBIDDEN",
          });
        }
      }
    }
  });

  it("rejects forged credentials and derives governance actor from the Session", async () => {
    const customer = await login(baseUrl, "13900005021");
    const administratorAccount = await prisma.account.create({
      data: { mobile: "+8613900005022", role: "ADMINISTRATOR" },
    });
    const administrator = await login(baseUrl, "13900005022");
    const storedSession = await prisma.accountSession.findFirstOrThrow({
      where: { accountId: administratorAccount.id },
    });

    for (const cookie of [
      "geoeval_session=random-opaque-value",
      `geoeval_session=${storedSession.tokenDigest}`,
      "geoeval_session=%E0%A4%A",
      `__Host-geoeval_session=${cookieValue(administrator.cookie)}`,
    ]) {
      const response = await fetch(`${baseUrl}/identity/me`, {
        headers: { cookie },
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        code: "AUTHENTICATION_REQUIRED",
        message: "请先登录",
      });
    }

    const denied = await fetch(`${baseUrl}/admin/accounts`, {
      method: "POST",
      headers: browserMutationHeaders(customer.cookie),
      body: JSON.stringify({
        mobile: "13900005023",
        role: "AGENT",
        reason: "客户伪造管理员路径",
      }),
    });
    expect(denied.status).toBe(403);
    expect(
      await prisma.account.count({ where: { mobile: "+8613900005023" } }),
    ).toBe(0);

    const accepted = await fetch(`${baseUrl}/admin/accounts`, {
      method: "POST",
      headers: browserMutationHeaders(administrator.cookie),
      body: JSON.stringify({
        mobile: "13900005024",
        role: "AGENT",
        reason: "验证服务端治理 Actor",
        actorAccountId: customer.account.id,
        status: "INACTIVE",
        revision: 999,
      }),
    });
    expect(accepted.status).toBe(201);
    const created = (await accepted.json()) as { id: string };
    expect(
      await prisma.identityGovernanceAudit.findFirstOrThrow({
        where: { targetAccountId: created.id },
      }),
    ).toMatchObject({ actorAccountId: administratorAccount.id });
    expect(
      await prisma.account.findUniqueOrThrow({ where: { id: created.id } }),
    ).toMatchObject({ role: "AGENT", status: "ACTIVE", revision: 1 });
  });

  it("rejects null or malformed Identity and Governance bodies without a server error", async () => {
    const nullChallenge = await fetch(`${baseUrl}/identity/challenges`, {
      method: "POST",
      headers: browserMutationHeaders(),
      body: "null",
    });
    expect(nullChallenge.status).toBe(400);

    const invalidSession = await fetch(`${baseUrl}/identity/sessions`, {
      method: "POST",
      headers: browserMutationHeaders(),
      body: JSON.stringify({
        challengeId: "not-a-uuid",
        mobile: "13900005031",
        code: "246810",
      }),
    });
    expect(invalidSession.status).toBe(400);
    const nullSession = await fetch(`${baseUrl}/identity/sessions`, {
      method: "POST",
      headers: browserMutationHeaders(),
      body: "null",
    });
    expect(nullSession.status).toBe(400);

    await prisma.account.create({
      data: { mobile: "+8613900005032", role: "ADMINISTRATOR" },
    });
    const administrator = await login(baseUrl, "13900005032");
    const nullCreate = await fetch(`${baseUrl}/admin/accounts`, {
      method: "POST",
      headers: browserMutationHeaders(administrator.cookie),
      body: "null",
    });
    expect(nullCreate.status).toBe(400);
    const nullStatus = await fetch(
      `${baseUrl}/admin/accounts/${administrator.account.id}/status`,
      {
        method: "PATCH",
        headers: browserMutationHeaders(administrator.cookie),
        body: "null",
      },
    );
    expect(nullStatus.status).toBe(400);
    const repeatedSearch = await fetch(
      `${baseUrl}/admin/accounts?search=139&search=138`,
      { headers: { cookie: administrator.cookie } },
    );
    expect(repeatedSearch.status).toBe(400);
    expect(await repeatedSearch.json()).toMatchObject({
      message: "search 必须是单个字符串",
    });
    expect(await prisma.identityGovernanceAudit.count()).toBe(0);
  });
});

const allRoles: AccountRole[] = [
  "TERMINAL_CUSTOMER",
  "OPERATIONS",
  "ADMINISTRATOR",
  "AGENT",
];

async function createRoleSessions(
  prisma: PrismaService,
  baseUrl: string,
): Promise<Record<AccountRole, Awaited<ReturnType<typeof login>>>> {
  await prisma.account.createMany({
    data: [
      { mobile: "+8613900005032", role: "OPERATIONS" },
      { mobile: "+8613900005033", role: "ADMINISTRATOR" },
      { mobile: "+8613900005034", role: "AGENT" },
    ],
  });
  const entries = await Promise.all([
    login(baseUrl, "13900005031"),
    login(baseUrl, "13900005032"),
    login(baseUrl, "13900005033"),
    login(baseUrl, "13900005034"),
  ]);
  return Object.fromEntries(
    allRoles.map((role, index) => [role, entries[index]]),
  ) as Record<AccountRole, Awaited<ReturnType<typeof login>>>;
}

function cookieValue(cookie: string): string {
  return cookie.slice(cookie.indexOf("=") + 1);
}
