import type { AuthenticatedPaymentNotification } from "./payment-gateway.js";

export const NOTIFICATION_INBOX = Symbol("RECHARGE_NOTIFICATION_INBOX");
export const PAYMENT_NOTIFICATION_VERIFIER = Symbol(
  "PAYMENT_NOTIFICATION_VERIFIER",
);

export type NotificationIdentity = Readonly<{
  provider: "WECHAT";
  merchantId: string;
  notificationId: string;
}>;

export type NotificationReceipt = NotificationIdentity & {
  canonical: AuthenticatedPaymentNotification;
  hasConflict: boolean;
  processedAt: string | null;
  reviewReason: string | null;
  appliedRechargeOrderId: string | null;
};

export type NotificationAcceptance =
  "RECORDED" | "DUPLICATE" | "CONFLICT_RECORDED";

/** Durable acceptance, not local order validation or permission to credit. */
export interface NotificationInbox {
  accept(
    notification: AuthenticatedPaymentNotification,
  ): Promise<NotificationAcceptance>;
  getReceipt(
    identity: NotificationIdentity,
  ): Promise<NotificationReceipt | null>;
  /** Advisory scans only. Recheck under settlement locks before any future processing. */
  listPending(limit: number): Promise<NotificationReceipt[]>;
  listConflicts(limit: number): Promise<NotificationReceipt[]>;
  listReviewRequired(limit: number): Promise<NotificationReceipt[]>;
}
