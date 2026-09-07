import { Module, type DynamicModule } from "@nestjs/common";

import type { ApiConfig } from "./config/runtime-config.js";
import { FoundationController } from "./foundation/foundation.controller.js";
import { FoundationModule } from "./foundation/foundation.module.js";
import { GeoOptimizationModule } from "./geo-optimization/geo-optimization.module.js";
import { HealthController } from "./health.controller.js";
import { IdentityModule } from "./identity/identity.module.js";
import { PersistenceModule } from "./infrastructure/persistence.module.js";
import { MediaSupplyModule } from "./media-supply/media-supply.module.js";
import { TelemetryModule } from "./infrastructure/telemetry.js";
import { NotificationApiModule } from "./notification/notification-api.module.js";
import { ReadinessModule } from "./readiness.module.js";
import { PublishingCommerceModule } from "./publishing-commerce/publishing-commerce.module.js";

@Module({})
export class ApiModule {
  static register(config: ApiConfig): DynamicModule {
    const optimization = GeoOptimizationModule.register({
      writerMode: config.geoOptimizationWriterMode,
      runtimeEnvironment: config.runtimeEnvironment,
      storeLocation: config.storeLocation,
    });
    return {
      module: ApiModule,
      imports: [
        PersistenceModule.register(config.databaseUrl),
        TelemetryModule.register(config.telemetryShouldFail),
        IdentityModule.register(config),
        optimization,
        MediaSupplyModule,
        PublishingCommerceModule.register(optimization),
        NotificationApiModule,
        ReadinessModule,
        FoundationModule,
      ],
      controllers: [HealthController, FoundationController],
    };
  }
}
