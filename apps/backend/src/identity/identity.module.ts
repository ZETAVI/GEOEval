import { Global, Module, type DynamicModule } from "@nestjs/common";

import type { ApiConfig } from "../config/runtime-config.js";
import {
  IDENTITY_CONFIG,
  IdentityService,
} from "./application/identity.service.js";
import { IDENTITY_REPOSITORY } from "./domain/identity.repository.js";
import { PostgresIdentityRepository } from "./infrastructure/postgres-identity.repository.js";
import { IdentityController } from "./presentation/identity.controller.js";
import { SessionGuard } from "./presentation/session.guard.js";

@Global()
@Module({})
export class IdentityModule {
  static register(config: ApiConfig): DynamicModule {
    return {
      module: IdentityModule,
      global: true,
      controllers: [IdentityController],
      providers: [
        { provide: IDENTITY_CONFIG, useValue: config },
        PostgresIdentityRepository,
        {
          provide: IDENTITY_REPOSITORY,
          useExisting: PostgresIdentityRepository,
        },
        IdentityService,
        SessionGuard,
      ],
      exports: [IdentityService, SessionGuard],
    };
  }
}
