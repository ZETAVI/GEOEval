import { Module } from "@nestjs/common";

import { BrandService } from "./application/brand.service.js";
import { BRAND_REPOSITORY } from "./domain/brand.repository.js";
import { PostgresBrandRepository } from "./infrastructure/postgres-brand.repository.js";
import { BrandController } from "./presentation/brand.controller.js";

@Module({
  controllers: [BrandController],
  providers: [
    PostgresBrandRepository,
    { provide: BRAND_REPOSITORY, useExisting: PostgresBrandRepository },
    BrandService,
  ],
})
export class BrandModule {}
