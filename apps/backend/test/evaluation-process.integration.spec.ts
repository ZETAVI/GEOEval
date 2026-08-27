import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Queue } from "bullmq";
import { NestFactory } from "@nestjs/core";

import { AiExecutionService } from "../src/ai-execution/application/ai-execution.service.js";
import {
  DeterministicAiAttemptAdapter,
  type DeterministicAttemptScenario,
} from "../src/ai-execution/domain/ai-attempt.adapter.js";
import { PostgresAiAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-attempt.repository.js";
import { ProductWorkProcessor } from "../src/background-work/application/product-work.processor.js";
import { bullmqConnectionOptions } from "../src/background-work/bullmq-connection.js";
import { PostgresProductOutboxRepository } from "../src/background-work/infrastructure/postgres-product-outbox.repository.js";
import { ProductWorkerRuntime } from "../src/background-work/product-worker-runtime.js";
import { BrandService } from "../src/brand/application/brand.service.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import {
  loadApiConfig,
  loadWorkerConfig,
} from "../src/config/runtime-config.js";
import { EvaluationProcessCoordinator } from "../src/geo-intelligence/application/evaluation-process.coordinator.js";
import { EvaluationService } from "../src/geo-intelligence/application/evaluation.service.js";
import { DeterministicEvaluationQuestionGenerator } from "../src/geo-intelligence/domain/question-generator.js";
import { PostgresEvaluationProcessRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-process.repository.js";
import { PostgresEvaluationRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { SafeTelemetry } from "../src/infrastructure/telemetry.js";
import { WorkerModule } from "../src/worker.module.js";
import { clearCustomerData } from "./customer-data.js";

const config = loadApiConfig({ GEOEVAL_LOCAL_DEFAULTS: "1", NODE_ENV: "test" });

describe("resumable evaluation evidence", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const brands = new BrandService(new PostgresBrandRepository(prisma));
  const evaluations = new EvaluationService(
    brands,
    new PostgresEvaluationRepository(prisma),
    new DeterministicEvaluationQuestionGenerator(),
  );
  let accountId: string;

  beforeAll(async () => prisma.$connect());
  afterAll(async () => {
    await clearProductQueue();
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await clearProductQueue();
    await clearCustomerData(prisma);
    accountId = (
      await prisma.account.create({ data: { mobile: "+8613900000301" } })
    ).id;
  });

  it("retains twenty canonical answers and interpretations including valid no-mention results", async () => {
    const { runId, processor, outbox } = await startScenario();
    await drain(processor, outbox);

    const run = await prisma.evaluationRun.findUniqueOrThrow({
      where: { id: runId },
      include: { executionCycles: true },
    });
    expect(run).toMatchObject({
      status: "EVALUATING",
      stage: "READY_FOR_SYNTHESIS",
    });
    expect(run.executionCycles[0]?.status).toBe("READY_FOR_SYNTHESIS");
    expect(await prisma.evaluationSampleEvidence.count()).toBe(20);
    expect(await prisma.evaluationSampleInterpretation.count()).toBe(20);
    expect(
      await prisma.evaluationSampleInterpretation.count({
        where: { mentioned: false },
      }),
    ).toBe(5);
    expect(
      await prisma.evaluationSampleInterpretation.count({
        where: { acceptedAttempt: { status: "SUCCEEDED" } },
      }),
    ).toBe(20);
    const evidence = await prisma.evaluationSampleEvidence.findFirstOrThrow();
    const foreignAttempt = await prisma.aiExecutionAttempt.findFirstOrThrow({
      where: {
        purpose: "EVALUATION_ACQUISITION",
        sampleId: { not: evidence.sampleId },
      },
    });
    await expect(
      prisma.evaluationSampleEvidence.update({
        where: { id: evidence.id },
        data: { acceptedAttemptId: foreignAttempt.id },
      }),
    ).rejects.toThrow();
  });

  it("uses the seventeen-of-twenty boundary for readiness and please-retry", async () => {
    const failThree = failedPositions(3, "EVALUATION_ACQUISITION");
    const first = await startScenario(failThree);
    await drain(first.processor, first.outbox);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({
        where: { id: first.runId },
      }),
    ).toMatchObject({
      status: "EVALUATING",
      stage: "READY_FOR_SYNTHESIS",
    });
    expect(await prisma.evaluationStageExhaustion.count()).toBe(3);

    await clearCustomerData(prisma);
    accountId = (
      await prisma.account.create({ data: { mobile: "+8613900000302" } })
    ).id;
    const failFour = failedPositions(4, "EVALUATION_ACQUISITION");
    const second = await startScenario(failFour);
    await drain(second.processor, second.outbox);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({
        where: { id: second.runId },
      }),
    ).toMatchObject({ status: "PLEASE_RETRY" });
    expect(await prisma.evaluationSampleInterpretation.count()).toBe(16);
  });

  it("separates purpose retries from delivery retries and can exhaust interpretation", async () => {
    const retried = new Set<string>();
    const retryOnce: DeterministicAttemptScenario = (request) => {
      const key = positionKey(request.input);
      if (
        request.purpose === "EVALUATION_ACQUISITION" &&
        key === "1:DeepSeek" &&
        request.attemptNumber === 1 &&
        !retried.has(key)
      ) {
        retried.add(key);
        return {
          kind: "FAILED",
          failureClass: "CONTROLLED_TRANSIENT",
          retryable: true,
        };
      }
      if (request.purpose === "EVALUATION_INTERPRETATION" && key === "1:豆包") {
        return {
          kind: "FAILED",
          failureClass: "CONTROLLED_PARSE_FAILURE",
          retryable: false,
        };
      }
      return undefined;
    };
    const { runId, processor, outbox } = await startScenario(retryOnce);
    await drain(processor, outbox);

    expect(
      await prisma.aiExecutionAttempt.count({
        where: { purpose: "EVALUATION_ACQUISITION" },
      }),
    ).toBe(21);
    expect(
      await prisma.evaluationStageExhaustion.count({
        where: { purpose: "EVALUATION_INTERPRETATION" },
      }),
    ).toBe(1);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({
      status: "EVALUATING",
      stage: "READY_FOR_SYNTHESIS",
    });
  });

  it("keeps duplicate concurrent delivery and telemetry failure from duplicating accepted evidence", async () => {
    const { runId, processor, outbox } = await startScenario(undefined, true);
    const [started] = await outbox.findDeliverable(1);
    expect(started).toBeDefined();
    await Promise.all([
      processor.apply(started!.id),
      processor.apply(started!.id),
      processor.apply(started!.id),
    ]);
    expect(
      await prisma.productOutboxEvent.count({
        where: { eventType: "evaluation.sample.acquire.requested" },
      }),
    ).toBe(20);

    const acquisitionEvents = await outbox.findDeliverable(50);
    const acquisitionIds = new Set(
      (
        await prisma.productOutboxEvent.findMany({
          where: { eventType: "evaluation.sample.acquire.requested" },
          select: { id: true },
        })
      ).map((event) => event.id),
    );
    const acquisition = acquisitionEvents.find((event) =>
      acquisitionIds.has(event.id),
    );
    expect(acquisition).toBeDefined();
    await Promise.all([
      processor.apply(acquisition!.id),
      processor.apply(acquisition!.id),
    ]);
    await drain(processor, outbox);

    expect(await prisma.evaluationSampleEvidence.count()).toBe(20);
    expect(await prisma.evaluationSampleInterpretation.count()).toBe(20);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({ stage: "READY_FOR_SYNTHESIS" });
  });

  it("resumes queued small work after a worker runtime restart", async () => {
    const { runId, processor, outbox } = await startScenario();
    const [started] = await outbox.findDeliverable(1);
    await processor.apply(started!.id);

    const firstRuntime = new ProductWorkerRuntime(
      outbox,
      processor,
      "redis://127.0.0.1:56379",
    );
    await firstRuntime.onApplicationBootstrap();
    await firstRuntime.onModuleDestroy();

    const secondRuntime = new ProductWorkerRuntime(
      outbox,
      processor,
      "redis://127.0.0.1:56379",
    );
    await secondRuntime.onApplicationBootstrap();
    try {
      await waitFor(async () => {
        const run = await prisma.evaluationRun.findUniqueOrThrow({
          where: { id: runId },
        });
        const unfinished = await prisma.productOutboxEvent.count({
          where: { status: { not: "COMPLETED" } },
        });
        return run.stage === "READY_FOR_SYNTHESIS" && unfinished === 0;
      });
    } finally {
      await secondRuntime.onModuleDestroy();
    }

    expect(await prisma.evaluationSampleEvidence.count()).toBe(20);
    expect(await prisma.evaluationSampleInterpretation.count()).toBe(20);
    expect(
      await prisma.productOutboxEvent.count({
        where: { status: { not: "COMPLETED" } },
      }),
    ).toBe(0);
  });

  it("boots and closes the complete Worker module graph", async () => {
    const application = await NestFactory.createApplicationContext(
      WorkerModule.register(
        loadWorkerConfig({ GEOEVAL_LOCAL_DEFAULTS: "1", NODE_ENV: "test" }),
      ),
      { logger: false },
    );

    await application.close();
  });

  async function startScenario(
    scenario?: DeterministicAttemptScenario,
    telemetryShouldFail = false,
  ) {
    const brand = await brands.create(accountId, {
      companyName: "星河咖啡",
      primaryIndustry: "餐饮",
      secondaryIndustry: "咖啡店",
      characteristicOne: "安静办公",
      characteristicTwo: "精品手冲",
      province: "广东省",
      city: "广州市",
      district: "天河区",
      contactName: "林先生",
      contactMobile: "+8613900000301",
    });
    const definition = await evaluations.prepareDefinition(accountId, brand.id);
    const run = await evaluations.startRun(accountId, definition.id);
    const processRepository = new PostgresEvaluationProcessRepository(prisma);
    const ai = new AiExecutionService(
      new PostgresAiAttemptRepository(prisma),
      new DeterministicAiAttemptAdapter(scenario),
    );
    const coordinator = new EvaluationProcessCoordinator(processRepository, ai);
    const outbox = new PostgresProductOutboxRepository(prisma);
    let telemetryFailureCount = 0;
    const telemetry = new SafeTelemetry({
      export: async () => {
        if (telemetryShouldFail && telemetryFailureCount === 0) {
          telemetryFailureCount += 1;
          throw new Error("controlled telemetry failure");
        }
      },
    });
    return {
      runId: run.id,
      outbox,
      processor: new ProductWorkProcessor(outbox, coordinator, telemetry),
    };
  }
});

