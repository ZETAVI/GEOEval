import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/prisma.service.js";
import type {
  DeliverableProductOutbox,
  ProductOutboxRepository,
  ProductOutboxWorkEvent,
} from "../domain/product-outbox.repository.js";

const EVALUATION_EVENT_TYPES = [
  "evaluation.run.started",
  "evaluation.sample.acquire.requested",
  "evaluation.sample.interpret.requested",
  "evaluation.run.readiness.requested",
  "evaluation.run.synthesize.requested",
  "evaluation.definition.prepare.requested",
  "evaluation.report.accepted",
  "evaluation.retry.required",
] as const;

@Injectable()
export class PostgresProductOutboxRepository implements ProductOutboxRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findDeliverable(limit: number): Promise<DeliverableProductOutbox[]> {
    const events = await this.prisma.productOutboxEvent.findMany({
      where: {
        status: { in: ["PENDING", "DISPATCHED"] },
        eventType: { in: [...EVALUATION_EVENT_TYPES] },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true, status: true },
    });
    return events as DeliverableProductOutbox[];
  }

  async findEvent(id: string): Promise<ProductOutboxWorkEvent | undefined> {
    const event = await this.prisma.productOutboxEvent.findUnique({
      where: { id },
      select: {
        id: true,
        eventType: true,
        payload: true,
        correlationId: true,
        createdAt: true,
        status: true,
      },
    });
    if (!event || event.status === "COMPLETED") return undefined;
    if (!isEvaluationEventType(event.eventType)) {
      throw new Error(`Unsupported product event ${event.eventType}`);
    }
    if (!isRecord(event.payload)) {
      throw new Error(`Product event ${event.id} has an invalid payload`);
    }
    return {
      id: event.id,
      eventType: event.eventType,
      payload: event.payload,
      correlationId: event.correlationId,
      createdAt: event.createdAt,
    };
  }

  async markDispatched(id: string): Promise<void> {
    await this.prisma.productOutboxEvent.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "DISPATCHED", dispatchedAt: new Date() },
    });
  }

  async markCompleted(id: string): Promise<void> {
    await this.prisma.productOutboxEvent.updateMany({
      where: { id, status: { in: ["PENDING", "DISPATCHED"] } },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }
}

function isEvaluationEventType(value: string): boolean {
  return (EVALUATION_EVENT_TYPES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
