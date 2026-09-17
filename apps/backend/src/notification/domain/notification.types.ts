import { z } from "zod";

export type NotificationKind =
  | "EVALUATION_COMPLETED"
  | "EVALUATION_RETRY_REQUIRED"
  | "RECHARGE_SUCCESSFUL"
  | "RECHARGE_INVOICE_NEEDS_CORRECTION"
  | "RECHARGE_INVOICE_ISSUED"
  | "AGENCY_WITHDRAWAL_COMPLETED"
  | "AGENCY_WITHDRAWAL_REJECTED"
  | "AGENCY_WITHDRAWAL_PAYMENT_FAILED";

export const notificationTargetSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("RECHARGE_INVOICE"),
      invoiceRequestId: z.string().uuid(),
      rechargeOrderId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("AGENCY_WITHDRAWAL"),
      withdrawalId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("RECHARGE_ORDER"),
      rechargeOrderId: z.string().uuid(),
    })
    .strict(),
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

export class NotificationSourceConflict extends Error {
  constructor() {
    super("NOTIFICATION_SOURCE_CONFLICT");
  }
}
