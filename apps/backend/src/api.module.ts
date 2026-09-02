import { Module, type DynamicModule } from "@nestjs/common";

import type { ApiConfig } from "./config/runtime-config.js";
import { BrandModule } from "./brand/brand.module.js";
import { FoundationController } from "./foundation/foundation.controller.js";
import { FoundationModule } from "./foundation/foundation.module.js";
import { GeoIntelligenceModule } from "./geo-intelligence/geo-intelligence.module.js";
import { HealthController } from "./health.controller.js";
import { IdentityModule } from "./identity/identity.module.js";
import { PersistenceModule } from "./infrastructure/persistence.module.js";
import { MediaSupplyModule } from "./media-supply/media-supply.module.js";
import { TelemetryModule } from "./infrastructure/telemetry.js";
import { NotificationApiModule } from "./notification/notification-api.module.js";
import { ReadinessModule } from "./readiness.module.js";

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
        GeoIntelligenceModule,
        MediaSupplyModule,
        NotificationApiModule,
        ReadinessModule,
        FoundationModule,
      ],
      controllers: [HealthController, FoundationController],
    };
  }
}
