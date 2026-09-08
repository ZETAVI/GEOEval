import { Inject, Injectable } from "@nestjs/common";
import {
  Prisma,
  type RechargePaymentObservation,
} from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { paymentFactsSha256 } from "../application/payment-facts.js";
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
      where: { provider_merchantId_notificationId: identity },
      include: { canonical: true },
    });
    return receipt ? receiptView(receipt) : null;
  }

  async listPending(limit: number): Promise<NotificationReceipt[]> {
    return this.scan(false, limit);
  }

  async listConflicts(limit: number): Promise<NotificationReceipt[]> {
    return this.scan(true, limit);
  }

  private async scan(
    hasConflict: boolean,
    limit: number,
  ): Promise<NotificationReceipt[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error("RECHARGE_RECEIPT_SCAN_LIMIT");
    const rows = await this.prisma.rechargeNotificationReceipt.findMany({
      where: { hasConflict, ...(!hasConflict ? { processedAt: null } : {}) },
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

function observationData(
  n: AuthenticatedPaymentNotification,
): Prisma.RechargePaymentObservationCreateManyInput {
  const f = { ...n.facts },
    p = { ...n.proof };
  if (
    n.factsVersion !== 1 ||
    paymentFactsSha256(f) !== n.factsSha256 ||
    f.tradeType !== "NATIVE" ||
    f.payerCurrency !== "CNY" ||
    f.payerTotalFen === null ||
    !Number.isSafeInteger(f.orderTotalFen) ||
    !Number.isSafeInteger(f.payerTotalFen) ||
    !Number.isSafeInteger(p.signedAtSeconds) ||
    ![f.successAt, n.createdAt, p.receivedAt].every((value) => {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) && date.toISOString() === value;
    })
  )
    throw new Error("RECHARGE_NOTIFICATION_INVARIANT");
  return {
    provider: f.provider,
    merchantId: f.merchantId,
    notificationId: n.notificationId,
    factsSha256: n.factsSha256,
    factsVersion: n.factsVersion,
    appId: f.appId,
    merchantOrderNo: f.merchantOrderNo,
    transactionId: f.transactionId,
    tradeType: f.tradeType,
    orderTotalFen: BigInt(f.orderTotalFen),
    currency: f.currency,
    payerTotalFen: BigInt(f.payerTotalFen),
    payerCurrency: f.payerCurrency,
    successAt: new Date(f.successAt),
    notificationCreatedAt: new Date(n.createdAt),
    verificationKeyId: p.verificationKeyId,
    signedAtSeconds: BigInt(p.signedAtSeconds),
    receivedAt: new Date(p.receivedAt),
    bodySha256: p.bodySha256,
  };
}

function receiptView(row: {
  provider: string;
  merchantId: string;
  notificationId: string;
  hasConflict: boolean;
  processedAt: Date | null;
  canonical: RechargePaymentObservation;
}): NotificationReceipt {
  const c = row.canonical;
  return {
    provider: "WECHAT",
    merchantId: row.merchantId,
    notificationId: row.notificationId,
    hasConflict: row.hasConflict,
    processedAt: row.processedAt?.toISOString() ?? null,
    canonical: {
      notificationId: c.notificationId,
      createdAt: c.notificationCreatedAt.toISOString(),
      factsVersion: 1,
      factsSha256: c.factsSha256,
      facts: {
        provider: "WECHAT",
        merchantId: c.merchantId,
        appId: c.appId,
        merchantOrderNo: c.merchantOrderNo,
        transactionId: c.transactionId,
        tradeType: "NATIVE",
        orderTotalFen: Number(c.orderTotalFen),
        currency: "CNY",
        payerTotalFen: Number(c.payerTotalFen),
        payerCurrency: "CNY",
        successAt: c.successAt.toISOString(),
      },
      proof: {
        verificationKeyId: c.verificationKeyId,
        signedAtSeconds: Number(c.signedAtSeconds),
        receivedAt: c.receivedAt.toISOString(),
        bodySha256: c.bodySha256,
      },
    },
  };
}
