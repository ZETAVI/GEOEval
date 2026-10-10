import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgresAiAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-attempt.repository.js";
import type { ResolvedSampleAiAttemptRequest } from "../src/ai-execution/domain/ai-attempt.types.js";
import { BrandService } from "../src/brand/application/brand.service.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";
import { EvaluationService } from "../src/geo-intelligence/application/evaluation.service.js";
import type {
  AcceptedEvidence,
  ExecutionSamplingBatchContext,
  EvaluationSampleWorkContext,
} from "../src/geo-intelligence/domain/evaluation-process.types.js";
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
    target.pathname === "/geoeval_p4_issue169") ||
  (process.env.CI === "true" && target.pathname === "/geoeval");

describe.skipIf(!permitted)("P4 durable sampling persistence", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const repository = new PostgresEvaluationProcessRepository(prisma);
  const attempts = new PostgresAiAttemptRepository(prisma);
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
  let batch: ExecutionSamplingBatchContext;
  let context: EvaluationSampleWorkContext;

  async function reset() {
    await prisma.$executeRawUnsafe(
      "DROP TRIGGER IF EXISTS p4_test_fail_parser ON product_outbox_events",
    );
    await prisma.$executeRawUnsafe(
      "DROP FUNCTION IF EXISTS p4_test_fail_parser()",
    );
    await prisma.evaluationSamplingBatchItem.deleteMany();
    await clearCustomerData(prisma);
  }
  beforeAll(async () => prisma.$connect());
  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await reset();
    const account = await prisma.account.create({
      data: { mobile: "+8613900000169" },
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
    cycleId = (
      await prisma.evaluationExecutionCycle.findFirstOrThrow({
        where: { runId },
      })
    ).id;
    await repository.initializeRun(runId, cycleId, {
      mode: "execution-center",
      accountAlias: "fixture",
      centerRef: "p4-center",
    });
    const sample = await prisma.evaluationSample.findFirstOrThrow({
      where: { runId, platformKey: "deepseek" },
    });
    batch = (await repository.getOrCreateExecutionSamplingBatch({
      sampleId: sample.id,
      runId,
      cycleId,
      accountAlias: "fixture",
      centerRef: "p4-center",
    }))!;
    context = (await repository.getSampleContext(
      batch.samples[0]!.sampleId,
      runId,
      cycleId,
    ))!;
  });

  const evidence = (text = "原始完整回答"): AcceptedEvidence => ({
    answerContent: text,
    answerFormat: "MARKDOWN",
    returnedModel: "consumer-web:deepseek",
    searchObservation: "UNKNOWN",
    sourceMetadata: [{ title: "内部信源", url: "https://example.test/source" }],
    content: {
      version: "answer.content.v1",
      blocks: [
        {
          type: "table",
          rows: [
            ["餐厅", "烤鸭"],
            ["花悦庭", "果木"],
          ],
        },
      ],
    },
    readingText: "餐厅 | 烤鸭\n花悦庭 | 果木",
    images: [{ url: "https://example.test/image.png", alt: "烤鸭" }],
  });

  async function createQueuedRun(mode: "ai-provider" | "execution-center") {
    const account = await prisma.account.create({
      data: { mobile: "+8613900000187" },
    });
    const brand = await brands.create(
      account.id,
      readyCoffeeBrandInput(account.id, { companyName: "排队测试咖啡" }),
    );
    const service = new EvaluationService(
      brands,
      new PostgresEvaluationRepository(prisma, mode),
      preparation.repository,
    );
    const definition = await preparation.prepareReadyDefinition(
      service,
      account.id,
      brand.id,
    );
    const run = await service.startRun(account.id, definition.id);
    const cycle = await prisma.evaluationExecutionCycle.findFirstOrThrow({
      where: { runId: run.id },
    });
    return { account, service, run, cycle };
  }

  function apiRequest(
    sampleContext = context,
    attemptNumber = 1,
  ): ResolvedSampleAiAttemptRequest {
    return {
      runId,
      cycleId,
      sampleId: sampleContext.sampleId,
      purpose: "EVALUATION_ACQUISITION",
      attemptNumber,
      executionChannel: "API",
      deadlineAt: batch.deadlineAt.getTime(),
      routePolicyId: sampleContext.routePolicyId,
      requestedModel: sampleContext.requestedModel,
      providerKey: "fixture",
      serviceClass: "fixture",
      protocol: "fixture",
      correlationId: sampleContext.correlationId,
      input: {
        taskKind: "EVALUATION_ACQUISITION",
        systemInstruction: sampleContext.objectivityInstruction,
        companyName: sampleContext.companyName,
        query: sampleContext.query,
        questionOrdinal: sampleContext.questionOrdinal,
        platformLabel: sampleContext.platformLabel,
        province: "广东省",
        city: "广州市",
      },
    };
  }

  async function succeededWeb(
    sampleId = context.sampleId,
    answer = evidence(),
  ) {
    const item = await repository.getExecutionSamplingItem({
      sampleId,
      runId,
      cycleId,
    });
    await attempts.finish(
      item!.attemptId,
      { kind: "SUCCEEDED", output: { kind: "ACQUISITION", ...answer } },
      10,
    );
    return item!.attemptId;
  }

  it("persists exact questions, immutable mappings and queue-inclusive absolute time", async () => {
    const cycle = await prisma.evaluationExecutionCycle.findUniqueOrThrow({
      where: { id: cycleId },
    });
    expect(cycle.samplingStartedAt).toEqual(cycle.createdAt);
    expect(
      cycle.samplingFallbackDueAt!.getTime() - cycle.createdAt.getTime(),
    ).toBe(80_000);
    expect(
      cycle.samplingDeadlineAt!.getTime() - cycle.createdAt.getTime(),
    ).toBe(130_000);
    expect(batch.request.items).toEqual(
      batch.samples.map((sample) => ({
        itemId: sample.sampleId,
        userPrompt: sample.query,
      })),
    );
    expect(batch.items).toHaveLength(4);
    expect(await prisma.evaluationSamplingBatchItem.count()).toBe(20);
    expect(
      await prisma.aiExecutionAttempt.count({
        where: { executionChannel: "WEB", status: "STARTED" },
      }),
    ).toBe(20);
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          eventType: "evaluation.sample.acquire.requested",
          payload: { path: ["executionChannel"], equals: "WEB" },
        },
      }),
    ).toBe(5);
    await new PostgresEvaluationProcessRepository(prisma).initializeRun(
      runId,
      cycleId,
      {
        mode: "execution-center",
        accountAlias: "fixture",
        centerRef: "p4-center",
      },
    );
    const resumed = await repository.getOrCreateExecutionSamplingBatch({
      sampleId: context.sampleId,
      runId,
      cycleId,
      accountAlias: "fixture",
      centerRef: "p4-center",
    });
    expect(resumed?.request).toEqual(batch.request);
    expect(resumed?.items).toEqual(batch.items);
    expect(await prisma.evaluationSamplingBatchItem.count()).toBe(20);
  });

  it("keeps WEB 1 and API 1 independent and finishes a pre-reserved external attempt", async () => {
    const begun = await attempts.begin(
      apiRequest(),
      210_000,
      "EXECUTION_CENTER",
    );
    expect(begun.kind).toBe("ACQUIRED");
    expect(begun.attempt.executionChannel).toBe("API");
    expect(begun.attempt.executionDeadlineAt).toEqual(batch.deadlineAt);
    const web = batch.items[0]!;
    const recorded = await attempts.recordExternal(
      {
        ...apiRequest(),
        executionChannel: "WEB",
        input: {
          taskKind: "BROWSER_EVALUATION_ACQUISITION",
          platformKey: batch.platformKey,
          questionId: batch.samples[0]!.questionId,
          externalTaskId: "task-fixture",
          resultIndex: 0,
        },
      },
      { kind: "SUCCEEDED", output: { kind: "ACQUISITION", ...evidence() } },
      15,
    );
    expect(recorded.id).toBe(web.attemptId);
    expect(recorded.status).toBe("SUCCEEDED");
    expect((await attempts.find(apiRequest()))?.id).toBe(begun.attempt.id);
    expect(
      (await attempts.find({ ...apiRequest(), executionChannel: "WEB" }))?.id,
    ).toBe(web.attemptId);
  });

  it("accepts the first rich result and queues Parser without waiting for three siblings", async () => {
    const attemptId = await succeededWeb();
    expect(
      await repository.acceptEvidence({
        context,
        attemptId,
        evidence: evidence(),
      }),
    ).toBe("ACCEPTED");
    const saved = await prisma.evaluationSampleEvidence.findUniqueOrThrow({
      where: { sampleId: context.sampleId },
    });
    expect(saved).toMatchObject(evidence());
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          aggregateId: context.sampleId,
          eventType: "evaluation.sample.interpret.requested",
        },
      }),
    ).toBe(1);
    expect(
      await prisma.evaluationSample.count({
        where: {
          id: { in: batch.samples.slice(1).map((s) => s.sampleId) },
          status: "PENDING",
        },
      }),
    ).toBe(3);
    expect(
      (await repository.getSampleContext(context.sampleId, runId, cycleId))
        ?.evidence?.readingText,
    ).toBe(evidence().readingText);
  });

  it("accepts exactly one winner under concurrent WEB/API and duplicate result delivery", async () => {
    const web = await succeededWeb();
    const api = await attempts.begin(apiRequest(), 210_000, "EXECUTION_CENTER");
    await attempts.finish(
      api.attempt.id,
      {
        kind: "SUCCEEDED",
        output: { kind: "ACQUISITION", ...evidence("API回答") },
      },
      10,
    );
    const results = await Promise.all([
      repository.acceptEvidence({
        context,
        attemptId: web,
        evidence: evidence(),
      }),
      repository.acceptEvidence({
        context,
        attemptId: api.attempt.id,
        evidence: evidence("API回答"),
      }),
      repository.acceptEvidence({
        context,
        attemptId: web,
        evidence: evidence(),
      }),
    ]);
    expect(results.filter((r) => r === "ACCEPTED")).toHaveLength(1);
    expect(results.filter((r) => r === "ALREADY_ACCEPTED")).toHaveLength(2);
    expect(
      await prisma.evaluationSampleEvidence.count({
        where: { sampleId: context.sampleId },
      }),
    ).toBe(1);
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          aggregateId: context.sampleId,
          eventType: "evaluation.sample.interpret.requested",
        },
      }),
    ).toBe(1);
  });

  it("at 80 seconds schedules API only for unanswered positions and deduplicates restart recovery", async () => {
    const attemptId = await succeededWeb();
    await repository.acceptEvidence({
      context,
      attemptId,
      evidence: evidence(),
    });
    const due = context.samplingWindow!.fallbackDueAt;
    expect(
      await repository.scheduleSamplingFallback({
        runId,
        cycleId,
        reason: "FALLBACK_DUE",
        now: new Date(due.getTime() - 1),
      }),
    ).toBe(0);
    expect(
      await repository.scheduleSamplingFallback({
        runId,
        cycleId,
        reason: "FALLBACK_DUE",
        now: due,
      }),
    ).toBe(19);
    expect(
      await new PostgresEvaluationProcessRepository(
        prisma,
      ).reconcileSamplingWindows(1, due),
    ).toBe(0);
    const early = await repository.scheduleSamplingFallback({
      runId,
      cycleId,
      sampleId: context.sampleId,
      reason: "WEB_UNAVAILABLE",
      now: new Date(due.getTime() - 50_000),
    });
    expect(early).toBe(0);
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          aggregateId: context.sampleId,
          eventType: "evaluation.sample.acquire.requested",
          businessKey: { not: { endsWith: ":channel:WEB" } },
        },
      }),
    ).toBe(0);
  });

  it("at 80 seconds adds exactly the fourth API work item after three of one platform are accepted", async () => {
    const platformIds = batch.samples.map((sample) => sample.sampleId);
    for (const sample of batch.samples.slice(0, 3)) {
      const itemContext = (await repository.getSampleContext(
        sample.sampleId,
        runId,
        cycleId,
      ))!;
      const attemptId = await succeededWeb(sample.sampleId);
      expect(
        await repository.acceptEvidence({
          context: itemContext,
          attemptId,
          evidence: evidence(),
        }),
      ).toBe("ACCEPTED");
    }
    expect(
      await prisma.evaluationSample.count({
        where: {
          runId,
          platformKey: { not: batch.platformKey },
          status: "PENDING",
        },
      }),
    ).toBe(16);
    const apiWorkWhere = {
      aggregateId: { in: platformIds },
      eventType: "evaluation.sample.acquire.requested",
      businessKey: { not: { endsWith: ":channel:WEB" } },
    };
    await repository.scheduleSamplingFallback({
      runId,
      cycleId,
      reason: "FALLBACK_DUE",
      now: new Date(context.samplingWindow!.startedAt.getTime() + 79_000),
    });
    expect(await prisma.productOutboxEvent.count({ where: apiWorkWhere })).toBe(
      0,
    );
    await repository.scheduleSamplingFallback({
      runId,
      cycleId,
      reason: "FALLBACK_DUE",
      now: context.samplingWindow!.fallbackDueAt,
    });
    const platformApiWork = await prisma.productOutboxEvent.findMany({
      where: apiWorkWhere,
    });
    expect(platformApiWork).toHaveLength(1);
    expect(platformApiWork[0]!.payload).toMatchObject({
      runId,
      cycleId,
      sampleId: batch.samples[3]!.sampleId,
      attemptNumber: 1,
    });
    expect(
      await prisma.evaluationSample.count({
        where: {
          id: { in: platformIds.slice(0, 3) },
          status: "EVIDENCE_ACCEPTED",
        },
      }),
    ).toBe(3);
  });

  it("130-second closure only exhausts pending acquisition and leaves accepted Parser usable", async () => {
    const attemptId = await succeededWeb();
    await repository.acceptEvidence({
      context,
      attemptId,
      evidence: evidence(),
    });
    const deadline = context.samplingWindow!.deadlineAt;
    expect(
      await repository.closeSamplingAtDeadline({
        runId,
        cycleId,
        now: new Date(deadline.getTime() - 1),
      }),
    ).toBe(0);
    expect(
      await repository.closeSamplingAtDeadline({
        runId,
        cycleId,
        now: deadline,
      }),
    ).toBe(19);
    expect(
      await repository.closeSamplingAtDeadline({
        runId,
        cycleId,
        now: deadline,
      }),
    ).toBe(0);
    const stored = await prisma.evaluationExecutionCycle.findUniqueOrThrow({
      where: { id: cycleId },
    });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.samplingClosedAt).toEqual(deadline);
    expect(
      (await repository.getSampleContext(context.sampleId, runId, cycleId))
        ?.status,
    ).toBe("EVIDENCE_ACCEPTED");
    expect(
      await prisma.evaluationStageExhaustion.count({
        where: { cycleId, purpose: "EVALUATION_ACQUISITION" },
      }),
    ).toBe(19);
    expect(await repository.hasOpenSamplingWindows()).toBe(false);
  });

  it("rejects a deadline-racing successful candidate and prevents exhaustion overwriting evidence", async () => {
    const attemptId = await succeededWeb();
    const deadline = context.samplingWindow!.deadlineAt;
    const [result] = await Promise.all([
      repository.acceptEvidence({
        context,
        attemptId,
        evidence: evidence(),
        observedAt: deadline,
      }),
      repository.closeSamplingAtDeadline({ runId, cycleId, now: deadline }),
    ]);
    expect(result).toBe("DEADLINE_EXCEEDED");
    expect(
      await prisma.evaluationSampleEvidence.count({
        where: { sampleId: context.sampleId },
      }),
    ).toBe(0);
    expect(
      (
        await prisma.evaluationSample.findUniqueOrThrow({
          where: { id: context.sampleId },
        })
      ).status,
    ).toBe("ACQUISITION_EXHAUSTED");
  });

  it("holds an item terminal snapshot immutable without waiting for sibling terminal states", async () => {
    const snapshot = {
      contractVersion: "execution.v1" as const,
      channel: "web" as const,
      callerRequestRef: batch.callerRequestRef,
      taskId: "execution-" + randomUUID(),
      deadlineAt: batch.request.deadlineAt,
      items: batch.items.map((item, index) => ({
        itemId: item.itemId,
        state: index === 0 ? "RESULT_AVAILABLE" : "QUEUED",
        ...(index === 0 ? { result: { answer: "首题" } } : {}),
      })),
    };
    const first = await repository.recordExecutionSamplingSnapshot({
      batchId: batch.batchId,
      snapshot,
    });
    expect(first?.items[0]?.state).toBe("READY");
    expect(first?.items[1]?.state).toBe("WAITING");
    expect(first?.status).toBe("SUBMITTED");
    await repository.recordExecutionSamplingSnapshot({
      batchId: batch.batchId,
      snapshot: {
        ...snapshot,
        items: snapshot.items.map((item, index) =>
          index === 0 ? { ...item, result: { answer: "不能覆盖" } } : item,
        ),
      },
    });
    const item = await repository.getExecutionSamplingItem({
      sampleId: batch.items[0]!.sampleId,
      runId,
      cycleId,
    });
    expect(item?.snapshot).toMatchObject({ result: { answer: "首题" } });
  });

  it("rejects old-cycle results and wrong-attempt identity before accepting evidence", async () => {
    const web = await succeededWeb();
    const other = await succeededWeb(batch.samples[1]!.sampleId);
    expect(
      await repository.acceptEvidence({
        context,
        attemptId: other,
        evidence: evidence(),
      }),
    ).toBe("STALE_CYCLE");
    await prisma.evaluationExecutionCycle.update({
      where: { id: cycleId },
      data: { status: "EXHAUSTED" },
    });
    await prisma.evaluationExecutionCycle.create({
      data: { runId, sequence: 2 },
    });
    expect(
      await repository.acceptEvidence({
        context,
        attemptId: web,
        evidence: evidence(),
      }),
    ).toBe("STALE_CYCLE");
    expect(await prisma.evaluationSampleEvidence.count()).toBe(0);
  });

  it("rolls back evidence, status and processed receipt when Parser outbox insertion fails", async () => {
    const attemptId = await succeededWeb();
    await prisma.$executeRawUnsafe(
      "CREATE FUNCTION p4_test_fail_parser() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type='evaluation.sample.interpret.requested' THEN RAISE EXCEPTION 'CONTROLLED_P4_PARSER_OUTBOX_FAILURE'; END IF; RETURN NEW; END $$",
    );
    await prisma.$executeRawUnsafe(
      "CREATE TRIGGER p4_test_fail_parser BEFORE INSERT ON product_outbox_events FOR EACH ROW EXECUTE FUNCTION p4_test_fail_parser()",
    );
    try {
      await expect(
        repository.acceptEvidence({ context, attemptId, evidence: evidence() }),
      ).rejects.toThrow();
      expect(await prisma.evaluationSampleEvidence.count()).toBe(0);
      expect(
        (
          await prisma.evaluationSample.findUniqueOrThrow({
            where: { id: context.sampleId },
          })
        ).status,
      ).toBe("PENDING");
      expect(
        (
          await repository.getExecutionSamplingItem({
            sampleId: context.sampleId,
            runId,
            cycleId,
          })
        )?.processedAt,
      ).toBeNull();
    } finally {
      await prisma.$executeRawUnsafe(
        "DROP TRIGGER IF EXISTS p4_test_fail_parser ON product_outbox_events",
      );
      await prisma.$executeRawUnsafe(
        "DROP FUNCTION IF EXISTS p4_test_fail_parser()",
      );
    }
    expect(
      await repository.acceptEvidence({
        context,
        attemptId,
        evidence: evidence(),
      }),
    ).toBe("ACCEPTED");
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          aggregateId: context.sampleId,
          eventType: "evaluation.sample.interpret.requested",
        },
      }),
    ).toBe(1);
  });

  it("pages past old live windows instead of letting a waiting prefix hide a later due run", async () => {
    const otherAccount = await prisma.account.create({
      data: { mobile: "+8613900000168" },
    });
    const otherBrand = await brands.create(
      otherAccount.id,
      readyCoffeeBrandInput(otherAccount.id, { companyName: "另一个测试咖啡" }),
    );
    const definition = await preparation.prepareReadyDefinition(
      evaluations,
      otherAccount.id,
      otherBrand.id,
    );
    const otherRun = await evaluations.startRun(otherAccount.id, definition.id);
    const otherCycle = await prisma.evaluationExecutionCycle.findFirstOrThrow({
      where: { runId: otherRun.id },
    });
    await repository.initializeRun(otherRun.id, otherCycle.id, {
      mode: "execution-center",
      accountAlias: "fixture",
      centerRef: "p4-center",
    });
    const all = await prisma.evaluationExecutionCycle.findMany({
      where: { id: { in: [cycleId, otherCycle.id] } },
    });
    const due = new Date(
      Math.max(...all.map((row) => row.samplingFallbackDueAt!.getTime())),
    );
    expect(await repository.reconcileSamplingWindows(1, due)).toBe(40);
    expect(await repository.reconcileSamplingWindows(1, due)).toBe(0);
    expect(
      await repository.listExecutionSamplingBatches({ limit: 1 }),
    ).toHaveLength(1);
    const first = (
      await repository.listExecutionSamplingBatches({ limit: 1 })
    )[0]!;
    const after = await repository.listExecutionSamplingBatches({
      limit: 100,
      afterId: first.batchId,
    });
    expect(after).toHaveLength(9);
    expect(after.every((row) => row.batchId > first.batchId)).toBe(true);
  });

  it("enforces 80/130 seconds before run.started is processed and never revives a late start", async () => {
    const queued = await createQueuedRun("execution-center");
    expect(
      (
        await prisma.evaluationRun.findUniqueOrThrow({
          where: { id: queued.run.id },
        })
      ).stage,
    ).toBe("QUEUED");
    expect(queued.cycle.samplingStartedAt).toEqual(queued.cycle.createdAt);
    expect(
      queued.cycle.samplingFallbackDueAt!.getTime() -
        queued.cycle.createdAt.getTime(),
    ).toBe(80_000);
    expect(
      queued.cycle.samplingDeadlineAt!.getTime() -
        queued.cycle.createdAt.getTime(),
    ).toBe(130_000);
    expect(
      await prisma.evaluationSamplingBatchItem.count({
        where: { cycleId: queued.cycle.id },
      }),
    ).toBe(0);
    expect(
      await repository.scheduleSamplingFallback({
        runId: queued.run.id,
        cycleId: queued.cycle.id,
        reason: "FALLBACK_DUE",
        now: new Date(queued.cycle.samplingFallbackDueAt!.getTime() - 1),
      }),
    ).toBe(0);
    await repository.reconcileSamplingWindows(
      1,
      queued.cycle.samplingFallbackDueAt!,
    );
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          aggregateId: {
            in: (
              await prisma.evaluationSample.findMany({
                where: { runId: queued.run.id },
                select: { id: true },
              })
            ).map((row) => row.id),
          },
          eventType: "evaluation.sample.acquire.requested",
        },
      }),
    ).toBe(20);
    expect(
      (
        await prisma.evaluationRun.findUniqueOrThrow({
          where: { id: queued.run.id },
        })
      ).stage,
    ).toBe("PROCESSING_EVIDENCE");
    await repository.reconcileSamplingWindows(
      1,
      queued.cycle.samplingDeadlineAt!,
    );
    expect(
      await prisma.evaluationSample.count({
        where: { runId: queued.run.id, status: "ACQUISITION_EXHAUSTED" },
      }),
    ).toBe(20);
    const before = await prisma.productOutboxEvent.count({
      where: { payload: { path: ["cycleId"], equals: queued.cycle.id } },
    });
    await repository.initializeRun(queued.run.id, queued.cycle.id, {
      mode: "execution-center",
      accountAlias: "fixture",
      centerRef: "p4-center",
    });
    expect(
      await prisma.evaluationSamplingBatchItem.count({
        where: { cycleId: queued.cycle.id },
      }),
    ).toBe(0);
    expect(
      await prisma.productOutboxEvent.count({
        where: { payload: { path: ["cycleId"], equals: queued.cycle.id } },
      }),
    ).toBe(before);
    expect(
      await prisma.aiExecutionAttempt.count({
        where: {
          cycleId: queued.cycle.id,
          status: "FAILED",
          failureClass: "SAMPLING_DEADLINE_EXCEEDED",
        },
      }),
    ).toBe(20);
    await repository.evaluateReadiness(queued.run.id, queued.cycle.id);
    expect(
      (
        await prisma.evaluationRun.findUniqueOrThrow({
          where: { id: queued.run.id },
        })
      ).status,
    ).toBe("PLEASE_RETRY");
    await expect(
      repository.initializeRun(queued.run.id, queued.cycle.id, {
        mode: "execution-center",
        accountAlias: "fixture",
        centerRef: "p4-center",
      }),
    ).resolves.toBeUndefined();
    expect(
      (
        await prisma.evaluationRun.findUniqueOrThrow({
          where: { id: queued.run.id },
        })
      ).status,
    ).toBe("PLEASE_RETRY");
  });

  it("persists one fresh retry window and only platform WEB leaders before fallback is due", async () => {
    const queued = await createQueuedRun("execution-center");
    await repository.closeSamplingAtDeadline({
      runId: queued.run.id,
      cycleId: queued.cycle.id,
      now: queued.cycle.samplingDeadlineAt!,
    });
    await repository.evaluateReadiness(queued.run.id, queued.cycle.id);
    await Promise.all([
      queued.service.retryRun(queued.account.id, queued.run.id),
      queued.service.retryRun(queued.account.id, queued.run.id),
    ]);
    const retry = await prisma.evaluationExecutionCycle.findFirstOrThrow({
      where: { runId: queued.run.id, sequence: 2 },
    });
    expect(
      await prisma.evaluationExecutionCycle.count({
        where: { runId: queued.run.id, sequence: 2 },
      }),
    ).toBe(1);
    expect(retry.samplingStartedAt).toEqual(retry.createdAt);
    expect(
      retry.samplingDeadlineAt!.getTime() - retry.createdAt.getTime(),
    ).toBe(130_000);
    const events = await prisma.productOutboxEvent.findMany({
      where: {
        eventType: "evaluation.sample.acquire.requested",
        payload: { path: ["cycleId"], equals: retry.id },
      },
    });
    expect(events).toHaveLength(5);
    expect(
      events.every(
        (event) =>
          (event.payload as Record<string, unknown>).executionChannel === "WEB",
      ),
    ).toBe(true);
    const leaders = await prisma.evaluationSample.findMany({
      where: { runId: queued.run.id, question: { ordinal: 1 } },
      select: { id: true },
    });
    expect(
      new Set(
        events.map(
          (event) => (event.payload as Record<string, unknown>).sampleId,
        ),
      ),
    ).toEqual(new Set(leaders.map((row) => row.id)));
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          aggregateId: queued.run.id,
          eventType: {
            in: [
              "evaluation.sampling.fallback.requested",
              "evaluation.sampling.deadline.requested",
            ],
          },
          payload: { path: ["cycleId"], equals: retry.id },
        },
      }),
    ).toBe(2);
  });

  it("keeps default submission free of P4 windows and budget work", async () => {
    const queued = await createQueuedRun("ai-provider");
    expect(queued.cycle.samplingStartedAt).toBeNull();
    expect(queued.cycle.samplingDeadlineAt).toBeNull();
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          aggregateId: queued.run.id,
          eventType: {
            in: [
              "evaluation.sampling.fallback.requested",
              "evaluation.sampling.deadline.requested",
            ],
          },
        },
      }),
    ).toBe(0);
  });
});
