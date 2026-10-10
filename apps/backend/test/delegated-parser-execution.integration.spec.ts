import { setTimeout as delay } from "node:timers/promises";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { AiExecutionService } from "../src/ai-execution/application/ai-execution.service.js";
import { DelegatedParserExecutionService } from "../src/ai-execution/application/delegated-parser-execution.service.js";
import { AiSynthesisExecutionService } from "../src/ai-execution/application/ai-synthesis-execution.service.js";
import type { AiAttemptAdapter } from "../src/ai-execution/domain/ai-attempt.adapter.js";
import { NoopAiAttemptTelemetry } from "../src/ai-execution/domain/ai-attempt.telemetry.js";
import type {
  ResolvedAiAttemptRequest,
  ResolvedSampleAiAttemptRequest,
  SampleAiAttemptRequest,
} from "../src/ai-execution/domain/ai-attempt.types.js";
import { DeterministicAiAttemptAdapter } from "../src/ai-execution/infrastructure/deterministic-ai-attempt.adapter.js";
import { ExecutionCenterClient } from "../src/ai-execution/infrastructure/execution-center.client.js";
import { ExecutionCenterEventRuntime } from "../src/ai-execution/infrastructure/execution-center-event.runtime.js";
import type { ParserExecutionCenterConfig } from "../src/ai-execution/infrastructure/execution-center.config.js";
import { PostgresAiAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-attempt.repository.js";
import { PostgresAiSynthesisAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-synthesis-attempt.repository.js";
import { PostgresExecutionCenterReceiptRepository } from "../src/ai-execution/infrastructure/postgres-execution-center-receipt.repository.js";
import { RealAiAttemptAdapter } from "../src/ai-execution/infrastructure/providers/real-ai-attempt.adapter.js";
import { RealAiNativeAttemptCodec } from "../src/ai-execution/infrastructure/providers/real-ai-native-attempt.codec.js";
import { ProductWorkProcessor } from "../src/background-work/application/product-work.processor.js";
import { PostgresProductOutboxRepository } from "../src/background-work/infrastructure/postgres-product-outbox.repository.js";
import { BrandService } from "../src/brand/application/brand.service.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";
import { EvaluationProcessCoordinator } from "../src/geo-intelligence/application/evaluation-process.coordinator.js";
import { EvaluationService } from "../src/geo-intelligence/application/evaluation.service.js";
import { EvaluationSynthesisCoordinator } from "../src/geo-intelligence/application/evaluation-synthesis.coordinator.js";
import { evaluationBrandTextContext } from "../src/geo-intelligence/domain/evaluation-brand-snapshot.js";
import { buildSampleParserTask } from "../src/geo-intelligence/sample-parser.policy.js";
import { PostgresEvaluationProcessRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-process.repository.js";
import { PostgresEvaluationRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation.repository.js";
import { PostgresEvaluationSynthesisRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-synthesis.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { SafeTelemetry } from "../src/infrastructure/telemetry.js";
import { NotificationEventHandler } from "../src/notification/application/notification-event.handler.js";
import { PostgresNotificationRepository } from "../src/notification/infrastructure/postgres-notification.repository.js";
import {
  clearCustomerData,
  readyCoffeeBrandInput,
  TEST_STORE_LOCATION_RECEIPTS,
} from "./customer-data.js";
import { createEvaluationQuestionPreparationHarness } from "./evaluation-question-preparation-harness.js";
import {
  startDelegatedCenterHost,
  type DelegatedCenterHost,
} from "./fixtures/delegated-center-host.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const configuration = loadIntegrationApiConfig();
const target = new URL(configuration.databaseUrl);
const permitted =
  (target.hostname === "127.0.0.1" &&
    ["/geoeval_issue175", "/geoeval_p4_issue169"].includes(target.pathname)) ||
  (process.env.CI === "true" && target.pathname === "/geoeval");

describe.skipIf(!permitted)("durable delegated Parser product loop", () => {
  const prisma = new PrismaService(configuration.databaseUrl);
  const hosts: DelegatedCenterHost[] = [];
  const runtimes: ExecutionCenterEventRuntime[] = [];
  beforeAll(async () => prisma.$connect());
  beforeEach(async () => clearCustomerData(prisma));
  afterEach(async () => {
    for (const runtime of runtimes.splice(0)) await runtime.onModuleDestroy();
    for (const host of hosts.splice(0)) await host.close();
  });
  afterAll(async () => {
    await clearCustomerData(prisma);
    await prisma.$disconnect();
  });

  it("completes the original Outbox while the physical Provider is still running, then accepts one real Parser interpretation", async () => {
    const scene = await scenario();
    scene.host.holdProvider = true;
    await scene.startRuntime(scene.driver);
    const submitted = await scene.processor.apply(scene.originalOutboxId);
    await until(
      () => scene.host.providerCalls.length,
      (count) => count === 1,
    );
    expect(submitted.kind).toBe("COMPLETED");
    expect(
      (
        await prisma.productOutboxEvent.findUniqueOrThrow({
          where: { id: scene.originalOutboxId },
        })
      ).status,
    ).toBe("COMPLETED");
    const receipt = await scene.receipt();
    expect(receipt).toMatchObject({
      state: "WAITING",
      business: { purpose: "EVALUATION_INTERPRETATION" },
    });
    expect(
      await prisma.aiExecutionAttempt.findUniqueOrThrow({
        where: { id: receipt!.attemptId },
      }),
    ).toMatchObject({
      status: "STARTED",
      executionTransport: "EXECUTION_CENTER",
    });
    expect(await prisma.evaluationSampleInterpretation.count()).toBe(0);
    expect(scene.directCalls).toEqual(["EVALUATION_ACQUISITION"]);
    const releasedAt = Date.now();
    scene.host.releaseProvider();
    const ready = await until(scene.receipt, (row) => row?.state === "READY");
    expect(Date.now() - releasedAt).toBeLessThan(1_500); // not the 5-second recovery poll.
    const resume = await scene.resumeOutbox();
    expect((await scene.processor.apply(resume.id)).kind).toBe("COMPLETED");
    const accepted =
      await prisma.evaluationSampleInterpretation.findUniqueOrThrow({
        where: { sampleId: scene.sampleId },
      });
    expect(accepted).toMatchObject({
      acceptedAttemptId: ready!.attemptId,
      mentioned: true,
      semanticContractVersion: "2.0.0",
    });
    const attempt = await prisma.aiExecutionAttempt.findUniqueOrThrow({
      where: { id: ready!.attemptId },
    });
    expect(attempt).toMatchObject({
      status: "SUCCEEDED",
      usage: { prompt_tokens: 220, completion_tokens: 96, total_tokens: 316 },
    });
    expect(attempt.responseEnvelope).toMatchObject({
      schemaVersion: "ai-attempt-envelope@1",
      providerEvidence: {
        providerKey: "alibaba-model-studio",
        returnedModel: "deepseek-v4-flash-0731",
      },
    });
    expect(scene.host.providerCalls[0]!.authorization).toBe(
      "Bearer synthetic-provider-key",
    );
    expect(scene.host.providerCalls[0]!.body).toEqual(
      scene.codec.prepare(scene.resolved).body,
    );
    await scene.processor.apply(resume.id);
    await scene.processor.apply(scene.originalOutboxId);
    expect(
      await prisma.evaluationSampleInterpretation.count({
        where: { sampleId: scene.sampleId },
      }),
    ).toBe(1);
    expect(scene.host.providerCalls).toHaveLength(1);
  });

  it("handles completion before ACK and a concurrently applied resume without duplicate acceptance", async () => {
    const scene = await scenario();
    const releaseAck = scene.host.holdAck();
    await scene.startRuntime(scene.driver);
    const original = scene.processor.apply(scene.originalOutboxId);
    const ready = await until(scene.receipt, (row) => row?.state === "READY");
    expect(
      (
        await prisma.productOutboxEvent.findUniqueOrThrow({
          where: { id: scene.originalOutboxId },
        })
      ).status,
    ).not.toBe("COMPLETED");
    const resume = await scene.resumeOutbox();
    await scene.processor.apply(resume.id);
    releaseAck();
    expect((await original).kind).toBe("COMPLETED");
    expect((await scene.receipt())?.state).toBe("READY");
    const cursor = await scene.receipts.readCursor("fixture-parser-center");
    expect(cursor).toBeGreaterThan(0);
    await scene.stopRuntimes();
    await scene.startRuntime(scene.driver); // persisted cursor, not a fabricated ready cursor.
    await scene.processor.apply(resume.id);
    expect(
      await prisma.evaluationSampleInterpretation.count({
        where: { sampleId: scene.sampleId },
      }),
    ).toBe(1);
    expect(
      await prisma.productOutboxEvent.count({
        where: { businessKey: `execution-result:${ready!.attemptId}` },
      }),
    ).toBe(1);
    expect(scene.host.providerCalls).toHaveLength(1);
  });

  it("recovers a lost ACK using the same key after driver restart and never treats remote STARTED as the old ambiguity retry", async () => {
    const scene = await scenario();
    scene.host.holdProvider = true;
    scene.host.dropNextAck = true;
    expect((await scene.processor.apply(scene.originalOutboxId)).kind).toBe(
      "DEFERRED",
    );
    await until(
      () => scene.host.providerCalls.length,
      (count) => count === 1,
    );
    const reserved = await scene.receipt();
    expect(reserved).toMatchObject({ state: "RESERVING", taskId: null });
    const restarted = scene.createDriver();
    const resumedProcessor = scene.createProcessor(restarted);
    expect((await resumedProcessor.apply(scene.originalOutboxId)).kind).toBe(
      "COMPLETED",
    );
    expect((await scene.receipt())?.taskId).toBeTruthy();
    expect(scene.host.submittedKeys).toHaveLength(2);
    expect(new Set(scene.host.submittedKeys).size).toBe(1);
    expect(scene.host.providerCalls).toHaveLength(1);
    await prisma.aiExecutionAttempt.update({
      where: { id: reserved!.attemptId },
      data: { startedAt: new Date(Date.now() - 211_000) },
    });
    const legacyRecovery = await new PostgresAiAttemptRepository(prisma).begin(
      scene.resolved,
      1,
    );
    expect(legacyRecovery.kind).toBe("DEFERRED");
    expect(legacyRecovery.attempt).toMatchObject({
      status: "STARTED",
      retryable: null,
      executionTransport: "EXECUTION_CENTER",
    });
    expect((await restarted.execute(scene.request))?.kind).toBe(
      "REMOTE_PENDING",
    );
    await scene.startRuntime(restarted);
    scene.host.releaseProvider();
    await until(scene.receipt, (row) => row?.state === "READY");
    await resumedProcessor.apply((await scene.resumeOutbox()).id);
    expect(
      await prisma.evaluationSampleInterpretation.count({
        where: { sampleId: scene.sampleId },
      }),
    ).toBe(1);
    expect(scene.host.providerCalls).toHaveLength(1);
  });

  it("continues receipt recovery when the new-submission gate is disabled", async () => {
    const scene = await scenario();
    scene.host.holdProvider = true;
    await scene.processor.apply(scene.originalOutboxId);
    await until(
      () => scene.host.providerCalls.length,
      (count) => count === 1,
    );
    const recovery = scene.createDriver(false);
    const processor = scene.createProcessor(recovery);
    await scene.startRuntime(recovery);
    scene.host.releaseProvider();
    await until(scene.receipt, (row) => row?.state === "READY");
    await processor.apply((await scene.resumeOutbox()).id);
    expect(
      await prisma.evaluationSampleInterpretation.count({
        where: { sampleId: scene.sampleId },
      }),
    ).toBe(1);
    expect(scene.host.providerCalls).toHaveLength(1);
  });

  it("keeps the default closed path and an existing DIRECT attempt on their original transport", async () => {
    const scene = await scenario(false);
    await scene.processor.apply(scene.originalOutboxId);
    expect(await prisma.executionCenterReceipt.count()).toBe(0);
    expect(scene.host.submittedKeys).toHaveLength(0);
    expect(scene.directCalls).toEqual([
      "EVALUATION_ACQUISITION",
      "EVALUATION_INTERPRETATION",
    ]);
    const request = { ...scene.request, attemptNumber: 2 };
    const resolved = {
      ...request,
      ...scene.adapter.resolve(request),
    } as ResolvedSampleAiAttemptRequest;
    const direct = await new PostgresAiAttemptRepository(prisma).begin(
      resolved,
      210_000,
    );
    expect(direct.attempt.executionTransport).toBe("DIRECT");
    const enabled = scene.createDriver(true);
    expect(await enabled.execute(request)).toBeUndefined();
    const ai = new AiExecutionService(
      new PostgresAiAttemptRepository(prisma),
      scene.adapter,
      210_000,
      new NoopAiAttemptTelemetry(),
      enabled,
    );
    expect((await ai.execute(request)).kind).toBe("DEFERRED");
    expect(await prisma.executionCenterReceipt.count()).toBe(0);
    expect(scene.host.submittedKeys).toHaveLength(0);
  });

  it("fails a definite center configuration rejection promptly without a second business attempt", async () => {
    const scene = await scenario();
    scene.host.rejectStatus = 403;
    expect((await scene.processor.apply(scene.originalOutboxId)).kind).toBe(
      "COMPLETED",
    );
    const attempt = await prisma.aiExecutionAttempt.findFirstOrThrow({
      where: { sampleId: scene.sampleId, purpose: "EVALUATION_INTERPRETATION" },
    });
    expect(attempt).toMatchObject({
      status: "FAILED",
      failureClass: "EXECUTION_CENTER_REJECTED",
      retryable: false,
    });
    expect(scene.host.providerCalls).toHaveLength(0);
    // A rejected business attempt is terminal even if the original unaccepted
    // receipt remains RESERVING for audit. Configuration recovery cannot resend it.
    scene.host.rejectStatus = 0;
    await scene.driver.reconcile();
    await delay(25);
    expect(scene.host.providerCalls).toHaveLength(0);
    expect((await scene.receipt())?.state).toBe("RESERVING");
    expect(scene.host.submittedKeys).toHaveLength(1);
    expect(
      await prisma.aiExecutionAttempt.count({
        where: {
          sampleId: scene.sampleId,
          purpose: "EVALUATION_INTERPRETATION",
        },
      }),
    ).toBe(1);
    expect(
      await prisma.evaluationStageExhaustion.count({
        where: { sampleId: scene.sampleId },
      }),
    ).toBe(1);
  });

  it("preserves Provider 429 as RATE_LIMIT_OR_QUOTA in GEO rather than confusing a received HTTP body with semantic success", async () => {
    const scene = await scenario();
    scene.providerStatus.value = 429;
    await scene.startRuntime(scene.driver);
    await scene.processor.apply(scene.originalOutboxId);
    const ready = await until(scene.receipt, (row) => row?.state === "READY");
    expect(ready!.snapshot?.items[0]?.result?.httpStatus).toBe(429);
    await scene.processor.apply((await scene.resumeOutbox()).id);
    const attempt = await prisma.aiExecutionAttempt.findUniqueOrThrow({
      where: { id: ready!.attemptId },
    });
    expect(attempt).toMatchObject({
      status: "FAILED",
      failureClass: "RATE_LIMIT_OR_QUOTA",
      retryable: true,
    });
    expect(await prisma.evaluationSampleInterpretation.count()).toBe(0);
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          eventType: "evaluation.sample.interpret.requested",
          status: "PENDING",
          businessKey: { endsWith: ":interpretation:2" },
        },
      }),
    ).toBe(1);
    expect(scene.host.providerCalls).toHaveLength(1);
  });

  async function scenario(enabled = true) {
    const deterministic = new DeterministicAiAttemptAdapter();
    const real = new RealAiAttemptAdapter({
      mode: "real",
      requestTimeoutMs: 30_000,
      ambiguityTimeoutMs: 210_000,
      telemetry: { mode: "disabled" },
      tokenHub: { baseUrl: "https://unused.invalid", apiKey: "dummy-key" },
      modelStudio: { baseUrl: "https://unused.invalid", apiKey: "dummy-key" },
      ark: { baseUrl: "https://unused.invalid", apiKey: "dummy-key" },
      qianfan: { baseUrl: "https://unused.invalid", apiKey: "dummy-key" },
    });
    const nativeCodec = new RealAiNativeAttemptCodec();
    const providerStatus = { value: 200 };
    const nativeRequests = new Map<string, ResolvedAiAttemptRequest>();
    const codec: RealAiNativeAttemptCodec = {
      prepare(request) {
        const prepared = nativeCodec.prepare(request);
        nativeRequests.set(canonical(prepared.body), request);
        return prepared;
      },
      consume(request, prepared, response) {
        return nativeCodec.consume(request, prepared, response);
      },
    };
    const host = await startDelegatedCenterHost(async (body) => {
      if (providerStatus.value !== 200)
        return {
          status: providerStatus.value,
          body: {
            error: { code: "fixture_rate_limit", message: "synthetic only" },
          },
        };
      const request = nativeRequests.get(canonical(body));
      if (!request) throw new Error("PREPARED_PROVIDER_BODY_MISMATCH");
      const result = await deterministic.execute(request);
      if (result.kind !== "SUCCEEDED")
        throw new Error("DETERMINISTIC_PARSER_FIXTURE_FAILED");
      return {
        status: 200,
        body: {
          id: "fixture-native-response",
          model: request.requestedModel,
          choices: [
            {
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: JSON.stringify(result.output),
              },
            },
          ],
          usage: {
            prompt_tokens: 220,
            completion_tokens: 96,
            total_tokens: 316,
          },
        },
      };
    });
    hosts.push(host);
    const directCalls: string[] = [];
    const adapter: AiAttemptAdapter = {
      resolve: (request) => real.resolve(request),
      execute: (request) => {
        directCalls.push(request.purpose);
        return deterministic.execute(request);
      },
    };
    const attempts = new PostgresAiAttemptRepository(prisma);
    const receipts = new PostgresExecutionCenterReceiptRepository(prisma);
    const config: ParserExecutionCenterConfig = {
      enabled,
      centerRef: "fixture-parser-center",
      baseUrl: host.baseUrl,
      callerToken: "synthetic-caller-key",
      httpTimeoutMs: 2_000,
      endpoints: {
        "alibaba-model-studio:chat-completions": {
          endpointRef: "fixture",
          endpointVersion: "1",
          operation: "chat",
        },
      },
    };
    const client = new ExecutionCenterClient(config);
    const createDriver = (enabled = config.enabled) =>
      new DelegatedParserExecutionService(
        attempts,
        receipts,
        adapter,
        codec,
        client,
        { ...config, enabled },
        30_000,
      );
    const driver = createDriver();
    const preparation = createEvaluationQuestionPreparationHarness(prisma);
    const brands = new BrandService(
      new PostgresBrandRepository(prisma),
      new BrandReferenceData(),
      TEST_STORE_LOCATION_RECEIPTS,
    );
    const evaluations = new EvaluationService(
      brands,
      new PostgresEvaluationRepository(prisma),
      preparation.repository,
    );
    const account = await prisma.account.create({
      data: { mobile: "+8613900000275" },
    });
    const brand = await brands.create(
      account.id,
      readyCoffeeBrandInput(account.id, { companyName: "星河咖啡" }),
    );
    const definition = await preparation.prepareReadyDefinition(
      evaluations,
      account.id,
      brand.id,
    );
    const run = await evaluations.startRun(account.id, definition.id);
    const cycle = await prisma.evaluationExecutionCycle.findFirstOrThrow({
      where: { runId: run.id },
    });
    const processRepository = new PostgresEvaluationProcessRepository(prisma);
    await processRepository.initializeRun(run.id, cycle.id);
    const sample = await prisma.evaluationSample.findFirstOrThrow({
      where: { runId: run.id, question: { kind: "BRAND_DIRECTED" } },
    });
    const outbox = new PostgresProductOutboxRepository(prisma);
    const synthesis = new EvaluationSynthesisCoordinator(
      new PostgresEvaluationSynthesisRepository(prisma),
      new AiSynthesisExecutionService(
        new PostgresAiSynthesisAttemptRepository(prisma),
        deterministic,
        210_000,
      ),
    );
    const createProcessor = (driver: DelegatedParserExecutionService) => {
      const ai = new AiExecutionService(
        attempts,
        adapter,
        210_000,
        new NoopAiAttemptTelemetry(),
        driver,
      );
      const coordinator = new EvaluationProcessCoordinator(
        processRepository,
        ai,
        synthesis,
        { mode: "ai-provider" },
        {
          async submitBatch() {
            throw new Error("Legacy browser disabled in P2 fixture");
          },
          async readBatch() {
            throw new Error("Legacy browser disabled in P2 fixture");
          },
        },
      );
      return new ProductWorkProcessor(
        outbox,
        coordinator,
        preparation.coordinator,
        new NotificationEventHandler(
          new PostgresNotificationRepository(prisma),
        ),
        new SafeTelemetry({ export: async () => {} }),
      );
    };
    const processor = createProcessor(driver);
    const acquisition = await prisma.productOutboxEvent.findFirstOrThrow({
      where: {
        aggregateId: sample.id,
        eventType: "evaluation.sample.acquire.requested",
      },
    });
    await processor.apply(acquisition.id);
    const original = await prisma.productOutboxEvent.findFirstOrThrow({
      where: {
        aggregateId: sample.id,
        eventType: "evaluation.sample.interpret.requested",
      },
    });
    await prisma.productOutboxEvent.updateMany({
      where: { id: { not: original.id } },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    const context = await processRepository.getSampleContext(
      sample.id,
      run.id,
      cycle.id,
    );
    if (!context?.evidence) throw new Error("PARSER_EVIDENCE_FIXTURE_MISSING");
    const brandContext = evaluationBrandTextContext(context.brandSnapshot);
    const request: SampleAiAttemptRequest = {
      runId: run.id,
      cycleId: cycle.id,
      sampleId: sample.id,
      purpose: "EVALUATION_INTERPRETATION",
      attemptNumber: 1,
      routePolicyId: "evaluation.interpretation.deepseek@1",
      requestedModel: "deepseek-v4-flash-0731",
      correlationId: context.correlationId,
      input: buildSampleParserTask({
        companyName: brandContext.companyName,
        primaryIndustry: brandContext.primaryIndustry,
        secondaryIndustry: brandContext.secondaryIndustry,
        region: [
          brandContext.province,
          brandContext.city,
          brandContext.terminalRegion,
        ]
          .filter(Boolean)
          .join(""),
        characteristicOne: brandContext.characteristicOne,
        characteristicTwo: brandContext.characteristicTwo,
        questionKind: context.questionKind,
        question: context.query,
        originalAnswer: context.evidence.answerContent,
      }),
    };
    const resolved = {
      ...request,
      ...adapter.resolve(request),
    } as ResolvedSampleAiAttemptRequest;
    const receipt = () =>
      receipts.findByRequest({
        cycleId: cycle.id,
        sampleId: sample.id,
        purpose: "EVALUATION_INTERPRETATION",
        attemptNumber: 1,
      });
    const resumeOutbox = async () => {
      const receiptRow = await receipt();
      if (!receiptRow) throw new Error("RECEIPT_FIXTURE_MISSING");
      return prisma.productOutboxEvent.findUniqueOrThrow({
        where: { businessKey: `execution-result:${receiptRow.attemptId}` },
      });
    };
    const localRuntimes: ExecutionCenterEventRuntime[] = [];
    const startRuntime = async (driver: DelegatedParserExecutionService) => {
      const before = host.eventConnections;
      const runtime = new ExecutionCenterEventRuntime(
        receipts,
        client,
        driver,
        config.centerRef,
      );
      localRuntimes.push(runtime);
      runtimes.push(runtime);
      runtime.onApplicationBootstrap();
      await until(
        () => host.eventConnections,
        (count) => count > before,
      );
      return runtime;
    };
    const stopRuntimes = async () => {
      for (const runtime of localRuntimes.splice(0)) {
        await runtime.onModuleDestroy();
        const index = runtimes.indexOf(runtime);
        if (index >= 0) runtimes.splice(index, 1);
      }
    };
    return {
      host,
      codec,
      adapter,
      directCalls,
      providerStatus,
      attempts,
      receipts,
      config,
      driver,
      processor,
      sampleId: sample.id,
      originalOutboxId: original.id,
      request,
      resolved,
      receipt,
      resumeOutbox,
      createDriver,
      createProcessor,
      startRuntime,
      stopRuntimes,
    };
  }
});

async function until<T>(
  read: () => Promise<T> | T,
  accept: (value: T) => boolean,
  timeoutMs = 4_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const value = await read();
    if (accept(value)) return value;
    if (Date.now() >= deadline)
      throw new Error("DELEGATED_PARSER_EXPECTATION_TIMEOUT");
    await delay(10);
  }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}
