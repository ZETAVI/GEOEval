import { randomUUID } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
import { createEvaluationQuestionPreparationHarness } from "./evaluation-question-preparation-harness.js";

const config = loadIntegrationApiConfig();

describe("customer-entry HTTP contract", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const questionPreparation =
    createEvaluationQuestionPreparationHarness(prisma);
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

  it("reports the running API as ready", async () => {
    const response = await fetch(`${baseUrl}/health/ready`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
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

  it("serves dependent industry choices without a second writable region standard", async () => {
    const cookie = await login(baseUrl, "13900000013");
    const industries = await fetch(
      `${baseUrl}/brand-reference-data/industries`,
      { headers: { cookie } },
    );
    expect(industries.status).toBe(200);
    expect((await industries.json()).primaryIndustries).toHaveLength(13);

    const legacyRegionSelector = await fetch(
      `${baseUrl}/brand-reference-data/regions/provinces`,
      { headers: { cookie } },
    );
    expect(legacyRegionSelector.status).toBe(404);
  });

  it("serves the fixed definition and idempotent official-start contract", async () => {
    const cookie = await login(baseUrl, "13900000004");
    const verificationResponse = await fetch(
      `${baseUrl}/brand-location-verifications`,
      {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          searchInput: "广州塔",
          providerPlaceId: "fixture-guangzhou-tower",
        }),
      },
    );
    expect(verificationResponse.status).toBe(201);
    const verification = (await verificationResponse.json()) as {
      verificationReceipt: string;
      queryLocality: { kind: string; label: string };
      locationPreview: {
        officialRegion: { terminal: { label: string } };
      };
    };
    expect(verification.locationPreview.officialRegion.terminal.label).toBe(
      "海珠区",
    );
    expect(verification.queryLocality).toEqual({
      kind: "BUSINESS_AREA",
      label: "赤岗",
    });
    const brandResponse = await fetch(`${baseUrl}/brands`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        companyName: "HTTP 评测测试品牌",
        primaryIndustryId: "IND-01",
        secondaryIndustryId: "IND-01-02",
        flagshipProductOrService: "精品手冲咖啡",
        characteristics: ["安静办公", "精品手冲"],
        contactName: "林先生",
        contactMobile: "13900000004",
        locationChange: {
          action: "REPLACE",
          verificationReceipt: verification.verificationReceipt,
        },
      }),
    });
    const brand = (await brandResponse.json()) as {
      id: string;
      primaryIndustryLabel: string;
      storeLocation: {
        officialRegion: { terminal: { label: string } };
        queryLocality: { label: string };
      };
    };
    expect(brand).toMatchObject({
      primaryIndustryLabel: "本地生活与门店服务",
      storeLocation: {
        officialRegion: { terminal: { label: "海珠区" } },
        queryLocality: { label: "赤岗" },
      },
    });

    const definitionResponse = await fetch(
      `${baseUrl}/brands/${brand.id}/evaluation-definition`,
      { method: "PUT", headers: { cookie } },
    );
    expect(definitionResponse.status).toBe(200);
    const preparing = (await definitionResponse.json()) as {
      status: string;
      preparationId: string;
      definition: null;
    };
    expect(preparing).toMatchObject({ status: "PREPARING", definition: null });
    await questionPreparation.processPreparation(preparing.preparationId);

    const readyResponse = await fetch(
      `${baseUrl}/brands/${brand.id}/evaluation-definition`,
      { headers: { cookie } },
    );
    const readyEnvelope = (await readyResponse.json()) as {
      preparation: {
        status: string;
        preparationId: string;
        definition: {
          id: string;
          questions: unknown[];
          platforms: Array<Record<string, unknown>>;
          objectivityProfile?: unknown;
          inputFingerprint?: unknown;
        };
      };
    };
    const ready = readyEnvelope.preparation;
    expect(ready.status).toBe("READY");
    const definition = ready.definition;
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

  it("keeps the current-report route account-scoped", async () => {
    const unauthenticated = await fetch(
      `${baseUrl}/brands/not-owned/evaluation-report`,
    );
    expect(unauthenticated.status).toBe(401);

    const ownerCookie = await login(baseUrl, "13900000005");
    const brandResponse = await fetch(`${baseUrl}/brands`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: ownerCookie },
      body: JSON.stringify({ companyName: "报告权限测试品牌" }),
    });
    const brand = (await brandResponse.json()) as { id: string };
    const ownerRead = await fetch(
      `${baseUrl}/brands/${brand.id}/evaluation-report`,
      { headers: { cookie: ownerCookie } },
    );
    expect(ownerRead.status).toBe(200);
    expect(await ownerRead.json()).toEqual({ report: null });

    const foreignCookie = await login(baseUrl, "13900000006");
    const foreignRead = await fetch(
      `${baseUrl}/brands/${brand.id}/evaluation-report`,
      { headers: { cookie: foreignCookie } },
    );
    expect(foreignRead.status).toBe(404);
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

  it("keeps notification reads durable, account-scoped, and separate from SSE hints", async () => {
    const ownerCookie = await login(baseUrl, "13900000007");
    const ownerResponse = await fetch(`${baseUrl}/identity/me`, {
      headers: { cookie: ownerCookie },
    });
    const owner = (await ownerResponse.json()) as { id: string };
    const brandId = randomUUID();
    const runId = randomUUID();
    const first = await prisma.notification.create({
      data: {
        recipientAccountId: owner.id,
        sourceEventId: randomUUID(),
        kind: "EVALUATION_RETRY_REQUIRED",
        title: "评测需要重试",
        summary: "可继续重试。",
        target: { kind: "EVALUATION_RETRY", brandId, runId },
        occurredAt: new Date("2026-08-27T12:00:00.000Z"),
      },
    });
    await prisma.notification.create({
      data: {
        recipientAccountId: owner.id,
        sourceEventId: randomUUID(),
        kind: "EVALUATION_COMPLETED",
        title: "评测已完成",
        summary: "报告已经生成。",
        target: {
          kind: "EVALUATION_REPORT",
          brandId,
          runId,
          reportId: randomUUID(),
        },
        occurredAt: new Date("2026-08-27T12:01:00.000Z"),
      },
    });

    const listResponse = await fetch(`${baseUrl}/notifications?limit=1`, {
      headers: { cookie: ownerCookie },
    });
    expect(listResponse.status).toBe(200);
    const list = (await listResponse.json()) as {
      items: Array<Record<string, unknown>>;
      unreadCount: number;
      nextCursor: string;
    };
    expect(list.items).toHaveLength(1);
    expect(list.unreadCount).toBe(2);
    expect(list.nextCursor).toEqual(expect.any(String));
    expect(JSON.stringify(list)).not.toContain("sourceEventId");

    const invalidCursor = await fetch(
      `${baseUrl}/notifications?cursor=not-a-cursor`,
      { headers: { cookie: ownerCookie } },
    );
    expect(invalidCursor.status).toBe(400);

    const foreignCookie = await login(baseUrl, "13900000008");
    const foreignRead = await fetch(
      `${baseUrl}/notifications/${first.id}/read`,
      { method: "PUT", headers: { cookie: foreignCookie } },
    );
    expect(foreignRead.status).toBe(404);
    const ownerRead = await fetch(`${baseUrl}/notifications/${first.id}/read`, {
      method: "PUT",
      headers: { cookie: ownerCookie },
    });
    expect(ownerRead.status).toBe(200);
    expect((await ownerRead.json()) as { readAt: string | null }).toMatchObject(
      {
        readAt: expect.any(String),
      },
    );
    const allRead = await fetch(`${baseUrl}/notifications/read-all`, {
      method: "PUT",
      headers: { cookie: ownerCookie },
    });
    expect(await allRead.json()).toEqual({ unreadCount: 0 });

    const unauthenticatedSse = await fetch(`${baseUrl}/notifications/events`);
    expect(unauthenticatedSse.status).toBe(401);
    const controller = new AbortController();
    const sse = await fetch(`${baseUrl}/notifications/events`, {
      headers: { cookie: ownerCookie },
      signal: controller.signal,
    });
    expect(sse.status).toBe(200);
    const hint = await readSseEvent(sse);
    controller.abort();
    expect(hint).toContain("event: refresh");
    expect(hint).toContain("unreadCount");
    expect(hint).not.toContain("评测已完成");
  });
});

async function readSseEvent(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let received = "";
  for (let index = 0; index < 10; index += 1) {
    const chunk = await reader.read();
    if (chunk.done) break;
    received += decoder.decode(chunk.value, { stream: true });
    if (received.includes("event: refresh")) return received;
  }
  return received;
}

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
