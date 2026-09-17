import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";

import type { ProductOutboxWorkEvent } from "../../background-work/domain/product-outbox.repository.js";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from "../domain/notification.repository.js";

const completedSchema = z
  .object({
    accountId: z.string().uuid(),
    brandId: z.string().uuid(),
    brandName: z.string().min(1),
    runId: z.string().uuid(),
    reportId: z.string().uuid(),
  })
  .strict();

const retrySchema = z
  .object({
    accountId: z.string().uuid(),
    brandId: z.string().uuid(),
    brandName: z.string().min(1),
    runId: z.string().uuid(),
    cycleId: z.string().uuid(),
    stage: z.enum(["EVIDENCE", "SYNTHESIS"]),
  })
  .strict();

const withdrawalSchema = z
  .object({
    recipientAccountId: z.string().uuid(),
    withdrawalId: z.string().uuid(),
    number: z.number().int().positive(),
    amountFen: z.string().regex(/^\d+$/),
    reason: z.string().min(1).max(320).optional(),
  })
  .strict();

const rechargeInvoiceSchema = z
  .object({
    recipientAccountId: z.string().uuid(),
    invoiceRequestId: z.string().uuid(),
    rechargeOrderId: z.string().uuid(),
    number: z.number().int().positive(),
    reason: z.string().min(1).max(320).optional(),
  })
  .strict();

@Injectable()
export class NotificationEventHandler {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepository,
  ) {}

  async publishRecharge(input: {
    orderId: string;
    recipientAccountId: string;
    points: number;
    occurredAt: Date;
  }): Promise<void> {
    const value = z
      .object({
        orderId: z.string().uuid(),
        recipientAccountId: z.string().uuid(),
        points: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
        occurredAt: z.date(),
      })
      .strict()
      .parse(input);
    await this.repository.materialize({
      recipientAccountId: value.recipientAccountId,
      sourceEventId: value.orderId,
      kind: "RECHARGE_SUCCESSFUL",
      title: "充值积分已到账",
      summary: `本次充值 ${value.points} 积分已到账，可查看充值订单。`,
      target: { kind: "RECHARGE_ORDER", rechargeOrderId: value.orderId },
      occurredAt: value.occurredAt,
    });
  }

  async handle(event: ProductOutboxWorkEvent): Promise<void> {
    if (event.eventType.startsWith("recharge.invoice.")) {
      const payload = rechargeInvoiceSchema.parse(event.payload);
      const common = {
        recipientAccountId: payload.recipientAccountId,
        sourceEventId: event.id,
        target: {
          kind: "RECHARGE_INVOICE" as const,
          invoiceRequestId: payload.invoiceRequestId,
          rechargeOrderId: payload.rechargeOrderId,
        },
        occurredAt: event.createdAt,
      };
      if (event.eventType === "recharge.invoice.needs_correction") {
        await this.repository.materialize({
          ...common,
          kind: "RECHARGE_INVOICE_NEEDS_CORRECTION",
          title: "开票资料需要修改",
          summary: `开票申请 #${payload.number} 需要修改：${payload.reason}`,
        });
        return;
      }
      if (event.eventType === "recharge.invoice.issued") {
        await this.repository.materialize({
          ...common,
          kind: "RECHARGE_INVOICE_ISSUED",
          title: "发票已开具",
          summary: `开票申请 #${payload.number} 已由运营确认发送。`,
        });
        return;
      }
    }
    if (event.eventType.startsWith("agency.withdrawal.")) {
      const payload = withdrawalSchema.parse(event.payload);
      const amount = formatFen(payload.amountFen);
      const common = {
        recipientAccountId: payload.recipientAccountId,
        sourceEventId: event.id,
        target: {
          kind: "AGENCY_WITHDRAWAL" as const,
          withdrawalId: payload.withdrawalId,
        },
        occurredAt: event.createdAt,
      };
      if (event.eventType === "agency.withdrawal.completed") {
        await this.repository.materialize({
          ...common,
          kind: "AGENCY_WITHDRAWAL_COMPLETED",
          title: "提现已完成",
          summary: `提现申请 #${payload.number} 已完成，金额 ${amount} 元。`,
        });
        return;
      }
      if (event.eventType === "agency.withdrawal.rejected") {
        await this.repository.materialize({
          ...common,
          kind: "AGENCY_WITHDRAWAL_REJECTED",
          title: "提现申请未通过",
          summary: `提现申请 #${payload.number} 未通过：${payload.reason}`,
        });
        return;
      }
      if (event.eventType === "agency.withdrawal.payment_failed") {
        await this.repository.materialize({
          ...common,
          kind: "AGENCY_WITHDRAWAL_PAYMENT_FAILED",
          title: "提现付款失败",
          summary: `提现申请 #${payload.number} 付款失败：${payload.reason}`,
        });
        return;
      }
    }
    if (event.eventType === "evaluation.report.accepted") {
      const payload = completedSchema.parse(event.payload);
      await this.repository.materialize({
        recipientAccountId: payload.accountId,
        sourceEventId: event.id,
        kind: "EVALUATION_COMPLETED",
        title: `「${payload.brandName}」评测已完成`,
        summary: "评测报告已经生成，可查看本次结果。",
        target: {
          kind: "EVALUATION_REPORT",
          brandId: payload.brandId,
          runId: payload.runId,
          reportId: payload.reportId,
        },
        occurredAt: event.createdAt,
      });
      return;
    }
    if (event.eventType === "evaluation.retry.required") {
      const payload = retrySchema.parse(event.payload);
      await this.repository.materialize({
        recipientAccountId: payload.accountId,
        sourceEventId: event.id,
        kind: "EVALUATION_RETRY_REQUIRED",
        title: `「${payload.brandName}」评测需要重试`,
        summary: "本次评测未能形成完整报告，可继续重试。",
        target: {
          kind: "EVALUATION_RETRY",
          brandId: payload.brandId,
          runId: payload.runId,
        },
        occurredAt: event.createdAt,
      });
      return;
    }
    throw new Error(`Unsupported notification event ${event.eventType}`);
  }
}

function formatFen(value: string): string {
  const fen = BigInt(value);
  return `${fen / 100n}.${(fen % 100n).toString().padStart(2, "0")}`;
}
