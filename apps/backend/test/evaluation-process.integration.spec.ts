import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Queue } from "bullmq";
import { NestFactory } from "@nestjs/core";

import { AiExecutionService } from "../src/ai-execution/application/ai-execution.service.js";
import { AiSynthesisExecutionService } from "../src/ai-execution/application/ai-synthesis-execution.service.js";
import { type AiAttemptAdapter } from "../src/ai-execution/domain/ai-attempt.adapter.js";
import type {
  AiAdapterResult,
  AiAttemptRequest,
  ResolvedAiAttemptRequest,
} from "../src/ai-execution/domain/ai-attempt.types.js";
import {
  DeterministicAiAttemptAdapter,
  type DeterministicAttemptScenario,
} from "../src/ai-execution/infrastructure/deterministic-ai-attempt.adapter.js";
import { PostgresAiAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-attempt.repository.js";
import { PostgresAiSynthesisAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-synthesis-attempt.repository.js";
import { ProductWorkProcessor } from "../src/background-work/application/product-work.processor.js";
import { bullmqConnectionOptions } from "../src/background-work/bullmq-connection.js";
import { PostgresProductOutboxRepository } from "../src/background-work/infrastructure/postgres-product-outbox.repository.js";
import { ProductWorkerRuntime } from "../src/background-work/product-worker-runtime.js";
import { BrandService } from "../src/brand/application/brand.service.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";
import { EvaluationProcessCoordinator } from "../src/geo-intelligence/application/evaluation-process.coordinator.js";
import {
  BrowserSamplingTransportError,
  type BrowserSamplingGateway,
} from "../src/geo-intelligence/domain/browser-sampling.gateway.js";
import { EvaluationOptimizationGuidanceService } from "../src/geo-intelligence/application/evaluation-optimization-guidance.service.js";
import { EvaluationReportService } from "../src/geo-intelligence/application/evaluation-report.service.js";
import { EvaluationSynthesisCoordinator } from "../src/geo-intelligence/application/evaluation-synthesis.coordinator.js";
import { EvaluationService } from "../src/geo-intelligence/application/evaluation.service.js";
import { BRAND_NAME_RESOLUTION_MODEL_CONTRACT_VERSION } from "../src/geo-intelligence/domain/brand-name-resolution.contract.js";
import { REPORT_COMPOSITION_MODEL_CONTRACT_VERSION } from "../src/geo-intelligence/domain/report-composition.contract.js";
import { parseStoredSampleSemantic } from "../src/geo-intelligence/domain/sample-parser.contract.js";
import { SAMPLE_PARSER_MODEL_CONTRACT_VERSION } from "../src/geo-intelligence/domain/sample-parser-model.contract.js";
import { PostgresEvaluationProcessRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-process.repository.js";
import { PostgresEvaluationReportRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-report.repository.js";
import { PostgresEvaluationSynthesisRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-synthesis.repository.js";
import { PostgresEvaluationRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { SafeTelemetry } from "../src/infrastructure/telemetry.js";
import { NotificationEventHandler } from "../src/notification/application/notification-event.handler.js";
import { PostgresNotificationRepository } from "../src/notification/infrastructure/postgres-notification.repository.js";
import { WorkerModule } from "../src/worker.module.js";
import type { BrowserSamplingConfig } from "../src/geo-intelligence/infrastructure/browser-sampling.config.js";
import {
  clearCustomerData,
  readyCoffeeBrandInput,
  TEST_STORE_LOCATION_RECEIPTS,
} from "./customer-data.js";
import {
  loadIntegrationApiConfig,
  loadIntegrationWorkerConfig,
} from "./integration-test-config.js";
import { createEvaluationQuestionPreparationHarness } from "./evaluation-question-preparation-harness.js";

const config = loadIntegrationApiConfig();
const workerConfig = loadIntegrationWorkerConfig();

describe("resumable evaluation evidence", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const brands = new BrandService(
    new PostgresBrandRepository(prisma),
    new BrandReferenceData(),
    TEST_STORE_LOCATION_RECEIPTS,
  );
  const questionPreparation =
    createEvaluationQuestionPreparationHarness(prisma);
  const evaluations = new EvaluationService(
    brands,
    new PostgresEvaluationRepository(prisma),
    questionPreparation.repository,
  );
  const reportRepository = new PostgresEvaluationReportRepository(prisma);
  const reports = new EvaluationReportService(brands, reportRepository);
  const optimizationGuidance = new EvaluationOptimizationGuidanceService(
    brands,
    reportRepository,
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
        where: { semanticContractVersion: "2.0.0" },
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
        version: SAMPLE_PARSER_MODEL_CONTRACT_VERSION,
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
    const latestGuidance = await optimizationGuidance.latest(
      accountId,
      brandId,
    );
    expect(latestGuidance).toMatchObject({
      reference: { reportId: report.id, runId },
      brandInformationChanged: false,
    });
    expect(latestGuidance?.customerDirections.length).toBeGreaterThan(0);
    expect(latestGuidance?.writerGuidance.priorities.length).toBeGreaterThan(0);
    expect(JSON.stringify(latestGuidance?.writerGuidance)).not.toContain(
      "evidenceRefs",
    );
    const publicProjection = JSON.stringify(currentReport);
    for (const privateField of [
      "systemInstruction",
      "prompt",
      "model",
      "sources",
      "searchUsed",
      "searchObservation",
      "attemptNumber",
      "traceId",
      "internalGuidance",
      "semanticPayload",
    ]) {
      expect(publicProjection).not.toContain(privateField);
    }

    const brandBeforeReportChange = await brands.current(accountId);
    expect(brandBeforeReportChange?.id).toBe(brandId);
    await brands.update(accountId, brandId, {
      expectedRevision: brandBeforeReportChange!.revision,
      characteristics: [
        {
          ...brandBeforeReportChange!.characteristics[0]!,
          title: "适合会议",
        },
        brandBeforeReportChange!.characteristics[1]!,
      ],
    });
    expect(await reports.current(accountId, brandId)).toMatchObject({
      id: currentReport?.id,
      brandInformationChanged: true,
    });
    expect(await optimizationGuidance.latest(accountId, brandId)).toMatchObject(
      {
        reference: { guidanceId: latestGuidance?.reference.guidanceId },
        brandInformationChanged: true,
      },
    );
    const nextDefinition = await questionPreparation.prepareReadyDefinition(
      evaluations,
      accountId,
      brandId,
    );
    await evaluations.startRun(accountId, nextDefinition.id);
    expect(await reports.current(accountId, brandId)).toBeNull();
    expect(await optimizationGuidance.latest(accountId, brandId)).toMatchObject(
      {
        reference: { guidanceId: latestGuidance?.reference.guidanceId },
        brandInformationChanged: true,
      },
    );
    const otherAccount = await prisma.account.create({
      data: { mobile: "+8613900000399" },
    });
    await expect(reports.current(otherAccount.id, brandId)).rejects.toThrow(
      "未找到该品牌",
    );
    await expect(
      optimizationGuidance.latest(otherAccount.id, brandId),
    ).rejects.toThrow("未找到该品牌");
    const synthesisAttempts = await prisma.aiSynthesisAttempt.findMany({
      where: { runId },
      orderBy: { startedAt: "asc" },
    });
    expect(synthesisAttempts.map((attempt) => attempt.purpose)).toEqual([
      "BRAND_NAME_RESOLUTION",
      "REPORT_COMPOSITION",
    ]);
    expect(synthesisAttempts[0]?.requestPayload).toMatchObject({
      taskKind: "STRUCTURED_OUTPUT",
      outputContract: { version: BRAND_NAME_RESOLUTION_MODEL_CONTRACT_VERSION },
    });
    expect(synthesisAttempts[1]?.requestPayload).toMatchObject({
      taskKind: "STRUCTURED_OUTPUT",
      outputContract: { version: REPORT_COMPOSITION_MODEL_CONTRACT_VERSION },
    });
    const compositionRequest = JSON.parse(
      JSON.stringify(synthesisAttempts[1]!.requestPayload),
    ) as {
      userContext: {
        samples: Array<{ question: string; platformLabel: string }>;
      };
    };
    expect(
      compositionRequest.userContext.samples.map(
        (sample) => `${sample.question}|${sample.platformLabel}`,
      ),
    ).toEqual(
      currentReport!.questions.flatMap((question) =>
        question.samples.map(
          (sample) => `${question.content}|${sample.platformLabel}`,
        ),
      ),
    );
    expect(JSON.stringify(compositionRequest)).not.toContain("pointRef");
    expect(JSON.stringify(synthesisAttempts)).not.toContain("originalAnswer");
    expect(
      await prisma.evaluationBrandResolution.count({ where: { runId } }),
    ).toBe(1);
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

  it("projects truthful per-platform progress through resolution and composition", async () => {
    const { runId, brandId, processor, outbox } = await startScenario();
    const started = await evaluations.observeDefinition(accountId, brandId);
    expect(started?.definition?.run).toMatchObject({
      id: runId,
      phase: "ACQUIRING_ANSWERS",
      platformProgress: expect.arrayContaining([
        expect.objectContaining({
          platformLabel: "DeepSeek",
          expectedSampleCount: 4,
          acquiredSampleCount: 0,
          analyzedSampleCount: 0,
          unavailableSampleCount: 0,
        }),
      ]),
    });

    const [runStarted] = await outbox.findDeliverable(1);
    await processor.apply(runStarted!.id);
    const acquisition = await prisma.productOutboxEvent.findFirstOrThrow({
      where: {
        eventType: "evaluation.sample.acquire.requested",
        status: { not: "COMPLETED" },
      },
      orderBy: { createdAt: "asc" },
    });
    await processor.apply(acquisition.id);
    const acquired = await evaluations.observeDefinition(accountId, brandId);
    expect(
      acquired?.definition?.run?.platformProgress.reduce(
        (total, platform) => total + platform.acquiredSampleCount,
        0,
      ),
    ).toBe(1);
    expect(
      acquired?.definition?.run?.platformProgress.reduce(
        (total, platform) => total + platform.analyzedSampleCount,
        0,
      ),
    ).toBe(0);

    const interpretation = await prisma.productOutboxEvent.findFirstOrThrow({
      where: {
        eventType: "evaluation.sample.interpret.requested",
        status: { not: "COMPLETED" },
      },
    });
    await processor.apply(interpretation.id);
    const analyzed = await evaluations.observeDefinition(accountId, brandId);
    expect(
      analyzed?.definition?.run?.platformProgress.reduce(
        (total, platform) => total + platform.analyzedSampleCount,
        0,
      ),
    ).toBe(1);

    const resolutionEvent = await advanceToSynthesisEvent(processor, outbox);
    expect(
      (await evaluations.observeDefinition(accountId, brandId))?.definition
        ?.run,
    ).toMatchObject({ phase: "RESOLVING_BRANDS" });
    await processor.apply(resolutionEvent.id);
    expect(
      (await evaluations.observeDefinition(accountId, brandId))?.definition
        ?.run,
    ).toMatchObject({ phase: "COMPOSING_REPORT" });
    await drain(processor, outbox);
    expect(
      (await evaluations.observeDefinition(accountId, brandId))?.definition
        ?.run,
    ).toMatchObject({ phase: "COMPLETED", status: "COMPLETED" });
  });

  it("retries an unreadable parser card without resampling", async () => {
    let protectedSampleId: string | undefined;
    const structuralCardFragment: DeterministicAttemptScenario = (request) => {
      if (
        request.purpose !== "EVALUATION_INTERPRETATION" ||
        protectedSampleId !== undefined
      ) {
        return undefined;
      }
      protectedSampleId = request.sampleId;
      return {
        kind: "SUCCEEDED",
        output: {
          brands: [],
          cardInterpretation: "}}}",
        },
      };
    };
    const { runId, brandId, processor, outbox } = await startScenario(
      structuralCardFragment,
    );
    await drain(processor, outbox);

    expect(protectedSampleId).toBeDefined();
    if (!protectedSampleId)
      throw new Error("Protected replay sample was not captured");
    const interpretation =
      await prisma.evaluationSampleInterpretation.findUniqueOrThrow({
        where: { sampleId: protectedSampleId },
      });
    expect(
      parseStoredSampleSemantic(
        interpretation.semanticContractVersion,
        interpretation.semanticPayload,
      ).cardInterpretation,
    ).not.toBe("}}}");
    expect(
      await prisma.aiExecutionAttempt.count({
        where: {
          sampleId: protectedSampleId,
          purpose: "EVALUATION_INTERPRETATION",
        },
      }),
    ).toBe(2);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({ status: "COMPLETED", stage: "REPORT_ACCEPTED" });

    const report = await reports.current(accountId, brandId);
    const replaySample = report?.questions
      .flatMap((question) => question.samples)
      .find((sample) => sample.id === protectedSampleId);
    expect(replaySample).toMatchObject({
      availability: "INCLUDED",
      cardInterpretation: expect.not.stringContaining("}}}"),
    });
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
      if (request.purpose !== "REPORT_COMPOSITION") return undefined;
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

    const brandBeforeNextEvaluation = await brands.current(accountId);
    expect(brandBeforeNextEvaluation?.id).toBe(first.brandId);
    await brands.update(accountId, first.brandId, {
      expectedRevision: brandBeforeNextEvaluation!.revision,
      characteristics: [
        brandBeforeNextEvaluation!.characteristics[0]!,
        {
          ...brandBeforeNextEvaluation!.characteristics[1]!,
          title: "适合商务交流",
        },
      ],
    });
    const nextDefinition = await questionPreparation.prepareReadyDefinition(
      evaluations,
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
    const rejected = await prisma.aiExecutionAttempt.findFirstOrThrow({
      where: {
        sampleId: controlledSampleId,
        purpose: "EVALUATION_INTERPRETATION",
        attemptNumber: 1,
      },
    });
    expect(rejected).toMatchObject({
      status: "FAILED",
      failureClass: "SEMANTIC_CONTRACT_REJECTED",
      retryable: true,
      responseEnvelope: {
        schemaVersion: "ai-attempt-envelope@1",
        semanticDisposition: {
          kind: "REJECTED",
          failureClass: "SEMANTIC_CONTRACT_REJECTED",
          modelContractVersion: SAMPLE_PARSER_MODEL_CONTRACT_VERSION,
          domainContractVersion: "2.0.0",
        },
      },
    });
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

  it("uses the selected DeepSeek route for both parser attempts", async () => {
    let controlledSampleId: string | undefined;
    const failPrimaryParser: DeterministicAttemptScenario = (request) => {
      if (
        request.purpose === "EVALUATION_ACQUISITION" &&
        positionKey(request) === "1:DeepSeek"
      ) {
        controlledSampleId = request.sampleId;
      }
      if (
        request.purpose === "EVALUATION_INTERPRETATION" &&
        request.sampleId === controlledSampleId &&
        request.attemptNumber <= 2
      ) {
        return {
          kind: "FAILED",
          failureClass: "CONTROLLED_PRIMARY_PARSER_FAILURE",
          retryable: true,
        };
      }
      return undefined;
    };
    const { runId, processor, outbox } = await startScenario(failPrimaryParser);
    await drain(processor, outbox);

    expect(controlledSampleId).toBeDefined();
    const attempts = await prisma.aiExecutionAttempt.findMany({
      where: {
        sampleId: controlledSampleId,
        purpose: "EVALUATION_INTERPRETATION",
      },
      orderBy: { attemptNumber: "asc" },
    });
    expect(
      attempts.map(
        ({ routePolicyId, providerKey, requestedModel, attemptNumber }) => ({
          routePolicyId,
          providerKey,
          requestedModel,
          attemptNumber,
        }),
      ),
    ).toEqual([
      {
        routePolicyId: "evaluation.interpretation.deepseek@1",
        providerKey: "deterministic-parser",
        requestedModel: "deepseek-v4-flash-0731",
        attemptNumber: 1,
      },
      {
        routePolicyId: "evaluation.interpretation.deepseek@1",
        providerKey: "deterministic-parser",
        requestedModel: "deepseek-v4-flash-0731",
        attemptNumber: 2,
      },
    ]);
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

  it("accepts partial browser-control-plane batches without replaying captured siblings", async () => {
    const submitted = new Map<string, string[]>();
    const submitKeys: string[] = [];
    let controlPlaneUnavailable = true;
    const gateway: BrowserSamplingGateway = {
      async submitBatch(input) {
        submitKeys.push(input.idempotencyKey);
        if (controlPlaneUnavailable) {
          controlPlaneUnavailable = false;
          throw new BrowserSamplingTransportError("controlled outage");
        }
        submitted.set(input.platform, input.prompts);
        return { externalTaskId: `task-${input.platform}` };
      },
      async readBatch(externalTaskId) {
        const platform = externalTaskId.replace("task-", "");
        return {
          kind: "TERMINAL",
          status: platform === "doubao" ? "FAILED" : "SUCCEEDED",
          collectionElapsedMs: 64_000,
          failureCode:
            platform === "doubao" ? "PLATFORM_SUBMISSION_FAILED" : null,
          failureMessage:
            platform === "doubao" ? "one controlled failure" : null,
          items: Array.from({ length: 4 }, (_, index) =>
            platform === "doubao" && index === 2
              ? {
                  index,
                  completionStatus: "FAILED" as const,
                  failureCode: "VERIFICATION_CHALLENGE" as const,
                  failureMessage: "controlled failed item",
                  collectionSlaMet: false as const,
                  capturedAtMs: null,
                  timings: null,
                  resetReady: true,
                }
              : {
                  index,
                  completionStatus:
                    platform === "qwen" && index === 1
                      ? ("CAPTURED_LATE" as const)
                      : ("CAPTURED" as const),
                  answer:
                    platform === "doubao" && index === 3
                      ? submitted.get(platform)![index]!
                      : `${platform} 的完整助手回答 ${index + 1}`,
                  collectionSlaMet: !(platform === "qwen" && index === 1),
                  capturedAtMs:
                    platform === "qwen" && index === 1 ? 87_000 : 60_000,
                  timings: null,
                  resetReady: true,
                  assistantRoleVerified: true as const,
                  nonEchoVerified: true as const,
                },
          ),
        };
      },
    };
    const sampling: BrowserSamplingConfig = {
      mode: "browser-control-plane",
      baseUrl: "http://control.test",
      bearerToken: "",
      accountId: "primary",
      requestTimeoutMs: 1_000,
      pollIntervalMs: 250,
      collectionDeadlineMs: 85_000,
      maximumWaitMs: 600_000,
    };
    const { runId, processor, outbox } = await startScenario(
      undefined,
      false,
      undefined,
      210_000,
      sampling,
      gateway,
    );
    const [runStarted] = await outbox.findDeliverable(1);
    await processor.apply(runStarted!.id);
    const platformEvents = await prisma.productOutboxEvent.findMany({
      where: {
        eventType: "evaluation.sample.acquire.requested",
        status: { not: "COMPLETED" },
      },
      orderBy: { createdAt: "asc" },
    });
    expect(platformEvents).toHaveLength(5);
    await expect(processor.apply(platformEvents[0]!.id)).resolves.toMatchObject(
      {
        kind: "DEFERRED",
      },
    );
    expect(
      await prisma.evaluationSamplingBatch.findFirstOrThrow({
        where: { runId, status: "PENDING" },
      }),
    ).toMatchObject({ externalTaskId: null });
    await expect(processor.apply(platformEvents[0]!.id)).resolves.toMatchObject(
      {
        kind: "DEFERRED",
      },
    );
    expect(submitKeys[0]).toBe(submitKeys[1]);
    expect(
      await prisma.evaluationSamplingBatch.findFirstOrThrow({
        where: { runId, status: "SUBMITTED" },
      }),
    ).toMatchObject({ externalTaskId: expect.stringMatching(/^task-/) });
    const restartedAdapter = new DeterministicAiAttemptAdapter();
    const restartedAi = new AiExecutionService(
      new PostgresAiAttemptRepository(prisma),
      restartedAdapter,
      210_000,
    );
    const restartedSynthesis = new EvaluationSynthesisCoordinator(
      new PostgresEvaluationSynthesisRepository(prisma),
      new AiSynthesisExecutionService(
        new PostgresAiSynthesisAttemptRepository(prisma),
        restartedAdapter,
        210_000,
      ),
    );
    const restartedProcessor = new ProductWorkProcessor(
      outbox,
      new EvaluationProcessCoordinator(
        new PostgresEvaluationProcessRepository(prisma),
        restartedAi,
        restartedSynthesis,
        sampling,
        gateway,
      ),
      questionPreparation.coordinator,
      new NotificationEventHandler(new PostgresNotificationRepository(prisma)),
      new SafeTelemetry({ export: async () => undefined }),
    );
    await drain(restartedProcessor, outbox);

    expect([...submitted.keys()].sort()).toEqual([
      "deepseek",
      "doubao",
      "qwen",
      "wenxin",
      "yuanbao",
    ]);
    expect(
      [...submitted.values()].every((prompts) => prompts.length === 4),
    ).toBe(true);
    expect(
      await prisma.evaluationSamplingBatch.count({ where: { runId } }),
    ).toBe(5);
    expect(
      await prisma.evaluationSamplingBatch.findFirstOrThrow({
        where: { runId, platformKey: "qwen" },
      }),
    ).toMatchObject({
      status: "COMPLETED",
      acquiredCount: 4,
      failedCount: 0,
      lateCount: 1,
    });
    expect(
      await prisma.evaluationSamplingBatch.findFirstOrThrow({
        where: { runId, platformKey: "doubao" },
      }),
    ).toMatchObject({
      status: "COMPLETED",
      acquiredCount: 2,
      failedCount: 2,
      lateCount: 0,
    });
    expect(await prisma.evaluationSampleEvidence.count()).toBe(18);
    expect(await prisma.evaluationStageExhaustion.count()).toBe(2);
    expect(
      await prisma.aiExecutionAttempt.findMany({
        where: { runId, status: "FAILED" },
        select: { failureClass: true },
        orderBy: { failureClass: "asc" },
      }),
    ).toEqual([
      { failureClass: "ANSWER_ECHOED_QUERY" },
      { failureClass: "VERIFICATION_CHALLENGE" },
    ]);
    expect(
      await prisma.aiExecutionAttempt.count({
        where: {
          runId,
          purpose: "EVALUATION_ACQUISITION",
          providerKey: "browser-sampler-control-plane",
        },
      }),
    ).toBe(20);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({ status: "COMPLETED", stage: "REPORT_ACCEPTED" });
  });

  it("bounds a persistently unavailable browser control plane", async () => {
    const sampling: BrowserSamplingConfig = {
      mode: "browser-control-plane",
      baseUrl: "http://control.test",
      bearerToken: "",
      accountId: "primary",
      requestTimeoutMs: 1_000,
      pollIntervalMs: 250,
      collectionDeadlineMs: 30_000,
      maximumWaitMs: 60_000,
    };
    const unavailable: BrowserSamplingGateway = {
      async submitBatch() {
        throw new BrowserSamplingTransportError("controlled outage");
      },
      async readBatch() {
        throw new BrowserSamplingTransportError("controlled outage");
      },
    };
    const { runId, processor, outbox } = await startScenario(
      undefined,
      false,
      undefined,
      210_000,
      sampling,
      unavailable,
    );
    const [runStarted] = await outbox.findDeliverable(1);
    await processor.apply(runStarted!.id);
    const batch = await prisma.evaluationSamplingBatch.findFirstOrThrow({
      where: { runId },
    });
    await prisma.evaluationSamplingBatch.update({
      where: { id: batch.id },
      data: { createdAt: new Date(Date.now() - 61_000) },
    });
    const sampleIds = Array.isArray(batch.sampleIds)
      ? batch.sampleIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
    const leaderSampleId = sampleIds[0];
    if (!leaderSampleId) throw new Error("Browser batch has no leader sample");
    const acquisition = await prisma.productOutboxEvent.findFirstOrThrow({
      where: {
        eventType: "evaluation.sample.acquire.requested",
        aggregateId: leaderSampleId,
      },
    });

    await expect(processor.apply(acquisition.id)).resolves.toEqual({
      kind: "COMPLETED",
    });
    expect(
      await prisma.evaluationSamplingBatch.findUniqueOrThrow({
        where: { id: batch.id },
      }),
    ).toMatchObject({
      status: "COMPLETED",
      acquiredCount: 0,
      failedCount: 4,
    });
    expect(
      await prisma.aiExecutionAttempt.findMany({
        where: { sampleId: { in: sampleIds } },
        select: { failureClass: true, requestPayload: true },
      }),
    ).toEqual(
      Array.from({ length: 4 }, () => ({
        failureClass: "NETWORK",
        requestPayload: expect.objectContaining({
          taskKind: "BROWSER_EVALUATION_ACQUISITION",
          externalTaskId: expect.stringMatching(/^idempotency:/),
        }),
      })),
    );
  });

  it("defers a live duplicate without completing its outbox event or sending a second request", async () => {
    const blocking = new BlockingAiAttemptAdapter();
    const { processor, outbox } = await startScenario(
      undefined,
      false,
      blocking,
      5_000,
    );
    const [started] = await outbox.findDeliverable(1);
    await processor.apply(started!.id);
    const acquisition = await prisma.productOutboxEvent.findFirstOrThrow({
      where: { eventType: "evaluation.sample.acquire.requested" },
      orderBy: { createdAt: "asc" },
    });

    const first = processor.apply(acquisition.id);
    await blocking.waitUntilStarted();
    const duplicate = await processor.apply(acquisition.id);
    expect(duplicate).toMatchObject({ kind: "DEFERRED" });
    expect(blocking.callCount).toBe(1);
    const deferredEvent = await prisma.productOutboxEvent.findUniqueOrThrow({
      where: { id: acquisition.id },
    });
    expect(["PENDING", "DISPATCHED"]).toContain(deferredEvent.status);

    blocking.release();
    await first;
    expect(
      await prisma.productOutboxEvent.findUniqueOrThrow({
        where: { id: acquisition.id },
      }),
    ).toMatchObject({ status: "COMPLETED" });
    expect(await prisma.aiExecutionAttempt.count()).toBe(1);
  });

  it("closes an expired in-flight attempt as ambiguous and drops its late result", async () => {
    const blocking = new BlockingAiAttemptAdapter();
    const { runId, processor, outbox } = await startScenario(
      undefined,
      false,
      blocking,
      20,
    );
    const [started] = await outbox.findDeliverable(1);
    await processor.apply(started!.id);
    const acquisition = await prisma.productOutboxEvent.findFirstOrThrow({
      where: { eventType: "evaluation.sample.acquire.requested" },
      orderBy: { createdAt: "asc" },
    });

    const first = processor.apply(acquisition.id);
    await blocking.waitUntilStarted();
    await new Promise((resolve) => setTimeout(resolve, 30));
    await processor.apply(acquisition.id);
    blocking.release();
    await first;

    const ambiguous = await prisma.aiExecutionAttempt.findFirstOrThrow({
      where: {
        runId,
        attemptNumber: 1,
        failureClass: "AMBIGUOUS_INTERRUPTION",
      },
    });
    expect(ambiguous).toMatchObject({ status: "FAILED", retryable: true });
    expect(ambiguous.responseEnvelope).toMatchObject({
      schemaVersion: "ai-attempt-envelope@1",
      providerEvidence: {
        failure: { kind: "AMBIGUOUS_INTERRUPTION" },
      },
    });

    await drain(processor, outbox);
    expect(
      await prisma.aiExecutionAttempt.count({
        where: {
          sampleId: ambiguous.sampleId,
          purpose: "EVALUATION_ACQUISITION",
        },
      }),
    ).toBe(2);
    expect(await prisma.evaluationSampleEvidence.count()).toBe(20);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({ stage: "REPORT_ACCEPTED" });
  });

  it("retries report composition on the selected route before accepting a report", async () => {
    const failPrimaryRoutes: DeterministicAttemptScenario = (request) =>
      request.purpose === "REPORT_COMPOSITION" && request.attemptNumber < 2
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
    expect(attempts.map((attempt) => attempt.purpose)).toEqual([
      "BRAND_NAME_RESOLUTION",
      "REPORT_COMPOSITION",
      "REPORT_COMPOSITION",
    ]);
    expect(attempts.map((attempt) => attempt.routePolicyId)).toEqual([
      "evaluation.brand-name-resolution.deepseek@1",
      "evaluation.report-composition.deepseek@1",
      "evaluation.report-composition.deepseek@1",
    ]);
    expect(
      await prisma.evaluationRun.findUniqueOrThrow({ where: { id: runId } }),
    ).toMatchObject({ status: "COMPLETED", stage: "REPORT_ACCEPTED" });
    expect(await prisma.evaluationReport.count({ where: { runId } })).toBe(1);
  });

  it("exhausts invalid overall analysis without issuing a partial report", async () => {
    const rejectEverySynthesis: DeterministicAttemptScenario = (request) =>
      request.purpose === "REPORT_COMPOSITION"
        ? { kind: "SUCCEEDED", output: { unexpected: true } }
        : undefined;
    const { runId, brandId, processor, outbox } =
      await startScenario(rejectEverySynthesis);
    await drain(processor, outbox);

    expect(await prisma.aiSynthesisAttempt.count({ where: { runId } })).toBe(3);
    const rejectedAttempts = await prisma.aiSynthesisAttempt.findMany({
      where: { runId, purpose: "REPORT_COMPOSITION" },
      orderBy: { attemptNumber: "asc" },
    });
    expect(
      rejectedAttempts.map((attempt) => ({
        status: attempt.status,
        failureClass: attempt.failureClass,
        retryable: attempt.retryable,
        semanticDisposition:
          typeof attempt.responseEnvelope === "object" &&
          attempt.responseEnvelope !== null &&
          !Array.isArray(attempt.responseEnvelope) &&
          "semanticDisposition" in attempt.responseEnvelope
            ? attempt.responseEnvelope.semanticDisposition
            : undefined,
      })),
    ).toEqual(
      Array.from({ length: 2 }, () => ({
        status: "FAILED",
        failureClass: "SEMANTIC_CONTRACT_REJECTED",
        retryable: true,
        semanticDisposition: {
          kind: "REJECTED",
          failureClass: "SEMANTIC_CONTRACT_REJECTED",
          modelContractVersion: REPORT_COMPOSITION_MODEL_CONTRACT_VERSION,
          domainContractVersion: "evaluation.overall-synthesis@1",
        },
      })),
    );
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

    expect(await prisma.aiSynthesisAttempt.count({ where: { runId } })).toBe(2);
    expect(
      await prisma.aiSynthesisAttempt.count({
        where: { runId, purpose: "BRAND_NAME_RESOLUTION" },
      }),
    ).toBe(1);
    expect(
      await prisma.aiSynthesisAttempt.count({
        where: { runId, purpose: "REPORT_COMPOSITION" },
      }),
    ).toBe(1);
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
      workerConfig.redisUrl,
    );
    await firstRuntime.onApplicationBootstrap();
    await firstRuntime.onModuleDestroy();

    const secondRuntime = new ProductWorkerRuntime(
      outbox,
      processor,
      workerConfig.redisUrl,
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
      WorkerModule.register(workerConfig),
      { logger: false },
    );

    await application.close();
  });

  async function startScenario(
    scenario?: DeterministicAttemptScenario,
    telemetryShouldFail = false,
    adapterOverride?: AiAttemptAdapter,
    ambiguityTimeoutMs = 210_000,
    samplingConfig: BrowserSamplingConfig = { mode: "ai-provider" },
    browserSamplingGateway: BrowserSamplingGateway = {
      async submitBatch() {
        throw new Error("Browser sampling is disabled in this scenario");
      },
      async readBatch() {
        throw new Error("Browser sampling is disabled in this scenario");
      },
    },
  ) {
    const brand = await brands.create(
      accountId,
      readyCoffeeBrandInput(accountId, {
        companyName: "星河咖啡",
        contactMobile: "+8613900000301",
      }),
    );
    const definition = await questionPreparation.prepareReadyDefinition(
      evaluations,
      accountId,
      brand.id,
    );
    const run = await evaluations.startRun(accountId, definition.id);
    const processRepository = new PostgresEvaluationProcessRepository(prisma);
    const adapter =
      adapterOverride ?? new DeterministicAiAttemptAdapter(scenario);
    const ai = new AiExecutionService(
      new PostgresAiAttemptRepository(prisma),
      adapter,
      ambiguityTimeoutMs,
    );
    const synthesisAi = new AiSynthesisExecutionService(
      new PostgresAiSynthesisAttemptRepository(prisma),
      adapter,
      ambiguityTimeoutMs,
    );
    const synthesis = new EvaluationSynthesisCoordinator(
      new PostgresEvaluationSynthesisRepository(prisma),
      synthesisAi,
    );
    const coordinator = new EvaluationProcessCoordinator(
      processRepository,
      ai,
      synthesis,
      samplingConfig,
      browserSamplingGateway,
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
        questionPreparation.coordinator,
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

class BlockingAiAttemptAdapter implements AiAttemptAdapter {
  readonly delegate = new DeterministicAiAttemptAdapter();
  callCount = 0;
  private startedResolve!: () => void;
  private releaseResolve!: () => void;
  private readonly started = new Promise<void>((resolve) => {
    this.startedResolve = resolve;
  });
  private readonly released = new Promise<void>((resolve) => {
    this.releaseResolve = resolve;
  });

  resolve(request: AiAttemptRequest) {
    return this.delegate.resolve(request);
  }

  async execute(request: ResolvedAiAttemptRequest): Promise<AiAdapterResult> {
    this.callCount += 1;
    if (this.callCount === 1 && request.purpose === "EVALUATION_ACQUISITION") {
      this.startedResolve();
      await this.released;
    }
    return this.delegate.execute(request);
  }

  waitUntilStarted() {
    return this.started;
  }

  release() {
    this.releaseResolve();
  }
}

async function clearProductQueue(): Promise<void> {
  const queue = new Queue("geoeval-product", {
    connection: bullmqConnectionOptions(workerConfig.redisUrl),
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
  if (
    request.purpose === "OVERALL_SYNTHESIS" ||
    request.purpose === "BRAND_NAME_RESOLUTION" ||
    request.purpose === "REPORT_COMPOSITION"
  ) {
    return `${request.purpose}:${request.attemptNumber}`;
  }
  return `${String(request.input.userContext.question)}:${request.sampleId}`;
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
