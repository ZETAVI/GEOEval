import { presentBrand } from "../application/brand-customer-view.js";
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";

import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import {
  CurrentAccountMobile,
  CurrentPrincipal,
} from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { BrandService } from "../application/brand.service.js";
import type {
  BrandMutationInput,
  BrandUpdateInput,
} from "../domain/brand.types.js";
import {
  BrandArticleInformationRequest,
  BrandCharacteristicMutationRequest,
  BrandCharacteristicResponse,
  BrandMutationRequest,
  BrandResponse,
  BrandUpdateRequest,
} from "./brand.dto.js";

@ApiTags("brands")
@ApiExtraModels(
  BrandResponse,
  BrandMutationRequest,
  BrandUpdateRequest,
  BrandCharacteristicMutationRequest,
  BrandCharacteristicResponse,
  BrandArticleInformationRequest,
)
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller("brands")
export class BrandController {
  constructor(@Inject(BrandService) private readonly brands: BrandService) {}

  @Get()
  @ApiOkResponse({ type: [BrandResponse] })
  async list(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<BrandResponse[]> {
    return (await this.brands.list(principal.accountId)).map(presentBrand);
  }

  @Get("current")
  @ApiOkResponse({
    schema: {
      nullable: true,
      allOf: [{ $ref: getSchemaPath(BrandResponse) }],
    },
  })
  async current(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<BrandResponse | null> {
    const brand = await this.brands.current(principal.accountId);
    return brand ? presentBrand(brand) : null;
  }

  @Post()
  @ApiBody({ type: BrandMutationRequest })
  @ApiCreatedResponse({ type: BrandResponse })
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @CurrentAccountMobile() accountMobile: string,
    @Body() input: BrandMutationRequest,
  ): Promise<BrandResponse> {
    return this.brands
      .create(principal.accountId, input as BrandMutationInput, accountMobile)
      .then(presentBrand);
  }

  @Patch(":id")
  @ApiBody({ type: BrandUpdateRequest })
  @ApiOkResponse({ type: BrandResponse })
  update(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("id") id: string,
    @Body() input: BrandUpdateRequest,
  ): Promise<BrandResponse> {
    return this.brands
      .update(principal.accountId, id, input as BrandUpdateInput)
      .then(presentBrand);
  }

  @Put(":id/current")
  @ApiOkResponse({ type: BrandResponse })
  selectCurrent(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("id") id: string,
  ): Promise<BrandResponse> {
    return this.brands
      .selectCurrent(principal.accountId, id)
      .then(presentBrand);
  }
}
