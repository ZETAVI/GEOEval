import { createHash, randomUUID } from "node:crypto";
import {
  Prisma,
  type RechargeOrder as StoredOrder,
} from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { bindRechargePoints } from "../../publishing-commerce/infrastructure/recharge-points-access.js";
import type {
  NativeChannel,
  NativeClaim,
  NativeOperationResult,
  NativeRecoveryPolicy,
  NativeRecoveryRepository,
} from "../application/native-recovery.js";
import type {
  PaymentOrder,
  PaymentProof,
} from "../application/payment-gateway.js";
import type { RechargeCustomerQueries } from "../application/customer-recharge.js";
import { RechargeError } from "../domain/recharge-order.js";
import {
  canDispatchNative,
  nativeQrDeadline,
  nativeFailure,
  planNativeQuery,
  type NativeOperationKind,
} from "../domain/native-recovery.js";
import {
  PostgresRechargeRepository,
  orderView,
} from "./postgres-recharge.repository.js";
import {
  canonicalDate,
  paymentObservationData,
  queryObservationKey,
  storedPaymentFacts,
} from "./stored-payment-observation.js";

const txOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 1000,
  timeout: 5000,
};
const active = ["PENDING_PAYMENT", "CONFIRMING"];
const qrWarning = "QR_REFRESH_UNPROVEN";
// Older executors conservatively skip this marker; new code still requires the normal claim lock.
const slowRetry = "SLOW_RETRY";
const runnableReview = {
  OR: [
    { nativeReviewReason: null },
    { nativeReviewReason: qrWarning },
    { nativeReviewReason: slowRetry },
  ],
};
type SettlementItem = Awaited<
  ReturnType<NativeRecoveryRepository["dueSettlements"]>
>[number];

