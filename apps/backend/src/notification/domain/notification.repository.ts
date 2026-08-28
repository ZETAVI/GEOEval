import type {
  NotificationCursor,
  NotificationKind,
  NotificationRevision,
  StoredNotificationView,
  NotificationTarget,
  NotificationView,
} from "./notification.types.js";

export const NOTIFICATION_REPOSITORY = Symbol("NOTIFICATION_REPOSITORY");

export interface NotificationRepository {
  materialize(input: {
    recipientAccountId: string;
    sourceEventId: string;
    kind: NotificationKind;
    title: string;
    summary: string;
    target: NotificationTarget;
    occurredAt: Date;
  }): Promise<void>;
  list(input: {
    recipientAccountId: string;
    limit: number;
    cursor?: NotificationCursor;
  }): Promise<{
    items: StoredNotificationView[];
    hasMore: boolean;
    unreadCount: number;
  }>;
  markRead(
    recipientAccountId: string,
    notificationId: string,
  ): Promise<NotificationView | undefined>;
  markAllRead(recipientAccountId: string): Promise<number>;
  revision(recipientAccountId: string): Promise<NotificationRevision>;
}
