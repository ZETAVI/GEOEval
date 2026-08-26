import { Module, type DynamicModule } from "@nestjs/common";

import type { ApiConfig } from "./config/runtime-config.js";
import { BrandModule } from "./brand/brand.module.js";
import { FoundationController } from "./foundation/foundation.controller.js";
import { FoundationModule } from "./foundation/foundation.module.js";
import { HealthController } from "./health.controller.js";
import { IdentityModule } from "./identity/identity.module.js";
import { PersistenceModule } from "./infrastructure/persistence.module.js";
import { TelemetryModule } from "./infrastructure/telemetry.js";
import { ReadinessState } from "./readiness.js";

@Module({})
export class ApiModule {
  static register(config: ApiConfig): DynamicModule {
    return {
      module: ApiModule,
      imports: [
        PersistenceModule.register(config.databaseUrl),
        TelemetryModule.register(config.telemetryShouldFail),
        IdentityModule.register(config),
        BrandModule,
        FoundationModule,
      ],
      controllers: [HealthController, FoundationController],
      providers: [ReadinessState],
    };
  }
}
