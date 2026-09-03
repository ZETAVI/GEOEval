import { Module, type DynamicModule } from "@nestjs/common";

import { BrandService } from "./application/brand.service.js";
import { StoreLocationReceiptCodec } from "./application/store-location-receipt.js";
import { StoreLocationVerificationService } from "./application/store-location-verification.service.js";
import { BRAND_REPOSITORY } from "./domain/brand.repository.js";
import { STORE_LOCATION_PROVIDER } from "./domain/store-location.provider.js";
import { AmapStoreLocationProvider } from "./infrastructure/amap-store-location.provider.js";
import {
  DeterministicStoreLocationProvider,
  DisabledStoreLocationProvider,
} from "./infrastructure/deterministic-store-location.provider.js";
import { PostgresBrandRepository } from "./infrastructure/postgres-brand.repository.js";
import {
  STORE_LOCATION_CONFIG,
  type StoreLocationRuntimeConfig,
} from "./infrastructure/store-location.config.js";
import { BrandReferenceData } from "./reference-data/brand-reference-data.js";
import { BrandController } from "./presentation/brand.controller.js";
import { BrandReferenceController } from "./presentation/brand-reference.controller.js";
import { StoreLocationVerificationController } from "./presentation/store-location-verification.controller.js";

@Module({})
export class BrandModule {
  static register(config: StoreLocationRuntimeConfig): DynamicModule {
    return {
      module: BrandModule,
      controllers: [
        BrandController,
        BrandReferenceController,
        StoreLocationVerificationController,
      ],
      providers: [
        PostgresBrandRepository,
        BrandReferenceData,
        { provide: BRAND_REPOSITORY, useExisting: PostgresBrandRepository },
        { provide: STORE_LOCATION_CONFIG, useValue: config },
        {
          provide: STORE_LOCATION_PROVIDER,
          useFactory: () => {
            if (config.mode === "amap") {
              return new AmapStoreLocationProvider(config);
            }
            if (config.mode === "deterministic") {
              return new DeterministicStoreLocationProvider();
            }
            return new DisabledStoreLocationProvider();
          },
        },
        {
          provide: StoreLocationReceiptCodec,
          useFactory: () =>
            new StoreLocationReceiptCodec(
              config.receiptSigningSecret || "disabled-store-location-receipts",
              config.receiptTtlSeconds,
            ),
        },
        BrandService,
        StoreLocationVerificationService,
      ],
      exports: [BrandService, BrandReferenceData],
    };
  }
}
