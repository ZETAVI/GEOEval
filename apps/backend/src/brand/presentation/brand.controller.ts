import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";

import { SessionGuard } from "../../identity/presentation/session.guard.js";
import type { AuthenticatedRequest } from "../../identity/presentation/session-http.js";
import { BrandService } from "../application/brand.service.js";
import type { BrandView } from "../domain/brand.types.js";
import { BrandMutationRequest, BrandResponse } from "./brand.dto.js";

@ApiTags("brands")
@ApiExtraModels(BrandResponse)
@UseGuards(SessionGuard)
@Controller("brands")
export class BrandController {
  constructor(@Inject(BrandService) private readonly brands: BrandService) {}

  @Get()
  @ApiOkResponse({ type: [BrandResponse] })
  async list(@Req() request: AuthenticatedRequest): Promise<BrandResponse[]> {
    return (await this.brands.list(request.geoevalAccount!.id)).map(
      presentBrand,
    );
  }

  @Get("current")
  @ApiOkResponse({
    schema: {
      nullable: true,
      allOf: [{ $ref: getSchemaPath(BrandResponse) }],
    },
  })
  async current(
    @Req() request: AuthenticatedRequest,
  ): Promise<BrandResponse | null> {
    const brand = await this.brands.current(request.geoevalAccount!.id);
    return brand ? presentBrand(brand) : null;
  }

  @Post()
  @ApiBody({ type: BrandMutationRequest })
  @ApiCreatedResponse({ type: BrandResponse })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: BrandMutationRequest,
  ): Promise<BrandResponse> {
    return this.brands
      .create(request.geoevalAccount!.id, input, request.geoevalAccount!.mobile)
      .then(presentBrand);
  }

  @Patch(":id")
  @ApiBody({ type: BrandMutationRequest })
  @ApiOkResponse({ type: BrandResponse })
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: BrandMutationRequest,
  ): Promise<BrandResponse> {
    return this.brands
      .update(request.geoevalAccount!.id, id, input)
      .then(presentBrand);
  }

  @Put(":id/current")
  @ApiOkResponse({ type: BrandResponse })
  selectCurrent(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<BrandResponse> {
    return this.brands
      .selectCurrent(request.geoevalAccount!.id, id)
      .then(presentBrand);
  }
}

function presentBrand(brand: BrandView): BrandResponse {
  return {
    id: brand.id,
    status: brand.status,
    companyName: brand.companyName,
    primaryIndustryId: brand.primaryIndustryId,
    secondaryIndustryId: brand.secondaryIndustryId,
    otherProductOrService: brand.otherProductOrService,
    characteristicOne: brand.characteristicOne,
    characteristicTwo: brand.characteristicTwo,
    provinceRegionId: brand.provinceRegionId,
    cityRegionId: brand.cityRegionId,
    terminalRegionId: brand.terminalRegionId,
    contactName: brand.contactName,
    contactMobile: brand.contactMobile,
    primaryIndustryLabel: brand.primaryIndustryLabel,
    secondaryIndustryLabel: brand.secondaryIndustryLabel,
    provinceRegionLabel: brand.provinceRegionLabel,
    cityRegionLabel: brand.cityRegionLabel,
    terminalRegionLabel: brand.terminalRegionLabel,
    terminalRegionLevel: brand.terminalRegionLevel,
    readyForEvaluation: brand.readyForEvaluation,
    missingFields: brand.missingFields,
    isCurrent: brand.isCurrent,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
}
