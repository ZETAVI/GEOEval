import { Module, type DynamicModule } from "@nestjs/common";
import { AgencyCommissionService } from "./agency-commission.service.js";
import {
  AgencyCommissionRuntime,
  AGENCY_COMMISSION_ENABLED,
} from "./agency-commission.runtime.js";
import { CommissionSourceAccess } from "../publishing-commerce/infrastructure/commission-source-access.js";
import { CommissionLedgerAccess } from "../agency/infrastructure/commission-ledger-access.js";
import { DeliveryCommissionAccess } from "../publication-delivery/infrastructure/delivery-commission-access.js";
import { PostgresOperationsIdentityReader } from "../identity/infrastructure/postgres-operations-identity-reader.js";
@Module({
  providers: [
    AgencyCommissionService,
    CommissionSourceAccess,
    CommissionLedgerAccess,
    DeliveryCommissionAccess,
  ],
  exports: [AgencyCommissionService],
})
export class AgencyCommissionModule {
  static register(enabled: boolean): DynamicModule {
    return {
      module: AgencyCommissionModule,
      providers: [
        PostgresOperationsIdentityReader,
        AgencyCommissionRuntime,
        { provide: AGENCY_COMMISSION_ENABLED, useValue: enabled },
      ],
    };
  }
}
