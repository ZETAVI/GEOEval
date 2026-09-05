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
import {
  browserMutationHeaders,
  trustedTestOrigin,
} from "./http-test-headers.js";
import {
  loginWithDevelopmentChallenge as login,
  requestDevelopmentChallenge,
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

describe("Identity HTTP CSRF boundary", () => {
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

  it("requires JSON, the application header, and exact Origin before issuing a Challenge", async () => {
    const body = JSON.stringify({ mobile: "13900005201" });
    const rejected = [
      {
        headers: {
          "x-geoeval-request": "1",
          origin: trustedTestOrigin,
        },
        status: 415,
        code: "JSON_CONTENT_TYPE_REQUIRED",
      },
      {
        headers: {
          "content-type": "text/plain",
          "x-geoeval-request": "1",
          origin: trustedTestOrigin,
        },
        status: 415,
        code: "JSON_CONTENT_TYPE_REQUIRED",
      },
      {
        headers: {
          "content-type": "application/json",
          origin: trustedTestOrigin,
        },
        status: 403,
        code: "APPLICATION_HEADER_REQUIRED",
      },
      {
        headers: {
          "content-type": "application/json",
          "x-geoeval-request": "0",
          origin: trustedTestOrigin,
        },
        status: 403,
        code: "APPLICATION_HEADER_REQUIRED",
      },
      {
        headers: {
          "content-type": "application/json",
          "x-geoeval-request": "1",
        },
        status: 403,
        code: "ORIGIN_FORBIDDEN",
      },
      {
        headers: {
          "content-type": "application/json",
          "x-geoeval-request": "1",
          origin: `${trustedTestOrigin}.attacker.invalid`,
        },
        status: 403,
        code: "ORIGIN_FORBIDDEN",
      },
    ];

    for (const scenario of rejected) {
      const response = await fetch(`${baseUrl}/identity/challenges`, {
        method: "POST",
        headers: scenario.headers,
        body,
      });
      await expectCsrfFailure(response, scenario.status, scenario.code);
    }
    expect(await prisma.mobileChallenge.count()).toBe(0);

    const accepted = await fetch(`${baseUrl}/identity/challenges`, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-geoeval-request": "1",
        origin: trustedTestOrigin,
      },
      body,
    });
    expect(accepted.status).toBe(201);
    expect(await prisma.mobileChallenge.count()).toBe(1);
  });

  it("does not consume a valid Challenge until Session creation passes CSRF", async () => {
    const challenge = await requestDevelopmentChallenge(baseUrl, "13900005211");
    const body = JSON.stringify({
      challengeId: challenge.challengeId,
      mobile: "13900005211",
      code: challenge.developmentCode,
    });

    const missingHeader = await fetch(`${baseUrl}/identity/sessions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: trustedTestOrigin,
      },
      body,
    });
    await expectCsrfFailure(missingHeader, 403, "APPLICATION_HEADER_REQUIRED");
    const wrongType = await fetch(`${baseUrl}/identity/sessions`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-geoeval-request": "1",
        origin: trustedTestOrigin,
      },
      body,
    });
    await expectCsrfFailure(wrongType, 415, "JSON_CONTENT_TYPE_REQUIRED");
    expect(
      await prisma.mobileChallenge.findUniqueOrThrow({
        where: { id: challenge.challengeId },
      }),
    ).toMatchObject({ consumedAt: null });
    expect(await prisma.accountSession.count()).toBe(0);

    const accepted = await fetch(`${baseUrl}/identity/sessions`, {
      method: "POST",
      headers: browserMutationHeaders(),
      body,
    });
    expect(accepted.status).toBe(201);
    expect(await prisma.accountSession.count()).toBe(1);
  });

  it("keeps rejected current and logout-all requests side-effect free", async () => {
    const first = await login(baseUrl, "13900005221");
    const second = await login(baseUrl, "13900005221");
    const safeRead = await fetch(`${baseUrl}/identity/me`, {
      headers: { cookie: first.cookie },
    });
    expect(safeRead.status).toBe(200);

    const missingType = await fetch(`${baseUrl}/identity/session`, {
      method: "DELETE",
      headers: { cookie: first.cookie },
    });
    await expectCsrfFailure(missingType, 415, "JSON_CONTENT_TYPE_REQUIRED");
    const missingOrigin = await fetch(`${baseUrl}/identity/session`, {
      method: "DELETE",
      headers: {
        cookie: first.cookie,
        "content-type": "application/json",
        "x-geoeval-request": "1",
      },
    });
    await expectCsrfFailure(missingOrigin, 403, "ORIGIN_FORBIDDEN");
    const wrongHeader = await fetch(`${baseUrl}/identity/sessions`, {
      method: "DELETE",
      headers: {
        cookie: second.cookie,
        "content-type": "application/json",
        "x-geoeval-request": "wrong",
        origin: trustedTestOrigin,
      },
    });
    await expectCsrfFailure(wrongHeader, 403, "APPLICATION_HEADER_REQUIRED");
    expect(
      await prisma.accountSession.count({ where: { revokedAt: null } }),
    ).toBe(2);

    const currentLogout = await fetch(`${baseUrl}/identity/session`, {
      method: "DELETE",
      headers: browserMutationHeaders(first.cookie),
    });
    expect(currentLogout.status).toBe(204);
    expect(
      await prisma.accountSession.count({ where: { revokedAt: null } }),
    ).toBe(1);

    const logoutAll = await fetch(`${baseUrl}/identity/sessions`, {
      method: "DELETE",
      headers: browserMutationHeaders(second.cookie),
    });
    expect(logoutAll.status).toBe(204);
    expect(
      await prisma.accountSession.count({ where: { revokedAt: null } }),
    ).toBe(0);
  });

  it("advertises credentials only for the exact configured preflight Origin", async () => {
    const preflightHeaders = {
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type,x-geoeval-request",
    };
    const trusted = await fetch(`${baseUrl}/identity/challenges`, {
      method: "OPTIONS",
      headers: { ...preflightHeaders, origin: trustedTestOrigin },
    });
    expect(trusted.status).toBe(204);
    expect(trusted.headers.get("access-control-allow-origin")).toBe(
      trustedTestOrigin,
    );
    expect(trusted.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );

    const untrusted = await fetch(`${baseUrl}/identity/challenges`, {
      method: "OPTIONS",
      headers: {
        ...preflightHeaders,
        origin: `${trustedTestOrigin}.attacker.invalid`,
      },
    });
    expect(untrusted.headers.get("access-control-allow-origin")).toBeNull();
    expect(untrusted.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );
  });
});

async function expectCsrfFailure(
  response: Response,
  status: number,
  code: string,
): Promise<void> {
  expect(response.status).toBe(status);
  expect(await response.json()).toMatchObject({ code });
}
