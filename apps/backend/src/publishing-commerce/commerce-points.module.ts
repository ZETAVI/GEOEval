import { AdminPointRecordsController } from "./presentation/admin-point-records.controller.js";
import { AdminPointRecordsService } from "./application/admin-point-records.service.js";
import { Module } from "@nestjs/common";
import { PointAccountService } from "./application/point-account.service.js";
import { POINT_ACCOUNT_REPOSITORY } from "./domain/point-account.js";
import { PostgresPointAccountRepository } from "./infrastructure/postgres-point-account.repository.js";
import {
  PointAdminController,
  PointCustomerController,
} from "./presentation/point-account.controller.js";

/** Commerce-owned points, without importing publishing or fulfilment modules.
 * The application root supplies the existing global Identity and Persistence.
 */
@Module({
  controllers: [
    AdminPointRecordsController,
    PointAdminController,
    PointCustomerController,
  ],
  providers: [
    AdminPointRecordsService,
    PostgresPointAccountRepository,
    {
      provide: POINT_ACCOUNT_REPOSITORY,
      useExisting: PostgresPointAccountRepository,
    },
    PointAccountService,
  ],
  exports: [PointAccountService],
})
export class CommercePointsModule {}