/** Recharge execution journal. All wallet changes go through the existing Commerce transaction seam. */
export class PostgresNativeRecoveryRepository
  implements NativeRecoveryRepository, RechargeCustomerQueries
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: PostgresRechargeRepository,
  ) {}

  async dueOrderIds(now: Date, limit: number) {
    return (
      await this.prisma.rechargeOrder.findMany({
        where: {
          status: { in: active },
          reviewReason: null,
          ...runnableReview,
          nativeNextActionAt: { lte: now },
        },
        orderBy: [{ nativeNextActionAt: "asc" }, { id: "asc" }],
        take: limit,
        select: { id: true },
      })
    ).map((o) => o.id);
  }

  claim(
    orderId: string,
    channel: Omit<NativeChannel, "gateway">,
    policy: NativeRecoveryPolicy,
    now: Date,
  ) {
    return this.withOrder(
      orderId,
      null,
      async (tx, o, points): Promise<NativeClaim | null> => {
        if (
          !isActive(o) ||
          o.reviewReason ||
          blocked(o) ||
          !o.nativeNextActionAt ||
          o.nativeNextActionAt > now ||
          (o.nativeLeaseUntil && o.nativeLeaseUntil > now)
        )
          return null;
        const stop = stopped(o, now),
          mayInitiate = canInitiate(o, policy, now);
        if (
          o.dispatchState === "UNSENT" &&
          (stop ||
            (o.nativeDescription &&
              !mayInitiate &&
              o.expiresAt.getTime() - now.getTime() <
                policy.minimumDispatchWindowMs))
        ) {
          await points.release(o.id);
          await tx.rechargeOrder.update({
            where: { id: o.id },
            data: { status: "CLOSED", closedAt: now, ...idle() },
          });
          return null;
        }
        if (o.merchantId !== channel.merchantId || o.appId !== channel.appId) {
          await this.review(tx, o.id, "CHANNEL_MISMATCH");
          return null;
        }
        let kind = (o.nativeNextOperation ?? "QUERY") as NativeOperationKind;
        // An expired lease means the previous request may have reached WeChat, regardless of its kind.
        if (o.nativeLeaseId || (stop && kind === "INITIATE")) kind = "QUERY";
        if (
          kind === "INITIATE" &&
          (!mayInitiate || !policy.initiationEnabled)
        ) {
          if (o.dispatchState === "UNSENT") {
            await tx.rechargeOrder.update({
              where: { id: o.id },
              data: { nativeNextActionAt: o.expiresAt },
            });
            return null;
          }
          kind = "QUERY";
        }
        if (kind === "INITIATE" && o.nativeNotifyUrl !== channel.notifyUrl) {
          await this.review(tx, o.id, "CHANNEL_MISMATCH");
          return null;
        }
        const id = randomUUID(),
          generation = o.nativeGeneration + 1;
        const claim: NativeClaim = {
          id,
          orderId: o.id,
          generation,
          kind,
          startedAt: now,
          order: paymentOrder(o),
          description: o.nativeDescription,
          notifyUrl: o.nativeNotifyUrl,
          paymentExpiresAt: o.expiresAt.toISOString(),
        };
        await tx.rechargeOperationAttempt.create({
          data: {
            id,
            orderId: o.id,
            generation,
            kind,
            startedAt: now,
            requestSha256: requestHash(claim),
          },
        });
        const leaseUntil = new Date(now.getTime() + policy.leaseMs);
        await tx.rechargeOrder.update({
          where: { id: o.id },
          data: {
            nativeGeneration: generation,
            ...(stop ? { status: "CONFIRMING" } : {}),
            nativeLeaseId: id,
            nativeLeaseUntil: leaseUntil,
            nativeNextOperation: "QUERY",
            nativeNextActionAt: leaseUntil,
            ...(kind === "INITIATE" ? { dispatchState: "MAY_EXIST" } : {}),
          },
        });
        return claim;
      },
    );
  }

  async deferOrder(orderId: string, now: Date, until: Date) {
    // No later wallet acquisition: scheduling-only update cannot invert the accounting lock order.
    // A claim committed despite a lost response has a future due lease and will not be overwritten.
    await this.prisma.$transaction(
      (tx) =>
        tx.rechargeOrder.updateMany({
          where: {
            id: orderId,
            status: { in: active },
            nativeNextActionAt: { lte: now },
            OR: [
              { nativeLeaseUntil: null },
              { nativeLeaseUntil: { lte: now } },
            ],
          },
          data: { nativeNextActionAt: until },
        }),
      txOptions,
    );
  }

  async complete(
    claim: NativeClaim,
    result: NativeOperationResult,
    policy: NativeRecoveryPolicy,
    now: Date,
  ) {
    await this.withOrder(claim.orderId, null, async (tx, o, points) => {
      const attempt = await tx.rechargeOperationAttempt.findUniqueOrThrow({
        where: { id: claim.id },
      });
      if (
        attempt.orderId !== o.id ||
        attempt.kind !== claim.kind ||
        attempt.generation !== claim.generation ||
        attempt.requestSha256 !== requestHash(claim) ||
        result.kind !== claim.kind
      )
        throw new Error("NATIVE_ATTEMPT_MISMATCH");
      const resultSha256 = hash(result);
      if (attempt.finishedAt) {
        if (attempt.resultSha256 !== resultSha256)
          throw new Error("NATIVE_RESULT_CONFLICT");
        return;
      }
      const current =
        o.nativeLeaseId === attempt.id &&
        o.nativeGeneration === attempt.generation;
      const response = result.response;
      if (!response.ok) {
        const diagnostic = nativeFailure(claim.kind, response.error);
        await tx.rechargeOperationAttempt.update({
          where: { id: attempt.id },
          data: {
            finishedAt: now,
            resultSha256,
            resultKind: "UNRESOLVED",
            diagnosticCode: response.error.code,
            ...diagnostic,
          },
        });
        if (current && isActive(o)) {
          const count = Math.min(o.nativeFailureCount + 1, 2_147_483_647);
          const temporary = diagnostic.failureClass === "TEMPORARY";
          const slow = count >= policy.maxFailures;
          await tx.rechargeOrder.update({
            where: { id: o.id },
            data: {
              ...idle(),
              nativeFailureCount: count,
              status: "CONFIRMING",
              ...(temporary
                ? {
                    nativeReviewReason:
                      o.nativeReviewReason === qrWarning
                        ? qrWarning
                        : slow
                          ? slowRetry
                          : null,
                    nativeNextOperation: "QUERY",
                    nativeNextActionAt: new Date(
                      now.getTime() +
                        (slow ? policy.slowRetryDelayMs : policy.retryDelayMs),
                    ),
                  }
                : {
                    nativeReviewReason:
                      diagnostic.failureClass === "REJECTED"
                        ? "RESPONSE_REJECTED"
                        : "RESPONSE_UNKNOWN",
                  }),
            },
          });
        }
        return;
      }
      // Gateway authenticates first; this boundary also rejects a mismatched successful identity.
      const value = response.value;
      if ("identity" in value && !sameIdentity(value.identity, paymentOrder(o)))
        throw new Error("NATIVE_RESULT_IDENTITY");
      const proof = proofData(value.proof);
      let resultKind: string,
        tradeState: string | null = null,
        observationId: string | null = null;
      if (result.kind === "QUERY" && result.response.ok) {
        const observation = result.response.value;
        tradeState = observation.state;
        resultKind =
          observation.state === "SUCCESS"
            ? "SUCCESS"
            : observation.state === "CLOSED"
              ? "CLOSED"
              : observation.state === "NOTPAY"
                ? "NOTPAY"
                : "REVIEW";
        if (observation.state === "SUCCESS") {
          const data = paymentObservationData(
            observation.facts,
            observation.proof,
          );
          const queryKey = queryObservationKey(o.id, data.factsSha256);
          await tx.rechargePaymentObservation.createMany({
            data: [
              { ...data, sourceKind: "QUERY", queryKey, queriedOrderId: o.id },
            ],
            skipDuplicates: true,
          });
          observationId = (
            await tx.rechargePaymentObservation.findUniqueOrThrow({
              where: { queryKey },
            })
          ).id;
        }
      } else resultKind = result.kind === "INITIATE" ? "QR" : "CLOSED";
      await tx.rechargeOperationAttempt.update({
        where: { id: attempt.id },
        data: {
          finishedAt: now,
          resultSha256,
          resultKind,
          tradeState,
          ...proof,
          paymentObservationId: observationId,
          ...(observationId
            ? { processingState: "PENDING", processingDueAt: now }
            : {}),
        },
      });
      // Money observations survive stale worker generations. C1 alone decides whether they can credit.
      if (observationId) {
        if (isActive(o))
          await tx.rechargeOrder.update({
            where: { id: o.id },
            data: { status: "CONFIRMING", ...idle() },
          });
        return;
      }
      if (resultKind === "CLOSED") {
        const pendingSuccess = await tx.rechargeOperationAttempt.count({
          where: { orderId: o.id, resultKind: "SUCCESS" },
        });
        if (o.status === "SUCCESSFUL" || pendingSuccess > 0) {
          await this.review(tx, o.id, "CLOSE_PAYMENT_CONFLICT");
          return;
        }
        if (!isActive(o) || o.reviewReason) return;
        await points.release(o.id);
        await tx.rechargeOrder.update({
          where: { id: o.id },
          data: {
            status: "CLOSED",
            closedAt: now,
            nativeCloseAttemptId: attempt.id,
            ...idle(),
          },
        });
        return;
      }
      if (!current || !isActive(o) || o.reviewReason || blocked(o)) return;
      if (result.kind === "INITIATE" && result.response.ok) {
        const qr = result.response.value;
        if (qr.paymentExpiresAt !== o.expiresAt.toISOString())
          throw new Error("NATIVE_DEADLINE_MISMATCH");
        const deadline = nativeQrDeadline({
          url: qr.url,
          requestStartedAt: attempt.startedAt,
          paymentExpiresAt: o.expiresAt,
          previous:
            o.nativeQrUrl && o.nativeQrExpiresAt
              ? { url: o.nativeQrUrl, expiresAt: o.nativeQrExpiresAt }
              : null,
        });
        await tx.rechargeOrder.update({
          where: { id: o.id },
          data: {
            ...idle(),
            nativeFailureCount: 0,
            nativeQrUrl: qr.url,
            status: stopped(o, now) ? "CONFIRMING" : "PENDING_PAYMENT",
            nativeQrExpiresAt: deadline,
            nativeQrAttemptId: attempt.id,
            nativeNextOperation: "QUERY",
            nativeNextActionAt: stopped(o, now)
              ? now
              : new Date(now.getTime() + policy.queryIntervalMs),
            ...(deadline <= now && !stopped(o, now)
              ? { nativeReviewReason: qrWarning }
              : {}),
          },
        });
        return;
      }
      if (result.kind === "QUERY" && result.response.ok) {
        const decision = planNativeQuery(result.response.value.state, {
          stopPayment: stopped(o, now),
          mayInitiate:
            policy.initiationEnabled &&
            canInitiate(o, policy, now) &&
            o.nativeReviewReason !== qrWarning,
          usableQr: usableQr(o, now),
        });
        if (decision === "REVIEW") {
          await this.review(tx, o.id, "UNEXPECTED_TRADE_STATE");
          return;
        }
        if (
          decision !== "QUERY" &&
          decision !== "CLOSE" &&
          decision !== "INITIATE"
        )
          throw new Error("NATIVE_QUERY_DECISION");
        await tx.rechargeOrder.update({
          where: { id: o.id },
          data: {
            ...idle(),
            nativeFailureCount: 0,
            ...(o.nativeReviewReason === slowRetry
              ? { nativeReviewReason: null }
              : {}),
            nativeNextOperation: decision,
            status:
              stopped(o, now) || !usableQr(o, now)
                ? "CONFIRMING"
                : "PENDING_PAYMENT",
            nativeNextActionAt:
              decision === "QUERY"
                ? new Date(now.getTime() + policy.queryIntervalMs)
                : now,
          },
        });
      }
    });
  }

  async findRequest(
    accountId: string,
    input: import("../domain/recharge-order.js").CreateRecharge,
  ) {
    const prior = await this.prisma.rechargeOrder.findUnique({
      where: {
        accountId_idempotencyKey: {
          accountId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (!prior) return null;
    if (prior.amountYuan !== input.amountYuan || prior.method !== input.method)
      throw new RechargeError("IDEMPOTENCY_CONFLICT");
    return orderView(prior);
  }

  async listOwned(
    accountId: string,
    input: Parameters<RechargeCustomerQueries["listOwned"]>[1],
  ) {
    const rows = await this.prisma.rechargeOrder.findMany({
      where: {
        accountId,
        ...(input.status ? { status: input.status } : {}),
        ...(input.before
          ? {
              OR: [
                { createdAt: { lt: input.before.createdAt } },
                {
                  createdAt: input.before.createdAt,
                  id: { lt: input.before.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
    });
    const items = rows.slice(0, input.limit),
      last = items.at(-1);
    return {
      items: items.map(orderView),
      next:
        rows.length > input.limit && last
          ? { createdAt: last.createdAt, id: last.id }
          : null,
    };
  }

  async readOwned(accountId: string, orderId: string, now: Date) {
    const o = await this.prisma.rechargeOrder.findFirst({
      where: { id: orderId, accountId },
    });
    if (!o) return null;
    return {
      order: orderView(o),
      cancelRequested: o.nativeCancelRequestedAt !== null,
      canCancel: isActive(o) && !o.nativeCancelRequestedAt,
      qr:
        usableQr(o, now) &&
        !o.reviewReason &&
        !o.nativeReviewReason &&
        !stopped(o, now) &&
        isActive(o)
          ? {
              value: o.nativeQrUrl!,
              expiresAt: o.nativeQrExpiresAt!.toISOString(),
            }
          : null,
      nextActionAt: isActive(o)
        ? (o.nativeNextActionAt?.toISOString() ?? null)
        : null,
      reviewRequired:
        o.reviewReason !== null ||
        (o.nativeReviewReason !== null && o.nativeReviewReason !== slowRetry),
    };
  }

  async cancelOwned(accountId: string, orderId: string, now: Date) {
    await this.withOrder(orderId, accountId, async (tx, o, points) => {
      if (!isActive(o) || o.nativeCancelRequestedAt) return;
      const data = {
        nativeCancelRequestedAt: now,
        nativeGeneration: o.nativeGeneration + 1,
        ...idle(),
      };
      if (o.dispatchState === "UNSENT" && !o.reviewReason) {
        await points.release(o.id);
        await tx.rechargeOrder.update({
          where: { id: o.id },
          data: { ...data, status: "CLOSED", closedAt: now },
        });
      } else
        await tx.rechargeOrder.update({
          where: { id: o.id },
          data: {
            ...data,
            status: "CONFIRMING",
            ...(!o.reviewReason && !blocked(o)
              ? { nativeNextOperation: "QUERY", nativeNextActionAt: now }
              : {}),
          },
        });
    });
  }

  async verifyOwned(
    accountId: string,
    orderId: string,
    now: Date,
    minimumIntervalMs: number,
  ) {
    await this.withOrder(orderId, accountId, async (tx, o) => {
      // The browser can request a check, never assert payment or supersede a running lease.
      if (
        !isActive(o) ||
        o.reviewReason ||
        blocked(o) ||
        o.dispatchState === "UNSENT" ||
        o.nativeLeaseId
      )
        return;
      if (
        await tx.rechargeOperationAttempt.count({
          where: { orderId: o.id, processingState: "PENDING" },
        })
      )
        return;
      if (o.nativeFailureCount > 0) return; // Browser hints cannot bypass transport backoff.
      const last = await tx.rechargeOperationAttempt.findFirst({
        where: { orderId: o.id },
        orderBy: { generation: "desc" },
        select: { startedAt: true },
      });
      const due = new Date(
        Math.max(
          now.getTime(),
          (last?.startedAt.getTime() ?? 0) + minimumIntervalMs,
        ),
      );
      if (o.nativeNextActionAt && o.nativeNextActionAt <= due) return;
      await tx.rechargeOrder.update({
        where: { id: o.id },
        data: { nativeNextOperation: "QUERY", nativeNextActionAt: due },
      });
    });
  }

  async dueSettlements(now: Date, limit: number): Promise<SettlementItem[]> {
    const [notifications, queries] = await Promise.all([
      this.prisma.rechargeNotificationReceipt.findMany({
        where: {
          processedAt: null,
          reviewReason: null,
          retryAfter: { lte: now },
        },
        orderBy: [{ retryAfter: "asc" }, { createdAt: "asc" }],
        take: limit,
      }),
      this.prisma.rechargeOperationAttempt.findMany({
        where: { processingState: "PENDING", processingDueAt: { lte: now } },
        orderBy: [{ processingDueAt: "asc" }, { id: "asc" }],
        take: limit,
      }),
    ]);
    // A single chronological due queue prevents one source from starving the other, even at limit=1.
    return [
      ...notifications.map((n) => ({
        at: n.retryAfter.getTime(),
        item: {
          kind: "NOTIFICATION" as const,
          identity: {
            provider: "WECHAT" as const,
            merchantId: n.merchantId,
            notificationId: n.notificationId,
          },
        },
      })),
      ...queries.map((q) => ({
        at: q.processingDueAt!.getTime(),
        item: { kind: "QUERY" as const, attemptId: q.id },
      })),
    ]
      .sort((a, b) => a.at - b.at)
      .slice(0, limit)
      .map((row) => row.item);
  }

  async settleQuery(attemptId: string) {
    const attempt =
      await this.prisma.rechargeOperationAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        include: { paymentObservation: true },
      });
    const o = attempt.paymentObservation;
    if (
      !o ||
      attempt.resultKind !== "SUCCESS" ||
      o.queriedOrderId !== attempt.orderId
    )
      throw new Error("NATIVE_SETTLEMENT_SOURCE");
    const result = await this.core.applyAuthenticatedQuery(
      attempt.orderId,
      storedPaymentFacts(o),
      {
        verificationKeyId: o.verificationKeyId,
        signedAtSeconds: Number(o.signedAtSeconds),
        receivedAt: o.receivedAt.toISOString(),
        bodySha256: o.bodySha256,
      },
    );
    if (result.kind !== "NOT_FOUND")
      await this.prisma.rechargeOperationAttempt.updateMany({
        where: { id: attempt.id, processingState: "PENDING" },
        data: {
          processingState:
            result.kind === "REVIEW_REQUIRED" ? "REVIEW" : "APPLIED",
          processingDueAt: null,
        },
      });
    return result;
  }

  async deferSettlement(item: SettlementItem, until: Date) {
    if (item.kind === "QUERY")
      await this.prisma.rechargeOperationAttempt.updateMany({
        where: { id: item.attemptId, processingState: "PENDING" },
        data: { processingDueAt: until },
      });
    else
      await this.prisma.rechargeNotificationReceipt.updateMany({
        where: { ...item.identity, processedAt: null, reviewReason: null },
        data: { retryAfter: until },
      });
  }

  private async withOrder<T>(
    id: string,
    owner: string | null,
    work: (
      tx: Prisma.TransactionClient,
      order: StoredOrder,
      points: Awaited<ReturnType<typeof bindRechargePoints>>,
    ) => Promise<T>,
  ) {
    const initial = await this.prisma.rechargeOrder.findFirst({
      where: { id, ...(owner ? { accountId: owner } : {}) },
      select: { accountId: true },
    });
    if (!initial) throw new RechargeError("NOT_FOUND");
    return this.prisma.$transaction(async (tx) => {
      const points = await bindRechargePoints(tx, initial.accountId);
      await tx.$queryRaw`SELECT id FROM recharge_orders WHERE id=CAST(${id} AS UUID) FOR UPDATE`;
      const order = await tx.rechargeOrder.findUniqueOrThrow({ where: { id } });
      await points.lockReservation(id);
      return work(tx, order, points);
    }, txOptions);
  }
  private review(tx: Prisma.TransactionClient, id: string, reason: string) {
    return tx.rechargeOrder.update({
      where: { id },
      data: { ...idle(), nativeReviewReason: reason },
    });
  }
}

function isActive(o: StoredOrder) {
  return active.includes(o.status);
}
function blocked(o: StoredOrder) {
  return (
    o.nativeReviewReason !== null &&
    ![qrWarning, slowRetry].includes(o.nativeReviewReason)
  );
}
function stopped(o: StoredOrder, now: Date) {
  return o.nativeCancelRequestedAt !== null || o.expiresAt <= now;
}
function usableQr(o: StoredOrder, now: Date) {
  return !!o.nativeQrUrl && !!o.nativeQrExpiresAt && o.nativeQrExpiresAt > now;
}
function canInitiate(o: StoredOrder, policy: NativeRecoveryPolicy, now: Date) {
  return (
    !!o.nativeDescription &&
    !!o.nativeNotifyUrl &&
    canDispatchNative({
      cancelled: o.nativeCancelRequestedAt !== null,
      paymentExpiresAt: o.expiresAt,
      now,
      minimumRemainingMs: policy.minimumDispatchWindowMs,
    })
  );
}
function idle() {
  return {
    nativeLeaseId: null,
    nativeLeaseUntil: null,
    nativeNextOperation: null,
    nativeNextActionAt: null,
  };
}
function paymentOrder(o: StoredOrder): PaymentOrder {
  return {
    merchantId: o.merchantId,
    appId: o.appId,
    merchantOrderNo: o.merchantOrderNo,
    amountFen: Number(o.amountFen),
  };
}
function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function requestHash(claim: NativeClaim) {
  return hash({
    kind: claim.kind,
    order: claim.order,
    ...(claim.kind === "INITIATE"
      ? {
          description: claim.description,
          notifyUrl: claim.notifyUrl,
          expiresAt: claim.paymentExpiresAt,
        }
      : {}),
  });
}
function proofData(p: PaymentProof) {
  if (
    !/^[a-f0-9]{64}$/.test(p.bodySha256) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(p.verificationKeyId) ||
    !Number.isSafeInteger(p.signedAtSeconds) ||
    p.signedAtSeconds < 0
  )
    throw new Error("NATIVE_PROOF_INVARIANT");
  return {
    verificationKeyId: p.verificationKeyId,
    signedAtSeconds: BigInt(p.signedAtSeconds),
    receivedAt: canonicalDate(p.receivedAt),
    bodySha256: p.bodySha256,
  };
}

function sameIdentity(a: PaymentOrder, b: PaymentOrder) {
  return (
    a.merchantId === b.merchantId &&
    a.appId === b.appId &&
    a.merchantOrderNo === b.merchantOrderNo &&
    a.amountFen === b.amountFen
  );
}
