import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { BrandService } from "../src/brand/application/brand.service.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";
import { GeoOptimizationService } from "../src/geo-optimization/application/geo-optimization.service.js";
import { EVALUATION_REPORT_DOCUMENT_VERSION } from "../src/geo-intelligence/domain/evaluation-report.document.js";
import { OVERALL_SYNTHESIS_CONTRACT_VERSION } from "../src/geo-intelligence/domain/overall-synthesis.contract.js";
import type { PrismaService } from "../src/infrastructure/prisma.service.js";
import {
  readyCoffeeBrandInput,
  TEST_STORE_LOCATION_RECEIPTS,
} from "./customer-data.js";

/** Synthetic accepted evaluation prerequisite; article creation/confirmation uses its real owner. */
export async function publishingContextFixture(
  app: INestApplication,
  prisma: PrismaService,
  accountId: string,
  companyName = "星河咖啡",
) {
  const brands = new BrandService(
    new PostgresBrandRepository(prisma),
    new BrandReferenceData(),
    TEST_STORE_LOCATION_RECEIPTS,
  );
  const brand = await brands.create(
    accountId,
    readyCoffeeBrandInput(accountId, {
      companyName,
      articleInformation: {
        price: { mode: "RANGE", minimum: 28, maximum: 68 },
        suitableAudienceContexts: ["需要安静办公的顾客"],
        supplementalBackground: null,
        desiredPositioning: [],
      },
    }),
  );
  const definition = await prisma.evaluationDefinition.create({
    data: {
      accountId,
      brandId: brand.id,
      inputFingerprint: brand.evaluationFingerprint,
      brandSnapshot: { fixture: true },
      questionGeneratorId: "fixture",
      questionGeneratorVersion: "1",
      questionGeneratorHash: "1".repeat(64),
      platformPolicy: { fixture: true },
      objectivityProfileId: "fixture",
      objectivityProfileVersion: "1",
      objectivityProfileHash: "2".repeat(64),
      objectivityProfileContent: "fixture",
    },
  });
  const run = await prisma.evaluationRun.create({
    data: {
      accountId,
      brandId: brand.id,
      definitionId: definition.id,
      inputFingerprint: brand.evaluationFingerprint,
      status: "COMPLETED",
      stage: "REPORT_ACCEPTED",
      correlationId: randomUUID(),
    },
  });
  const cycle = await prisma.evaluationExecutionCycle.create({
    data: { runId: run.id, sequence: 1, status: "COMPLETED" },
  });
  const attempt = await prisma.aiSynthesisAttempt.create({
    data: {
      runId: run.id,
      cycleId: cycle.id,
      attemptNumber: 1,
      status: "SUCCEEDED",
      routePolicyId: "fixture",
      providerKey: "fixture",
      requestedModel: "fixture",
      requestPayload: { fixture: true },
      correlationId: run.correlationId,
      finishedAt: new Date(),
    },
  });
  const synthesis = await prisma.evaluationSynthesis.create({
    data: {
      runId: run.id,
      acceptedAttemptId: attempt.id,
      semanticContractVersion: OVERALL_SYNTHESIS_CONTRACT_VERSION,
      semanticPayload: { fixture: true },
    },
  });
  await prisma.evaluationReport.create({
    data: {
      runId: run.id,
      synthesisId: synthesis.id,
      metricPolicyVersion: "evaluation.report-metrics@1",
      documentContractVersion: EVALUATION_REPORT_DOCUMENT_VERSION,
      publicDocument: {
        overview: {
          recommendationAssessment: "当前推荐表现仍有提升空间。",
          brandPerception: "安静办公场景有一定认知。",
          recommendationIndex: {
            score: 2.5,
            stars: 2.5,
            mentionRate: 0.25,
            mentionCount: 1,
            validOpenSampleCount: 4,
          },
          typicalPosition: { kind: "SINGLE", position: 3 },
          coverage: {
            validSampleCount: 20,
            totalSampleCount: 20,
            missingSampleCount: 0,
          },
        },
        platforms: [],
        themes: { positive: [], negative: [] },
        competitors: [],
        limitations: [],
        directions: [
          {
            directionId: "direction-local",
            currentProblem: "本地品牌认知不够集中。",
            recommendedDirection: "围绕精品咖啡与办公体验持续表达。",
            intendedImprovement: "提高目标客户对品牌的清晰认知。",
            evidence: { sampleCount: 4, platforms: ["deepseek"] },
          },
        ],
      },
    },
  });
  const sampleId = randomUUID();
  await prisma.evaluationOptimizationGuidance.create({
    data: {
      runId: run.id,
      synthesisId: synthesis.id,
      guidancePayload: {
        summary: "强化本地精品咖啡与办公场景认知",
        priorities: [
          {
            guidanceId: "priority-local",
            label: "本地认知",
            detail: "持续说明所在区域与核心服务",
            evidenceRefs: [{ sampleId, observationId: null }],
          },
        ],
        writingAngles: [
          {
            guidanceId: "angle-work",
            label: "办公场景",
            detail: "突出安静座位和稳定网络",
            evidenceRefs: [{ sampleId, observationId: null }],
          },
        ],
        cautions: ["不要编造未提供的信息"],
      },
    },
  });
  await brands.selectCurrent(accountId, brand.id);
  const articles = app.get(GeoOptimizationService);
  await articles.generate({
    accountId,
    brandId: brand.id,
    idempotencyKey: randomUUID(),
    expectedBrandRevision: brand.revision,
  });
  const generated = await articles.currentArticle(accountId, brand.id);
  if (!generated) throw new Error("Fixture article generation did not succeed");
  const article = await articles.confirmArticle({
    accountId,
    brandId: brand.id,
    articleId: generated.id,
    expectedRevision: generated.revision,
  });
  return { brand, article };
}
