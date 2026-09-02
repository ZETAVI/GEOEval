import type { PrismaService } from "../src/infrastructure/prisma.service.js";
import type { EditableBrandFields } from "../src/brand/domain/brand.types.js";

export const READY_COFFEE_BRAND_FIELDS: EditableBrandFields = {
  primaryIndustryId: "IND-01",
  secondaryIndustryId: "IND-01-02",
  characteristicOne: "安静办公",
  characteristicTwo: "精品手冲",
  provinceRegionId: "CN-MCA-PROVINCE-440000",
  cityRegionId: "CN-MCA-PREFECTURE-440100",
  terminalRegionId: "CN-MCA-COUNTY-440106",
  contactName: "林先生",
  contactMobile: "+8613900000101",
};

export async function clearCustomerData(prisma: PrismaService): Promise<void> {
  await prisma.mediaCatalogAudit.deleteMany();
  await prisma.mediaResource.deleteMany();
  await prisma.mediaPlatformListing.deleteMany();
  await prisma.mediaPlatformCategory.deleteMany();
  await prisma.mediaSupplySource.deleteMany();
  await prisma.mediaPlatform.deleteMany();
  await prisma.mediaCatalogState.updateMany({
    where: { id: "global" },
    data: { publicRevision: 1n },
  });
  await prisma.notification.deleteMany();
  await prisma.productOutboxEvent.deleteMany();
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
  await prisma.brandContext.deleteMany();
  await prisma.brandProfile.deleteMany();
  await prisma.accountSession.deleteMany();
  await prisma.account.deleteMany();
  await prisma.mobileChallenge.deleteMany();
}
