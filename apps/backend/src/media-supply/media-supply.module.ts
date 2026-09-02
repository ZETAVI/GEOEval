import { Module } from "@nestjs/common";

import { MediaSupplyService } from "./application/media-supply.service.js";
import { MEDIA_SUPPLY_REPOSITORY } from "./domain/media-supply.repository.js";
import { PostgresMediaSupplyRepository } from "./infrastructure/postgres-media-supply.repository.js";
import { MediaAdminController } from "./presentation/media-admin.controller.js";
import { MediaCatalogController } from "./presentation/media-catalog.controller.js";

@Module({
  controllers: [MediaCatalogController, MediaAdminController],
  providers: [
    PostgresMediaSupplyRepository,
    {
      provide: MEDIA_SUPPLY_REPOSITORY,
      useExisting: PostgresMediaSupplyRepository,
    },
    MediaSupplyService,
  ],
  exports: [MediaSupplyService],
})
export class MediaSupplyModule {}
