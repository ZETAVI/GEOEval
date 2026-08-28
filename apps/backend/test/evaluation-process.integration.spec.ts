import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Queue } from "bullmq";
import { NestFactory } from "@nestjs/core";

import { AiExecutionService } from "../src/ai-execution/application/ai-execution.service.js";
import { AiSynthesisExecutionService } from "../src/ai-execution/application/ai-synthesis-execution.service.js";
import {
  DeterministicAiAttemptAdapter,
  type DeterministicAttemptScenario,
} from "../src/ai-execution/domain/ai-attempt.adapter.js";
import type { AiAttemptRequest } from "../src/ai-execution/domain/ai-attempt.types.js";
import { PostgresAiAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-attempt.repository.js";
import { PostgresAiSynthesisAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-synthesis-attempt.repository.js";
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
import { EvaluationReportService } from "../src/geo-intelligence/application/evaluation-report.service.js";
import { EvaluationSynthesisCoordinator } from "../src/geo-intelligence/application/evaluation-synthesis.coordinator.js";
import { EvaluationService } from "../src/geo-intelligence/application/evaluation.service.js";
import { DeterministicEvaluationQuestionGenerator } from "../src/geo-intelligence/domain/question-generator.js";
import { parseStoredSampleSemantic } from "../src/geo-intelligence/domain/sample-parser.contract.js";
import { PostgresEvaluationProcessRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-process.repository.js";
import { PostgresEvaluationReportRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-report.repository.js";
import { PostgresEvaluationSynthesisRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-synthesis.repository.js";
import { PostgresEvaluationRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { SafeTelemetry } from "../src/infrastructure/telemetry.js";
import { NotificationEventHandler } from "../src/notification/application/notification-event.handler.js";
import { PostgresNotificationRepository } from "../src/notification/infrastructure/postgres-notification.repository.js";
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
  const reports = new EvaluationReportService(
    brands,
    new PostgresEvaluationReportRepository(prisma),
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
    const { runId, brandId, processor, outbox } = await startScenario();
    await drain(processor, outbox);

    const run = await prisma.evaluationRun.findUniqueOrThrow({
      where: { id: runId },
      include: { executionCycles: true },
    });
    expect(run).toMatchObject({
      status: "COMPLETED",
      stage: "REPORT_ACCEPTED",
    });
    expect(run.executionCycles[0]?.status).toBe("COMPLETED");
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
    const currentInterpretations =
      await prisma.evaluationSampleInterpretation.findMany({
        where: { semanticContractVersion: "1.0.0" },
        select: {
          relevantDescription: true,
          characteristics: true,
          objectiveSummary: true,
          structuredEvidence: true,
        },
      });
    expect(currentInterpretations).toHaveLength(20);
    expect(currentInterpretations).toEqual(
      Array.from({ length: 20 }, () => ({
        relevantDescription: null,
        characteristics: null,
        objectiveSummary: null,
        structuredEvidence: null,
      })),
    );
    const openInterpretations =
      await prisma.evaluationSampleInterpretation.findMany({
        where: { sample: { question: { kind: { not: "BRAND_DIRECTED" } } } },
        include: { sample: { include: { question: true } } },
      });
    const openByKind = new Map(
      openInterpretations.map((interpretation) => [
        interpretation.sample.question.kind,
        {
          position: interpretation.position,
          semantic: parseStoredSampleSemantic(
            interpretation.semanticContractVersion,
            interpretation.semanticPayload,
          ),
        },
      ]),
    );
    expect(openByKind.get("INDUSTRY_RECOMMENDATION")).toMatchObject({
      position: null,
      semantic: {
        profile: "OPEN_DISCOVERY",
        targetRole: "NOT_MENTIONED",
        otherBrands: [{ displayName: "晨光咖啡" }, { displayName: "城市咖啡" }],
      },
    });
    expect(openByKind.get("CHARACTERISTIC_ONE")).toMatchObject({ position: 3 });
    expect(openByKind.get("CHARACTERISTIC_TWO")).toMatchObject({ position: 1 });
    expect(
      await prisma.evaluationSampleInterpretation.count({
        where: {
          sample: { question: { kind: "BRAND_DIRECTED" } },
          position: { not: null },
        },
      }),
    ).toBe(0);
    const interpretationAttempt =
      await prisma.aiExecutionAttempt.findFirstOrThrow({
        where: { purpose: "EVALUATION_INTERPRETATION" },
      });
    expect(interpretationAttempt.requestPayload).toMatchObject({
      taskKind: "STRUCTURED_OUTPUT",
      systemInstruction: expect.any(String),
      outputContract: {
        version: "1.0.0",
        jsonSchema: expect.any(Object),
      },
    });
    expect(interpretationAttempt.requestPayload).not.toHaveProperty(
      "parserInstructionHash",
    );
    expect(interpretationAttempt.requestPayload).not.toHaveProperty(
      "semanticSchemaHash",
    );
    const constrainedInterpretation =
      await prisma.evaluationSampleInterpretation.findFirstOrThrow();
    await expect(
      prisma.evaluationSampleInterpretation.update({
        where: { id: constrainedInterpretation.id },
        data: { position: -1 },
      }),
    ).rejects.toThrow();
    const report = await prisma.evaluationReport.findUniqueOrThrow({
      where: { runId },
    });
    expect(report).toMatchObject({
      metricPolicyVersion: "evaluation.report-metrics@1",
      documentContractVersion: "evaluation.report-document@1",
    });
    expect(report.publicDocument).not.toHaveProperty("internalGuidance");
    expect(await prisma.evaluationSynthesis.count({ where: { runId } })).toBe(
      1,
    );
    expect(
      await prisma.evaluationOptimizationGuidance.count({ where: { runId } }),
    ).toBe(1);
    const currentReport = await reports.current(accountId, brandId);
    expect(currentReport).toMatchObject({
      runId,
      brandId,
      brandInformationChanged: false,
      document: {
        overview: { coverage: { validSampleCount: 20, totalSampleCount: 20 } },
      },
    });
    expect(currentReport?.questions).toHaveLength(4);
    expect(
      currentReport?.questions.flatMap((question) => question.samples),
    ).toHaveLength(20);
    const publicProjection = JSON.stringify(currentReport);
    for (const privateField of [
      "systemInstruction",
      "prompt",
      "model",
      "sources",
      "searchUsed",
      "attemptNumber",
      "traceId",
      "internalGuidance",
      "semanticPayload",
    ]) {
      expect(publicProjection).not.toContain(privateField);
    }

    await brands.update(accountId, brandId, {
      characteristicOne: "适合会议",
    });
    expect(await reports.current(accountId, brandId)).toMatchObject({
      id: currentReport?.id,
      brandInformationChanged: true,
    });
    const nextDefinition = await evaluations.prepareDefinition(
      accountId,
      brandId,
    );
    await evaluations.startRun(accountId, nextDefinition.id);
    expect(await reports.current(accountId, brandId)).toBeNull();
    const otherAccount = await prisma.account.create({
      data: { mobile: "+8613900000399" },
    });
    await expect(reports.current(otherAccount.id, brandId)).rejects.toThrow(
      "未找到该品牌",
    );
    const synthesisAttempt = await prisma.aiSynthesisAttempt.findFirstOrThrow({
      where: { runId },
    });
    expect(synthesisAttempt.requestPayload).toMatchObject({
      taskKind: "STRUCTURED_OUTPUT",
      outputContract: { version: "evaluation.overall-synthesis@1" },
    });
    expect(synthesisAttempt.requestPayload).not.toHaveProperty(
      "synthesisInputHash",
    );
    expect(JSON.stringify(synthesisAttempt.requestPayload)).not.toContain(
      "originalAnswer",
    );
    await expect(
      prisma.evaluationSampleInterpretation.update({
        where: { id: constrainedInterpretation.id },
        data: { mentioned: false, position: 1 },
      }),
    ).rejects.toThrow();
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
      status: "COMPLETED",
      stage: "REPORT_ACCEPTED",
    });
    expect(await prisma.evaluationStageExhaustion.count()).toBe(3);
    const partialReport = await reports.current(accountId, first.brandId);
    expect(partialReport).toMatchObject({
      document: {
        overview: {
          coverage: {
            validSampleCount: 17,
            totalSampleCount: 20,
            missingSampleCount: 3,
          },
        },
      },
    });
    expect(
      partialReport?.questions
        .flatMap((question) => question.samples)
        .filter((sample) => sample.availability === "NOT_INCLUDED"),
    ).toHaveLength(3);

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

  it("opens one retry cycle and reacquires only exhausted samples", async () => {
    const failedSamples = new Set<string>();
    const positions = new Set(["1:DeepSeek", "1:豆包", "1:千问", "1:文心一言"]);
    const failOnce: DeterministicAttemptScenario = (request) => {
      if (
        request.purpose === "EVALUATION_ACQUISITION" &&
        positions.has(positionKey(request)) &&
        !failedSamples.has(request.sampleId)
      ) {
        failedSamples.add(request.sampleId);
        return {
          kind: "FAILED",
          failureClass: "CONTROLLED_FIRST_CYCLE_EXHAUSTION",
          retryable: false,
        };
      }
      return undefined;
    };
    const { runId, processor, outbox } = await startScenario(failOnce);
    await drain(processor, outbox);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({ status: "PLEASE_RETRY", stage: "PROCESSING_EVIDENCE" });
    expect(await prisma.evaluationSample.count({ where: { runId } })).toBe(20);
    expect(
      await prisma.evaluationStageExhaustion.count({ where: { runId } }),
    ).toBe(4);

    const [first, second, third] = await Promise.all([
      evaluations.retryRun(accountId, runId),
      evaluations.retryRun(accountId, runId),
      evaluations.retryRun(accountId, runId),
    ]);
    expect(new Set([first.id, second.id, third.id])).toEqual(new Set([runId]));
    expect(
      await prisma.evaluationExecutionCycle.count({ where: { runId } }),
    ).toBe(2);
    await drain(processor, outbox);

    const cycles = await prisma.evaluationExecutionCycle.findMany({
      where: { runId },
      orderBy: { sequence: "asc" },
    });
    expect(cycles.map(({ sequence, status }) => [sequence, status])).toEqual([
      [1, "EXHAUSTED"],
      [2, "COMPLETED"],
    ]);
    expect(
      await prisma.aiExecutionAttempt.count({
        where: {
          runId,
          cycleId: cycles[1]!.id,
          purpose: "EVALUATION_ACQUISITION",
          attemptNumber: 1,
        },
      }),
    ).toBe(4);
    expect(await prisma.evaluationSample.count({ where: { runId } })).toBe(20);
    expect(await prisma.evaluationReport.count({ where: { runId } })).toBe(1);
  });

  it("retries only interpretation when canonical evidence is already accepted", async () => {
    const selected = new Set<string>();
    const failed = new Set<string>();
    const positions = new Set(["1:DeepSeek", "1:豆包", "1:千问", "1:文心一言"]);
    const failInterpretationOnce: DeterministicAttemptScenario = (request) => {
      if (
        request.purpose === "EVALUATION_ACQUISITION" &&
        positions.has(positionKey(request))
      ) {
        selected.add(request.sampleId);
      }
      if (
        request.purpose === "EVALUATION_INTERPRETATION" &&
        selected.has(request.sampleId) &&
        !failed.has(request.sampleId)
      ) {
        failed.add(request.sampleId);
        return {
          kind: "FAILED",
          failureClass: "CONTROLLED_INTERPRETATION_EXHAUSTION",
          retryable: false,
        };
      }
      return undefined;
    };
    const { runId, processor, outbox } = await startScenario(
      failInterpretationOnce,
    );
    await drain(processor, outbox);
    const acquisitionAttempts = await prisma.aiExecutionAttempt.count({
      where: { runId, purpose: "EVALUATION_ACQUISITION" },
    });
    expect(acquisitionAttempts).toBe(20);
    expect(await prisma.evaluationSampleEvidence.count()).toBe(20);

    await evaluations.retryRun(accountId, runId);
    await drain(processor, outbox);
    expect(
      await prisma.aiExecutionAttempt.count({
        where: { runId, purpose: "EVALUATION_ACQUISITION" },
      }),
    ).toBe(acquisitionAttempts);
    expect(
      await prisma.aiExecutionAttempt.count({
        where: { runId, purpose: "EVALUATION_INTERPRETATION" },
      }),
    ).toBe(24);
    expect(await prisma.evaluationReport.count({ where: { runId } })).toBe(1);
  });

  it("retries exhausted synthesis without resampling and materializes durable notices", async () => {
    let firstSynthesisCycle: string | undefined;
    const rejectFirstCycle: DeterministicAttemptScenario = (request) => {
      if (request.purpose !== "OVERALL_SYNTHESIS") return undefined;
      firstSynthesisCycle ??= request.cycleId;
      return request.cycleId === firstSynthesisCycle
        ? { kind: "SUCCEEDED", output: { unexpected: true } }
        : undefined;
    };
    const { runId, processor, outbox } = await startScenario(rejectFirstCycle);
    await drain(processor, outbox);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({ status: "PLEASE_RETRY", stage: "SYNTHESIS_EXHAUSTED" });
    const sampleAttemptCount = await prisma.aiExecutionAttempt.count({
      where: { runId },
    });
    expect(
      await prisma.notification.count({
        where: { kind: "EVALUATION_RETRY_REQUIRED" },
      }),
    ).toBe(1);

    await evaluations.retryRun(accountId, runId);
    await drain(processor, outbox);
    expect(await prisma.aiExecutionAttempt.count({ where: { runId } })).toBe(
      sampleAttemptCount,
    );
    expect(await prisma.aiSynthesisAttempt.count({ where: { runId } })).toBe(4);
    expect(
      await prisma.notification.count({
        where: { kind: "EVALUATION_COMPLETED" },
      }),
    ).toBe(1);
    const completionEvent = await prisma.productOutboxEvent.findFirstOrThrow({
      where: { eventType: "evaluation.report.accepted", aggregateId: runId },
    });
    await Promise.all([
      processor.apply(completionEvent.id),
      processor.apply(completionEvent.id),
    ]);
    expect(
      await prisma.notification.count({
        where: { sourceEventId: completionEvent.id },
      }),
    ).toBe(1);
  });

  it("keeps the newest completed report current and earlier reports in history", async () => {
    const first = await startScenario();
    await drain(first.processor, first.outbox);
    const firstReport = await reports.current(accountId, first.brandId);
    expect(firstReport).not.toBeNull();
    expect(
      (await reports.history(accountId, first.brandId)).items,
    ).toHaveLength(0);

    await brands.update(accountId, first.brandId, {
      characteristicTwo: "适合商务交流",
    });
    const nextDefinition = await evaluations.prepareDefinition(
      accountId,
      first.brandId,
    );
    const nextRun = await evaluations.startRun(accountId, nextDefinition.id);
    await drain(first.processor, first.outbox);

    expect(await reports.current(accountId, first.brandId)).toMatchObject({
      runId: nextRun.id,
    });
    const history = await reports.history(accountId, first.brandId);
    expect(history.items).toHaveLength(1);
    expect(history.items[0]).toMatchObject({
      id: firstReport!.id,
      runId: first.runId,
      brandInformationChanged: true,
    });
    expect(
      await reports.detail(accountId, first.brandId, firstReport!.id),
    ).toMatchObject({ id: firstReport!.id, runId: first.runId });
    const otherAccount = await prisma.account.create({
      data: { mobile: "+8613900000388" },
    });
    await expect(
      reports.detail(otherAccount.id, first.brandId, firstReport!.id),
    ).rejects.toThrow("未找到该品牌");
  });

  it("separates purpose retries from delivery retries and can exhaust interpretation", async () => {
    const retried = new Set<string>();
    let controlledInterpretationSampleId: string | undefined;
    const retryOnce: DeterministicAttemptScenario = (request) => {
      const key = positionKey(request);
      if (request.purpose === "EVALUATION_ACQUISITION" && key === "1:豆包") {
        controlledInterpretationSampleId = request.sampleId;
      }
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
      if (
        request.purpose === "EVALUATION_INTERPRETATION" &&
        request.sampleId === controlledInterpretationSampleId
      ) {
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
      status: "COMPLETED",
      stage: "REPORT_ACCEPTED",
    });
  });

  it("retries a rejected parser contract as a new interpretation attempt", async () => {
    let controlledSampleId: string | undefined;
    const rejectFirstParserOutput: DeterministicAttemptScenario = (request) => {
      if (
        request.purpose === "EVALUATION_ACQUISITION" &&
        positionKey(request) === "1:DeepSeek"
      ) {
        controlledSampleId = request.sampleId;
      }
      if (
        request.purpose === "EVALUATION_INTERPRETATION" &&
        request.sampleId === controlledSampleId &&
        request.attemptNumber === 1
      ) {
        return {
          kind: "SUCCEEDED",
          output: { family: "OPEN_DISCOVERY", unexpected: true },
        };
      }
      return undefined;
    };
    const { runId, processor, outbox } = await startScenario(
      rejectFirstParserOutput,
    );
    await drain(processor, outbox);

    expect(controlledSampleId).toBeDefined();
    if (!controlledSampleId)
      throw new Error("Controlled sample was not captured");
    expect(
      await prisma.aiExecutionAttempt.count({
        where: {
          sampleId: controlledSampleId,
          purpose: "EVALUATION_INTERPRETATION",
        },
      }),
    ).toBe(2);
    const interpretation =
      await prisma.evaluationSampleInterpretation.findUniqueOrThrow({
        where: { sampleId: controlledSampleId },
        include: { acceptedAttempt: true },
      });
    expect(interpretation.acceptedAttempt.attemptNumber).toBe(2);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({ stage: "REPORT_ACCEPTED" });
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
    ).toMatchObject({ stage: "REPORT_ACCEPTED" });
  });

  it("uses the primary retry and fallback slots before accepting a report", async () => {
    const failPrimaryRoutes: DeterministicAttemptScenario = (request) =>
      request.purpose === "OVERALL_SYNTHESIS" && request.attemptNumber < 3
        ? {
            kind: "FAILED",
            failureClass: "CONTROLLED_SYNTHESIS_TRANSIENT",
            retryable: true,
          }
        : undefined;
    const { runId, processor, outbox } = await startScenario(failPrimaryRoutes);
    await drain(processor, outbox);

    const attempts = await prisma.aiSynthesisAttempt.findMany({
      where: { runId },
      orderBy: { attemptNumber: "asc" },
    });
    expect(attempts).toHaveLength(3);
    expect(attempts.map((attempt) => attempt.providerKey)).toEqual([
      "deterministic-synthesis-primary",
      "deterministic-synthesis-primary",
      "deterministic-synthesis-fallback",
    ]);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({ status: "COMPLETED", stage: "REPORT_ACCEPTED" });
    expect(await prisma.evaluationReport.count({ where: { runId } })).toBe(1);
  });

  it("exhausts invalid overall analysis without issuing a partial report", async () => {
    const rejectEverySynthesis: DeterministicAttemptScenario = (request) =>
      request.purpose === "OVERALL_SYNTHESIS"
        ? { kind: "SUCCEEDED", output: { unexpected: true } }
        : undefined;
    const { runId, brandId, processor, outbox } =
      await startScenario(rejectEverySynthesis);
    await drain(processor, outbox);

    expect(await prisma.aiSynthesisAttempt.count({ where: { runId } })).toBe(3);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({
      status: "PLEASE_RETRY",
      stage: "SYNTHESIS_EXHAUSTED",
    });
    expect(
      await prisma.evaluationExecutionCycle.findFirstOrThrow({
        where: { runId },
      }),
    ).toMatchObject({ status: "EXHAUSTED" });
    expect(
      await prisma.evaluationSynthesisExhaustion.count({ where: { runId } }),
    ).toBe(1);
    expect(await prisma.evaluationSynthesis.count({ where: { runId } })).toBe(
      0,
    );
    expect(await prisma.evaluationReport.count({ where: { runId } })).toBe(0);
    expect(
      await prisma.evaluationOptimizationGuidance.count({ where: { runId } }),
    ).toBe(0);
    expect(await reports.current(accountId, brandId)).toBeNull();
    expect(await prisma.evaluationSampleEvidence.count()).toBe(20);
    expect(await prisma.evaluationSampleInterpretation.count()).toBe(20);
  });

  it("keeps duplicate overall-analysis delivery idempotent", async () => {
    const { runId, processor, outbox } = await startScenario();
    const synthesisEvent = await advanceToSynthesisEvent(processor, outbox);
    await Promise.all([
      processor.apply(synthesisEvent.id),
      processor.apply(synthesisEvent.id),
      processor.apply(synthesisEvent.id),
    ]);
    await drain(processor, outbox);

    expect(await prisma.aiSynthesisAttempt.count({ where: { runId } })).toBe(1);
    expect(await prisma.evaluationSynthesis.count({ where: { runId } })).toBe(
      1,
    );
    expect(await prisma.evaluationReport.count({ where: { runId } })).toBe(1);
    expect(
      await prisma.evaluationOptimizationGuidance.count({ where: { runId } }),
    ).toBe(1);
  });

  it("reconciles a missing ready-run overall-analysis work fact", async () => {
    const { runId, processor, outbox } = await startScenario();
    const synthesisEvent = await advanceToSynthesisEvent(processor, outbox);
    await prisma.productOutboxEvent.delete({
      where: { id: synthesisEvent.id },
    });

    expect(await processor.reconcile()).toBe(1);
    await drain(processor, outbox);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({ status: "COMPLETED", stage: "REPORT_ACCEPTED" });
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
        return run.stage === "REPORT_ACCEPTED" && unfinished === 0;
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
    const adapter = new DeterministicAiAttemptAdapter(scenario);
    const ai = new AiExecutionService(
      new PostgresAiAttemptRepository(prisma),
      adapter,
    );
    const synthesisAi = new AiSynthesisExecutionService(
      new PostgresAiSynthesisAttemptRepository(prisma),
      adapter,
    );
    const synthesis = new EvaluationSynthesisCoordinator(
      new PostgresEvaluationSynthesisRepository(prisma),
      synthesisAi,
    );
    const coordinator = new EvaluationProcessCoordinator(
      processRepository,
      ai,
      synthesis,
    );
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
      brandId: brand.id,
      outbox,
      processor: new ProductWorkProcessor(
        outbox,
        coordinator,
        new NotificationEventHandler(
          new PostgresNotificationRepository(prisma),
        ),
        telemetry,
      ),
    };
  }

  async function advanceToSynthesisEvent(
    processor: ProductWorkProcessor,
    outbox: PostgresProductOutboxRepository,
  ): Promise<{ id: string }> {
    for (let round = 0; round < 20; round += 1) {
      const synthesis = await prisma.productOutboxEvent.findFirst({
        where: {
          eventType: "evaluation.run.synthesize.requested",
          status: { not: "COMPLETED" },
        },
        select: { id: true },
      });
      if (synthesis) return synthesis;
      const events = await outbox.findDeliverable(500);
      if (events.length === 0) break;
      await Promise.all(events.map((event) => processor.apply(event.id)));
    }
    throw new Error("Overall-analysis work fact was not created");
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
    request.purpose === purpose && positions.has(positionKey(request))
      ? {
          kind: "FAILED",
          failureClass: "CONTROLLED_EXHAUSTION",
          retryable: false,
        }
      : undefined;
}

function positionKey(request: AiAttemptRequest): string {
  if (request.purpose === "EVALUATION_ACQUISITION") {
    return `${String(request.input.questionOrdinal)}:${String(request.input.platformLabel)}`;
  }
  if (request.purpose === "OVERALL_SYNTHESIS") {
    return `synthesis:${request.attemptNumber}`;
  }
  return `${String(request.input.userContext.questionKind)}:${request.sampleId}`;
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
