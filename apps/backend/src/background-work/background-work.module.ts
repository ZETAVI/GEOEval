import { Module } from "@nestjs/common";

import { GeoIntelligenceProcessModule } from "../geo-intelligence/geo-intelligence-process.module.js";
import { ProductWorkProcessor } from "./application/product-work.processor.js";
import { PRODUCT_OUTBOX_REPOSITORY } from "./domain/product-outbox.repository.js";
import { PostgresProductOutboxRepository } from "./infrastructure/postgres-product-outbox.repository.js";

@Module({
  imports: [GeoIntelligenceProcessModule],
  providers: [
    PostgresProductOutboxRepository,
    {
      provide: PRODUCT_OUTBOX_REPOSITORY,
      useExisting: PostgresProductOutboxRepository,
    },
    ProductWorkProcessor,
  ],
  exports: [PRODUCT_OUTBOX_REPOSITORY, ProductWorkProcessor],
})
export class BackgroundWorkModule {}
