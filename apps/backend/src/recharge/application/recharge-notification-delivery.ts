/** A private post-settlement obligation. This port can never mutate money. */
export type RechargeNotice = {
  orderId: string;
  recipientAccountId: string;
  points: number;
  occurredAt: Date;
};
export interface RechargeNotificationDeliveries {
  due(limit: number): Promise<RechargeNotice[]>;
  delivered(orderId: string): Promise<void>;
  failed(
    orderId: string,
    kind: "TEMPORARY" | "SOURCE_CONFLICT",
    retryDelayMs: number,
  ): Promise<void>;
}
export interface RechargeNoticePublisher {
  publish(notice: RechargeNotice): Promise<"DELIVERED" | "SOURCE_CONFLICT">;
}

export class RechargeNotificationDeliveryService {
  constructor(
    private readonly repository: RechargeNotificationDeliveries,
    private readonly publisher: RechargeNoticePublisher,
    private readonly retryDelayMs: number,
  ) {
    if (
      !Number.isInteger(retryDelayMs) ||
      retryDelayMs < 100 ||
      retryDelayMs > 300_000
    )
      throw new Error("INVALID_NOTIFICATION_RETRY_DELAY");
  }
  async run(limit: number, stop?: AbortSignal) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error("INVALID_NOTIFICATION_BATCH");
    const result = { delivered: 0, reviewed: 0, failed: 0 };
    if (stop?.aborted) return result;
    for (const notice of await this.repository.due(limit)) {
      if (stop?.aborted) break;
      try {
        const outcome = await this.publisher.publish(notice);
        if (outcome === "SOURCE_CONFLICT") {
          await this.repository.failed(
            notice.orderId,
            outcome,
            this.retryDelayMs,
          );
          result.reviewed++;
        } else {
          await this.repository.delivered(notice.orderId);
          result.delivered++;
        }
      } catch {
        result.failed++;
        // A lost ACK retries the same immutable source; materialization preserves readAt.
        try {
          await this.repository.failed(
            notice.orderId,
            "TEMPORARY",
            this.retryDelayMs,
          );
        } catch {
          /* Database outage: retain the original durable due obligation. */
        }
      }
    }
    return result;
  }
}
