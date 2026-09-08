import { Inject, Injectable } from "@nestjs/common";
import {
  NOTIFICATION_INBOX,
  PAYMENT_NOTIFICATION_VERIFIER,
  type NotificationInbox,
} from "./notification-inbox.js";
import type { PaymentNotificationVerifier } from "./payment-gateway.js";

export type ReceiveNotificationResult =
  "ACCEPTED" | "UNAUTHENTICATED" | "INVALID" | "RETRY";

@Injectable()
export class ReceivePaymentNotificationService {
  constructor(
    @Inject(PAYMENT_NOTIFICATION_VERIFIER)
    private readonly verifier: PaymentNotificationVerifier,
    @Inject(NOTIFICATION_INBOX) private readonly inbox: NotificationInbox,
  ) {}

  async receive(
    input: Parameters<PaymentNotificationVerifier["verifyNotification"]>[0],
  ): Promise<ReceiveNotificationResult> {
    const startedAt = performance.now();
    let verified;
    try {
      verified = this.verifier.verifyNotification(input);
    } catch {
      return "RETRY";
    }
    if (!verified.ok)
      return verified.error.code.startsWith("AUTH_")
        ? "UNAUTHENTICATED"
        : "INVALID";
    const remainingMs = 3500 - (performance.now() - startedAt);
    if (remainingMs <= 0) return "RETRY";
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Expiry bounds the response, not the database commit. Late commits are deduplicated.
      return await Promise.race([
        this.inbox.accept(verified.value).then(() => "ACCEPTED" as const),
        new Promise<"RETRY">((resolve) => {
          timer = setTimeout(() => resolve("RETRY"), remainingMs);
        }),
      ]);
    } catch {
      return "RETRY";
    } finally {
      clearTimeout(timer);
    }
  }
}
