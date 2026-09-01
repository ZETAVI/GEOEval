import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";

import { FoundationService } from "../src/foundation/foundation.service.js";
import { WorkProcessor } from "../src/foundation/work-processor.js";
import { PostgresFoundationRepository } from "../src/infrastructure/postgres-foundation.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import {
  SafeTelemetry,
  type TelemetrySink,
} from "../src/infrastructure/telemetry.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
const quietSink: TelemetrySink = { export: async () => undefined };
const failingSink: TelemetrySink = {
  export: async () => {
    throw new Error("test exporter unavailable");
  },
};

describe("foundation transaction and durable idempotency", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const repository = new PostgresFoundationRepository(prisma);

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  beforeEach(async () => {
    await prisma.workEffect.deleteMany();
    await prisma.outboxEvent.deleteMany();
    await prisma.foundationRecord.deleteMany();
  });

  it("rolls back the owner record and outbox event together", async () => {
    const service = new FoundationService(
      repository,
      new SafeTelemetry(quietSink),
    );

    await expect(
      service.createRecord({ name: "rollback", forceRollback: true }),
    ).rejects.toThrow("controlled owner transaction rollback");
    expect(await prisma.foundationRecord.count()).toBe(0);
    expect(await prisma.outboxEvent.count()).toBe(0);
  });

  it("commits business truth even when telemetry export fails", async () => {
    const service = new FoundationService(
      repository,
      new SafeTelemetry(failingSink),
    );

    const record = await service.createRecord({ name: "telemetry-isolation" });

    expect(record.status).toBe("ACCEPTED");
    expect(await prisma.foundationRecord.count()).toBe(1);
    expect(await prisma.outboxEvent.count()).toBe(1);
  });

  it("applies duplicate deliveries exactly once at the business boundary", async () => {
    const telemetry = new SafeTelemetry(quietSink);
    const service = new FoundationService(repository, telemetry);
    const processor = new WorkProcessor(repository, telemetry);
    const record = await service.createRecord({ name: "duplicate-delivery" });
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { recordId: record.id },
    });
    const data = {
      outboxEventId: event.id,
      recordId: record.id,
      businessKey: `foundation:${event.id}`,
      correlationId: event.correlationId,
    };

    await processor.apply(data);
    await processor.apply(data);

    expect(await prisma.workEffect.count()).toBe(1);
    expect((await service.getRecord(record.id)).status).toBe("PROCESSED");
    expect(
      await prisma.outboxEvent.count({ where: { status: "COMPLETED" } }),
    ).toBe(1);
  });
});
