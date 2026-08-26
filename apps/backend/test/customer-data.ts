import type { PrismaService } from "../src/infrastructure/prisma.service.js";

export async function clearCustomerData(prisma: PrismaService): Promise<void> {
  await prisma.productOutboxEvent.deleteMany();
  await prisma.evaluationSample.deleteMany();
  await prisma.evaluationRun.deleteMany();
  await prisma.evaluationQuestion.deleteMany();
  await prisma.evaluationDefinition.deleteMany();
  await prisma.brandContext.deleteMany();
  await prisma.brandProfile.deleteMany();
  await prisma.accountSession.deleteMany();
  await prisma.account.deleteMany();
  await prisma.mobileChallenge.deleteMany();
}
