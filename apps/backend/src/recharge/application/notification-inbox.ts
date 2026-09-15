import type { AuthenticatedPaymentNotification } from "./payment-gateway.js";
import type {
  ProviderNotification,
  RechargeProvider,
} from "./provider-payment.js";

export const NOTIFICATION_INBOX = Symbol("RECHARGE_NOTIFICATION_INBOX");
export const PAYMENT_NOTIFICATION_VERIFIER = Symbol(
  "PAYMENT_NOTIFICATION_VERIFIERS",
);

export type NotificationIdentity = Readonly<{
  provider: RechargeProvider;
  merchantId: string;
  notificationId: string;
}>;

export type NotificationReceipt = NotificationIdentity & {
  canonical: AuthenticatedPaymentNotification | ProviderNotification;
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
    notification: AuthenticatedPaymentNotification | ProviderNotification,
  ): Promise<NotificationAcceptance>;
  getReceipt(
    identity: NotificationIdentity,
  ): Promise<NotificationReceipt | null>;
  /** Advisory scans only. Recheck under settlement locks before any future processing. */
  listPending(limit: number): Promise<NotificationReceipt[]>;
  listConflicts(limit: number): Promise<NotificationReceipt[]>;
  listReviewRequired(limit: number): Promise<NotificationReceipt[]>;
}
