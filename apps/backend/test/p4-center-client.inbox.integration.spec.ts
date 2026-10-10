import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type {
  ExecutionCenterEvent,
  ExecutionCenterWebTaskSnapshot,
} from "../src/ai-execution/domain/execution-center-receipt.repository.js";
import { PostgresExecutionCenterReceiptRepository } from "../src/ai-execution/infrastructure/postgres-execution-center-receipt.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";
const config = loadIntegrationApiConfig();
const target = new URL(config.databaseUrl);
const allowed =
  (target.hostname === "127.0.0.1" &&
    ["/geoeval_p4_issue169", "/geoeval_issue175"].includes(target.pathname)) ||
  (process.env.CI === "true" && target.pathname === "/geoeval");
describe.skipIf(!allowed)(
  "P4 one durable API and web notification owner",
  () => {
    const prisma = new PrismaService(config.databaseUrl);
    const repository = new PostgresExecutionCenterReceiptRepository(prisma);
    let centerRef: string;
    let batchId: string;
    let event: ExecutionCenterEvent;
    let snapshot: ExecutionCenterWebTaskSnapshot;
    const scopes = new Set<string>();
    beforeAll(async () => {
      await prisma.$connect();
    });
    beforeEach(() => {
      batchId = randomUUID();
      centerRef = "p4-web-" + randomUUID();
      scopes.add(centerRef);
      const callerRequestRef = "geo:web:" + batchId;
      event = {
        cursor: 3,
        seq: 3,
        taskId: "execution-" + randomUUID(),
        itemId: randomUUID(),
        callerRequestRef,
        channel: "web",
        type: "RESULT_AVAILABLE",
        at: Date.now(),
      };
      snapshot = {
        contractVersion: "execution.v1",
        taskId: event.taskId,
        callerRequestRef,
        channel: "web",
        deadlineAt: event.at + 130000,
        metadata: { correlationId: randomUUID() },
        items: [
          {
            itemId: event.itemId,
            state: "RESULT_AVAILABLE",
            result: {
              kind: "web",
              answerContent: "首题原始回答",
              readingText: "表格：价格228元。",
              content: {
                version: 2,
                blocks: [{ type: "table", rows: [["价格", "228元"]] }],
                sources: [
                  {
                    id: "s1",
                    url: "https://source.fixture.invalid",
                    title: "信源",
                  },
                ],
                sourceCapture: { status: "CAPTURED" },
              },
              images: [
                { id: "i1", src: "https://source.fixture.invalid/image" },
              ],
            },
          },
          ...[1, 2, 3].map(() => ({ itemId: randomUUID(), state: "RUNNING" })),
        ],
      };
    });
    afterEach(async () => {
      await prisma.productOutboxEvent.deleteMany({
        where: {
          businessKey: {
            startsWith: "execution-web-result:" + centerRef + ":",
          },
        },
      });
      await prisma.executionCenterInbox.deleteMany({ where: { centerRef } });
      await prisma.executionCenterCursor.deleteMany({ where: { centerRef } });
    });
    afterAll(async () => {
      for (const scope of scopes) {
        await prisma.productOutboxEvent.deleteMany({
          where: {
            businessKey: { startsWith: "execution-web-result:" + scope + ":" },
          },
        });
        await prisma.executionCenterInbox.deleteMany({
          where: { centerRef: scope },
        });
        await prisma.executionCenterCursor.deleteMany({
          where: { centerRef: scope },
        });
      }
      await prisma.$disconnect();
    });
    it("stores a first rich item, safe event, cursor and one resume atomically while all siblings run", async () => {
      const input = {
        centerRef,
        expectedCursor: 0,
        event: { ...event, prompt: "never-in-safe-event" },
        snapshot,
      };
      const results = await Promise.all(
        Array.from({ length: 8 }, () => repository.consumeEvent(input)),
      );
      expect(results.filter((result) => result.queuedResume)).toHaveLength(1);
      expect(results.filter((result) => result.duplicate)).toHaveLength(7);
      expect(await repository.readCursor(centerRef)).toBe(3);
      expect(await repository.readNotification(centerRef, 3)).toEqual({
        event,
        snapshot,
      });
      const resume = await prisma.productOutboxEvent.findFirstOrThrow({
        where: { businessKey: "execution-web-result:" + centerRef + ":3" },
      });
      expect(resume).toMatchObject({
        aggregateId: batchId,
        eventType: "evaluation.browser.result.received",
        payload: { centerRef, cursor: 3 },
        correlationId: (snapshot.metadata as { correlationId: string })
          .correlationId,
      });
      expect(JSON.stringify(resume.payload)).not.toContain("首题原始");
      expect(
        await prisma.executionCenterReceipt.count({ where: { centerRef } }),
      ).toBe(0); // Web never creates a fake API receipt.
    });
    it("does not advance the shared cursor before a terminal web result is retrievable", async () => {
      await expect(
        repository.consumeEvent({ centerRef, expectedCursor: 0, event }),
      ).rejects.toMatchObject({ code: "TERMINAL_SNAPSHOT_REQUIRED" });
      expect(await repository.readCursor(centerRef)).toBe(0);
      expect(await repository.readNotification(centerRef, 3)).toBeNull();
      expect(
        await prisma.productOutboxEvent.count({
          where: { aggregateId: batchId },
        }),
      ).toBe(0);
    });
    it.each(["task", "item", "channel", "running"] as const)(
      "rejects a mismatched %s terminal body without losing delivery",
      async (mismatch) => {
        if (mismatch === "task") snapshot.taskId = "different-task";
        if (mismatch === "item") snapshot.items[0]!.itemId = "different-item";
        if (mismatch === "channel") snapshot.channel = "api" as "web";
        if (mismatch === "running") snapshot.items[0]!.state = "RUNNING";
        await expect(
          repository.consumeEvent({
            centerRef,
            expectedCursor: 0,
            event,
            snapshot,
          }),
        ).rejects.toMatchObject({ code: "TERMINAL_SNAPSHOT_REQUIRED" });
        expect(await repository.readCursor(centerRef)).toBe(0);
      },
    );
    it.each(["FAILED", "OUTCOME_UNKNOWN", "CANCELLED"])(
      "persists %s failure independently from siblings and any success interpretation",
      async (state) => {
        event.type = state;
        snapshot.items[0] = {
          itemId: event.itemId,
          state,
          error: {
            code: state,
            outcomeUnknown: state === "OUTCOME_UNKNOWN",
            dispatchOutcome: "MAY_HAVE_BEEN_SENT",
          },
        };
        await repository.consumeEvent({
          centerRef,
          expectedCursor: 0,
          event,
          snapshot,
        });
        expect(
          (await repository.readNotification(centerRef, 3))?.snapshot?.items[0]!
            .error,
        ).toEqual(snapshot.items[0]!.error);
        expect(
          await prisma.productOutboxEvent.count({
            where: { aggregateId: batchId },
          }),
        ).toBe(1);
      },
    );
    it("skips foreign web completion safely and uses the same cursor for a later GEO item", async () => {
      const foreign = {
        ...event,
        callerRequestRef: "foreign-client:task",
        cursor: 1,
        seq: 1,
      };
      await repository.consumeEvent({
        centerRef,
        expectedCursor: 0,
        event: foreign,
      });
      expect(await repository.readCursor(centerRef)).toBe(1);
      expect(
        (await repository.readNotification(centerRef, 1))?.snapshot,
      ).toBeNull();
      expect(
        await prisma.productOutboxEvent.count({
          where: { aggregateId: batchId },
        }),
      ).toBe(0);
      await repository.consumeEvent({
        centerRef,
        expectedCursor: 1,
        event,
        snapshot,
      });
      expect(await repository.readCursor(centerRef)).toBe(3);
    });
    it("keeps progress lightweight and creates the resume only when that item is terminal", async () => {
      await repository.consumeEvent({
        centerRef,
        expectedCursor: 0,
        event: { ...event, cursor: 1, seq: 1, type: "PROGRESS" },
      });
      expect(
        (await repository.readNotification(centerRef, 1))?.snapshot,
      ).toBeNull();
      expect(
        await prisma.productOutboxEvent.count({
          where: { aggregateId: batchId },
        }),
      ).toBe(0);
      await repository.consumeEvent({
        centerRef,
        expectedCursor: 1,
        event,
        snapshot,
      });
      expect(
        await prisma.productOutboxEvent.count({
          where: { aggregateId: batchId },
        }),
      ).toBe(1);
    });
    it("rolls back result, cursor and Outbox together after a simulated resume insert crash", async () => {
      const suffix = randomUUID().replaceAll("-", "");
      const functionName = "p4_fail_" + suffix;
      const triggerName = "p4_trigger_" + suffix;
      await prisma.$executeRawUnsafe(
        "CREATE FUNCTION " +
          functionName +
          "() RETURNS trigger AS $$ BEGIN IF NEW.business_key = '" +
          "execution-web-result:" +
          centerRef +
          ":3' THEN RAISE EXCEPTION 'p4 scoped transaction fault'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql",
      );
      await prisma.$executeRawUnsafe(
        "CREATE TRIGGER " +
          triggerName +
          " BEFORE INSERT ON product_outbox_events FOR EACH ROW EXECUTE FUNCTION " +
          functionName +
          "()",
      );
      try {
        await expect(
          repository.consumeEvent({
            centerRef,
            expectedCursor: 0,
            event,
            snapshot,
          }),
        ).rejects.toThrow();
        expect(await repository.readCursor(centerRef)).toBe(0);
        expect(await repository.readNotification(centerRef, 3)).toBeNull();
        expect(
          await prisma.productOutboxEvent.count({
            where: { aggregateId: batchId },
          }),
        ).toBe(0);
      } finally {
        await prisma.$executeRawUnsafe(
          "DROP TRIGGER IF EXISTS " + triggerName + " ON product_outbox_events",
        );
        await prisma.$executeRawUnsafe(
          "DROP FUNCTION IF EXISTS " + functionName + "()",
        );
      }
      expect(
        (
          await repository.consumeEvent({
            centerRef,
            expectedCursor: 0,
            event,
            snapshot,
          })
        ).queuedResume,
      ).toBe(true);
      expect(await repository.readCursor(centerRef)).toBe(3);
    });
  },
);
