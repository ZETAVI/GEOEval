import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
@Injectable()
export class SupportSettlementAccess {
  async hasOpen(tx: Prisma.TransactionClient, publishingOrderId: string) {
    return Boolean(
      await tx.supportTicket.findFirst({
        where: { publishingOrderId, status: "PROCESSING" },
        select: { id: true },
      }),
    );
  }
}
