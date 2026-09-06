import { Module } from "@nestjs/common";
import { MediaSupplyModule } from "../media-supply/media-supply.module.js";
import { PublishingPackageService } from "./application/publishing-package.service.js";
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
  ],
  providers: [
    PostgresPublishingPackageRepository,
    {
      provide: PUBLISHING_PACKAGE_REPOSITORY,
      useExisting: PostgresPublishingPackageRepository,
    },
    PublishingPackageService,
  ],
})
export class PublishingCommerceModule {}
