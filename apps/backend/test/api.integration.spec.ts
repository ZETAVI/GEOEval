import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiApp } from "../src/api-app.js";
import { loadApiConfig } from "../src/config/runtime-config.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";

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
    await clearCustomerData(prisma);
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

  it("serves the fixed definition and idempotent official-start contract", async () => {
    const cookie = await login(baseUrl, "13900000004");
    const brandResponse = await fetch(`${baseUrl}/brands`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        companyName: "HTTP 评测测试品牌",
        primaryIndustry: "餐饮",
        secondaryIndustry: "咖啡店",
        characteristicOne: "安静办公",
        characteristicTwo: "精品手冲",
        province: "广东省",
        city: "广州市",
        district: "天河区",
        contactName: "林先生",
        contactMobile: "13900000004",
      }),
    });
    const brand = (await brandResponse.json()) as { id: string };

    const definitionResponse = await fetch(
      `${baseUrl}/brands/${brand.id}/evaluation-definition`,
      { method: "PUT", headers: { cookie } },
    );
    expect(definitionResponse.status).toBe(200);
    const definition = (await definitionResponse.json()) as {
      id: string;
      questions: unknown[];
      platforms: Array<Record<string, unknown>>;
      objectivityProfile?: unknown;
    };
    expect(definition.questions).toHaveLength(4);
    expect(definition.platforms).toHaveLength(5);
    expect(definition.platforms[0]).toEqual({
      key: "deepseek",
      label: "DeepSeek",
    });
    expect(definition.objectivityProfile).toBeUndefined();
    expect(definition).not.toHaveProperty("inputFingerprint");

    const firstStart = await fetch(
      `${baseUrl}/evaluation-definitions/${definition.id}/runs`,
      { method: "POST", headers: { cookie } },
    );
    const firstRun = (await firstStart.json()) as {
      id: string;
      expectedSampleCount: number;
      correlationId?: string;
    };
    expect(firstStart.status).toBe(201);
    expect(firstRun.expectedSampleCount).toBe(20);
    expect(firstRun.correlationId).toBeUndefined();

    const duplicateStart = await fetch(
      `${baseUrl}/evaluation-definitions/${definition.id}/runs`,
      { method: "POST", headers: { cookie } },
    );
    expect((await duplicateStart.json()).id).toBe(firstRun.id);
    expect(await prisma.evaluationRun.count()).toBe(1);
    expect(await prisma.evaluationSample.count()).toBe(20);
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

async function login(baseUrl: string, mobile: string): Promise<string> {
  const challengeResponse = await fetch(`${baseUrl}/identity/challenges`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mobile }),
  });
  const challenge = (await challengeResponse.json()) as {
    challengeId: string;
    developmentCode: string;
  };
  const sessionResponse = await fetch(`${baseUrl}/identity/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challengeId: challenge.challengeId,
      mobile,
      code: challenge.developmentCode,
    }),
  });
  return sessionResponse.headers.get("set-cookie")!;
}
