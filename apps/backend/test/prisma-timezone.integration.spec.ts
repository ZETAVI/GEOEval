import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

describe("Prisma PostgreSQL time boundary", () => {
  const db = new PrismaService(loadIntegrationApiConfig().databaseUrl);

  beforeAll(() => db.$connect());
  afterAll(() => db.$disconnect());

  it("uses a UTC session while preserving an absolute DateTime instant", async () => {
    const input = new Date("2026-09-20T14:50:04.932Z");
    const [row] = await db.$queryRaw<
      Array<{ timezone: string; observed: Date }>
    >`SELECT current_setting('TimeZone') AS timezone, CAST(${input} AS timestamptz) AS observed`;

    expect(row?.timezone).toBe("UTC");
    expect(row?.observed.toISOString()).toBe(input.toISOString());
  });
});
