import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiApp } from "../src/api-app.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();

describe("Media Supply HTTP authorization and projection", () => {
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

  it("denies customer maintenance while serving the customer-safe catalog", async () => {
    const customer = await login(baseUrl, "13900003301");
    const denied = await fetch(`${baseUrl}/admin/media/platforms`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: customer.cookie },
      body: JSON.stringify({
        displayName: "越权平台",
        categories: ["PORTAL_MEDIA"],
        reason: "越权创建",
      }),
    });
    expect(denied.status).toBe(403);
    expect(await prisma.mediaPlatform.count()).toBe(0);

    for (const [mobile, role] of [
      ["+8613900003303", "OPERATIONS"],
      ["+8613900003304", "AGENT"],
    ] as const) {
      await prisma.account.create({ data: { mobile, role } });
      const supportingRole = await login(baseUrl, mobile.slice(3));
      const supportingDenied = await fetch(`${baseUrl}/admin/media/platforms`, {
        headers: { cookie: supportingRole.cookie },
      });
      expect(supportingDenied.status).toBe(403);
    }

    await prisma.account.create({
      data: { mobile: "+8613900003302", role: "ADMINISTRATOR" },
    });
    const administrator = await login(baseUrl, "13900003302");
    const administratorMe = await fetch(`${baseUrl}/identity/me`, {
      headers: { cookie: administrator.cookie },
    });
    expect(administratorMe.status).toBe(200);
    expect(await administratorMe.json()).toMatchObject({
      role: "ADMINISTRATOR",
    });
    const administratorBrandAccess = await fetch(`${baseUrl}/brands`, {
      headers: { cookie: administrator.cookie },
    });
    expect(administratorBrandAccess.status).toBe(401);
    const platformResponse = await fetch(`${baseUrl}/admin/media/platforms`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: administrator.cookie,
      },
      body: JSON.stringify({
        displayName: "人民网",
        description: "中央重点新闻网站",
        categories: ["CENTRAL_MEDIA", "PORTAL_MEDIA"],
        reason: "建立平台",
      }),
    });
    expect(platformResponse.status).toBe(201);
    const platform = (await platformResponse.json()) as {
      id: string;
      status: string;
      revision: number;
    };
    expect(platform).toMatchObject({ status: "INACTIVE", revision: 1 });

    const enableResponse = await fetch(
      `${baseUrl}/admin/media/platforms/${platform.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: administrator.cookie,
        },
        body: JSON.stringify({
          status: "ACTIVE",
          pointPrice: 500,
          expectedRevision: platform.revision,
          reason: "启用平台",
        }),
      },
    );
    expect(enableResponse.status).toBe(200);

    const catalog = await fetch(
      `${baseUrl}/media-catalog/platforms?category=CENTRAL_MEDIA`,
      { headers: { cookie: administrator.cookie } },
    );
    expect(catalog.status).toBe(200);
    const body = await catalog.json();
    expect(body).toMatchObject({
      items: [
        {
          id: platform.id,
          displayName: "人民网",
          pointPrice: 500,
          examples: [],
        },
      ],
      nextCursor: null,
    });
    expect(JSON.stringify(body)).not.toContain("normalizedName");
    expect(JSON.stringify(body)).not.toContain("procurementCostFen");

    const revision = await fetch(`${baseUrl}/media-catalog/revision`, {
      headers: { cookie: administrator.cookie },
    });
    expect(revision.status).toBe(200);
    expect(await revision.json()).toMatchObject({
      revision: expect.any(String),
    });
  });
});

async function login(baseUrl: string, mobile: string) {
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
  const cookie = sessionResponse.headers.get("set-cookie")!;
  const meResponse = await fetch(`${baseUrl}/identity/me`, {
    headers: { cookie },
  });
  const me = (await meResponse.json()) as { id: string };
  return { cookie, accountId: me.id };
}
