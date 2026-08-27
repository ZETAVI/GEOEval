import { Module } from "@nestjs/common";

import { PostgresFoundationRepository } from "../infrastructure/postgres-foundation.repository.js";
import { FOUNDATION_REPOSITORY } from "./foundation.repository.js";
import { FoundationService } from "./foundation.service.js";
import { WorkProcessor } from "./work-processor.js";

@Module({
  providers: [
    PostgresFoundationRepository,
    {
      provide: FOUNDATION_REPOSITORY,
      useExisting: PostgresFoundationRepository,
    },
    FoundationService,
    WorkProcessor,
  ],
  exports: [FOUNDATION_REPOSITORY, FoundationService, WorkProcessor],
})
export class FoundationModule {}