async function clearProductQueue(): Promise<void> {
  const queue = new Queue("geoeval-product", {
    connection: bullmqConnectionOptions("redis://127.0.0.1:56379"),
  });
  try {
    await queue.removeJobScheduler("evaluation-reconciliation-v1");
    await queue.obliterate({ force: true });
  } finally {
    await queue.close();
  }
}

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for resumed evaluation work");
}

function failedPositions(
  count: number,
  purpose: "EVALUATION_ACQUISITION" | "EVALUATION_INTERPRETATION",
): DeterministicAttemptScenario {
  const positions = new Set(
    ["1:DeepSeek", "1:豆包", "1:千问", "1:文心一言"].slice(0, count),
  );
  return (request) =>
    request.purpose === purpose && positions.has(positionKey(request.input))
      ? {
          kind: "FAILED",
          failureClass: "CONTROLLED_EXHAUSTION",
          retryable: false,
        }
      : undefined;
}

function positionKey(input: Record<string, unknown>): string {
  return `${String(input.questionOrdinal)}:${String(input.platformLabel)}`;
}

async function drain(
  processor: ProductWorkProcessor,
  outbox: PostgresProductOutboxRepository,
): Promise<void> {
  for (let round = 0; round < 20; round += 1) {
    const events = await outbox.findDeliverable(500);
    if (events.length === 0) return;
    await Promise.all(events.map((event) => processor.apply(event.id)));
  }
  throw new Error("Evaluation work did not drain within twenty rounds");
}
