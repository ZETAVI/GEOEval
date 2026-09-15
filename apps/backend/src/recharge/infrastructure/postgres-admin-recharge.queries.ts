import { Prisma } from "../../generated/prisma/client.js";
import type { PrismaService } from "../../infrastructure/prisma.service.js";
import type {
  AdminRechargeQueries,
  AdminRechargeSummary,
} from "../application/admin-recharge.js";
const base = {
  id: true,
  accountId: true,
  account: { select: { mobile: true } },
  amountYuan: true,
  fundedPoints: true,
  method: true,
  status: true,
  createdAt: true,
  expiresAt: true,
  paidAt: true,
  closedAt: true,
} satisfies Prisma.RechargeOrderSelect;
type Row = Prisma.RechargeOrderGetPayload<{ select: typeof base }>;
function method(value: string): AdminRechargeSummary["method"] {
  if (value === "WECHAT_NATIVE" || value === "ALIPAY_PC") return value;
  throw new Error("RECHARGE_METHOD_INVARIANT");
}
function summary(o: Row): AdminRechargeSummary {
  return {
    id: o.id,
    accountId: o.accountId,
    accountMobile: o.account.mobile,
    amountYuan: o.amountYuan,
    points: o.fundedPoints,
    method: method(o.method),
    status: o.status as AdminRechargeSummary["status"],
    createdAt: o.createdAt.toISOString(),
    paymentExpiresAt: o.expiresAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null,
    closedAt: o.closedAt?.toISOString() ?? null,
  };
}
const reasons: Record<string, string> = {
  SLOW_RETRY: "正在自动核验",
  QR_REFRESH_UNPROVEN: "二维码状态待核验",
  RESPONSE_REJECTED: "支付接口校验未通过",
  RESPONSE_UNKNOWN: "支付结果待核查",
  RETRY_EXHAUSTED: "支付结果待核查",
  FACT_MISMATCH: "付款信息不一致",
  TRANSACTION_REUSED: "交易归属冲突",
  RECEIPT_CONFLICT: "付款通知存在冲突",
  PAYMENT_CONFLICT: "付款信息存在冲突",
  CLOSED_ORDER: "已关闭订单收到付款记录",
};
/** Read-only projection; never loads the payment runtime or a Commerce writer. */
export class PostgresAdminRechargeQueries implements AdminRechargeQueries {
  constructor(private readonly prisma: PrismaService) {}
  private snapshot<T>(read: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        return read(tx);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        maxWait: 5000,
        timeout: 10000,
      },
    );
  }
  list: AdminRechargeQueries["list"] = (filter, limit, before) =>
    this.snapshot(async (tx) => {
      const rows = await tx.rechargeOrder.findMany({
        where: {
          ...(filter.accountId ? { accountId: filter.accountId } : {}),
          ...(filter.orderId ? { id: filter.orderId } : {}),
          ...(filter.status ? { status: filter.status } : {}),
          ...(filter.createdFrom || filter.createdBefore
            ? {
                createdAt: {
                  ...(filter.createdFrom
                    ? { gte: new Date(filter.createdFrom) }
                    : {}),
                  ...(filter.createdBefore
                    ? { lt: new Date(filter.createdBefore) }
                    : {}),
                },
              }
            : {}),
          ...(before
            ? {
                OR: [
                  { createdAt: { lt: new Date(before.createdAt) } },
                  {
                    createdAt: new Date(before.createdAt),
                    id: { lt: before.id },
                  },
                ],
              }
            : {}),
        },
        select: base,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
      });
      const items = rows.slice(0, limit).map(summary),
        last = items.at(-1);
      return {
        items,
        next:
          rows.length > limit && last
            ? { id: last.id, createdAt: last.createdAt }
            : null,
      };
    });
  detail: AdminRechargeQueries["detail"] = (id) =>
    this.snapshot(async (tx) => {
      const o = await tx.rechargeOrder.findUnique({
        where: { id },
        select: {
          ...base,
          merchantOrderNo: true,
          providerTransactionId: true,
          reviewReason: true,
          nativeReviewReason: true,
          settledLedger: {
            select: { id: true, fundedDelta: true, createdAt: true },
          },
          nativeAttempts: {
            where: { kind: "QUERY", finishedAt: { not: null } },
            orderBy: [{ finishedAt: "desc" }, { generation: "desc" }],
            take: 1,
            select: { finishedAt: true },
          },
          notificationDelivery: { select: { deliveredAt: true } },
        },
      });
      if (!o) return null;
      const reason =
        o.reviewReason ??
        (o.status === "SUCCESSFUL" || o.status === "CLOSED"
          ? null
          : o.nativeReviewReason);
      return {
        ...summary(o),
        merchantOrderNo: o.merchantOrderNo,
        providerTransactionId: o.providerTransactionId,
        ledgerId: o.settledLedger?.id ?? null,
        creditedPoints: o.settledLedger?.fundedDelta ?? null,
        creditedAt: o.settledLedger?.createdAt.toISOString() ?? null,
        lastQueriedAt: o.nativeAttempts[0]?.finishedAt?.toISOString() ?? null,
        diagnostic: reason ? (reasons[reason] ?? "支付记录待核查") : null,
        notificationState: o.notificationDelivery
          ? o.notificationDelivery.deliveredAt
            ? "DELIVERED"
            : "PENDING"
          : null,
        notificationDeliveredAt:
          o.notificationDelivery?.deliveredAt?.toISOString() ?? null,
      };
    });
}
