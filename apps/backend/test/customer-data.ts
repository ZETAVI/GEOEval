import { randomUUID } from "node:crypto";

import type { PrismaService } from "../src/infrastructure/prisma.service.js";
import { StoreLocationReceiptCodec } from "../src/brand/application/store-location-receipt.js";
import type { BrandMutationInput } from "../src/brand/domain/brand.types.js";
import { BrandReferenceData } from "../src/brand/reference-data/brand-reference-data.js";

export const READY_COFFEE_BRAND_FIELDS: BrandMutationInput = {
  primaryIndustryId: "IND-01",
  secondaryIndustryId: "IND-01-02",
  flagshipProductOrService: "精品手冲咖啡",
  characteristics: [{ title: "安静办公" }, { title: "精品手冲" }],
  contactName: "林先生",
  contactMobile: "+8613900000101",
};

let receiptNowMs = new Date("2026-09-03T00:00:00.000Z").getTime();
export const TEST_STORE_LOCATION_RECEIPTS = new StoreLocationReceiptCodec(
  "geoeval_test_store_location_receipt_secret_2026",
  900,
  () => new Date(receiptNowMs),
);

export function readyCoffeeBrandInput(
  accountId: string,
  fields: BrandMutationInput = {},
): BrandMutationInput {
  const targetBrandId = randomUUID();
  const issued = issueStoreLocationReceipt({
    accountId,
    targetBrandId,
    targetKind: "NEW_BRAND",
  });
  return {
    ...READY_COFFEE_BRAND_FIELDS,
    ...fields,
    locationChange: {
      action: "REPLACE",
      verificationReceipt: issued,
    },
  };
}

export function replacementStoreLocationInput(
  accountId: string,
  brandId: string,
  localityLabel = "赤岗",
): BrandMutationInput {
  return {
    locationChange: {
      action: "REPLACE",
      verificationReceipt: issueStoreLocationReceipt({
        accountId,
        targetBrandId: brandId,
        targetKind: "EXISTING_BRAND",
        localityLabel,
      }),
    },
  };
}

function issueStoreLocationReceipt(input: {
  accountId: string;
  targetBrandId: string;
  targetKind: "NEW_BRAND" | "EXISTING_BRAND";
  localityLabel?: string;
}): string {
  receiptNowMs += 1;
  const receiptNow = new Date(receiptNowMs);
  const { localityLabel = "赤岗", ...receiptBinding } = input;
  return TEST_STORE_LOCATION_RECEIPTS.issue({
    verificationId: randomUUID(),
    ...receiptBinding,
    searchInput: "广州塔",
    evidence: {
      providerPlaceId: "fixture-guangzhou-tower",
      placeName: "广州塔",
      formattedAddress: "广东省广州市海珠区阅江西路222号",
      coordinate: {
        longitude: 113.324553,
        latitude: 23.106414,
        system: "GCJ_02",
      },
      provinceName: "广东省",
      cityName: "广州市",
      districtName: "海珠区",
      townshipName: "赤岗街道",
      adcode: "440105",
      towncode: "440105001000",
      providerContractVersion: "fixture@1",
      verifiedAt: receiptNow.toISOString(),
    },
    officialRegion: new BrandReferenceData().deriveOfficialRegion({
      adcode: "440105",
      towncode: "440105001000",
    }),
    queryLocality: {
      kind: "BUSINESS_AREA",
      label: localityLabel,
    },
  }).verificationReceipt;
}

export async function clearCustomerData(prisma: PrismaService): Promise<void> {
  await prisma.mediaCatalogAudit.deleteMany();
  await prisma.mediaResource.deleteMany();
  await prisma.mediaPlatformCategory.deleteMany();
  await prisma.mediaSupplier.deleteMany();
  await prisma.mediaPlatform.deleteMany();
  await prisma.mediaCatalogState.updateMany({
    where: { id: "global" },
    data: { publicRevision: 1n },
  });
  await prisma.notification.deleteMany();
  await prisma.productOutboxEvent.deleteMany();
  await prisma.coreArticle.deleteMany();
  await prisma.articleGeneration.deleteMany();
  await prisma.writerInputSnapshot.deleteMany();
  await prisma.evaluationReport.deleteMany();
  await prisma.evaluationOptimizationGuidance.deleteMany();
  await prisma.evaluationSynthesis.deleteMany();
  await prisma.evaluationSynthesisExhaustion.deleteMany();
  await prisma.aiSynthesisAttempt.deleteMany();
  await prisma.evaluationStageExhaustion.deleteMany();
  await prisma.evaluationSampleInterpretation.deleteMany();
  await prisma.evaluationSampleEvidence.deleteMany();
  await prisma.aiExecutionAttempt.deleteMany();
  await prisma.evaluationSample.deleteMany();
  await prisma.evaluationExecutionCycle.deleteMany();
  await prisma.evaluationRun.deleteMany();
  await prisma.evaluationQuestion.deleteMany();
  await prisma.evaluationDefinition.deleteMany();
  await prisma.aiQuestionGenerationAttempt.deleteMany();
  await prisma.evaluationQuestionPreparation.deleteMany();
  await prisma.brandContext.deleteMany();
  await prisma.brandStoreLocation.deleteMany();
  await prisma.brandProfile.deleteMany();
  await prisma.identityGovernanceAudit.deleteMany();
  await prisma.identityGovernanceControl.updateMany({
    data: {
      bootstrapAccountId: null,
      bootstrapSecretDigest: null,
      bootstrapKeyId: null,
      bootstrapCompletedAt: null,
      revision: 1,
    },
  });
  await prisma.accountSession.deleteMany();
  await prisma.account.deleteMany();
  await prisma.mobileChallenge.deleteMany();
  await prisma.mobileChallengeRateLimit.deleteMany();
}
