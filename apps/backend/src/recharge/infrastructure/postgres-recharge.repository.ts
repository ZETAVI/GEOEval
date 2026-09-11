import { randomUUID } from "node:crypto";
import {
  Prisma,
  type RechargeOrder as StoredOrder,
  type RechargePaymentObservation,
  type RechargeNotificationReceipt,
} from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { bindRechargePoints } from "../../publishing-commerce/infrastructure/recharge-points-access.js";
import type { NotificationIdentity } from "../application/notification-inbox.js";
import type {
  PaymentFacts,
  PaymentProof,
} from "../application/payment-gateway.js";
import {
  POINTS_PER_YUAN,
  RechargeError,
  type CreateRecharge,
  type RechargeConfig,
  type RechargeOrder,
  type RechargeRepository,
  type RechargeReviewReason,
  type SettlementResult,
} from "../domain/recharge-order.js";
import {
  paymentObservationData,
  storedPaymentFacts,
  queryObservationKey,
} from "./stored-payment-observation.js";

import type { NativePreparation } from "../application/native-recovery.js";

type Source =
  | { kind: "NOTIFICATION"; identity: NotificationIdentity }
  | {
      kind: "QUERY";
      data: ReturnType<typeof paymentObservationData>;
      queryKey: string;
    };
const txOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 1000,
  timeout: 5000,
};

