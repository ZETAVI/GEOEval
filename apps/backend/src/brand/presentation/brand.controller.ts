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
  list(@Req() request: AuthenticatedRequest): Promise<BrandView[]> {
    return this.brands.list(request.geoevalAccount!.id);
  }

  @Get("current")
  @ApiOkResponse({
    schema: {
      nullable: true,
      allOf: [{ $ref: getSchemaPath(BrandResponse) }],
    },
  })
  current(@Req() request: AuthenticatedRequest): Promise<BrandView | null> {
    return this.brands.current(request.geoevalAccount!.id);
  }

  @Post()
  @ApiBody({ type: BrandMutationRequest })
  @ApiCreatedResponse({ type: BrandResponse })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: BrandMutationRequest,
  ): Promise<BrandView> {
    return this.brands.create(
      request.geoevalAccount!.id,
      input,
      request.geoevalAccount!.mobile,
    );
  }

  @Patch(":id")
  @ApiBody({ type: BrandMutationRequest })
  @ApiOkResponse({ type: BrandResponse })
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: BrandMutationRequest,
  ): Promise<BrandView> {
    return this.brands.update(request.geoevalAccount!.id, id, input);
  }

  @Put(":id/current")
  @ApiOkResponse({ type: BrandResponse })
  selectCurrent(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<BrandView> {
    return this.brands.selectCurrent(request.geoevalAccount!.id, id);
  }
}
