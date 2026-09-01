import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AiQuestionGenerationExecutionService } from "../src/ai-execution/application/ai-question-generation-execution.service.js";
import type { DeterministicAttemptScenario } from "../src/ai-execution/infrastructure/deterministic-ai-attempt.adapter.js";
import { DeterministicAiAttemptAdapter } from "../src/ai-execution/infrastructure/deterministic-ai-attempt.adapter.js";
import { PostgresAiQuestionGenerationAttemptRepository } from "../src/ai-execution/infrastructure/postgres-ai-question-generation-attempt.repository.js";
import { BrandService } from "../src/brand/application/brand.service.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";
import { EvaluationQuestionPreparationCoordinator } from "../src/geo-intelligence/application/evaluation-question-preparation.coordinator.js";
import { EvaluationService } from "../src/geo-intelligence/application/evaluation.service.js";
import { PostgresEvaluationQuestionPreparationRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation-question-preparation.repository.js";
import { PostgresEvaluationRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import {
  clearCustomerData,
  READY_COFFEE_BRAND_FIELDS,
} from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();

describe("durable evaluation question preparation", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const brands = new BrandService(
    new PostgresBrandRepository(prisma),
    new BrandReferenceData(),
  );
  let accountId: string;

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => {
    await clearCustomerData(prisma);
    accountId = (
      await prisma.account.create({ data: { mobile: "+8613900000261" } })
    ).id;
  });

  it("uses the primary route twice and the provider-distinct fallback once", async () => {
    const stack = createStack((request) =>
      request.purpose === "EVALUATION_QUESTION_GENERATION" &&
      request.attemptNumber < 3
        ? {
            kind: "FAILED",
            failureClass: "CONTROLLED_TRANSIENT_FAILURE",
            retryable: true,
          }
        : undefined,
    );
    const brand = await createReadyBrand();
    const preparing = await stack.evaluations.prepareDefinition(
      accountId,
      brand.id,
    );
    expect(preparing).toMatchObject({ status: "PREPARING" });

    await Promise.all([
      processAttempt(stack.coordinator, preparing.preparationId!, 1, 1),
      processAttempt(stack.coordinator, preparing.preparationId!, 1, 1),
    ]);
    expect(
      await prisma.aiQuestionGenerationAttempt.count({
        where: {
          preparationId: preparing.preparationId!,
          sequence: 1,
          attemptNumber: 1,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          businessKey: `evaluation-question-preparation:${preparing.preparationId}:sequence:1:attempt:2`,
        },
      }),
    ).toBe(1);
    await processAttempt(stack.coordinator, preparing.preparationId!, 1, 2);
    await processAttempt(stack.coordinator, preparing.preparationId!, 1, 3);

    const ready = await stack.evaluations.observeDefinition(
      accountId,
      brand.id,
    );
    expect(ready).toMatchObject({ status: "READY" });
    expect(ready?.definition?.questions).toHaveLength(4);
    expect(
      await prisma.aiQuestionGenerationAttempt.findMany({
        orderBy: { attemptNumber: "asc" },
        select: {
          attemptNumber: true,
          routePolicyId: true,
          requestedModel: true,
          status: true,
        },
      }),
    ).toEqual([
      {
        attemptNumber: 1,
        routePolicyId: "evaluation.question-generation.qwen-primary@1",
        requestedModel: "qwen3.8-flash",
        status: "FAILED",
      },
      {
        attemptNumber: 2,
        routePolicyId: "evaluation.question-generation.qwen-primary@1",
        requestedModel: "qwen3.8-flash",
        status: "FAILED",
      },
      {
        attemptNumber: 3,
        routePolicyId: "evaluation.question-generation.hy3-fallback@1",
        requestedModel: "hy3",
        status: "SUCCEEDED",
      },
    ]);
    expect(await prisma.evaluationDefinition.count()).toBe(1);
  });

  it("exhausts one sequence and accepts only the explicit retry sequence", async () => {
    const stack = createStack((request) =>
      request.purpose === "EVALUATION_QUESTION_GENERATION" &&
      request.sequence === 1
        ? {
            kind: "FAILED",
            failureClass: "CONTROLLED_SEQUENCE_EXHAUSTION",
            retryable: true,
          }
        : undefined,
    );
    const brand = await createReadyBrand();
    const preparing = await stack.evaluations.prepareDefinition(
      accountId,
      brand.id,
    );
    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      await processAttempt(
        stack.coordinator,
        preparing.preparationId!,
        1,
        attemptNumber,
      );
    }
    expect(
      await stack.evaluations.observeDefinition(accountId, brand.id),
    ).toMatchObject({ status: "PLEASE_RETRY", definition: null });

    const [firstRetry, duplicateRetry] = await Promise.all([
      stack.evaluations.retryDefinitionPreparation(
        accountId,
        preparing.preparationId!,
      ),
      stack.evaluations.retryDefinitionPreparation(
        accountId,
        preparing.preparationId!,
      ),
    ]);
    expect(firstRetry).toMatchObject({ status: "PREPARING" });
    expect(duplicateRetry).toMatchObject({ status: "PREPARING" });
    expect(
      await prisma.evaluationQuestionPreparation.findUniqueOrThrow({
        where: { id: preparing.preparationId! },
        select: { currentSequence: true },
      }),
    ).toEqual({ currentSequence: 2 });
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          businessKey: `evaluation-question-preparation:${preparing.preparationId}:sequence:2:attempt:1`,
        },
      }),
    ).toBe(1);

    await processAttempt(stack.coordinator, preparing.preparationId!, 1, 3);
    expect(await prisma.evaluationDefinition.count()).toBe(0);
    await processAttempt(stack.coordinator, preparing.preparationId!, 2, 1);
    expect(
      await stack.evaluations.observeDefinition(accountId, brand.id),
    ).toMatchObject({ status: "READY" });
    expect(await prisma.evaluationDefinition.count()).toBe(1);
  });

  it("keeps an existing definition ready without creating Agent work", async () => {
    const stack = createStack();
    const brand = await createReadyBrand();
    const purpose = await brands.evaluationPurposeView(accountId, brand.id);
    const definition = await stack.evaluationRepository.createDefinition({
      accountId,
      brandId: brand.id,
      inputFingerprint: purpose.inputFingerprint,
      brandSnapshot: {
        schemaVersion: "brand-evaluation-snapshot@2",
        companyName: purpose.companyName,
        industry: purpose.industry,
        region: purpose.region,
        characteristicOne: purpose.characteristicOne,
        characteristicTwo: purpose.characteristicTwo,
      },
      questionGenerator: {
        id: "evaluation.question-generation",
        version: "0.1.0",
        contentHash: "c".repeat(64),
      },
      objectivityProfile: {
        id: "evaluation.objectivity",
        version: "0.3.0",
        contentHash: "d".repeat(64),
        content: "保持客观",
      },
      platforms: [],
      questions: [
        { kind: "BRAND_DIRECTED", ordinal: 1, content: "历史问题一" },
        {
          kind: "INDUSTRY_RECOMMENDATION",
          ordinal: 2,
          content: "历史问题二",
        },
        { kind: "CHARACTERISTIC_ONE", ordinal: 3, content: "历史问题三" },
        { kind: "CHARACTERISTIC_TWO", ordinal: 4, content: "历史问题四" },
      ],
    });

    const observed = await stack.evaluations.prepareDefinition(
      accountId,
      brand.id,
    );
    expect(observed).toMatchObject({
      status: "READY",
      preparationId: null,
      definition: { id: definition.id },
    });
    expect(await prisma.evaluationQuestionPreparation.count()).toBe(0);
    expect(await prisma.aiQuestionGenerationAttempt.count()).toBe(0);
  });

  it("turns an expired started attempt into a recorded ambiguous failure", async () => {
    const stack = createStack(undefined, 20);
    const brand = await createReadyBrand();
    const preparing = await stack.evaluations.prepareDefinition(
      accountId,
      brand.id,
    );
    const preparation =
      await prisma.evaluationQuestionPreparation.findUniqueOrThrow({
        where: { id: preparing.preparationId! },
      });
    await prisma.aiQuestionGenerationAttempt.create({
      data: {
        preparationId: preparation.id,
        sequence: 1,
        attemptNumber: 1,
        routePolicyId: "evaluation.question-generation.qwen-primary@1",
        providerKey: "deterministic-question-primary",
        requestedModel: "qwen3.8-flash",
        requestPayload: {},
        correlationId: preparation.correlationId,
        startedAt: new Date(Date.now() - 100),
      },
    });

    await processAttempt(stack.coordinator, preparation.id, 1, 1);
    expect(
      await prisma.aiQuestionGenerationAttempt.findFirstOrThrow({
        where: { preparationId: preparation.id, attemptNumber: 1 },
        select: { status: true, failureClass: true, retryable: true },
      }),
    ).toEqual({
      status: "FAILED",
      failureClass: "AMBIGUOUS_INTERRUPTION",
      retryable: true,
    });
    expect(
      await prisma.productOutboxEvent.count({
        where: {
          businessKey: `evaluation-question-preparation:${preparation.id}:sequence:1:attempt:2`,
        },
      }),
    ).toBe(1);
  });

  function createStack(
    scenario?: DeterministicAttemptScenario,
    ambiguityTimeoutMs = 2_000,
  ) {
    const preparationRepository =
      new PostgresEvaluationQuestionPreparationRepository(prisma);
    const evaluationRepository = new PostgresEvaluationRepository(prisma);
    const evaluations = new EvaluationService(
      brands,
      evaluationRepository,
      preparationRepository,
    );
    const execution = new AiQuestionGenerationExecutionService(
      new PostgresAiQuestionGenerationAttemptRepository(prisma),
      new DeterministicAiAttemptAdapter(scenario),
      ambiguityTimeoutMs,
    );
    return {
      evaluationRepository,
      evaluations,
      coordinator: new EvaluationQuestionPreparationCoordinator(
        preparationRepository,
        execution,
      ),
    };
  }

  async function createReadyBrand() {
    return brands.create(accountId, {
      companyName: "互动派科技股份有限公司",
      ...READY_COFFEE_BRAND_FIELDS,
      contactMobile: "+8613900000261",
    });
  }
});

async function processAttempt(
  coordinator: EvaluationQuestionPreparationCoordinator,
  preparationId: string,
  sequence: number,
  attemptNumber: number,
): Promise<void> {
  await coordinator.process({ preparationId, sequence, attemptNumber });
}
