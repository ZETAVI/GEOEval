import { Module } from "@nestjs/common";
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
  ],
})
export class PublishingCommerceModule {}
