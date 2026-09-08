import { Module, type DynamicModule } from "@nestjs/common";
import { PublicationDeliveryModule } from "../publication-delivery/publication-delivery.module.js";
import { PublishingOrderController } from "./presentation/publishing-order.controller.js";
import { PublishingOrderService } from "./application/publishing-order.service.js";
import { PUBLISHING_ORDER_REPOSITORY } from "./domain/publishing-order.js";
import { PostgresPublishingOrderRepository } from "./infrastructure/postgres-publishing-order.repository.js";
import { PublishingSelectionService } from "./application/publishing-selection.service.js";
import { PUBLISHING_SELECTION_REPOSITORY } from "./domain/publishing-selection.js";
import { PostgresPublishingSelectionRepository } from "./infrastructure/postgres-publishing-selection.repository.js";
import { PublishingSelectionController } from "./presentation/publishing-selection.controller.js";
import { MediaSupplyModule } from "../media-supply/media-supply.module.js";
import { PublishingPackageService } from "./application/publishing-package.service.js";
import { CommercePointsModule } from "./commerce-points.module.js";
import { PUBLISHING_PACKAGE_REPOSITORY } from "./domain/publishing-package.js";
import { PostgresPublishingPackageRepository } from "./infrastructure/postgres-publishing-package.repository.js";
import {
  PublishingPackageAdminController,
  PublishingPackageCustomerController,
} from "./presentation/publishing-package.controller.js";

@Module({
  imports: [CommercePointsModule, MediaSupplyModule, PublicationDeliveryModule],
  exports: [PublishingOrderService],
  controllers: [
    PublishingOrderController,
    PublishingPackageAdminController,
    PublishingPackageCustomerController,
    PublishingSelectionController,
  ],
  providers: [
    PublishingOrderService,
    PostgresPublishingOrderRepository,
    {
      provide: PUBLISHING_ORDER_REPOSITORY,
      useExisting: PostgresPublishingOrderRepository,
    },
    PostgresPublishingPackageRepository,
    {
      provide: PUBLISHING_PACKAGE_REPOSITORY,
      useExisting: PostgresPublishingPackageRepository,
    },
    PublishingPackageService,
    PublishingSelectionService,
    PostgresPublishingSelectionRepository,
    {
      provide: PUBLISHING_SELECTION_REPOSITORY,
      useExisting: PostgresPublishingSelectionRepository,
    },
  ],
})
export class PublishingCommerceModule {
  static register(optimizationModule: DynamicModule): DynamicModule {
    return { module: PublishingCommerceModule, imports: [optimizationModule] };
  }
}
