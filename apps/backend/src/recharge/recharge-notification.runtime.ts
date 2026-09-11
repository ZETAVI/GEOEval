import type { PrismaService } from "../infrastructure/prisma.service.js";
import type { NotificationEventHandler } from "../notification/application/notification-event.handler.js";
import { NotificationSourceConflict } from "../notification/domain/notification.types.js";
import { RechargeNotificationDeliveryService } from "./application/recharge-notification-delivery.js";
import { PostgresRechargeNotificationDeliveries } from "./infrastructure/postgres-recharge-notification-deliveries.js";

/** Composition seam: Recharge owns retries; Notification owns message identity and read state. */
export function createRechargeNotificationRuntime(
  prisma: PrismaService,
  notifications: NotificationEventHandler,
  retryDelayMs: number,
) {
  return new RechargeNotificationDeliveryService(
    new PostgresRechargeNotificationDeliveries(prisma),
    {
      async publish(notice) {
        try {
          await notifications.publishRecharge(notice);
          return "DELIVERED";
        } catch (error) {
          if (error instanceof NotificationSourceConflict)
            return "SOURCE_CONFLICT";
          throw error;
        }
      },
    },
    retryDelayMs,
  );
}
