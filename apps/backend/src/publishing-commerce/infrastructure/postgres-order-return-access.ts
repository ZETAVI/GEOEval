import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PointChange } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { lockPointAccount } from "./point-account-lock.js";
import { computeOrderPointReturn } from "../domain/order-point-return.js";

export type OrderReturnRequest = {
  idempotencyKey: string;
  expectedAgreementRevision: number;
};
const receipt = (row: PointChange) => ({
  orderId: row.returnedOrderId!,
  ledgerId: row.id,
  agreementRevision: row.returnAgreementRevision!,
  points: row.grantedDelta + row.fundedDelta,
});

/** Commerce's original-order-only transaction port, not a generic wallet delta API. */
@Injectable()
export class PostgresOrderReturnAccess {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  finalized(orderId: string) {
    return this.prisma.orderSettlement.findUnique({ where: { orderId } });
  }

  async returned(orderId: string) {
    const row = await this.prisma.pointChange.findUnique({
      where: { returnedOrderId: orderId },
    });
    return row ? receipt(row) : null;
  }

  async bind(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.publishingOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("未找到原购买订单");
    const wallet = await lockPointAccount(tx, order.accountId);
    const original = await tx.pointChange.findUnique({
      where: { publishingOrderId: orderId },
    });
    if (
      !original ||
      original.kind !== "PUBLISHING_ORDER" ||
      original.accountId !== order.accountId
    )
      throw new ConflictException("原消费记录不完整，请保留订单后核查");
    return {
      async credit(request: OrderReturnRequest, points: number) {
        const next = computeOrderPointReturn(
          { granted: -original.grantedDelta, funded: -original.fundedDelta },
          points,
          wallet,
        );
        await tx.pointAccount.update({
          where: { accountId: order.accountId },
          data: next.balance,
        });
        const row = await tx.pointChange.create({
          data: {
            accountId: order.accountId,
            sequence: next.balance.revision,
            kind: "ORDER_RETURN",
            actorKind: "SYSTEM",
            actorAccountId: null,
            idempotencyKey: null,
            returnedOrderId: orderId,
            originalConsumptionId: original.id,
            returnRequest: request,
            returnAgreementRevision: request.expectedAgreementRevision,
            grantedDelta: next.grantedDelta,
            fundedDelta: next.fundedDelta,
            balanceAfter:
              next.balance.grantedBalance + next.balance.fundedBalance,
            reason: "发布订单协商退点",
            businessReference: orderId,
          },
        });
        return receipt(row);
      },
    };
  }
}
