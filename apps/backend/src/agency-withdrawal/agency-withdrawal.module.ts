import { Module, type DynamicModule } from "@nestjs/common";
import { CommissionEarningsAccess } from "../agency/infrastructure/commission-earnings-access.js";
import { PostgresOperationsIdentityReader } from "../identity/infrastructure/postgres-operations-identity-reader.js";
import { AesGcmSensitiveDataCipher } from "../security/sensitive-data-cipher.js";
import {
  AgencyWithdrawalService,
  SENSITIVE_DATA_CIPHER,
  WITHDRAWAL_ENABLED,
} from "./application/agency-withdrawal.service.js";
import {
  AdminAgencyWithdrawalController,
  AgencyWithdrawalController,
} from "./presentation/agency-withdrawal.controller.js";

@Module({})
export class AgencyWithdrawalModule {
  static register(config: {
    enabled: boolean;
    encryptionKeyHex: string;
  }): DynamicModule {
    return {
      module: AgencyWithdrawalModule,
      controllers: [
        AgencyWithdrawalController,
        AdminAgencyWithdrawalController,
      ],
      providers: [
        AgencyWithdrawalService,
        CommissionEarningsAccess,
        PostgresOperationsIdentityReader,
        { provide: WITHDRAWAL_ENABLED, useValue: config.enabled },
        {
          provide: SENSITIVE_DATA_CIPHER,
          useFactory: () =>
            new AesGcmSensitiveDataCipher(config.encryptionKeyHex),
        },
      ],
      exports: [AgencyWithdrawalService],
    };
  }
}
