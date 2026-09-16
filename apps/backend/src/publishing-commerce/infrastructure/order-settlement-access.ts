import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
@Injectable()
export class OrderSettlementAccess {
  read(tx: Prisma.TransactionClient, orderId: string) {
    return tx.orderSettlement.findUnique({ where: { orderId } });
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
