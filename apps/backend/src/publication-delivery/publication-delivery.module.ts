import { Module } from "@nestjs/common";
import { PostgresDeliveryPurchaseAccess } from "./infrastructure/postgres-delivery-purchase-access.js";
import { PostgresDeliveryAssignmentRepository } from "./infrastructure/postgres-delivery-assignment.repository.js";

@Module({
  providers: [
    PostgresDeliveryPurchaseAccess,
    PostgresDeliveryAssignmentRepository,
  ],
  exports: [
    PostgresDeliveryPurchaseAccess,
    PostgresDeliveryAssignmentRepository,
  ],
})
export class PublicationDeliveryModule {}
