import { describe, expect, it } from "vitest";

import {
  StoreLocationReceiptCodec,
  StoreLocationReceiptError,
} from "../src/brand/application/store-location-receipt.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";

const accountId = "00000000-0000-4000-8000-000000000001";
const targetBrandId = "00000000-0000-4000-8000-000000000002";
const verificationId = "00000000-0000-4000-8000-000000000003";
const secret = "test-store-location-receipt-secret-2026";

describe("Store Location verification receipt", () => {
  it("round-trips one account and Brand-bound verification", () => {
    const now = new Date("2026-09-03T00:00:00.000Z");
    const codec = new StoreLocationReceiptCodec(secret, 900, () => now);
    const issued = codec.issue(payload());

    expect(issued.expiresAt.toISOString()).toBe("2026-09-03T00:15:00.000Z");
    expect(codec.verify(issued.verificationReceipt)).toMatchObject({
      accountId,
      targetBrandId,
      verificationId,
      localityCandidates: [
        { id: "business-area-1", kind: "BUSINESS_AREA", label: "赤岗" },
      ],
    });
  });

  it("rejects altered and expired receipts", () => {
    let now = new Date("2026-09-03T00:00:00.000Z");
    const codec = new StoreLocationReceiptCodec(secret, 900, () => now);
    const receipt = codec.issue(payload()).verificationReceipt;
    const parts = receipt.split(".");
    const altered = `${parts[0]}.${parts[1]}x.${parts[2]}`;

    expect(() => codec.verify(altered)).toThrow(StoreLocationReceiptError);
    now = new Date("2026-09-03T00:15:00.000Z");
    expect(() => codec.verify(receipt)).toThrow("门店验证已过期");
  });
});

function payload() {
  return {
    verificationId,
    accountId,
    targetBrandId,
    targetKind: "NEW_BRAND" as const,
    searchInput: "广州塔",
    evidence: {
      providerPlaceId: "fixture-guangzhou-tower",
      placeName: "广州塔",
      formattedAddress: "广东省广州市海珠区阅江西路222号",
      coordinate: {
        longitude: 113.324553,
        latitude: 23.106414,
        system: "GCJ_02" as const,
      },
      provinceName: "广东省",
      cityName: "广州市",
      districtName: "海珠区",
      townshipName: "赤岗街道",
      adcode: "440105",
      towncode: "440105001000",
      providerContractVersion: "fixture@1",
      verifiedAt: "2026-09-03T00:00:00.000Z",
    },
    officialRegion: new BrandReferenceData().deriveOfficialRegion({
      adcode: "440105",
      towncode: "440105001000",
    }),
    localityCandidates: [
      { id: "business-area-1", kind: "BUSINESS_AREA" as const, label: "赤岗" },
    ],
  };
}
