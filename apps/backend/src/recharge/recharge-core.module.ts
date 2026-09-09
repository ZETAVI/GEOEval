import { Module, type DynamicModule } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma.service.js";
import { RechargeCoreService } from "./application/recharge-core.service.js";
import {
  rechargeConfigSchema,
  type RechargeConfig,
} from "./domain/recharge-order.js";
import { PostgresRechargeRepository } from "./infrastructure/postgres-recharge.repository.js";

/** Explicit core-only host composition. No controller, timer, worker, or merchant activation. */
@Module({})
export class RechargeCoreModule {
  static register(config: RechargeConfig): DynamicModule {
    const frozen = Object.freeze(rechargeConfigSchema.parse(config));
    return {
      module: RechargeCoreModule,
      providers: [
        {
          provide: PostgresRechargeRepository,
          inject: [PrismaService],
          useFactory: (prisma: PrismaService) =>
            new PostgresRechargeRepository(prisma),
        },
        {
          provide: RechargeCoreService,
          inject: [PostgresRechargeRepository],
          useFactory: (repository: PostgresRechargeRepository) =>
            new RechargeCoreService(repository, frozen),
        },
      ],
      exports: [RechargeCoreService],
    };
  }
}
