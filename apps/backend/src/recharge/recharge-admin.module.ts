import { Module } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma.service.js";
import { ADMIN_RECHARGE_QUERIES } from "./application/admin-recharge.js";
import { AdminRechargeService } from "./application/admin-recharge.service.js";
import { PostgresAdminRechargeQueries } from "./infrastructure/postgres-admin-recharge.queries.js";
import { AdminRechargeController } from "./presentation/admin-recharge.controller.js";
@Module({
  controllers: [AdminRechargeController],
  providers: [
    AdminRechargeService,
    {
      provide: ADMIN_RECHARGE_QUERIES,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PostgresAdminRechargeQueries(prisma),
    },
  ],
})
export class RechargeAdminModule {}
