import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiApp } from "../src/api-app.js";
import { loadApiConfig } from "../src/config/runtime-config.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";

const config = loadApiConfig({ GEOEVAL_LOCAL_DEFAULTS: "1", NODE_ENV: "test" });

describe("customer-entry HTTP contract", () => {
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
  beforeEach(async () => {
    await prisma.brandContext.deleteMany();
    await prisma.brandProfile.deleteMany();
    await prisma.accountSession.deleteMany();
    await prisma.account.deleteMany();
    await prisma.mobileChallenge.deleteMany();
  });

  it("serves login, cookie authentication, and an account-owned first brand", async () => {
    const challengeResponse = await fetch(`${baseUrl}/identity/challenges`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mobile: "13900000003" }),
    });
    expect(challengeResponse.status).toBe(201);
    const challenge = (await challengeResponse.json()) as {
      challengeId: string;
      developmentCode: string;
    };

    const sessionResponse = await fetch(`${baseUrl}/identity/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challengeId: challenge.challengeId,
        mobile: "13900000003",
        code: challenge.developmentCode,
      }),
    });
    expect(sessionResponse.status).toBe(201);
    const cookie = sessionResponse.headers.get("set-cookie");
    expect(cookie).toContain("geoeval_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");

    const meResponse = await fetch(`${baseUrl}/identity/me`, {
      headers: { cookie: cookie! },
    });
    expect(meResponse.status).toBe(200);

    const brandResponse = await fetch(`${baseUrl}/brands`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookie! },
      body: JSON.stringify({ companyName: "HTTP 契约测试品牌" }),
    });
    expect(brandResponse.status).toBe(201);
    expect(await brandResponse.json()).toMatchObject({
      companyName: "HTTP 契约测试品牌",
      contactMobile: "+8613900000003",
      isCurrent: true,
      readyForEvaluation: false,
    });
  });

  it("advertises credentialed CORS only to configured origins", async () => {
    const response = await fetch(`${baseUrl}/identity/challenges`, {
      method: "OPTIONS",
      headers: {
        origin: "http://127.0.0.1:3200",
        "access-control-request-method": "POST",
      },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://127.0.0.1:3200",
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );
  });
});
