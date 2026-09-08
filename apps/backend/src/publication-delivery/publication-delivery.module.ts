import { Module } from "@nestjs/common";
import { PostgresDeliveryPurchaseAccess } from "./infrastructure/postgres-delivery-purchase-access.js";
import { PostgresDeliveryAssignmentRepository } from "./infrastructure/postgres-delivery-assignment.repository.js";
import { PostgresPublicationWorkRepository } from "./infrastructure/postgres-publication-work.repository.js";

@Module({
  providers: [
    PostgresDeliveryPurchaseAccess,
    PostgresDeliveryAssignmentRepository,
    PostgresPublicationWorkRepository,
  ],
  exports: [
    PostgresDeliveryPurchaseAccess,
    PostgresDeliveryAssignmentRepository,
    PostgresPublicationWorkRepository,
  ],
})
export class PublicationDeliveryModule {}
