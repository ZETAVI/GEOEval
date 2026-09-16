import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
/** Delivery-owned read projection; Support may join these two public facts, never duplicate the assignee. */
@Injectable()
export class DeliverySupportAccess {
  projection() {
    return Prisma.sql`SELECT order_id, assignee_account_id FROM publication_deliveries`;
  }
  settlementCandidates() {
    return Prisma.sql`SELECT order_id, LEAST(completed_at,closed_at AT TIME ZONE 'UTC') AS ended_at FROM publication_deliveries WHERE status IN ('COMPLETED','CLOSED')`;
  }
  markSettled(
    tx: Prisma.TransactionClient,
    orderId: string,
    ledgerId: string | null,
  ) {
    return tx.publicationDelivery.update({
      where: { orderId },
      data: { settledLedgerId: ledgerId, revision: { increment: 1 } },
    });
  }
  async lock(tx: Prisma.TransactionClient, orderId: string) {
    await tx.$queryRaw`SELECT order_id FROM publication_deliveries WHERE order_id=${orderId}::uuid FOR NO KEY UPDATE`;
    const delivery = await tx.publicationDelivery.findUnique({
      where: { orderId },
    });
    if (!delivery) throw new NotFoundException("未找到可访问的发布订单");
    const [clock] = await tx.$queryRaw<
      Array<{ now: Date }>
    >`SELECT clock_timestamp() AS now`;
    return { delivery, now: clock!.now };
  }
}
