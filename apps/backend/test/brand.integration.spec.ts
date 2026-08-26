import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { BrandService } from "../src/brand/application/brand.service.js";
import { PostgresBrandRepository } from "../src/brand/infrastructure/postgres-brand.repository.js";
import { loadApiConfig } from "../src/config/runtime-config.js";
import { PrismaService } from "../src/infrastructure/prisma.service.js";

const config = loadApiConfig({ GEOEVAL_LOCAL_DEFAULTS: "1", NODE_ENV: "test" });

describe("account-scoped brand context", () => {
  const prisma = new PrismaService(config.databaseUrl);
  const service = new BrandService(new PostgresBrandRepository(prisma));
  let firstAccountId: string;
  let secondAccountId: string;

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => {
    await prisma.brandContext.deleteMany();
    await prisma.brandProfile.deleteMany();
    await prisma.accountSession.deleteMany();
    await prisma.account.deleteMany();
    await prisma.mobileChallenge.deleteMany();
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
    const brand = await service.create(firstAccountId, {
      companyName: "星河咖啡",
      primaryIndustry: "餐饮",
      secondaryIndustry: "咖啡店",
      characteristicOne: "安静办公",
      characteristicTwo: "精品手冲",
      province: "广东省",
      city: "广州市",
      district: "天河区",
      contactName: "林先生",
      contactMobile: "13800138000",
    });
    const contactEdit = await service.update(firstAccountId, brand.id, {
      contactName: "陈女士",
    });
    expect(contactEdit.evaluationFingerprint).toBe(brand.evaluationFingerprint);
    expect(contactEdit.readyForEvaluation).toBe(true);
    const contextEdit = await service.update(firstAccountId, brand.id, {
      characteristicOne: "安静办公与会议",
    });
    expect(contextEdit.evaluationFingerprint).not.toBe(
      brand.evaluationFingerprint,
    );
  });

  it("never exposes or selects another account's brand", async () => {
    const brand = await service.create(firstAccountId, {
      companyName: "星河咖啡",
    });
    expect(await service.list(secondAccountId)).toEqual([]);
    await expect(
      service.update(secondAccountId, brand.id, { companyName: "越权修改" }),
    ).rejects.toThrow("未找到该品牌");
    await expect(
      service.selectCurrent(secondAccountId, brand.id),
    ).rejects.toThrow("未找到该品牌");
  });
});
