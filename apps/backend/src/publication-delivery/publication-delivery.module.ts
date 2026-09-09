import { Module } from "@nestjs/common";
import { PostgresDeliveryPurchaseAccess } from "./infrastructure/postgres-delivery-purchase-access.js";
import { PostgresDeliveryAssignmentRepository } from "./infrastructure/postgres-delivery-assignment.repository.js";
import { PostgresPublicationWorkRepository } from "./infrastructure/postgres-publication-work.repository.js";
import { PostgresDeliveryResolutionRepository } from "./infrastructure/postgres-delivery-resolution.repository.js";
import { MediaSupplyModule } from "../media-supply/media-supply.module.js";

@Module({
  imports: [MediaSupplyModule],
  providers: [
    PostgresDeliveryPurchaseAccess,
    PostgresDeliveryAssignmentRepository,
    PostgresPublicationWorkRepository,
    PostgresDeliveryResolutionRepository,
  ],
  exports: [
    PostgresDeliveryPurchaseAccess,
    PostgresDeliveryAssignmentRepository,
    PostgresPublicationWorkRepository,
    PostgresDeliveryResolutionRepository,
  ],
})
export class PublicationDeliveryModule {}
