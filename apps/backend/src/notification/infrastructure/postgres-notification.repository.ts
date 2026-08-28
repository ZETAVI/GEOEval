import { Inject, Injectable } from "@nestjs/common";

import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import type { NotificationRepository } from "../domain/notification.repository.js";
import {
  notificationTargetSchema,
  type StoredNotificationView,
  type NotificationView,
} from "../domain/notification.types.js";

@Injectable()
export class PostgresNotificationRepository implements NotificationRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async materialize(
    input: Parameters<NotificationRepository["materialize"]>[0],
  ): Promise<void> {
    await this.prisma.notification.upsert({
      where: { sourceEventId: input.sourceEventId },
      create: {
        recipientAccountId: input.recipientAccountId,
        sourceEventId: input.sourceEventId,
        kind: input.kind,
        title: input.title,
        summary: input.summary,
        target: notificationTargetSchema.parse(
          input.target,
        ) as Prisma.InputJsonValue,
        occurredAt: input.occurredAt,
      },
      update: {},
    });
  }

  async list(
    input: Parameters<NotificationRepository["list"]>[0],
  ): ReturnType<NotificationRepository["list"]> {
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          recipientAccountId: input.recipientAccountId,
          ...(input.cursor
            ? {
                OR: [
                  { createdAt: { lt: input.cursor.createdAt } },
                  {
                    createdAt: input.cursor.createdAt,
                    id: { lt: input.cursor.id },
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit + 1,
      }),
      this.prisma.notification.count({
        where: { recipientAccountId: input.recipientAccountId, readAt: null },
      }),
    ]);
    return {
      items: rows.slice(0, input.limit).map(mapStoredNotification),
      hasMore: rows.length > input.limit,
      unreadCount,
    };
  }

  async markRead(
    recipientAccountId: string,
    notificationId: string,
  ): Promise<NotificationView | undefined> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, recipientAccountId, readAt: null },
      data: { readAt: new Date() },
    });
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientAccountId },
    });
    return notification ? mapNotification(notification) : undefined;
  }

  async markAllRead(recipientAccountId: string): Promise<number> {
    await this.prisma.notification.updateMany({
      where: { recipientAccountId, readAt: null },
      data: { readAt: new Date() },
    });
    return this.prisma.notification.count({
      where: { recipientAccountId, readAt: null },
    });
  }

  async revision(recipientAccountId: string) {
    const [latest, unreadCount] = await Promise.all([
      this.prisma.notification.findFirst({
        where: { recipientAccountId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true },
      }),
      this.prisma.notification.count({
        where: { recipientAccountId, readAt: null },
      }),
    ]);
    return {
      latestNotificationId: latest?.id ?? null,
      unreadCount,
    };
  }
}

function mapStoredNotification(
  notification: Parameters<typeof mapNotification>[0],
): StoredNotificationView {
  return {
    ...mapNotification(notification),
    createdAt: notification.createdAt,
  };
}

function mapNotification(notification: {
  id: string;
  kind: "EVALUATION_COMPLETED" | "EVALUATION_RETRY_REQUIRED";
  title: string;
  summary: string;
  target: Prisma.JsonValue;
  occurredAt: Date;
  readAt: Date | null;
  createdAt: Date;
}): NotificationView {
  return {
    id: notification.id,
    kind: notification.kind,
    title: notification.title,
    summary: notification.summary,
    target: notificationTargetSchema.parse(notification.target),
    occurredAt: notification.occurredAt,
    readAt: notification.readAt,
  };
}
