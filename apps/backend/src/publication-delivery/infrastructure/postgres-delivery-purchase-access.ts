import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import type { DeliveryStatus } from "../domain/delivery-assignment.js";

/** Purchase uses this owner-bound adapter, never Delivery's private tables. */
@Injectable()
export class PostgresDeliveryPurchaseAccess {
  bind(tx: Prisma.TransactionClient) {
    return {
      admit: async (orderId: string) => {
        await tx.publicationDelivery.create({ data: { orderId } });
      },
      statuses: async (
        orderIds: string[],
      ): Promise<Map<string, DeliveryStatus>> => {
        const rows = await tx.publicationDelivery.findMany({
          where: { orderId: { in: orderIds } },
          select: { orderId: true, status: true },
        });
        if (rows.length !== new Set(orderIds).size)
          throw new Error("Publishing order is missing its Delivery aggregate");
        return new Map(rows.map((row) => [row.orderId, row.status]));
      },
    };
  }
}
