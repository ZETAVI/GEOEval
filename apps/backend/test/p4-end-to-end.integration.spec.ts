import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { AiExecutionService } from "../src/ai-execution/application/ai-execution.service.js";
import { DelegatedParserExecutionService } from "../src/ai-execution/application/delegated-parser-execution.service.js";
import { AiSynthesisExecutionService } from "../src/ai-execution/application/ai-synthesis-execution.service.js";
import { AiQuestionGenerationExecutionService } from "../src/ai-execution/application/ai-question-generation-execution.service.js";
import type { AiAttemptAdapter } from "../src/ai-execution/domain/ai-attempt.adapter.js";
import type { AiNativeAttemptCodec } from "../src/ai-execution/domain/ai-native-attempt.codec.js";
import type { ResolvedAiAttemptRequest } from "../src/ai-execution/domain/ai-attempt.types.js";
import { DeterministicAiAttemptAdapter } from "../src/ai-execution/infrastructure/deterministic-ai-attempt.adapter.js";
import { ExecutionCenterClient } from "../src/ai-execution/infrastructure/execution-center.client.js";
import { ExecutionCenterEventRuntime } from "../src/ai-execution/infrastructure/execution-center-event.runtime.js";
import { ExecutionCenterBrowserSamplingGateway } from "../src/ai-execution/infrastructure/execution-center-browser-sampling.gateway.js";
import type { ParserExecutionCenterConfig } from "../src/ai-execution/infrastructure/execution-center.config.js";
import { PostgresAiAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-attempt.repository.js";
import { PostgresAiSynthesisAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-synthesis-attempt.repository.js";
import { PostgresAiQuestionGenerationAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-question-generation-attempt.repository.js";
import { PostgresExecutionCenterReceiptRepository } from "../src/ai-execution/infrastructure/postgres-execution-center-receipt.repository.js";
import { RealAiAttemptAdapter } from "../src/ai-execution/infrastructure/providers/real-ai-attempt.adapter.js";
import { RealAiNativeAttemptCodec } from "../src/ai-execution/infrastructure/providers/real-ai-native-attempt.codec.js";
import { ProductWorkProcessor } from "../src/background-work/application/product-work.processor.js";
import { PostgresProductOutboxRepository } from "../src/background-work/infrastructure/postgres-product-outbox.repository.js";
import { BrandService } from "../src/brand/application/brand.service.js";
import { StoreLocationReceiptCodec } from "../src/brand/application/store-location-receipt.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";
import { EvaluationProcessCoordinator } from "../src/geo-intelligence/application/evaluation-process.coordinator.js";
import { ExecutionCenterSamplingCoordinator } from "../src/geo-intelligence/application/execution-center-sampling.coordinator.js";
import { EvaluationService } from "../src/geo-intelligence/application/evaluation.service.js";
import { EvaluationReportService } from "../src/geo-intelligence/application/evaluation-report.service.js";
import { EvaluationSynthesisCoordinator } from "../src/geo-intelligence/application/evaluation-synthesis.coordinator.js";
import { EvaluationQuestionPreparationCoordinator } from "../src/geo-intelligence/application/evaluation-question-preparation.coordinator.js";
import { PostgresEvaluationProcessRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-process.repository.js";
import { PostgresEvaluationRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation.repository.js";
import { PostgresEvaluationReportRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-report.repository.js";
import { PostgresEvaluationSynthesisRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-synthesis.repository.js";
import { PostgresEvaluationQuestionPreparationRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-question-preparation.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { SafeTelemetry } from "../src/infrastructure/telemetry.js";
import { NotificationEventHandler } from "../src/notification/application/notification-event.handler.js";
import { PostgresNotificationRepository } from "../src/notification/infrastructure/postgres-notification.repository.js";
import { clearCustomerData } from "./customer-data.js";
import {
  startP4CenterHost,
  type P4CenterHost,
} from "./fixtures/p4-center-host.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const restaurantQuestions = [
  "广州天河猎德社区的花悦庭怎么样，主打的北京烤鸭做得如何，整体用餐体验怎样？",
  "广州天河猎德社区有哪些北京烤鸭餐厅味道比较正宗？",
  "广州天河猎德社区有哪些环境比较高级的北京烤鸭餐厅？",
  "想在广州天河猎德社区找一家吃北京烤鸭的餐厅，有哪些值得了解和比较？",
];
const configuration = loadIntegrationApiConfig();
const target = new URL(configuration.databaseUrl);
const allowed =
  (target.hostname === "127.0.0.1" &&
    target.pathname === "/geoeval_p4_issue169") ||
  (process.env.CI === "true" && target.pathname === "/geoeval");

describe.skipIf(!allowed)(
  "P4 restaurant local Query -> 20 samples -> report loop",
  () => {
    const prisma = new PrismaService(configuration.databaseUrl);
    const scenes: Array<Awaited<ReturnType<typeof createScene>>> = [];
    beforeAll(async () => prisma.$connect());
    beforeEach(async () => clearCustomerData(prisma));
    afterEach(async () => {
      vi.useRealTimers();
      for (const scene of scenes.splice(0)) {
        scene.releaseParserResponses();
        scene.releaseAcquisitionResponses();
        await scene.runtime.onModuleDestroy();
        await scene.host.close();
      }
    });
    afterAll(async () => {
      await clearCustomerData(prisma);
      await prisma.$disconnect();
    });

    it("accepts and parses first items while all fifteen siblings and every cleanup remain blocked", async () => {
      const scene = await createScene();
      scenes.push(scene);
      const round = await scene.startRound();
      await pumpUntil(
        scene,
        async () => (await prisma.evaluationSampleInterpretation.count()) === 5,
      );
      expect(scene.host.webCalls).toHaveLength(5);
      for (const call of scene.host.webCalls)
        expect(call.items.map((item) => item.prompt)).toEqual(
          restaurantQuestions,
        );
      const samples = await prisma.evaluationSample.findMany({
        where: { runId: round.runId },
        include: { evidence: true, interpretation: true, question: true },
      });
      expect(
        samples
          .filter((sample) => sample.question.ordinal === 1)
          .every((sample) => sample.interpretation !== null),
      ).toBe(true);
      expect(
        samples
          .filter((sample) => sample.question.ordinal > 1)
          .every((sample) => sample.status === "PENDING"),
      ).toBe(true);
      expect(
        samples
          .filter((sample) => sample.evidence)
          .every(
            (sample) =>
              sample.evidence!.content !== null &&
              sample.evidence!.readingText?.includes("餐厅: 花悦庭"),
          ),
      ).toBe(true);
      expect(scene.host.providerCalls).toHaveLength(5); // APIs are Parser only, not premature sampling fallback.
      expect(
        scene.nativeRequests.every(
          (request) => request.purpose === "EVALUATION_INTERPRETATION",
        ),
      ).toBe(true);
      expect(
        await scene.reports.current(scene.accountId, scene.brandId),
      ).toBeNull();
      scene.host.releaseSiblings();
      scene.host.releaseCleanup();
      const report = await pumpUntil(scene, () =>
        scene.reports.current(scene.accountId, scene.brandId),
      );
      expect(report!.runId).toBe(round.runId);
      const cards = report!.questions.flatMap((question) => question.samples);
      expect(cards).toHaveLength(20);
      expect(cards.every((sample) => sample.availability === "INCLUDED")).toBe(
        true,
      );
      expect(
        cards.every(
          (sample) =>
            sample.richAnswer?.blocks.some((block) => block.type === "table") &&
            sample.richAnswer.images[0]?.src ===
              "https://image.fixture.invalid/duck.jpg",
        ),
      ).toBe(true);
      expect(cards.every((sample) => sample.highlightUnavailable)).toBe(true);
      expect(JSON.stringify(cards.map((card) => card.richAnswer))).not.toMatch(
        /sourceCapture|source-1|source.fixture/,
      );
      expect(await prisma.evaluationSampleEvidence.count()).toBe(20);
      expect(await prisma.evaluationSampleInterpretation.count()).toBe(20);
      expect(scene.host.providerCalls).toHaveLength(20);
    }, 20_000);

    it("generates a new Query revision and another complete report without reusing prior task identity or evidence", async () => {
      const scene = await createScene();
      scenes.push(scene);
      scene.host.releaseSiblings();
      scene.host.releaseCleanup();
      const first = await scene.startRound();
      const firstReport = await pumpUntil(scene, () =>
        scene.reports.current(scene.accountId, scene.brandId),
      );
      const brand = await scene.brands.current(scene.accountId);
      await scene.brands.update(scene.accountId, scene.brandId, {
        expectedRevision: brand!.revision,
        characteristics: [
          brand!.characteristics[0]!,
          { ...brand!.characteristics[1]!, title: "适合商务聚餐" },
        ],
      });
      const second = await scene.startRound();
      const secondReport = await pumpUntil(scene, async () => {
        const report = await scene.reports.current(
          scene.accountId,
          scene.brandId,
        );
        return report?.runId === second.runId ? report : null;
      });
      expect(second.runId).not.toBe(first.runId);
      expect(second.definitionId).not.toBe(first.definitionId);
      expect(
        secondReport!.questions
          .flatMap((question) => question.samples)
          .every((sample) => sample.availability === "INCLUDED"),
      ).toBe(true);
      expect(await prisma.evaluationSampleEvidence.count()).toBe(40);
      expect(await prisma.evaluationSampleInterpretation.count()).toBe(40);
      expect(
        await prisma.aiQuestionGenerationAttempt.count({
          where: { status: "SUCCEEDED" },
        }),
      ).toBe(2);
      expect(scene.host.webCalls).toHaveLength(10);
      expect(scene.host.providerCalls).toHaveLength(40);
      expect(
        new Set(
          scene.host.webCalls.flatMap((call) =>
            call.items.map((item) => item.itemId),
          ),
        ).size,
      ).toBe(40);
      expect(
        (await scene.reports.history(scene.accountId, scene.brandId)).items,
      ).toMatchObject([{ id: firstReport!.id, runId: first.runId }]);
    }, 25_000);

    it("does not hedge at 79s, hedges only four pending qwen samples at 80s, and keeps late web results from replacing accepted API evidence", async () => {
      const scene = await createScene();
      scenes.push(scene);
      scene.host.holdSiblings = false;
      scene.host.holdCleanup = false;
      scene.host.blockedPlatforms.add("qwen");
      const round = await scene.startRound();
      await pumpUntil(
        scene,
        async () =>
          (await prisma.evaluationSampleInterpretation.count()) === 16,
      );
      const cycle = await prisma.evaluationExecutionCycle.findUniqueOrThrow({
        where: { id: round.cycleId },
      });
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(cycle.samplingStartedAt!.getTime() + 79_000);
      await scene.processor.reconcile();
      await pump(scene);
      expect(
        await prisma.aiExecutionAttempt.count({
          where: { purpose: "EVALUATION_ACQUISITION", executionChannel: "API" },
        }),
      ).toBe(0);
      vi.setSystemTime(cycle.samplingStartedAt!.getTime() + 80_000);
      await scene.processor.reconcile();
      const report = await pumpUntil(scene, () =>
        scene.reports.current(scene.accountId, scene.brandId),
      );
      expect(
        report!.questions
          .flatMap((question) => question.samples)
          .every((sample) => sample.availability === "INCLUDED"),
      ).toBe(true);
      const api = await prisma.aiExecutionAttempt.findMany({
        where: { purpose: "EVALUATION_ACQUISITION", executionChannel: "API" },
        include: { sample: true },
      });
      expect(api).toHaveLength(4);
      expect(
        api.every(
          (attempt) =>
            attempt.sample.platformKey === "qwen" &&
            attempt.executionTransport === "EXECUTION_CENTER",
        ),
      ).toBe(true);
      const before = await prisma.evaluationSampleEvidence.findMany({
        where: { sample: { runId: round.runId, platformKey: "qwen" } },
        orderBy: { sampleId: "asc" },
      });
      expect(
        before.every((evidence) =>
          api.some((attempt) => attempt.id === evidence.acceptedAttemptId),
        ),
      ).toBe(true);
      vi.useRealTimers();
      scene.host.releaseSiblings();
      scene.host.releaseCleanup();
      await pumpUntil(
        scene,
        async () =>
          (await prisma.evaluationSamplingBatchItem.count({
            where: { processedAt: null },
          })) === 0,
      );
      const after = await prisma.evaluationSampleEvidence.findMany({
        where: { sample: { runId: round.runId, platformKey: "qwen" } },
        orderBy: { sampleId: "asc" },
      });
      expect(after).toEqual(before);
      expect(await prisma.evaluationSampleInterpretation.count()).toBe(20);
    }, 25_000);

    it("cuts off pending sampling at 130s, allows accepted Parser work to finish, and retries only four missing samples", async () => {
      const scene = await createScene();
      scenes.push(scene);
      scene.host.holdSiblings = false;
      scene.host.holdCleanup = false;
      scene.host.blockedPlatforms.add("qwen");
      scene.holdParserResponses();
      scene.holdAcquisitionResponses();
      const first = await scene.startRound();
      await pumpUntil(
        scene,
        async () => (await prisma.evaluationSampleEvidence.count()) === 16,
      );
      expect(await prisma.evaluationSampleInterpretation.count()).toBe(0);
      const cycle = await prisma.evaluationExecutionCycle.findUniqueOrThrow({
        where: { id: first.cycleId },
      });
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(cycle.samplingStartedAt!.getTime() + 80_000);
      await scene.processor.reconcile();
      await pump(scene);
      expect(
        await prisma.aiExecutionAttempt.count({
          where: { purpose: "EVALUATION_ACQUISITION", executionChannel: "API" },
        }),
      ).toBe(4);
      vi.setSystemTime(cycle.samplingStartedAt!.getTime() + 130_000);
      await scene.processor.reconcile();
      await pump(scene);
      expect(
        await prisma.evaluationSample.count({
          where: { status: "ACQUISITION_EXHAUSTED" },
        }),
      ).toBe(4);
      expect(
        await prisma.evaluationSample.count({
          where: { status: "EVIDENCE_ACCEPTED" },
        }),
      ).toBe(16);
      expect(
        (
          await prisma.evaluationExecutionCycle.findUniqueOrThrow({
            where: { id: first.cycleId },
          })
        ).samplingClosedAt,
      ).not.toBeNull();
      scene.releaseParserResponses();
      await pumpUntil(
        scene,
        async () =>
          (
            await prisma.evaluationRun.findUniqueOrThrow({
              where: { id: first.runId },
            })
          ).status === "PLEASE_RETRY",
      );
      expect(await prisma.evaluationSampleInterpretation.count()).toBe(16);
      expect(
        await scene.reports.current(scene.accountId, scene.brandId),
      ).toBeNull();
      scene.host.releaseSiblings();
      scene.host.releaseCleanup();
      scene.releaseAcquisitionResponses();
      await pumpUntil(
        scene,
        async () =>
          (await prisma.evaluationSamplingBatchItem.count({
            where: { processedAt: null },
          })) === 0,
      );
      expect(await prisma.evaluationSampleEvidence.count()).toBe(16);
      vi.useRealTimers();
      const retried = await scene.evaluations.retryRun(
        scene.accountId,
        first.runId,
      );
      expect(retried.id).toBe(first.runId);
      const report = await pumpUntil(scene, () =>
        scene.reports.current(scene.accountId, scene.brandId),
      );
      expect(
        report!.questions
          .flatMap((question) => question.samples)
          .every((sample) => sample.availability === "INCLUDED"),
      ).toBe(true);
      expect(await prisma.evaluationSampleEvidence.count()).toBe(20);
      expect(await prisma.evaluationSampleInterpretation.count()).toBe(20);
      expect(scene.host.webCalls).toHaveLength(6);
      expect(scene.host.webCalls.at(-1)?.platform).toBe("qwen");
      expect(
        scene.host.webCalls.at(-1)?.items.map((item) => item.prompt),
      ).toEqual(restaurantQuestions);
      const cycles = await prisma.evaluationExecutionCycle.findMany({
        where: { runId: first.runId },
      });
      expect(cycles).toHaveLength(2);
    }, 30_000);

    async function createScene() {
      const deterministic = new DeterministicAiAttemptAdapter();
      const real = new RealAiAttemptAdapter({
        mode: "real",
        requestTimeoutMs: 30_000,
        ambiguityTimeoutMs: 210_000,
        telemetry: { mode: "disabled" },
        tokenHub: { baseUrl: "https://unused.invalid", apiKey: "synthetic" },
        modelStudio: { baseUrl: "https://unused.invalid", apiKey: "synthetic" },
        ark: { baseUrl: "https://unused.invalid", apiKey: "synthetic" },
        qianfan: { baseUrl: "https://unused.invalid", apiKey: "synthetic" },
      });
      const native = new RealAiNativeAttemptCodec();
      const prepared = new Map<string, ResolvedAiAttemptRequest>();
      const nativeRequests: ResolvedAiAttemptRequest[] = [];
      let holdParsers = false;
      let holdAcquisition = false;
      let releaseParsers!: () => void;
      let releaseAcquisition!: () => void;
      const parserResponses = new Promise<void>((resolve) => {
        releaseParsers = resolve;
      });
      const acquisitionResponses = new Promise<void>((resolve) => {
        releaseAcquisition = resolve;
      });
      const codec: AiNativeAttemptCodec = {
        prepare(request) {
          const body = native.prepare(request);
          prepared.set(canonical(body.body), request);
          return body;
        },
        consume: (request, body, response) =>
          native.consume(request, body, response),
      };
      const host = await startP4CenterHost(async (body) => {
        const request = prepared.get(canonical(body));
        if (!request) throw new Error("LOCAL_NATIVE_BODY_NOT_REGISTERED");
        nativeRequests.push(request);
        if (request.purpose === "EVALUATION_ACQUISITION" && holdAcquisition)
          await acquisitionResponses;
        if (request.purpose === "EVALUATION_INTERPRETATION" && holdParsers)
          await parserResponses;
        const result = await deterministic.execute(request);
        if (result.kind !== "SUCCEEDED")
          throw new Error("LOCAL_NATIVE_OUTPUT_FAILED");
        const responseText =
          request.purpose === "EVALUATION_ACQUISITION"
            ? String(result.output.answerContent)
            : JSON.stringify(result.output);
        if (request.protocol === "responses")
          return {
            id: "explicit-local-fixture",
            model: request.requestedModel,
            output: [
              {
                type: "message",
                role: "assistant",
                content: [{ type: "output_text", text: responseText }],
              },
            ],
            usage: { input_tokens: 220, output_tokens: 96, total_tokens: 316 },
          };
        return {
          id: "explicit-local-fixture",
          model: request.requestedModel,
          choices: [
            {
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: responseText,
              },
            },
          ],
          usage: {
            prompt_tokens: 220,
            completion_tokens: 96,
            total_tokens: 316,
          },
        };
      });
      const config: ParserExecutionCenterConfig = {
        enabled: true,
        acquisitionEnabled: true,
        centerRef: "p4-fixture-center",
        baseUrl: host.baseUrl,
        callerToken: "synthetic-caller-key",
        httpTimeoutMs: 2_000,
        endpoints: {
          "alibaba-model-studio:chat-completions": {
            endpointRef: "fixture",
            endpointVersion: "1",
            operation: "chat",
          },
          "alibaba-model-studio:responses": {
            endpointRef: "fixture",
            endpointVersion: "1",
            operation: "chat",
          },
        },
      };
      const adapter: AiAttemptAdapter = {
        resolve: (request) => real.resolve(request),
        execute() {
          throw new Error("Sample API must execute through the center");
        },
      };
      const attempts = new PostgresAiAttemptRepository(prisma);
      const receipts = new PostgresExecutionCenterReceiptRepository(prisma);
      const client = new ExecutionCenterClient(config);
      const driver = new DelegatedParserExecutionService(
        attempts,
        receipts,
        adapter,
        codec,
        client,
        config,
        200_000,
      );
      const ai = new AiExecutionService(
        attempts,
        adapter,
        210_000,
        undefined,
        driver,
      );
      const processRepository = new PostgresEvaluationProcessRepository(prisma);
      const sampling = new ExecutionCenterSamplingCoordinator(
        processRepository,
        ai,
        new ExecutionCenterBrowserSamplingGateway(client),
        receipts,
        { centerRef: config.centerRef, accountAlias: "primary" },
      );
      const synthesis = new EvaluationSynthesisCoordinator(
        new PostgresEvaluationSynthesisRepository(prisma),
        new AiSynthesisExecutionService(
          new PostgresAiSynthesisAttemptRepository(prisma),
          deterministic,
          210_000,
        ),
      );
      const queryRepository =
        new PostgresEvaluationQuestionPreparationRepository(prisma);
      const questionAdapter = new DeterministicAiAttemptAdapter((request) =>
        request.purpose === "EVALUATION_QUESTION_GENERATION"
          ? {
              kind: "SUCCEEDED",
              output: {
                queryTargetName: "花悦庭",
                brandDirected: restaurantQuestions[0],
                industryRecommendation: restaurantQuestions[1],
                characteristicAngleOne: restaurantQuestions[2],
                characteristicAngleTwo: restaurantQuestions[3],
              },
              usage: { inputTokens: 1, outputTokens: 1 },
            }
          : undefined,
      );
      const preparation = new EvaluationQuestionPreparationCoordinator(
        queryRepository,
        new AiQuestionGenerationExecutionService(
          new PostgresAiQuestionGenerationAttemptRepository(prisma),
          questionAdapter,
          210_000,
        ),
      );
      const receiptClock = () => new Date("2026-10-09T00:00:00Z");
      const locationReceipts = new StoreLocationReceiptCodec(
        "local_p4_test_location_receipt_2026",
        900,
        receiptClock,
      );
      const references = new BrandReferenceData();
      const brands = new BrandService(
        new PostgresBrandRepository(prisma),
        references,
        locationReceipts,
      );
      const account = await prisma.account.create({
        data: { mobile: "+8613900000469" },
      });
      const location = locationReceipts.issue({
        verificationId: randomUUID(),
        accountId: account.id,
        targetBrandId: randomUUID(),
        targetKind: "NEW_BRAND",
        searchInput: "广州天河猎德社区的花悦庭",
        evidence: {
          providerPlaceId: "explicit-local-liede-fixture",
          placeName: "花悦庭",
          formattedAddress: "广东省广州市天河区猎德社区（本地位置夹具）",
          coordinate: {
            longitude: 113.331,
            latitude: 23.116,
            system: "GCJ_02",
          },
          provinceName: "广东省",
          cityName: "广州市",
          districtName: "天河区",
          townshipName: "猎德街道",
          adcode: "440106",
          towncode: "440106013000",
          providerContractVersion: "explicit-local-fixture@1",
          verifiedAt: receiptClock().toISOString(),
        },
        officialRegion: references.deriveOfficialRegion({
          adcode: "440106",
          towncode: "440106013000",
        }),
        queryLocality: { kind: "BUSINESS_AREA", label: "猎德社区" },
      }).verificationReceipt;
      const brand = await brands.create(account.id, {
        companyName: "花悦庭",
        primaryIndustryId: "IND-01",
        secondaryIndustryId: "IND-01-01",
        flagshipProductOrService: "北京烤鸭",
        characteristics: [{ title: "正宗北京烤鸭" }, { title: "高级用餐环境" }],
        contactName: "本地测试联系人",
        contactMobile: "+8613900000469",
        locationChange: { action: "REPLACE", verificationReceipt: location },
      });
      const evaluations = new EvaluationService(
        brands,
        new PostgresEvaluationRepository(prisma, "execution-center"),
        queryRepository,
      );
      const reports = new EvaluationReportService(
        brands,
        new PostgresEvaluationReportRepository(prisma),
      );
      const coordinator = new EvaluationProcessCoordinator(
        processRepository,
        ai,
        synthesis,
        {
          mode: "execution-center",
          accountAlias: "primary",
          centerRef: config.centerRef,
        },
        {
          submitBatch: async () => {
            throw new Error("Legacy browser v1 must not be used");
          },
          readBatch: async () => {
            throw new Error("Legacy browser v1 must not be used");
          },
        },
        sampling,
      );
      const outbox = new PostgresProductOutboxRepository(prisma);
      const processor = new ProductWorkProcessor(
        outbox,
        coordinator,
        preparation,
        new NotificationEventHandler(
          new PostgresNotificationRepository(prisma),
        ),
        new SafeTelemetry({ export: async () => {} }),
      );
      const runtime = new ExecutionCenterEventRuntime(
        receipts,
        client,
        driver,
        config.centerRef,
      );
      runtime.onApplicationBootstrap();
      return {
        host,
        nativeRequests,
        brands,
        evaluations,
        reports,
        processor,
        outbox,
        runtime,
        accountId: account.id,
        brandId: brand.id,
        holdParserResponses() {
          holdParsers = true;
        },
        holdAcquisitionResponses() {
          holdAcquisition = true;
        },
        releaseParserResponses() {
          holdParsers = false;
          releaseParsers();
        },
        releaseAcquisitionResponses() {
          holdAcquisition = false;
          releaseAcquisition();
        },
        async startRound() {
          let query = await evaluations.prepareDefinition(account.id, brand.id);
          if (query.status === "PREPARING") {
            const event = await prisma.productOutboxEvent.findFirstOrThrow({
              where: {
                aggregateId: query.preparationId,
                eventType: "evaluation.definition.prepare.requested",
              },
            });
            await processor.apply(event.id);
            query = (await evaluations.observeDefinition(
              account.id,
              brand.id,
            ))!;
          }
          if (query.status !== "READY" || !query.definition)
            throw new Error("LOCAL_QUERY_DID_NOT_PREPARE");
          expect(
            query.definition.questions.map((question) => question.content),
          ).toEqual(restaurantQuestions);
          const run = await evaluations.startRun(
            account.id,
            query.definition.id,
          );
          const cycle = await prisma.evaluationExecutionCycle.findFirstOrThrow({
            where: { runId: run.id, status: "ACTIVE" },
          });
          return {
            runId: run.id,
            cycleId: cycle.id,
            definitionId: query.definition.id,
          };
        },
      };
    }
    async function pump(scene: Awaited<ReturnType<typeof createScene>>) {
      const events = await scene.outbox.findDeliverable(500);
      await Promise.all(events.map((event) => scene.processor.apply(event.id)));
      await delay(5);
    }
    async function pumpUntil<T>(
      scene: Awaited<ReturnType<typeof createScene>>,
      predicate: () => Promise<T>,
    ): Promise<T> {
      const end = performance.now() + 12_000;
      while (performance.now() < end) {
        await pump(scene);
        const value = await predicate();
        if (value) return value;
      }
      const attempts = await prisma.aiExecutionAttempt.findMany({
        select: {
          purpose: true,
          executionChannel: true,
          status: true,
          failureClass: true,
        },
      });
      const samples = await prisma.evaluationSample.findMany({
        select: { platformKey: true, status: true },
      });
      const pending = await prisma.productOutboxEvent.findMany({
        where: { status: { not: "COMPLETED" } },
        select: { eventType: true, status: true },
      });
      throw new Error(
        "P4_LOCAL_PRODUCT_LOOP_DID_NOT_COMPLETE " +
          JSON.stringify({
            attempts,
            samples,
            pending,
            nativeCalls: scene.nativeRequests.map((request) => request.purpose),
          }),
      );
    }
  },
);

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
