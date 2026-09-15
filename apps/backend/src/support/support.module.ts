import { Module } from "@nestjs/common";
import { PostgresOperationsIdentityReader } from "../identity/infrastructure/postgres-operations-identity-reader.js";
import { RechargeSupportReader } from "../recharge/infrastructure/recharge-support-reader.js";
import { PostgresSupportRepository } from "./infrastructure/postgres-support.repository.js";
import { SupportController } from "./presentation/support.controller.js";
@Module({
  controllers: [SupportController],
  providers: [
    PostgresSupportRepository,
    PostgresOperationsIdentityReader,
    RechargeSupportReader,
  ],
})
export class SupportModule {}
