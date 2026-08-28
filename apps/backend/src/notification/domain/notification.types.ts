import { z } from "zod";

export type NotificationKind =
  "EVALUATION_COMPLETED" | "EVALUATION_RETRY_REQUIRED";

export const notificationTargetSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("EVALUATION_REPORT"),
      brandId: z.string().uuid(),
      runId: z.string().uuid(),
      reportId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("EVALUATION_RETRY"),
      brandId: z.string().uuid(),
      runId: z.string().uuid(),
    })
    .strict(),
]);

export type NotificationTarget = z.infer<typeof notificationTargetSchema>;

export type NotificationView = {
  id: string;
  kind: NotificationKind;
  title: string;
  summary: string;
  target: NotificationTarget;
  occurredAt: Date;
  readAt: Date | null;
};

export type StoredNotificationView = NotificationView & {
  createdAt: Date;
};

export type NotificationCursor = { createdAt: Date; id: string };

export type NotificationPage = {
  items: NotificationView[];
  unreadCount: number;
  nextCursor: string | null;
};

export type NotificationRevision = {
  latestNotificationId: string | null;
  unreadCount: number;
};
