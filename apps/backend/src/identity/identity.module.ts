import { Global, Module, type DynamicModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import type { ApiConfig } from "../config/runtime-config.js";
import { AccessGuard } from "./access/access.guard.js";
import { CsrfGuard } from "./access/csrf.guard.js";
import { AccountGovernanceService } from "./application/account-governance.service.js";
import { AuthenticationService } from "./application/authentication.service.js";
import { IDENTITY_CONFIG } from "./application/identity.config.js";
import { SessionService } from "./application/session.service.js";
import { IDENTITY_REPOSITORY } from "./domain/identity.repository.js";
import { PostgresIdentityRepository } from "./infrastructure/postgres-identity.repository.js";
import { AccountGovernanceController } from "./presentation/account-governance.controller.js";
import { IdentityController } from "./presentation/identity.controller.js";

@Global()
@Module({})
export class IdentityModule {
  static register(config: ApiConfig): DynamicModule {
    return {
      module: IdentityModule,
      global: true,
      controllers: [IdentityController, AccountGovernanceController],
      providers: [
        { provide: IDENTITY_CONFIG, useValue: config },
        PostgresIdentityRepository,
        {
          provide: IDENTITY_REPOSITORY,
          useExisting: PostgresIdentityRepository,
        },
        AuthenticationService,
        SessionService,
        AccountGovernanceService,
        CsrfGuard,
        AccessGuard,
        { provide: APP_GUARD, useExisting: CsrfGuard },
        { provide: APP_GUARD, useExisting: AccessGuard },
      ],
      exports: [
        AuthenticationService,
        SessionService,
        AccountGovernanceService,
      ],
    };
  }
}
