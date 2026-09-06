import { Module, type DynamicModule } from "@nestjs/common";
import { PublishingSelectionService } from "./application/publishing-selection.service.js";
import { PUBLISHING_SELECTION_REPOSITORY } from "./domain/publishing-selection.js";
import { PostgresPublishingSelectionRepository } from "./infrastructure/postgres-publishing-selection.repository.js";
import { PublishingSelectionController } from "./presentation/publishing-selection.controller.js";
import { MediaSupplyModule } from "../media-supply/media-supply.module.js";
import { PublishingPackageService } from "./application/publishing-package.service.js";
import { PointAccountService } from "./application/point-account.service.js";
import { POINT_ACCOUNT_REPOSITORY } from "./domain/point-account.js";
import { PostgresPointAccountRepository } from "./infrastructure/postgres-point-account.repository.js";
import {
  PointAdminController,
  PointCustomerController,
} from "./presentation/point-account.controller.js";
import { PUBLISHING_PACKAGE_REPOSITORY } from "./domain/publishing-package.js";
import { PostgresPublishingPackageRepository } from "./infrastructure/postgres-publishing-package.repository.js";
import {
  PublishingPackageAdminController,
  PublishingPackageCustomerController,
} from "./presentation/publishing-package.controller.js";

@Module({
  imports: [MediaSupplyModule],
  controllers: [
    PublishingPackageAdminController,
    PublishingPackageCustomerController,
    PointAdminController,
    PointCustomerController,
    PublishingSelectionController,
  ],
  providers: [
    PostgresPublishingPackageRepository,
    {
      provide: PUBLISHING_PACKAGE_REPOSITORY,
      useExisting: PostgresPublishingPackageRepository,
    },
    PublishingPackageService,
    PostgresPointAccountRepository,
    {
      provide: POINT_ACCOUNT_REPOSITORY,
      useExisting: PostgresPointAccountRepository,
    },
    PointAccountService,
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
