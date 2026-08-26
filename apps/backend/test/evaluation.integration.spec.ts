import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { BrandService } from "../src/brand/application/brand.service.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import { loadApiConfig } from "../src/config/runtime-config.js";
import { EvaluationService } from "../src/geo-intelligence/application/evaluation.service.js";
import { DeterministicEvaluationQuestionGenerator } from "../src/geo-intelligence/domain/question-generator.js";
import { PostgresEvaluationRepository } from "../src/geo-intelligence/infrastructure/postgres-evaluation.repository.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import { clearCustomerData } from "./customer-data.js";

const config = loadApiConfig({ GEOEVAL_LOCAL_DEFAULTS: "1", NODE_ENV: "test" });

describe("evaluation definition and official start", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const brands = new BrandService(new PostgresBrandRepository(prisma));
  const evaluations = new EvaluationService(
    brands,
    new PostgresEvaluationRepository(prisma),
    new DeterministicEvaluationQuestionGenerator(),
  );
  let accountId: string;
  let otherAccountId: string;

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => {
    await clearCustomerData(prisma);
    const [account, other] = await Promise.all([
      prisma.account.create({ data: { mobile: "+8613900000101" } }),
      prisma.account.create({ data: { mobile: "+8613900000102" } }),
    ]);
    accountId = account.id;
    otherAccountId = other.id;
  });

  it("keeps one immutable four-question definition for an unchanged revision", async () => {
    const brand = await createReadyBrand(brands, accountId);
    const first = await evaluations.prepareDefinition(accountId, brand.id);
    const again = await evaluations.prepareDefinition(accountId, brand.id);

    expect(again.id).toBe(first.id);
    expect(first.questions.map((question) => question.kind)).toEqual([
      "BRAND_DIRECTED",
      "INDUSTRY_RECOMMENDATION",
      "CHARACTERISTIC_ONE",
      "CHARACTERISTIC_TWO",
    ]);
    expect(first.platforms.map((platform) => platform.label)).toEqual([
      "DeepSeek",
      "豆包",
      "千问",
      "文心一言",
      "混元",
    ]);
    expect(first.objectivityProfile).toMatchObject({
      id: "evaluation.objectivity",
      version: "0.3.0",
    });
    expect(first.brandSnapshot).not.toHaveProperty("contactName");

    await brands.update(accountId, brand.id, { contactName: "新的联系人" });
    const afterContactEdit = await evaluations.prepareDefinition(
      accountId,
      brand.id,
    );
    expect(afterContactEdit.id).toBe(first.id);
    expect(await prisma.evaluationDefinition.count()).toBe(1);
  });

  it("returns one stored definition under concurrent preparation", async () => {
    const brand = await createReadyBrand(brands, accountId);
    const [first, second] = await Promise.all([
      evaluations.prepareDefinition(accountId, brand.id),
      evaluations.prepareDefinition(accountId, brand.id),
    ]);

    expect(second.id).toBe(first.id);
    expect(second.questions).toEqual(first.questions);
    expect(await prisma.evaluationDefinition.count()).toBe(1);
    expect(await prisma.evaluationQuestion.count()).toBe(4);
  });

  it("creates a new definition after relevant edits and rejects the stale one", async () => {
    const brand = await createReadyBrand(brands, accountId);
    const first = await evaluations.prepareDefinition(accountId, brand.id);
    await brands.update(accountId, brand.id, {
      characteristicOne: "安静办公与小型会议",
    });
    const second = await evaluations.prepareDefinition(accountId, brand.id);

    expect(second.id).not.toBe(first.id);
    expect(first.questions[2]?.content).toContain("安静办公");
    expect(second.questions[2]?.content).toContain("安静办公与小型会议");
    await expect(evaluations.startRun(accountId, first.id)).rejects.toThrow(
      "品牌资料已经变化",
    );
  });

  it("atomically starts one run with twenty positions and one outbox fact", async () => {
    const brand = await createReadyBrand(brands, accountId);
    const definition = await evaluations.prepareDefinition(accountId, brand.id);
    const run = await evaluations.startRun(accountId, definition.id);
    const duplicate = await evaluations.startRun(accountId, definition.id);

    expect(run).toMatchObject({
      id: duplicate.id,
      status: "EVALUATING",
      expectedSampleCount: 20,
    });
    expect(await prisma.evaluationRun.count()).toBe(1);
    expect(await prisma.evaluationSample.count()).toBe(20);
    expect(await prisma.productOutboxEvent.count()).toBe(1);
    expect(await prisma.productOutboxEvent.findFirst()).toMatchObject({
      aggregateId: run.id,
      eventType: "evaluation.run.started",
      status: "PENDING",
    });
  });

  it("allows only one active run for a brand across changing revisions", async () => {
    const brand = await createReadyBrand(brands, accountId);
    const first = await evaluations.prepareDefinition(accountId, brand.id);
    await evaluations.startRun(accountId, first.id);
    await brands.update(accountId, brand.id, {
      characteristicTwo: "可预订的手冲体验课",
    });
    const second = await evaluations.prepareDefinition(accountId, brand.id);

    await expect(evaluations.startRun(accountId, second.id)).rejects.toThrow(
      "该品牌正在评测中",
    );
    expect(await prisma.evaluationRun.count()).toBe(1);
  });

  it("does not expose or start another account's definition", async () => {
    const brand = await createReadyBrand(brands, accountId);
    const definition = await evaluations.prepareDefinition(accountId, brand.id);

    await expect(
      evaluations.prepareDefinition(otherAccountId, brand.id),
    ).rejects.toThrow("未找到该品牌");
    await expect(
      evaluations.startRun(otherAccountId, definition.id),
    ).rejects.toThrow("未找到该评测问题集");
  });

  it("never creates another official run after the definition is used", async () => {
    const brand = await createReadyBrand(brands, accountId);
    const definition = await evaluations.prepareDefinition(accountId, brand.id);
    const run = await evaluations.startRun(accountId, definition.id);
    await prisma.evaluationRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED" },
    });

    await expect(
      evaluations.startRun(accountId, definition.id),
    ).rejects.toThrow("已经发起过正式评测");
    expect(await prisma.evaluationRun.count()).toBe(1);
  });
});

async function createReadyBrand(brands: BrandService, accountId: string) {
  return brands.create(accountId, {
    companyName: "星河咖啡",
    primaryIndustry: "餐饮",
    secondaryIndustry: "咖啡店",
    characteristicOne: "安静办公",
    characteristicTwo: "精品手冲",
    province: "广东省",
    city: "广州市",
    district: "天河区",
    contactName: "林先生",
    contactMobile: "13900000101",
  });
}
