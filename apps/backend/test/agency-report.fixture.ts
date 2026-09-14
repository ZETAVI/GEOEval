import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { BrandService } from "../src/brand/application/brand.service.js";
import type { PrismaService } from "../src/infrastructure/prisma.service.js";
import type { Prisma } from "../src/generated/prisma/client.js";
import { publishingContextFixture } from "./publishing-context.fixture.js";
/** Synthetic report with unscored samples; exercises history/projection, never providers. */
export async function agencyReportFixture(
  app: INestApplication,
  db: PrismaService,
  customer: string,
  name = "历史品牌",
) {
  const { brand } = await publishingContextFixture(app, db, customer, name);
  const purpose = await app
    .get(BrandService)
    .evaluationPurposeView(customer, brand.id);
  const snapshot = {
    schemaVersion: "brand-evaluation-snapshot@3",
    companyName: purpose.companyName,
    industry: purpose.industry,
    region: purpose.region,
    storeLocation: {
      ...purpose.storeLocation,
      source: {
        ...purpose.storeLocation.source,
        verifiedAt: purpose.storeLocation.source.verifiedAt.toISOString(),
      },
    },
    flagshipProductOrService: purpose.flagshipProductOrService,
    characteristics: purpose.characteristics,
  };
  const def = await db.evaluationDefinition.findFirstOrThrow({
    where: { brandId: brand.id },
  });
  await db.evaluationDefinition.update({
    where: { id: def.id },
    data: { brandSnapshot: snapshot },
  });
  const run = await db.evaluationRun.findFirstOrThrow({
    where: { brandId: brand.id },
  });
  const report = await db.evaluationReport.findUniqueOrThrow({
    where: { runId: run.id },
  });
  const doc = report.publicDocument as unknown as {
    overview: {
      coverage: unknown;
      recommendationIndex: unknown;
      typicalPosition: unknown;
    };
    platforms: unknown[];
  };
  doc.overview.coverage = {
    validSampleCount: 0,
    totalSampleCount: 20,
    missingSampleCount: 20,
  };
  doc.overview.recommendationIndex = {
    score: 0,
    stars: 0,
    mentionRate: 0,
    mentionCount: 0,
    validOpenSampleCount: 0,
  };
  doc.overview.typicalPosition = { kind: "NONE" };
  const keys = ["deepseek", "doubao", "kimi", "qwen", "wenxin"];
  doc.platforms = keys.map((key) => ({
    platformKey: key,
    platformLabel: key,
    validSampleCount: 0,
    totalSampleCount: 4,
    validOpenSampleCount: 0,
    mentionCount: 0,
    mentionRate: 0,
    typicalPosition: { kind: "NONE" },
  }));
  await db.evaluationReport.update({
    where: { id: report.id },
    data: { publicDocument: doc as Prisma.InputJsonValue },
  });
  const kinds = [
    "BRAND_DIRECTED",
    "INDUSTRY_RECOMMENDATION",
    "CHARACTERISTIC_ONE",
    "CHARACTERISTIC_TWO",
  ] as const;
  for (const [ordinal, kind] of kinds.entries()) {
    const q = await db.evaluationQuestion.create({
      data: {
        definitionId: def.id,
        kind,
        ordinal,
        content: `本地合成问题 ${ordinal + 1}`,
      },
    });
    for (const key of keys)
      await db.evaluationSample.create({
        data: {
          definitionId: def.id,
          runId: run.id,
          questionId: q.id,
          platformKey: key,
          platformLabel: key,
          status: "INTERPRETATION_EXHAUSTED",
        },
      });
  }
  const sample = await db.evaluationSample.findFirstOrThrow({
    where: { runId: run.id },
  });
  const cycle = await db.evaluationExecutionCycle.findFirstOrThrow({
    where: { runId: run.id },
  });
  const attempt = await db.aiExecutionAttempt.create({
    data: {
      runId: run.id,
      cycleId: cycle.id,
      sampleId: sample.id,
      purpose: "EVALUATION_ACQUISITION",
      attemptNumber: 1,
      status: "SUCCEEDED",
      routePolicyId: "fixture",
      providerKey: "fixture",
      requestedModel: "fixture-private-model",
      requestPayload: { private: "INTERNAL_PROMPT_MARKER" },
      correlationId: run.correlationId,
    },
  });
  await db.evaluationSampleEvidence.create({
    data: {
      sampleId: sample.id,
      acceptedAttemptId: attempt.id,
      answerContent: "合成原始回答：这家咖啡店适合安静办公。",
      answerFormat: "TEXT",
      sourceMetadata: { private: "INTERNAL_SOURCE_MARKER" },
      searchObservation: "UNKNOWN",
      returnedModel: "fixture-private-model",
    },
  });
  // A later unfinished run makes this accepted report historical without creating work.
  const next = await db.evaluationDefinition.create({
    data: {
      ...def,
      id: randomUUID(),
      brandSnapshot: snapshot,
      inputFingerprint: "a".repeat(64),
    },
  });
  await db.evaluationRun.create({
    data: {
      accountId: customer,
      brandId: brand.id,
      definitionId: next.id,
      inputFingerprint: next.inputFingerprint,
      correlationId: randomUUID(),
    },
  });
  return { brand, report };
}
