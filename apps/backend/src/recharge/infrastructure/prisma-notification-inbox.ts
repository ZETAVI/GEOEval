import { Inject, Injectable } from "@nestjs/common";
import {
  Prisma,
  type RechargePaymentObservation,
} from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  canonicalDate,
  paymentObservationData,
  storedNotification,
} from "./stored-payment-observation.js";
import type { AuthenticatedPaymentNotification } from "../application/payment-gateway.js";
import type {
  NotificationAcceptance,
  NotificationIdentity,
  NotificationInbox,
  NotificationReceipt,
} from "../application/notification-inbox.js";

@Injectable()
export class PrismaNotificationInbox implements NotificationInbox {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async accept(
    notification: AuthenticatedPaymentNotification,
  ): Promise<NotificationAcceptance> {
    // Snapshot before the first await, and reject inconsistent internal callers.
    const data = observationData(notification);
    const identity = {
      provider: data.provider,
      merchantId: data.merchantId,
      notificationId: data.notificationId,
    };
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '1000ms'`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '1500ms'`;
        await tx.rechargePaymentObservation.createMany({
          data: [data],
          skipDuplicates: true,
        });
        const inserted = await tx.rechargeNotificationReceipt.createMany({
          data: [{ ...identity, canonicalFactsSha256: data.factsSha256 }],
          skipDuplicates: true,
        });
        // A new READ COMMITTED statement sees a concurrent ON CONFLICT winner.
        const receipt = await tx.rechargeNotificationReceipt.findUniqueOrThrow({
          where: { provider_merchantId_notificationId: identity },
        });
        if (receipt.canonicalFactsSha256 !== data.factsSha256) {
          await tx.rechargeNotificationReceipt.update({
            where: { provider_merchantId_notificationId: identity },
            data: { hasConflict: true },
          });
          return "CONFLICT_RECORDED";
        }
        return inserted.count === 1 ? "RECORDED" : "DUPLICATE";
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 1000,
        timeout: 2000,
      },
    );
  }

  async getReceipt(
    identity: NotificationIdentity,
  ): Promise<NotificationReceipt | null> {
    const receipt = await this.prisma.rechargeNotificationReceipt.findUnique({
      where: {
        provider_merchantId_notificationId: {
          provider: identity.provider,
          merchantId: identity.merchantId,
          notificationId: identity.notificationId,
        },
      },
      include: { canonical: true },
    });
    return receipt ? receiptView(receipt) : null;
  }

  async listPending(limit: number): Promise<NotificationReceipt[]> {
    return this.scan(
      { hasConflict: false, processedAt: null, reviewReason: null },
      limit,
    );
  }

  async listConflicts(limit: number): Promise<NotificationReceipt[]> {
    return this.scan({ hasConflict: true }, limit);
  }

  async listReviewRequired(limit: number): Promise<NotificationReceipt[]> {
    return this.scan(
      { OR: [{ hasConflict: true }, { reviewReason: { not: null } }] },
      limit,
    );
  }

  private async scan(
    where: Prisma.RechargeNotificationReceiptWhereInput,
    limit: number,
  ): Promise<NotificationReceipt[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error("RECHARGE_RECEIPT_SCAN_LIMIT");
    const rows = await this.prisma.rechargeNotificationReceipt.findMany({
      where,
      orderBy: [
        { createdAt: "asc" },
        { provider: "asc" },
        { merchantId: "asc" },
        { notificationId: "asc" },
      ],
      take: limit,
      include: { canonical: true },
    });
    return rows.map(receiptView);
  }
}

function observationData(n: AuthenticatedPaymentNotification) {
  try {
    const data = paymentObservationData(n.facts, n.proof);
    if (
      n.factsVersion !== 1 ||
      data.factsSha256 !== n.factsSha256 ||
      n.facts.tradeType !== "NATIVE" ||
      n.facts.payerCurrency !== "CNY" ||
      n.facts.payerTotalFen === null
    )
      throw new Error("invalid");
    return {
      ...data,
      sourceKind: "NOTIFICATION",
      notificationId: n.notificationId,
      notificationCreatedAt: canonicalDate(n.createdAt),
    };
  } catch {
    throw new Error("RECHARGE_NOTIFICATION_INVARIANT");
  }
}

function receiptView(row: {
  provider: string;
  merchantId: string;
  notificationId: string;
  hasConflict: boolean;
  processedAt: Date | null;
  reviewReason: string | null;
  appliedRechargeOrderId: string | null;
  canonical: RechargePaymentObservation;
}): NotificationReceipt {
  return {
    provider: "WECHAT",
    merchantId: row.merchantId,
    notificationId: row.notificationId,
    hasConflict: row.hasConflict,
    processedAt: row.processedAt?.toISOString() ?? null,
    reviewReason: row.reviewReason,
    appliedRechargeOrderId: row.appliedRechargeOrderId,
    canonical: storedNotification(row.canonical),
  };
}
