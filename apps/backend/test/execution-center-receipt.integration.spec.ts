import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type {
  ExecutionCenterEvent,
  ExecutionCenterReceipt,
  ExecutionCenterSnapshot,
  ReserveExecutionCenterReceipt,
} from "../src/ai-execution/domain/execution-center-receipt.repository.js";
import { PostgresExecutionCenterReceiptRepository } from "../src/ai-execution/infrastructure/postgres-execution-center-receipt.repository.js";
import { PostgresProductOutboxRepository } from "../src/background-work/infrastructure/postgres-product-outbox.repository.js";
import { BrandService } from "../src/brand/application/brand.service.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";
import { EvaluationService } from "../src/geo-intelligence/application/evaluation.service.js";
import { sampleWorkRequestedEvent } from "../src/geo-intelligence/domain/evaluation-process.events.js";
import { PostgresEvaluationProcessRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-process.repository.js";
import { PostgresEvaluationRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import {
  clearCustomerData,
  readyCoffeeBrandInput,
  TEST_STORE_LOCATION_RECEIPTS,
} from "./customer-data.js";
import { createEvaluationQuestionPreparationHarness } from "./evaluation-question-preparation-harness.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();
const target = new URL(config.databaseUrl);
const permitted =
  (target.hostname === "127.0.0.1" &&
    target.pathname === "/geoeval_issue175") ||
  (process.env.CI === "true" && target.pathname === "/geoeval");

describe.skipIf(!permitted)(
  "durable execution-center receipt transaction",
  () => {
    const prisma = new PrismaService(config.databaseUrl);
    const repository = new PostgresExecutionCenterReceiptRepository(prisma);
    const brands = new BrandService(
      new PostgresBrandRepository(prisma),
      new BrandReferenceData(),
      TEST_STORE_LOCATION_RECEIPTS,
    );
    const preparation = createEvaluationQuestionPreparationHarness(prisma);
    const evaluations = new EvaluationService(
      brands,
      new PostgresEvaluationRepository(prisma),
      preparation.repository,
    );
    let runId: string;
    let cycleId: string;
    let sampleId: string;
    let correlationId: string;
    let nextAttemptNumber: number;

    beforeAll(async () => prisma.$connect());
    afterAll(async () => {
      await dropFailureTrigger();
      await clearCustomerData(prisma);
      await prisma.$disconnect();
    });
    beforeEach(async () => {
      await dropFailureTrigger();
      await clearCustomerData(prisma);
      const account = await prisma.account.create({
        data: { mobile: "+8613900000175" },
      });
      const brand = await brands.create(
        account.id,
        readyCoffeeBrandInput(account.id, { companyName: "测试咖啡" }),
      );
      const definition = await preparation.prepareReadyDefinition(
        evaluations,
        account.id,
        brand.id,
      );
      const run = await evaluations.startRun(account.id, definition.id);
      runId = run.id;
      const cycle = await prisma.evaluationExecutionCycle.findFirstOrThrow({
        where: { runId },
      });
      cycleId = cycle.id;
      const storedRun = await prisma.evaluationRun.findUniqueOrThrow({
        where: { id: runId },
      });
      correlationId = storedRun.correlationId;
      await new PostgresEvaluationProcessRepository(prisma).initializeRun(
        runId,
        cycleId,
      );
      sampleId = (
        await prisma.evaluationSample.findFirstOrThrow({ where: { runId } })
      ).id;
      nextAttemptNumber = 1;
      await prisma.productOutboxEvent.updateMany({
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    });

    it("does not reconcile receipts whose owning business attempt is already terminal", async () => {
      const failed = await repository.reserve(await reservation());
      const succeeded = await repository.reserve(await reservation());
      const active = await repository.reserve(await reservation());
      await prisma.aiExecutionAttempt.update({
        where: { id: failed.attemptId },
        data: { status: "FAILED", finishedAt: new Date(), retryable: false },
      });
      await prisma.aiExecutionAttempt.update({
        where: { id: succeeded.attemptId },
        data: { status: "SUCCEEDED", finishedAt: new Date() },
      });
      const candidates = await repository.listReconciliationCandidates({
        limit: 100,
      });
      expect(candidates.map((row) => row.id)).toEqual([active.id]);
      expect(await prisma.executionCenterReceipt.count()).toBe(3);
    });

    it("reserves one immutable submission under concurrent acquisition and finds its business identity", async () => {
      const input = await reservation();
      const rows = await Promise.all(
        Array.from({ length: 8 }, () => repository.reserve(input)),
      );
      expect(new Set(rows.map((row) => row.id)).size).toBe(1);
      expect(await prisma.executionCenterReceipt.count()).toBe(1);
      expect(rows[0]).toMatchObject({
        state: "RESERVING",
        taskId: null,
        snapshot: null,
        business: {
          runId,
          cycleId,
          sampleId,
          purpose: "EVALUATION_INTERPRETATION",
          attemptNumber: 1,
        },
      });
      expect((await repository.findByRequest(rows[0]!.business))?.id).toBe(
        rows[0]!.id,
      );
      expect(
        (await repository.findByAttempt(input.attemptId))?.request,
      ).toEqual(input.request);
    });

    it("rejects changed semantics and colliding keys without replacing the accepted request", async () => {
      const input = await reservation();
      await repository.reserve(input);
      await expect(
        repository.reserve({ ...input, requestFingerprint: "b".repeat(64) }),
      ).rejects.toMatchObject({ code: "RECEIPT_CONFLICT" });
      const other = await reservation();
      await expect(
        repository.reserve({ ...other, idempotencyKey: input.idempotencyKey }),
      ).rejects.toMatchObject({ code: "RECEIPT_CONFLICT" });
      expect(
        (await repository.findByAttempt(input.attemptId))?.request,
      ).toEqual(input.request);
      expect(await repository.findByAttempt(other.attemptId)).toBeNull();
    });

    it("requires the persistent EXECUTION_CENTER transport fence and API single-item contract", async () => {
      const input = await reservation("DIRECT");
      await expect(repository.reserve(input)).rejects.toMatchObject({
        code: "INVALID_RECEIPT_REQUEST",
      });
      const valid = await reservation();
      await expect(
        repository.reserve({
          ...valid,
          request: {
            ...valid.request,
            items: [{ itemId: "a" }, { itemId: "b" }],
          },
        }),
      ).rejects.toMatchObject({ code: "INVALID_RECEIPT_REQUEST" });
      expect(await prisma.executionCenterReceipt.count()).toBe(0);
    });

    it("captures an early terminal event before ACK and queues a distinct resumable outbox exactly once", async () => {
      const receipt = await repository.reserve(await reservation());
      const original = sampleWorkRequestedEvent(receipt.business);
      await prisma.productOutboxEvent.create({
        data: { ...original, status: "COMPLETED", completedAt: new Date() },
      });
      const event = notification(receipt, 7);
      const outcome = await repository.consumeEvent({
        centerRef: receipt.centerRef,
        expectedCursor: 0,
        event,
        snapshot: snapshot(receipt),
      });
      expect(outcome).toMatchObject({
        cursor: 7,
        duplicate: false,
        queuedResume: true,
        receipt: { state: "READY", taskId: event.taskId },
      });
      const lateAck = await repository.recordAccepted(receipt.id, {
        taskId: event.taskId,
        itemId: event.itemId,
      });
      expect(lateAck.state).toBe("READY");
      expect(lateAck.snapshot).toEqual(snapshot(receipt));
      const resumed = await prisma.productOutboxEvent.findUniqueOrThrow({
        where: { businessKey: `execution-result:${receipt.attemptId}` },
      });
      expect(resumed).toMatchObject({
        status: "PENDING",
        eventType: original.eventType,
        payload: original.payload,
      });
      expect(
        (
          await prisma.productOutboxEvent.findUniqueOrThrow({
            where: { businessKey: original.businessKey },
          })
        ).status,
      ).toBe("COMPLETED");
      const duplicate = await new PostgresExecutionCenterReceiptRepository(
        prisma,
      ).consumeEvent({
        centerRef: receipt.centerRef,
        expectedCursor: 0,
        event,
      });
      expect(duplicate).toMatchObject({
        cursor: 7,
        duplicate: true,
        queuedResume: false,
      });
      expect(await prisma.executionCenterInbox.count()).toBe(1);
      expect(
        await prisma.productOutboxEvent.count({
          where: { businessKey: `execution-result:${receipt.attemptId}` },
        }),
      ).toBe(1);
    });

    it("deduplicates concurrent first-event receivers in one durable cursor namespace", async () => {
      const receipt = await repository.reserve(await reservation());
      const event = notification(receipt, 4);
      const outcomes = await Promise.all([
        repository.consumeEvent({
          centerRef: receipt.centerRef,
          expectedCursor: 0,
          event,
          snapshot: snapshot(receipt),
        }),
        new PostgresExecutionCenterReceiptRepository(prisma).consumeEvent({
          centerRef: receipt.centerRef,
          expectedCursor: 0,
          event,
          snapshot: snapshot(receipt),
        }),
      ]);
      expect(outcomes.filter((outcome) => outcome.duplicate)).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome.queuedResume)).toHaveLength(
        1,
      );
      expect(await repository.readCursor(receipt.centerRef)).toBe(4);
      expect(await prisma.executionCenterInbox.count()).toBe(1);
      expect(
        await prisma.productOutboxEvent.count({
          where: { businessKey: `execution-result:${receipt.attemptId}` },
        }),
      ).toBe(1);
    });

    it("rolls back cursor and identity binding when a terminal event has no readable snapshot", async () => {
      const receipt = await repository.reserve(await reservation());
      await expect(
        repository.consumeEvent({
          centerRef: receipt.centerRef,
          expectedCursor: 0,
          event: notification(receipt, 5),
        }),
      ).rejects.toMatchObject({ code: "TERMINAL_SNAPSHOT_REQUIRED" });
      expect(await repository.readCursor(receipt.centerRef)).toBe(0);
      expect(await prisma.executionCenterInbox.count()).toBe(0);
      expect(await repository.findByAttempt(receipt.attemptId)).toMatchObject({
        state: "RESERVING",
        taskId: null,
      });
      expect(
        await prisma.productOutboxEvent.count({
          where: { businessKey: `execution-result:${receipt.attemptId}` },
        }),
      ).toBe(0);
    });

    it("rolls back raw result, inbox, cursor, and resume outbox together after a database failure", async () => {
      const receipt = await repository.reserve(await reservation());
      await prisma.$executeRawUnsafe(
        `CREATE FUNCTION execution_center_test_fail_resume() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.business_key LIKE 'execution-result:%' THEN RAISE EXCEPTION 'CONTROLLED_RESUME_FAILURE'; END IF; RETURN NEW; END $$`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER execution_center_test_fail_resume BEFORE INSERT ON product_outbox_events FOR EACH ROW EXECUTE FUNCTION execution_center_test_fail_resume()`,
      );
      await expect(
        repository.consumeEvent({
          centerRef: receipt.centerRef,
          expectedCursor: 0,
          event: notification(receipt, 3),
          snapshot: snapshot(receipt),
        }),
      ).rejects.toThrow();
      expect(await repository.readCursor(receipt.centerRef)).toBe(0);
      expect(await prisma.executionCenterInbox.count()).toBe(0);
      expect(await repository.findByAttempt(receipt.attemptId)).toMatchObject({
        state: "RESERVING",
        taskId: null,
        snapshot: null,
      });
      await dropFailureTrigger();
      const recovered = await repository.consumeEvent({
        centerRef: receipt.centerRef,
        expectedCursor: 0,
        event: notification(receipt, 3),
        snapshot: snapshot(receipt),
      });
      expect(recovered.queuedResume).toBe(true);
    });

    it("accepts legal caller cursor gaps but refuses out-of-order unseen delivery", async () => {
      const receipt = await repository.reserve(await reservation());
      const first = notification(receipt, 5, "DISPATCHING");
      await repository.consumeEvent({
        centerRef: receipt.centerRef,
        expectedCursor: 0,
        event: first,
      });
      await expect(
        repository.consumeEvent({
          centerRef: receipt.centerRef,
          expectedCursor: 0,
          event: notification(receipt, 9, "PROGRESS"),
        }),
      ).rejects.toMatchObject({ code: "CURSOR_CONFLICT" });
      await repository.consumeEvent({
        centerRef: receipt.centerRef,
        expectedCursor: 5,
        event: notification(receipt, 9, "PROGRESS"),
      });
      expect(await repository.readCursor(receipt.centerRef)).toBe(9);
      expect(await prisma.executionCenterInbox.count()).toBe(2);
      await expect(
        repository.consumeEvent({
          centerRef: receipt.centerRef,
          expectedCursor: 9,
          event: notification(receipt, 8, "PROGRESS"),
        }),
      ).rejects.toMatchObject({ code: "CURSOR_CONFLICT" });
    });

    it("preserves a first terminal snapshot and does not let late content reopen UNKNOWN", async () => {
      const receipt = await repository.reserve(await reservation());
      const unknown = snapshot(receipt, "OUTCOME_UNKNOWN");
      await repository.recordSnapshot(receipt.id, unknown);
      const late = snapshot(receipt, "OUTCOME_UNKNOWN");
      late.items[0]!.result = snapshot(receipt).items[0]!.result;
      const stored = await repository.recordSnapshot(receipt.id, late);
      expect(stored.snapshot).toEqual(unknown);
      await repository.consumeEvent({
        centerRef: receipt.centerRef,
        expectedCursor: 0,
        event: notification(receipt, 1, "LATE_RESULT_AVAILABLE"),
        snapshot: late,
      });
      expect(
        (await repository.findByAttempt(receipt.attemptId))?.snapshot,
      ).toEqual(unknown);
      expect(
        await prisma.productOutboxEvent.count({
          where: { businessKey: `execution-result:${receipt.attemptId}` },
        }),
      ).toBe(1);
    });

    it("rejects snapshot/task/item/contract mismatches without advancing the consumer", async () => {
      const receipt = await repository.reserve(await reservation());
      const other = await repository.reserve(await reservation());
      await repository.recordAccepted(receipt.id, {
        taskId: "same-task",
        itemId: receipt.request.items[0]!.itemId,
      });
      await expect(
        repository.recordAccepted(other.id, {
          taskId: "same-task",
          itemId: other.request.items[0]!.itemId,
        }),
      ).rejects.toMatchObject({ code: "EXECUTION_IDENTITY_MISMATCH" });
      const fresh = await repository.reserve(await reservation());
      const invalid = snapshot(fresh);
      invalid.items[0]!.itemId = "wrong-item";
      await expect(
        repository.consumeEvent({
          centerRef: fresh.centerRef,
          expectedCursor: 0,
          event: notification(fresh, 1),
          snapshot: invalid,
        }),
      ).rejects.toMatchObject({ code: "EXECUTION_IDENTITY_MISMATCH" });
      expect(await repository.readCursor(fresh.centerRef)).toBe(0);
      expect(await repository.findByAttempt(fresh.attemptId)).toMatchObject({
        taskId: null,
        state: "RESERVING",
      });
      await expect(
        repository.recordSnapshot(fresh.id, {
          ...snapshot(fresh),
          contractVersion: "different",
        } as unknown as ExecutionCenterSnapshot),
      ).rejects.toMatchObject({ code: "EXECUTION_IDENTITY_MISMATCH" });
    });

    it("stores only safe notification fields while returning untouched native response text", async () => {
      const receipt = await repository.reserve(await reservation());
      const event = {
        ...notification(receipt, 1),
        rawBody: "do-not-store-in-inbox",
        prompt: "do-not-log",
      };
      const result = await repository.consumeEvent({
        centerRef: receipt.centerRef,
        expectedCursor: 0,
        event,
        snapshot: snapshot(receipt),
      });
      const stored = await prisma.executionCenterInbox.findFirstOrThrow();
      expect(stored.event).not.toHaveProperty("rawBody");
      expect(stored.event).not.toHaveProperty("prompt");
      expect(result.receipt?.snapshot?.items[0]!.result?.rawBody).toBe(
        ' \n{"原生":"回答","usage":{"completion_tokens":2}}\n ',
      );
    });

    it("pages past a hundred remote waits and leaves their original work outside the relay window", async () => {
      const receipts: ExecutionCenterReceipt[] = [];
      for (let index = 0; index < 105; index++) {
        const receipt = await repository.reserve(await reservation());
        await repository.recordAccepted(receipt.id, {
          taskId: `task-${receipt.id}`,
          itemId: receipt.request.items[0]!.itemId,
        });
        await prisma.productOutboxEvent.create({
          data: {
            ...sampleWorkRequestedEvent(receipt.business),
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        receipts.push(receipt);
      }
      const first = await repository.listReconciliationCandidates({
        limit: 100,
      });
      const second = await repository.listReconciliationCandidates({
        limit: 100,
        afterId: first.at(-1)!.id,
      });
      expect(first).toHaveLength(100);
      expect(second).toHaveLength(5);
      expect(new Set([...first, ...second].map((row) => row.id)).size).toBe(
        105,
      );
      const ready = receipts.at(-1)!;
      await new PostgresExecutionCenterReceiptRepository(prisma).recordSnapshot(
        ready.id,
        snapshot(ready),
      );
      const deliverable = await new PostgresProductOutboxRepository(
        prisma,
      ).findDeliverable(100);
      expect(deliverable).toHaveLength(1);
      expect(deliverable[0]!.id).toBe(
        (
          await prisma.productOutboxEvent.findUniqueOrThrow({
            where: { businessKey: `execution-result:${ready.attemptId}` },
          })
        ).id,
      );
    }, 15_000);

    async function reservation(
      transport = "EXECUTION_CENTER",
    ): Promise<ReserveExecutionCenterReceipt> {
      const attempt = await prisma.aiExecutionAttempt.create({
        data: {
          runId,
          cycleId,
          sampleId,
          purpose: "EVALUATION_INTERPRETATION",
          attemptNumber: nextAttemptNumber++,
          routePolicyId: "evaluation.interpretation.deepseek@1",
          providerKey: "model-studio",
          requestedModel: "fixture-model",
          executionTransport: transport,
          requestPayload: { taskKind: "STRUCTURED_OUTPUT" },
          correlationId,
        },
      });
      const deadlineAt = new Date(Date.now() + 60_000);
      const callerRequestRef = `geo:${attempt.id}`;
      const request = {
        contractVersion: "execution.v1" as const,
        callerRequestRef,
        channel: "api" as const,
        deadlineAt: deadlineAt.getTime(),
        items: [{ itemId: `item:${attempt.id}` }],
        api: {
          endpointRef: "registered",
          endpointVersion: "1",
          operation: "chat",
          bodyEncoding: "json",
          body: {
            model: "fixture-model",
            messages: [{ role: "user", content: "原始输入" }],
          },
        },
      };
      return {
        attemptId: attempt.id,
        centerRef: "fixture-center",
        callerRequestRef,
        idempotencyKey: `key:${attempt.id}`,
        requestFingerprint: createHash("sha256")
          .update(JSON.stringify(request))
          .digest("hex"),
        request,
        deadlineAt,
      };
    }
    function notification(
      receipt: ExecutionCenterReceipt,
      cursor: number,
      type = "RESULT_AVAILABLE",
    ): ExecutionCenterEvent {
      return {
        cursor,
        seq: cursor,
        taskId: `task-${receipt.id}`,
        callerRequestRef: receipt.callerRequestRef,
        itemId: receipt.request.items[0]!.itemId,
        channel: "api",
        type,
        at: 1234,
        physicalAttemptId: `physical-${randomUUID()}`,
      };
    }
    function snapshot(
      receipt: ExecutionCenterReceipt,
      state = "RESULT_AVAILABLE",
    ): ExecutionCenterSnapshot {
      return {
        contractVersion: "execution.v1",
        channel: "api",
        callerRequestRef: receipt.callerRequestRef,
        taskId: `task-${receipt.id}`,
        deadlineAt: receipt.deadlineAt.getTime(),
        items: [
          {
            itemId: receipt.request.items[0]!.itemId,
            state,
            ...(state === "RESULT_AVAILABLE"
              ? {
                  result: {
                    kind: "api",
                    transportStatus: "RESPONSE_RECEIVED",
                    httpStatus: 200,
                    bodyEncoding: "utf8",
                    rawBody:
                      ' \n{"原生":"回答","usage":{"completion_tokens":2}}\n ',
                    safeHeaders: { "content-type": "application/json" },
                  },
                }
              : {
                  error: {
                    code: "DEADLINE_EXCEEDED",
                    dispatchOutcome: "UNKNOWN",
                  },
                }),
          },
        ],
      };
    }
    async function dropFailureTrigger(): Promise<void> {
      await prisma.$executeRawUnsafe(
        "DROP TRIGGER IF EXISTS execution_center_test_fail_resume ON product_outbox_events",
      );
      await prisma.$executeRawUnsafe(
        "DROP FUNCTION IF EXISTS execution_center_test_fail_resume()",
      );
    }
  },
);
