import type { PrismaService } from "../src/infrastructure/prisma.service.js";

export async function clearCustomerData(prisma: PrismaService): Promise<void> {
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