/** Owns Recharge only. Commerce binds the same transaction and owns every point mutation. */
export class PostgresRechargeRepository implements RechargeRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly native?: NativePreparation,
  ) {}

  create(accountId: string, input: CreateRecharge, config: RechargeConfig) {
    const request = {
        amountYuan: input.amountYuan,
        idempotencyKey: input.idempotencyKey,
        method: input.method,
      },
      policy = { ...config };
    return this.prisma.$transaction(async (tx) => {
      const points = await bindRechargePoints(tx, accountId);
      const prior = await tx.rechargeOrder.findUnique({
        where: {
          accountId_idempotencyKey: {
            accountId,
            idempotencyKey: request.idempotencyKey,
          },
        },
      });
      if (prior) {
        if (
          prior.amountYuan !== request.amountYuan ||
          prior.method !== request.method
        )
          throw new RechargeError("IDEMPOTENCY_CONFLICT");
        return orderView(prior);
      }
      if (this.native && !this.native.createEnabled)
        throw new RechargeError("CREATION_DISABLED");
      // Synchronize with Identity changes; customer deactivation cannot race a new order commit.
      const [account] = await tx.$queryRaw<
        Array<{ role: string; status: string }>
      >`SELECT role,status FROM accounts WHERE id=CAST(${accountId} AS UUID) FOR SHARE`;
      if (
        !account ||
        account.role !== "TERMINAL_CUSTOMER" ||
        account.status !== "ACTIVE"
      )
        throw new RechargeError("ACCOUNT_NOT_ACTIVE");
      if (
        request.amountYuan < policy.minAmountYuan ||
        request.amountYuan > policy.maxAmountYuan
      )
        throw new RechargeError("AMOUNT_NOT_ALLOWED");
      if (
        (await tx.rechargeOrder.count({
          where: {
            accountId,
            status: { in: ["PENDING_PAYMENT", "CONFIRMING"] },
          },
        })) >= policy.maxActiveOrders
      )
        throw new RechargeError("ACTIVE_ORDER_LIMIT");
      const now = new Date(),
        id = randomUUID();
      const order = await tx.rechargeOrder.create({
        data: {
          id,
          accountId,
          ...(this.native
            ? {
                nativeDescription: this.native.description,
                nativeNotifyUrl: this.native.notifyUrl,
                nativeNextOperation: "INITIATE",
                nativeNextActionAt: now,
              }
            : {}),
          ...request,
          amountFen: BigInt(request.amountYuan) * 100n,
          fundedPoints: request.amountYuan * POINTS_PER_YUAN,
          provider: "WECHAT",
          merchantId: policy.merchantId,
          appId: policy.appId,
          merchantOrderNo: id.replaceAll("-", ""),
          currency: "CNY",
          createdAt: now,
          expiresAt: new Date(
            now.getTime() + policy.paymentWindowSeconds * 1000,
          ),
        },
      });
      await points.reserve(order.id, order.fundedPoints);
      return orderView(order);
    }, txOptions);
  }

  async findOwned(accountId: string, orderId: string) {
    const order = await this.prisma.rechargeOrder.findFirst({
      where: { id: orderId, accountId },
    });
    return order ? orderView(order) : null;
  }

  cancelUnsent(accountId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const points = await bindRechargePoints(tx, accountId);
      const order = await lockOrder(tx, orderId);
      if (!order || order.accountId !== accountId)
        throw new RechargeError("NOT_FOUND");
      if (order.status === "SUCCESSFUL" || order.status === "CLOSED")
        return orderView(order);
      if (order.dispatchState !== "UNSENT" || order.reviewReason !== null)
        throw new RechargeError("CANCELLATION_REQUIRES_VERIFICATION");
      await points.release(order.id);
      return orderView(
        await tx.rechargeOrder.update({
          where: { id: order.id },
          data: { status: "CLOSED", closedAt: new Date() },
        }),
      );
    }, txOptions);
  }

  async applyNotification(
    identity: NotificationIdentity,
  ): Promise<SettlementResult> {
    const key = {
      provider: identity.provider,
      merchantId: identity.merchantId,
      notificationId: identity.notificationId,
    };
    const receipt = await this.prisma.rechargeNotificationReceipt.findUnique({
      where: { provider_merchantId_notificationId: key },
      include: { canonical: true },
    });
    if (!receipt) return { kind: "NOT_FOUND" };
    const f = receipt.canonical;
    const order = await this.prisma.rechargeOrder.findUnique({
      where: {
        provider_merchantId_merchantOrderNo: {
          provider: f.provider,
          merchantId: f.merchantId,
          merchantOrderNo: f.merchantOrderNo,
        },
      },
    });
    if (!order) {
      // No known account; this transaction locks only the receipt and never later a wallet.
      return this.prisma.$transaction(async (tx) => {
        const current = await lockReceipt(tx, key);
        if (!current) return { kind: "NOT_FOUND" };
        return markReview(tx, null, current, "UNKNOWN_ORDER");
      }, txOptions);
    }
    return this.settle(order, { kind: "NOTIFICATION", identity: key });
  }

  async applyAuthenticatedQuery(
    orderId: string,
    facts: PaymentFacts,
    proof: PaymentProof,
  ): Promise<SettlementResult> {
    const data = paymentObservationData(facts, proof);
    const queryKey = queryObservationKey(orderId, data.factsSha256);
    const order = await this.prisma.rechargeOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) return { kind: "NOT_FOUND" };
    return this.settle(order, { kind: "QUERY", data, queryKey });
  }

  private async settle(
    initial: StoredOrder,
    source: Source,
    transactionConflict = false,
  ): Promise<SettlementResult> {
    let attemptedTransactionId: string | null = null;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const points = await bindRechargePoints(tx, initial.accountId);
        const order = await lockOrder(tx, initial.id);
        if (!order || order.accountId !== initial.accountId)
          throw new Error("RECHARGE_OWNER_INVARIANT");
        await points.lockReservation(order.id);
        let receipt:
          | (RechargeNotificationReceipt & {
              canonical: RechargePaymentObservation;
            })
          | null = null;
        let observation: RechargePaymentObservation;
        if (source.kind === "NOTIFICATION") {
          receipt = await lockReceipt(tx, source.identity);
          if (!receipt) return { kind: "NOT_FOUND" };
          observation = receipt.canonical;
        } else {
          await tx.rechargePaymentObservation.createMany({
            data: [
              {
                ...source.data,
                sourceKind: "QUERY",
                queryKey: source.queryKey,
                queriedOrderId: order.id,
              },
            ],
            skipDuplicates: true,
          });
          observation = await tx.rechargePaymentObservation.findUniqueOrThrow({
            where: { queryKey: source.queryKey },
          });
        }
        const f = storedPaymentFacts(observation);
        attemptedTransactionId = f.transactionId;
        if (receipt?.hasConflict)
          return markReview(tx, order, receipt, "RECEIPT_CONFLICT");
        if (receipt?.reviewReason)
          return {
            kind: "REVIEW_REQUIRED",
            reason: receipt.reviewReason as RechargeReviewReason,
          };
        if (!matchesOrder(order, f))
          return markReview(tx, order, receipt, "FACT_MISMATCH");
        if (transactionConflict)
          return markReview(tx, order, receipt, "TRANSACTION_REUSED");
        if (order.status === "SUCCESSFUL") {
          const original =
            await tx.rechargePaymentObservation.findUniqueOrThrow({
              where: { id: order.paidObservationId! },
            });
          if (
            order.providerTransactionId !== f.transactionId ||
            order.paidAt?.toISOString() !== f.successAt ||
            (original.payerTotalFen !== null &&
              f.payerTotalFen !== null &&
              original.payerTotalFen !== BigInt(f.payerTotalFen))
          )
            return markReview(tx, order, receipt, "PAYMENT_CONFLICT");
          await markApplied(tx, receipt, order.id);
          return { kind: "ALREADY_APPLIED", order: orderView(order) };
        }
        if (order.status === "CLOSED")
          return markReview(tx, order, receipt, "CLOSED_ORDER");
        if (order.reviewReason)
          return markReview(
            tx,
            order,
            receipt,
            order.reviewReason as RechargeReviewReason,
          );
        const claimed = await tx.rechargeOrder.findUnique({
          where: {
            provider_merchantId_providerTransactionId: {
              provider: order.provider,
              merchantId: order.merchantId,
              providerTransactionId: f.transactionId,
            },
          },
        });
        if (claimed && claimed.id !== order.id)
          return markReview(tx, order, receipt, "TRANSACTION_REUSED");
        const ledger = await points.consume(order.id, order.fundedPoints);
        const settled = await tx.rechargeOrder.update({
          where: { id: order.id },
          data: {
            status: "SUCCESSFUL",
            providerTransactionId: f.transactionId,
            paidAt: new Date(f.successAt),
            paidObservationId: observation.id,
            ledgerId: ledger.id,
          },
        });
        await markApplied(tx, receipt, order.id);
        return { kind: "APPLIED", order: orderView(settled) };
      }, txOptions);
    } catch (error) {
      // A cross-account race can lose only at the unique transaction constraint. Its entire
      // credit rolls back; verify the committed winner before retaining the losing obligation.
      if (
        !transactionConflict &&
        attemptedTransactionId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const owner = await this.prisma.rechargeOrder.findUnique({
          where: {
            provider_merchantId_providerTransactionId: {
              provider: initial.provider,
              merchantId: initial.merchantId,
              providerTransactionId: attemptedTransactionId,
            },
          },
        });
        if (owner && owner.id !== initial.id)
          return this.settle(initial, source, true);
      }
      throw error;
    }
  }
}

