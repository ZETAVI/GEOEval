import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
@Injectable()
export class OrderSettlementAccess {
  read(tx: Prisma.TransactionClient, orderId: string) {
    return tx.orderSettlement.findUnique({ where: { orderId } });
  }
  async context(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.publishingOrder.findUniqueOrThrow({
      where: { id: orderId },
      select: { accountId: true },
    });
    const consumption = await tx.pointChange.findUnique({
      where: { publishingOrderId: orderId },
      select: { id: true },
    });
    const returned = await tx.pointChange.findUnique({
      where: { returnedOrderId: orderId },
      select: { id: true, grantedDelta: true, fundedDelta: true },
    });
    return {
      accountId: order.accountId,
      consumptionLedgerId: consumption?.id ?? null,
      returnLedgerId: returned?.id ?? null,
      returnedPoints: returned
        ? returned.grantedDelta + returned.fundedDelta
        : null,
    };
  }
  async record(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      points: number;
      agreementRevision: number;
      ledgerId: string | null;
    },
  ) {
    const [clock] = await tx.$queryRaw<
      Array<{ now: Date }>
    >`SELECT clock_timestamp() AS now`;
    return tx.orderSettlement.create({
      data: { ...input, settledAt: clock!.now },
    });
  }
}
