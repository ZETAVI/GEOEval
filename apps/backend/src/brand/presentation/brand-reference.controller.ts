import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { SessionGuard } from "../../identity/presentation/session.guard.js";
import {
  BrandReferenceData,
  BrandReferenceValidationError,
} from "../reference-data/brand-reference-data.js";
import {
  CityRegionOptionListResponse,
  IndustryCatalogResponse,
  RegionOptionListResponse,
  TerminalRegionOptionListResponse,
} from "./brand-reference.dto.js";

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
      primaryIndustries: catalog.primaryIndustries.map((primary) => ({
        id: primary.id,
        label: primary.label,
        secondaryIndustries: primary.secondaryIndustries
          .filter((secondary) => secondary.status === "ACTIVE")
          .map((secondary) => ({
            id: secondary.id,
            label: secondary.label,
            isOther: secondary.isOther,
          })),
      })),
    };
  }

  @Get("regions/provinces")
  @ApiOkResponse({ type: RegionOptionListResponse })
  provinces(): RegionOptionListResponse {
    return this.regionList(
      this.references.provinceOptions().map(({ id, label }) => ({ id, label })),
    );
  }

  @Get("regions/provinces/:provinceId/cities")
  @ApiOkResponse({ type: CityRegionOptionListResponse })
  cities(
    @Param("provinceId") provinceId: string,
  ): CityRegionOptionListResponse {
    return this.handle(() =>
      this.regionList(
        this.references
          .cityOptions(provinceId)
          .map(({ id, label, identityKind }) => ({ id, label, identityKind })),
      ),
    );
  }

  @Get("regions/provinces/:provinceId/cities/:cityId/terminals")
  @ApiOkResponse({ type: TerminalRegionOptionListResponse })
  terminals(
    @Param("provinceId") provinceId: string,
    @Param("cityId") cityId: string,
  ): TerminalRegionOptionListResponse {
    return this.handle(() =>
      this.regionList(
        this.references
          .terminalOptions(provinceId, cityId)
          .map(({ id, label, officialLevel }) => ({
            id,
            label,
            officialLevel,
          })),
      ),
    );
  }

  private regionList<T extends { id: string; label: string }>(
    options: T[],
  ): {
    sourceReleaseId: string;
    contentHash: string;
    options: T[];
  } {
    return { ...this.references.regionSourceView(), options };
  }

  private handle<T>(callback: () => T): T {
    try {
      return callback();
    } catch (error) {
      if (error instanceof BrandReferenceValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
