import { Module, type DynamicModule } from "@nestjs/common";

import type { WorkerConfig } from "./config/runtime-config.js";
import { BackgroundWorkModule } from "./background-work/background-work.module.js";
import {
  PRODUCT_REDIS_URL,
  ProductWorkerRuntime,
} from "./background-work/product-worker-runtime.js";
import { FoundationModule } from "./foundation/foundation.module.js";
import { PersistenceModule } from "./infrastructure/persistence.module.js";
import { TelemetryModule } from "./infrastructure/telemetry.js";
import { FoundationWorkerRuntime, REDIS_URL } from "./worker-runtime.js";

@Module({})
export class WorkerModule {
  static register(config: WorkerConfig): DynamicModule {
    return {
      module: WorkerModule,
      imports: [
        PersistenceModule.register(config.databaseUrl),
        TelemetryModule.register(config.telemetryShouldFail),
        FoundationModule,
        BackgroundWorkModule.register(config.aiExecution),
      ],
      providers: [
        { provide: REDIS_URL, useValue: config.redisUrl },
        { provide: PRODUCT_REDIS_URL, useValue: config.redisUrl },
        FoundationWorkerRuntime,
        ProductWorkerRuntime,
      ],
    };
  }
}
