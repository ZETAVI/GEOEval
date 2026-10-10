import { Module, type DynamicModule } from "@nestjs/common";

import type { AiExecutionConfig } from "../ai-execution/infrastructure/ai-execution.config.js";
import type { BrowserSamplingConfig } from "../geo-intelligence/infrastructure/browser-sampling.config.js";
import { GeoIntelligenceProcessModule } from "../geo-intelligence/geo-intelligence-process.module.js";
import { NotificationApplicationModule } from "../notification/notification-application.module.js";
import { ProductWorkProcessor } from "./application/product-work.processor.js";
import { PRODUCT_OUTBOX_REPOSITORY } from "./domain/product-outbox.repository.js";
import { PostgresProductOutboxRepository } from "./infrastructure/postgres-product-outbox.repository.js";

@Module({})
export class BackgroundWorkModule {
  static register(config: {
    aiExecution: AiExecutionConfig;
    evaluationSampling: BrowserSamplingConfig;
  }): DynamicModule {
    return {
      module: BackgroundWorkModule,
      imports: [
        GeoIntelligenceProcessModule.register(config),
        NotificationApplicationModule,
      ],
      providers: [
        PostgresProductOutboxRepository,
        {
          provide: PRODUCT_OUTBOX_REPOSITORY,
          useExisting: PostgresProductOutboxRepository,
        },
        ProductWorkProcessor,
      ],
      exports: [PRODUCT_OUTBOX_REPOSITORY, ProductWorkProcessor],
    };
  }
}
