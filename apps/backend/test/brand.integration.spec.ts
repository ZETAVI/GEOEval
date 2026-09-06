import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { BrandService } from "../src/brand/application/brand.service.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";
import {
  clearCustomerData,
  readyCoffeeBrandInput,
  replacementStoreLocationInput,
  TEST_STORE_LOCATION_RECEIPTS,
} from "./customer-data.js";
import { loadIntegrationApiConfig } from "./integration-test-config.js";

const config = loadIntegrationApiConfig();

describe("account-scoped brand context", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const service = new BrandService(
    new PostgresBrandRepository(prisma),
    new BrandReferenceData(),
    TEST_STORE_LOCATION_RECEIPTS,
  );
  let firstAccountId: string;
  let secondAccountId: string;

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => {
    await clearCustomerData(prisma);
    const [first, second] = await Promise.all([
      prisma.account.create({ data: { mobile: "+8613800138101" } }),
      prisma.account.create({ data: { mobile: "+8613800138102" } }),
    ]);
    firstAccountId = first.id;
    secondAccountId = second.id;
  });

  it("makes the first brand current and exposes honest readiness", async () => {
    const brand = await service.create(firstAccountId, {
      companyName: " 星河咖啡 ",
    });
    expect(brand).toMatchObject({
      companyName: "星河咖啡",
      isCurrent: true,
      readyForEvaluation: false,
    });
    expect(brand.missingFields).toContain("一级行业");
    expect((await service.current(firstAccountId))?.id).toBe(brand.id);
  });

  it("keeps the evaluation fingerprint stable for contact-only edits", async () => {
    const brand = await service.create(
      firstAccountId,
      readyCoffeeBrandInput(firstAccountId, {
        companyName: "星河咖啡",
        contactMobile: "13800138000",
      }),
    );
    const contactEdit = await service.update(firstAccountId, brand.id, {
      expectedRevision: brand.revision,
      contactName: "陈女士",
    });
    expect(contactEdit.evaluationFingerprint).toBe(brand.evaluationFingerprint);
    expect(contactEdit.readyForEvaluation).toBe(true);
    const contextEdit = await service.update(firstAccountId, brand.id, {
      expectedRevision: contactEdit.revision,
      characteristics: [
        { ...contactEdit.characteristics[0]!, title: "安静办公与会议" },
        contactEdit.characteristics[1]!,
      ],
    });
    expect(contextEdit.evaluationFingerprint).not.toBe(
      brand.evaluationFingerprint,
    );
  });

  it("keeps one Brand revision while writing-only details use their own fingerprint", async () => {
    const brand = await service.create(
      firstAccountId,
      readyCoffeeBrandInput(firstAccountId, { companyName: "星河咖啡" }),
    );
    expect(brand).toMatchObject({
      revision: 1,
      readyForEvaluation: true,
      readyForArticleGeneration: false,
      articleInformation: {
        price: null,
        suitableAudienceContexts: [],
        supplementalBackground: null,
        desiredPositioning: [],
      },
    });

    const completed = await service.update(firstAccountId, brand.id, {
      expectedRevision: brand.revision,
      characteristics: [
        { ...brand.characteristics[0]!, detail: "提供安静座位与稳定网络" },
        brand.characteristics[1]!,
      ],
      articleInformation: {
        price: { mode: "RANGE", minimum: 28, maximum: 68 },
        suitableAudienceContexts: [
          "需要安静办公的顾客",
          "关注手冲风味的咖啡爱好者",
        ],
        supplementalBackground: "团队持有专业咖啡师认证",
        desiredPositioning: ["本地精品咖啡代表"],
      },
    });

    expect(completed.revision).toBe(2);
    expect(completed.evaluationFingerprint).toBe(brand.evaluationFingerprint);
    expect(completed.writingContextFingerprint).not.toBe(
      brand.writingContextFingerprint,
    );
    expect(completed.characteristics.map((item) => item.id)).toEqual(
      brand.characteristics.map((item) => item.id),
    );
    expect(completed.readyForArticleGeneration).toBe(true);
    await expect(
      service.writerPurposeView(firstAccountId, brand.id),
    ).resolves.toMatchObject({
      revision: 2,
      writingContextFingerprint: completed.writingContextFingerprint,
      characteristics: [
        { title: "安静办公", detail: "提供安静座位与稳定网络" },
        { title: "精品手冲", detail: null },
      ],
    });

    await expect(
      service.update(firstAccountId, brand.id, {
        expectedRevision: brand.revision,
        contactName: "陈女士",
      }),
    ).rejects.toThrow("品牌资料已被更新");
    expect((await service.current(firstAccountId))?.contactName).toBe("林先生");
  });

  it("never exposes or selects another account's brand", async () => {
    const brand = await service.create(firstAccountId, {
      companyName: "星河咖啡",
    });
    expect(await service.list(secondAccountId)).toEqual([]);
    await expect(
      service.update(secondAccountId, brand.id, {
        expectedRevision: brand.revision,
        companyName: "越权修改",
      }),
    ).rejects.toThrow("未找到该品牌");
    await expect(
      service.selectCurrent(secondAccountId, brand.id),
    ).rejects.toThrow("未找到该品牌");
  });

  it("binds receipts, rejects replay, and changes meaning only with place/locality", async () => {
    const brand = await service.create(
      firstAccountId,
      readyCoffeeBrandInput(firstAccountId, { companyName: "星河咖啡" }),
    );
    const originalFactId = brand.storeLocation!.semanticFactId;
    const originalFingerprint = brand.evaluationFingerprint;

    const sameMeaning = replacementStoreLocationInput(firstAccountId, brand.id);
    const refreshed = await service.update(firstAccountId, brand.id, {
      ...sameMeaning,
      expectedRevision: brand.revision,
    });
    expect(refreshed.storeLocation?.semanticFactId).toBe(originalFactId);
    expect(refreshed.evaluationFingerprint).toBe(originalFingerprint);
    await expect(
      service.update(firstAccountId, brand.id, {
        ...sameMeaning,
        expectedRevision: refreshed.revision,
      }),
    ).rejects.toThrow("门店验证凭证已使用");

    const changedLocality = await service.update(firstAccountId, brand.id, {
      ...replacementStoreLocationInput(
        firstAccountId,
        brand.id,
        "business-area-2",
      ),
      expectedRevision: refreshed.revision,
    });
    expect(changedLocality.storeLocation?.semanticFactId).not.toBe(
      originalFactId,
    );
    expect(changedLocality.evaluationFingerprint).not.toBe(originalFingerprint);
    await expect(
      service.update(firstAccountId, brand.id, {
        ...sameMeaning,
        expectedRevision: changedLocality.revision,
      }),
    ).rejects.toThrow("门店验证凭证已过期");

    const removed = await service.update(firstAccountId, brand.id, {
      expectedRevision: changedLocality.revision,
      locationChange: { action: "REMOVE" },
    });
    expect(removed.storeLocation).toBeNull();
    expect(removed.readyForEvaluation).toBe(false);
    expect(removed.missingFields).toContain("具体门店");
  });

  it("rejects cross-account and arbitrary client location facts", async () => {
    await expect(
      service.create(
        secondAccountId,
        readyCoffeeBrandInput(firstAccountId, { companyName: "越权门店" }),
      ),
    ).rejects.toThrow("门店验证凭证不属于当前品牌");
    await expect(
      service.create(firstAccountId, {
        companyName: "伪造坐标",
        storeLocation: { longitude: 113, latitude: 23 },
      } as never),
    ).rejects.toThrow("品牌资料格式不正确");
  });

  it("serializes concurrent receipt consumption inside the Brand aggregate", async () => {
    const createInput = readyCoffeeBrandInput(firstAccountId, {
      companyName: "并发创建品牌",
    });
    const createResults = await Promise.allSettled([
      service.create(firstAccountId, createInput),
      service.create(firstAccountId, createInput),
    ]);
    expect(
      createResults.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      createResults.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);

    const brand = await service.create(
      firstAccountId,
      readyCoffeeBrandInput(firstAccountId, { companyName: "并发更新品牌" }),
    );
    const replacement = replacementStoreLocationInput(firstAccountId, brand.id);
    const updateResults = await Promise.allSettled([
      service.update(firstAccountId, brand.id, {
        ...replacement,
        expectedRevision: brand.revision,
      }),
      service.update(firstAccountId, brand.id, {
        ...replacement,
        expectedRevision: brand.revision,
      }),
    ]);
    expect(
      updateResults.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      updateResults.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
  });
});
