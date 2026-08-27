import { Inject, Injectable } from "@nestjs/common";

import type {
  DeliverableOutboxEvent,
  FoundationRepository,
} from "../foundation/foundation.repository.js";
import type {
  FoundationBacklogView,
  FoundationJobData,
  FoundationRecordView,
} from "../foundation/foundation.types.js";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class PostgresFoundationRepository implements FoundationRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createRecordWithOutbox(input: {
    name: string;
    correlationId: string;
    forceRollback: boolean;
  }): Promise<{ id: string }> {
    return this.prisma.$transaction(async (transaction) => {
      const created = await transaction.foundationRecord.create({
        data: { name: input.name, correlationId: input.correlationId },
      });
      if (input.forceRollback) {
        throw new Error("controlled owner transaction rollback");
      }
      await transaction.outboxEvent.create({
        data: {
          recordId: created.id,
          eventType: "foundation.record.accepted",
          payload: { recordId: created.id },
          correlationId: input.correlationId,
        },
      });
      return { id: created.id };
    });
  }

  async findRecord(id: string): Promise<FoundationRecordView | undefined> {
    const record = await this.prisma.foundationRecord.findUnique({
      where: { id },
      include: { effects: true },
    });
    if (!record) return undefined;

    return {
      id: record.id,
      name: record.name,
      status: record.status,
      correlationId: record.correlationId,
      effects: record.effects.map((effect) => ({
        id: effect.id,
        businessKey: effect.businessKey,
        result: effect.result,
      })),
    };
  }

  async getBacklog(): Promise<FoundationBacklogView> {
    const [pending, dispatched] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { status: "PENDING" } }),
      this.prisma.outboxEvent.count({ where: { status: "DISPATCHED" } }),
    ]);
    return { pending, dispatched };
  }

  async findDeliverableOutbox(
    limit: number,
  ): Promise<DeliverableOutboxEvent[]> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: { in: ["PENDING", "DISPATCHED"] } },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        recordId: true,
        status: true,
        correlationId: true,
      },
    });
    return events.flatMap((event) =>
      event.status === "PENDING" || event.status === "DISPATCHED"
        ? [
            {
              id: event.id,
              recordId: event.recordId,
              status: event.status,
              correlationId: event.correlationId,
            },
          ]
        : [],
    );
  }

  async markOutboxDispatched(id: string): Promise<void> {
    await this.prisma.outboxEvent.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "DISPATCHED" },
    });
  }

  async applyEffect(data: FoundationJobData): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.workEffect.upsert({
        where: { businessKey: data.businessKey },
        create: {
          businessKey: data.businessKey,
          outboxEventId: data.outboxEventId,
          recordId: data.recordId,
          result: "foundation-effect-applied",
          correlationId: data.correlationId,
        },
        update: {},
      });
      await transaction.foundationRecord.update({
        where: { id: data.recordId },
        data: { status: "PROCESSED" },
      });
      await transaction.outboxEvent.update({
        where: { id: data.outboxEventId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    });
  }
}
