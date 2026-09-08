import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { lockPointAccount } from "./point-account-lock.js";
import {
  adjustGranted,
  checkPointCapacity,
  PointAccountError,
  type PointAccountRepository,
  type PointAdjustment,
  type PointBalance,
} from "../domain/point-account.js";

@Injectable()
export class PostgresPointAccountRepository implements PointAccountRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async balance(accountId: string): Promise<PointBalance> {
    return (
      (await this.prisma.pointAccount.findUnique({
        where: { accountId },
        select: { grantedBalance: true, fundedBalance: true, revision: true },
      })) ?? { grantedBalance: 0, fundedBalance: 0, revision: 0 }
    );
  }

  changes(accountId: string, limit: number, beforeSequence?: number) {
    return this.prisma.pointChange.findMany({
      where: {
        accountId,
        ...(beforeSequence ? { sequence: { lt: beforeSequence } } : {}),
      },
      orderBy: { sequence: "desc" },
      take: limit,
    });
  }

  adjust(
    accountId: string,
    actorAccountId: string,
    input: PointAdjustment,
    targetActive: boolean,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await lockPointAccount(tx, accountId);
      const prior = await tx.pointChange.findUnique({
        where: {
          accountId_idempotencyKey: {
            accountId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (prior) {
        if (
          prior.actorAccountId !== actorAccountId ||
          prior.kind !== "ADMIN_ADJUSTMENT" ||
          prior.grantedDelta !== input.amount ||
          prior.fundedDelta !== 0 ||
          prior.reason !== input.reason ||
          prior.internalNote !== input.internalNote ||
          prior.businessReference !== input.businessReference
        )
          throw new PointAccountError(
            "IDEMPOTENCY_CONFLICT",
            "该请求标识已用于另一笔调整，请核对原操作",
          );
        return prior;
      }
      if (!targetActive)
        throw new PointAccountError(
          "TARGET_INACTIVE",
          "账号已停用，不能新增积分调整",
        );
      const next = adjustGranted(wallet, input.amount);
      checkPointCapacity(next, wallet);
      await tx.pointAccount.update({ where: { accountId }, data: next });
      return tx.pointChange.create({
        data: {
          accountId,
          actorAccountId,
          sequence: next.revision,
          kind: "ADMIN_ADJUSTMENT",
          grantedDelta: input.amount,
          fundedDelta: 0,
          balanceAfter: next.grantedBalance + next.fundedBalance,
          idempotencyKey: input.idempotencyKey,
          reason: input.reason,
          internalNote: input.internalNote,
          businessReference: input.businessReference,
        },
      });
    });
  }
}