async function lockOrder(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM recharge_orders WHERE id=CAST(${id} AS UUID) FOR UPDATE`;
  return tx.rechargeOrder.findUnique({ where: { id } });
}
async function lockReceipt(
  tx: Prisma.TransactionClient,
  identity: NotificationIdentity,
) {
  await tx.$queryRaw`SELECT notification_id FROM recharge_notification_receipts WHERE provider=${identity.provider} AND merchant_id=${identity.merchantId} AND notification_id=${identity.notificationId} FOR UPDATE`;
  return tx.rechargeNotificationReceipt.findUnique({
    where: { provider_merchantId_notificationId: identity },
    include: { canonical: true },
  });
}
async function markApplied(
  tx: Prisma.TransactionClient,
  receipt: RechargeNotificationReceipt | null,
  orderId: string,
) {
  if (!receipt) return;
  if (receipt.processedAt) {
    if (receipt.appliedRechargeOrderId !== orderId)
      throw new Error("RECHARGE_RECEIPT_OWNER_INVARIANT");
    return;
  }
  await tx.rechargeNotificationReceipt.update({
    where: {
      provider_merchantId_notificationId: {
        provider: receipt.provider,
        merchantId: receipt.merchantId,
        notificationId: receipt.notificationId,
      },
    },
    data: { processedAt: new Date(), appliedRechargeOrderId: orderId },
  });
}
async function markReview(
  tx: Prisma.TransactionClient,
  order: StoredOrder | null,
  receipt: RechargeNotificationReceipt | null,
  reason: RechargeReviewReason,
): Promise<SettlementResult> {
  if (receipt && receipt.reviewReason === null)
    await tx.rechargeNotificationReceipt.update({
      where: {
        provider_merchantId_notificationId: {
          provider: receipt.provider,
          merchantId: receipt.merchantId,
          notificationId: receipt.notificationId,
        },
      },
      data: { reviewReason: reason },
    });
  if (order && order.reviewReason === null)
    await tx.rechargeOrder.update({
      where: { id: order.id },
      data: {
        reviewReason: reason,
        ...(order.status === "PENDING_PAYMENT" ? { status: "CONFIRMING" } : {}),
      },
    });
  return { kind: "REVIEW_REQUIRED", reason };
}
function matchesOrder(o: StoredOrder, f: PaymentFacts) {
  return (
    o.provider === f.provider &&
    o.merchantId === f.merchantId &&
    o.appId === f.appId &&
    o.merchantOrderNo === f.merchantOrderNo &&
    o.amountFen === BigInt(f.orderTotalFen) &&
    o.currency === f.currency &&
    (f.tradeType === null || f.tradeType === "NATIVE")
  );
}
export function orderView(o: StoredOrder): RechargeOrder {
  return {
    id: o.id,
    accountId: o.accountId,
    idempotencyKey: o.idempotencyKey,
    amountYuan: o.amountYuan,
    amountFen: Number(o.amountFen),
    fundedPoints: o.fundedPoints,
    provider: "WECHAT",
    merchantId: o.merchantId,
    appId: o.appId,
    merchantOrderNo: o.merchantOrderNo,
    method: "WECHAT_NATIVE",
    status: o.status as RechargeOrder["status"],
    dispatchState: o.dispatchState as RechargeOrder["dispatchState"],
    expiresAt: o.expiresAt.toISOString(),
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null,
    closedAt: o.closedAt?.toISOString() ?? null,
    ledgerId: o.ledgerId,
    reviewReason: o.reviewReason as RechargeReviewReason | null,
  };
}
