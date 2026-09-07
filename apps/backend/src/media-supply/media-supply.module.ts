import { Module } from "@nestjs/common";

import { MediaSupplyService } from "./application/media-supply.service.js";
import { MEDIA_SUPPLY_REPOSITORY } from "./domain/media-supply.repository.js";
import { PostgresMediaSupplyRepository } from "./infrastructure/postgres-media-supply.repository.js";
import { MediaAdminController } from "./presentation/media-admin.controller.js";
import { MediaCatalogController } from "./presentation/media-catalog.controller.js";
import { PostgresMediaPurchaseReaderFactory } from "./infrastructure/postgres-media-purchase-reader.js";

@Module({
  controllers: [MediaCatalogController, MediaAdminController],
  providers: [
    PostgresMediaPurchaseReaderFactory,
    PostgresMediaSupplyRepository,
    {
      provide: MEDIA_SUPPLY_REPOSITORY,
      useExisting: PostgresMediaSupplyRepository,
    },
    MediaSupplyService,
  ],
  exports: [MediaSupplyService, PostgresMediaPurchaseReaderFactory],
})
export class MediaSupplyModule {}
