import { Module, type DynamicModule } from "@nestjs/common";

import type { StoreLocationRuntimeConfig } from "../brand/infrastructure/store-location.config.js";
import { GeoIntelligenceModule } from "../geo-intelligence/geo-intelligence.module.js";
import { GeoOptimizationService } from "./application/geo-optimization.service.js";
import { GeoOptimizationController } from "./presentation/geo-optimization.controller.js";
import { GEO_OPTIMIZATION_REPOSITORY } from "./domain/geo-optimization.repository.js";
import { CORE_ARTICLE_WRITER } from "./domain/writer.port.js";
import { DeterministicCoreArticleWriter } from "./infrastructure/deterministic-core-article.writer.js";
import { DisabledCoreArticleWriter } from "./infrastructure/disabled-core-article.writer.js";
import { PostgresGeoOptimizationRepository } from "./infrastructure/postgres-geo-optimization.repository.js";
import { PostgresArticlePurchaseReaderFactory } from "./infrastructure/postgres-article-purchase-reader.js";

export type GeoOptimizationRuntimeConfig = {
  writerMode: "disabled" | "deterministic";
  runtimeEnvironment: "development" | "test" | "production";
  storeLocation: StoreLocationRuntimeConfig;
};

@Module({})
export class GeoOptimizationModule {
  static register(config: GeoOptimizationRuntimeConfig): DynamicModule {
    if (
      !(["disabled", "deterministic"] as unknown[]).includes(config.writerMode)
    ) {
      throw new Error(
        `Unsupported Core Article Writer mode ${config.writerMode}`,
      );
    }
    if (
      config.runtimeEnvironment === "production" &&
      config.writerMode === "deterministic"
    ) {
      throw new Error(
        "Deterministic Core Article Writer cannot run in production",
      );
    }
    return {
      module: GeoOptimizationModule,
      imports: [GeoIntelligenceModule.register(config.storeLocation)],
      providers: [
        PostgresArticlePurchaseReaderFactory,
        PostgresGeoOptimizationRepository,
        DeterministicCoreArticleWriter,
        DisabledCoreArticleWriter,
        {
          provide: GEO_OPTIMIZATION_REPOSITORY,
          useExisting: PostgresGeoOptimizationRepository,
        },
        {
          provide: CORE_ARTICLE_WRITER,
          useExisting:
            config.writerMode === "deterministic"
              ? DeterministicCoreArticleWriter
              : DisabledCoreArticleWriter,
        },
        GeoOptimizationService,
      ],
      controllers: [GeoOptimizationController],
      exports: [GeoOptimizationService, PostgresArticlePurchaseReaderFactory],
    };
  }
}
