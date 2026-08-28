import { Inject, Injectable } from "@nestjs/common";

import { EvaluationProcessCoordinator } from "../../geo-intelligence/application/evaluation-process.coordinator.js";
import {
  EVALUATION_PROCESS_COMPLETED,
  type EvaluationProcessResult,
} from "../../geo-intelligence/domain/evaluation-process.result.js";
import { SafeTelemetry } from "../../infrastructure/telemetry.js";
import { NotificationEventHandler } from "../../notification/application/notification-event.handler.js";
import {
  PRODUCT_OUTBOX_REPOSITORY,
  type ProductOutboxRepository,
} from "../domain/product-outbox.repository.js";

@Injectable()
export class ProductWorkProcessor {
  constructor(
    @Inject(PRODUCT_OUTBOX_REPOSITORY)
    private readonly outbox: ProductOutboxRepository,
    @Inject(EvaluationProcessCoordinator)
    private readonly coordinator: EvaluationProcessCoordinator,
    @Inject(NotificationEventHandler)
    private readonly notifications: NotificationEventHandler,
    @Inject(SafeTelemetry)
    private readonly telemetry: SafeTelemetry,
  ) {}

  async apply(outboxEventId: string): Promise<EvaluationProcessResult> {
    const event = await this.outbox.findEvent(outboxEventId);
    if (!event) return EVALUATION_PROCESS_COMPLETED;
    let result: EvaluationProcessResult = EVALUATION_PROCESS_COMPLETED;
    if (
      event.eventType === "evaluation.report.accepted" ||
      event.eventType === "evaluation.retry.required"
    ) {
      await this.notifications.handle(event);
    } else {
      result = await this.coordinator.process(event);
    }
    if (result.kind === "DEFERRED") return result;
    await this.outbox.markCompleted(event.id);
    await this.telemetry.export({
      name: "product.work.applied",
      correlationId: event.correlationId,
      attributes: { outboxEventId: event.id, eventType: event.eventType },
    });
    return EVALUATION_PROCESS_COMPLETED;
  }

  async reconcile(): Promise<number> {
    return this.coordinator.reconcile(100);
  }
}
