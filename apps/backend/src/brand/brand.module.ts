import { Module } from "@nestjs/common";

import { BrandService } from "./application/brand.service.js";
import { BRAND_REPOSITORY } from "./domain/brand.repository.js";
import { PostgresBrandRepository } from "./infrastructure/postgres-brand.repository.js";
import { BrandReferenceData } from "./reference-data/brand-reference-data.js";
import { BrandController } from "./presentation/brand.controller.js";
import { BrandReferenceController } from "./presentation/brand-reference.controller.js";

@Module({
  controllers: [BrandController, BrandReferenceController],
  providers: [
    PostgresBrandRepository,
    BrandReferenceData,
    { provide: BRAND_REPOSITORY, useExisting: PostgresBrandRepository },
    BrandService,
  ],
  exports: [BrandService, BrandReferenceData],
})
export class BrandModule {}
