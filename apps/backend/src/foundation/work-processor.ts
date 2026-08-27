import { Inject, Injectable } from "@nestjs/common";

import { SafeTelemetry } from "../infrastructure/telemetry.js";
import {
  FOUNDATION_REPOSITORY,
  type FoundationRepository,
} from "./foundation.repository.js";
import type { FoundationJobData } from "./foundation.types.js";

export type { FoundationJobData } from "./foundation.types.js";

@Injectable()
export class WorkProcessor {
  constructor(
    @Inject(FOUNDATION_REPOSITORY)
    private readonly repository: FoundationRepository,
    @Inject(SafeTelemetry)
    private readonly telemetry: SafeTelemetry,
  ) {}

  async apply(data: FoundationJobData): Promise<void> {
    await this.repository.applyEffect(data);

    await this.telemetry.export({
      name: "foundation.work.applied",
      correlationId: data.correlationId,
      attributes: {
        recordId: data.recordId,
        outboxEventId: data.outboxEventId,
      },
    });
  }
}
