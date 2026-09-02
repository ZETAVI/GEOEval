import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/prisma.service.js";
import type { IdentityRepository } from "../domain/identity.repository.js";
import type {
  AccountView,
  AuthenticatedSession,
  MobileChallengeView,
} from "../domain/identity.types.js";

@Injectable()
export class PostgresIdentityRepository implements IdentityRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createChallenge(input: {
    id: string;
    mobile: string;
    codeDigest: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.mobileChallenge.create({ data: input });
  }

  async findChallenge(id: string): Promise<MobileChallengeView | undefined> {
    return (
      (await this.prisma.mobileChallenge.findUnique({ where: { id } })) ??
      undefined
    );
  }

  async incrementFailedAttempts(id: string): Promise<void> {
    await this.prisma.mobileChallenge.updateMany({
      where: { id, consumedAt: null },
      data: { failedAttempts: { increment: 1 } },
    });
  }

  async completeChallenge(input: {
    challengeId: string;
    mobile: string;
    sessionDigest: string;
    sessionExpiresAt: Date;
    now: Date;
  }): Promise<AccountView | undefined> {
    return this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.mobileChallenge.updateMany({
        where: {
          id: input.challengeId,
          mobile: input.mobile,
          consumedAt: null,
          expiresAt: { gt: input.now },
          failedAttempts: { lt: 5 },
        },
        data: { consumedAt: input.now },
      });
      if (consumed.count !== 1) return undefined;

      const account = await transaction.account.upsert({
        where: { mobile: input.mobile },
        create: { mobile: input.mobile },
        update: {},
        select: { id: true, mobile: true, role: true },
      });
      await transaction.accountSession.create({
        data: {
          accountId: account.id,
          tokenDigest: input.sessionDigest,
          expiresAt: input.sessionExpiresAt,
        },
      });
      return account;
    });
  }

  async findSession(
    tokenDigest: string,
    now: Date,
  ): Promise<AuthenticatedSession | undefined> {
    const session = await this.prisma.accountSession.findFirst({
      where: { tokenDigest, revokedAt: null, expiresAt: { gt: now } },
      include: { account: { select: { id: true, mobile: true, role: true } } },
    });
    return session ?? undefined;
  }

  async revokeSession(tokenDigest: string, now: Date): Promise<void> {
    await this.prisma.accountSession.updateMany({
      where: { tokenDigest, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
