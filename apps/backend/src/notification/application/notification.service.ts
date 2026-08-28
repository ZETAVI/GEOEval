import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from "../domain/notification.repository.js";
import type {
  NotificationCursor,
  NotificationPage,
  NotificationRevision,
  NotificationView,
} from "../domain/notification.types.js";

const cursorSchema = z
  .object({
    createdAt: z.string().datetime(),
    id: z.string().uuid(),
  })
  .strict();

@Injectable()
export class NotificationService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepository,
  ) {}

  async list(
    accountId: string,
    rawLimit?: string,
    rawCursor?: string,
  ): Promise<NotificationPage> {
    const limit = parseLimit(rawLimit);
    const result = await this.repository.list({
      recipientAccountId: accountId,
      limit,
      ...(rawCursor ? { cursor: decodeCursor(rawCursor) } : {}),
    });
    const last = result.items.at(-1);
    return {
      items: result.items.map(({ createdAt: _createdAt, ...item }) => item),
      unreadCount: result.unreadCount,
      nextCursor:
        result.hasMore && last
          ? encodeCursor({ createdAt: last.createdAt, id: last.id })
          : null,
    };
  }

  async markRead(
    accountId: string,
    notificationId: string,
  ): Promise<NotificationView> {
    const notification = await this.repository.markRead(
      accountId,
      notificationId,
    );
    if (!notification) throw new NotFoundException("未找到该通知");
    return notification;
  }

  async markAllRead(accountId: string): Promise<{ unreadCount: number }> {
    return { unreadCount: await this.repository.markAllRead(accountId) };
  }

  revision(accountId: string): Promise<NotificationRevision> {
    return this.repository.revision(accountId);
  }
}

function parseLimit(raw?: string): number {
  if (raw === undefined) return 10;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new BadRequestException("通知数量需要在 1 到 20 之间");
  }
  return value;
}

function encodeCursor(cursor: NotificationCursor): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    }),
    "utf8",
  ).toString("base64url");
}

function decodeCursor(raw: string): NotificationCursor {
  try {
    const parsed = cursorSchema.parse(
      JSON.parse(Buffer.from(raw, "base64url").toString("utf8")),
    );
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch {
    throw new BadRequestException("通知翻页位置无效，请重新加载");
  }
}
