import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
/** Immutable original ownership and customer-facing label only, no wallet or purchase mutation. */
@Injectable()
export class OrderSupportReader {
  async read(tx: Prisma.TransactionClient, id: string) {
    const order = await tx.publishingOrder.findUnique({
      where: { id },
      select: { id: true, accountId: true, title: true, number: true },
    });
    if (!order) throw new NotFoundException("未找到可访问的发布订单");
    return order;
  }
}
