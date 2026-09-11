import type { PrismaService } from "../../infrastructure/prisma.service.js";
import type { RechargeNotificationDeliveries } from "../application/recharge-notification-delivery.js";

export class PostgresRechargeNotificationDeliveries implements RechargeNotificationDeliveries {
  constructor(private readonly prisma: PrismaService) {}
  async due(limit: number) {
    const rows = await this.prisma.rechargeNotificationDelivery.findMany({
      where: { deliveredAt: null, nextAttemptAt: { lte: new Date() } },
      orderBy: [{ nextAttemptAt: "asc" }, { orderId: "asc" }],
      take: limit,
      select: {
        orderId: true,
        createdAt: true,
        order: { select: { accountId: true, fundedPoints: true } },
      },
    });
    return rows.map((row) => ({
      orderId: row.orderId,
      recipientAccountId: row.order.accountId,
      points: row.order.fundedPoints,
      occurredAt: row.createdAt,
    }));
  }
  async delivered(orderId: string) {
    await this.prisma.rechargeNotificationDelivery.updateMany({
      where: { orderId, deliveredAt: null, nextAttemptAt: { not: null } },
      data: { deliveredAt: new Date(), nextAttemptAt: null, lastError: null },
    });
  }
  async failed(
    orderId: string,
    kind: "TEMPORARY" | "SOURCE_CONFLICT",
    retryDelayMs: number,
  ) {
    await this.prisma.rechargeNotificationDelivery.updateMany({
      where: { orderId, deliveredAt: null, nextAttemptAt: { not: null } },
      data: {
        failureCount: { increment: 1 },
        lastError: kind,
        nextAttemptAt:
          kind === "SOURCE_CONFLICT"
            ? null
            : new Date(Date.now() + retryDelayMs),
      },
    });
  }
}
