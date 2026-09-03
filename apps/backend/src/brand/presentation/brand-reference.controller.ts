import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { SessionGuard } from "../../identity/presentation/session.guard.js";
import { BrandReferenceData } from "../reference-data/brand-reference-data.js";
import { IndustryCatalogResponse } from "./brand-reference.dto.js";

@ApiTags("brand-reference-data")
@UseGuards(SessionGuard)
@Controller("brand-reference-data")
export class BrandReferenceController {
  constructor(
    @Inject(BrandReferenceData) private readonly references: BrandReferenceData,
  ) {}

  @Get("industries")
  @ApiOkResponse({ type: IndustryCatalogResponse })
  industries(): IndustryCatalogResponse {
    const catalog = this.references.industryCatalogView();
    return {
      catalogId: catalog.catalogId,
      version: catalog.version,
      contentHash: catalog.contentHash,
      primaryIndustries: catalog.primaryIndustries.flatMap((primary) => {
        const secondaryIndustries = primary.secondaryIndustries
          .filter((secondary) => secondary.status === "ACTIVE")
          .map((secondary) => ({
            id: secondary.id,
            label: secondary.label,
            isOther: secondary.isOther,
          }));
        return secondaryIndustries.length > 0
          ? [
              {
                id: primary.id,
                label: primary.label,
                secondaryIndustries,
              },
            ]
          : [];
      }),
    };
  }
}
