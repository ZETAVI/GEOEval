import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { SafeTelemetry } from "../infrastructure/telemetry.js";
import {
  FOUNDATION_REPOSITORY,
  type FoundationRepository,
} from "./foundation.repository.js";
import type {
  CreateFoundationRecordCommand,
  FoundationBacklogView,
  FoundationRecordView,
} from "./foundation.types.js";

@Injectable()
export class FoundationService {
  constructor(
    @Inject(FOUNDATION_REPOSITORY)
    private readonly repository: FoundationRepository,
    private readonly telemetry: SafeTelemetry,
  ) {}

  async createRecord(
    input: CreateFoundationRecordCommand,
    incomingCorrelationId?: string,
  ): Promise<FoundationRecordView> {
    if (typeof input.name !== "string" || input.name.trim().length === 0) {
      throw new BadRequestException("Name is required");
    }
    const correlationId = incomingCorrelationId ?? randomUUID();

    const record = await this.repository.createRecordWithOutbox({
      name: input.name,
      correlationId,
      forceRollback: input.forceRollback === true,
    });

    await this.telemetry.export({
      name: "foundation.record.committed",
      correlationId,
      attributes: { recordId: record.id },
    });

    return this.getRecord(record.id);
  }

  async getRecord(id: string): Promise<FoundationRecordView> {
    const record = await this.repository.findRecord(id);

    if (!record) {
      throw new NotFoundException("Foundation record not found");
    }

    return record;
  }

  async getBacklog(): Promise<FoundationBacklogView> {
    return this.repository.getBacklog();
  }
}
