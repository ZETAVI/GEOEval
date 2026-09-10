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
