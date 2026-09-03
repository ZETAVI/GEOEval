import { randomUUID } from "node:crypto";

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { StoreLocationReceiptCodec } from "../src/brand/application/store-location-receipt.js";
import { StoreLocationVerificationService } from "../src/brand/application/store-location-verification.service.js";
import type { BrandRepository } from "../src/brand/domain/brand.repository.js";
import { DeterministicStoreLocationProvider } from "../src/brand/infrastructure/deterministic-store-location.provider.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";

const accountId = "00000000-0000-4000-8000-000000000011";

describe("Store Location verification service", () => {
  const repository = {
    find: async () => undefined,
  } as unknown as BrandRepository;
  const receiptCodec = new StoreLocationReceiptCodec(
    "test-store-location-receipt-secret-2026",
    900,
    () => new Date("2026-09-03T00:00:00.000Z"),
  );
  const service = new StoreLocationVerificationService(
    repository,
    new DeterministicStoreLocationProvider(),
    new BrandReferenceData(),
    receiptCodec,
    { export: async () => undefined } as never,
  );

  it("derives the exact region and returns bounded locality candidates", async () => {
    const result = await service.verify(accountId, {
      searchInput: " 广州塔 ",
      providerPlaceId: "fixture-guangzhou-tower",
    });

    expect(result.locationPreview.officialRegion).toMatchObject({
      province: { label: "广东省" },
      city: { label: "广州市" },
      terminal: { label: "海珠区", officialLevel: "COUNTY" },
    });
    expect(result.localityCandidates).toEqual([
      { id: "business-area-1", kind: "BUSINESS_AREA", label: "赤岗" },
      { id: "business-area-2", kind: "BUSINESS_AREA", label: "客村" },
    ]);
    expect(receiptCodec.verify(result.verificationReceipt)).toMatchObject({
      accountId,
      targetBrandId: result.targetBrandId,
      searchInput: "广州塔",
    });
  });

  it("marks a precise address as an address locality when no area exists", async () => {
    const result = await service.verify(accountId, {
      searchInput: "故宫博物院",
      providerPlaceId: "fixture-palace-museum",
    });
    expect(result.localityCandidates).toEqual([
      {
        id: "address-locality-1",
        kind: "ADDRESS_LOCALITY",
        label: "北京市东城区景山前街4号",
      },
    ]);
  });

  it("rejects an unowned existing Brand and an unknown provider place", async () => {
    await expect(
      service.verify(accountId, {
        brandId: randomUUID(),
        searchInput: "广州塔",
        providerPlaceId: "fixture-guangzhou-tower",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.verify(accountId, {
        searchInput: "不存在门店",
        providerPlaceId: "missing-place",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects malformed untrusted HTTP fields before invoking a provider", async () => {
    await expect(
      service.verify(accountId, {
        searchInput: 123,
        providerPlaceId: "fixture-guangzhou-tower",
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.verify(accountId, {
        searchInput: "广州塔",
        providerPlaceId: undefined,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.verify(accountId, {
        brandId: "not-a-uuid",
        searchInput: "广州塔",
        providerPlaceId: "fixture-guangzhou-tower",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
