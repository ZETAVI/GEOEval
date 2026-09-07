import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { PublishingOrderService } from "../application/publishing-order.service.js";
import {
  PublishingOrderPageResponse,
  PublishingOrderResponse,
  SubmitPublishingOrderRequest,
} from "./publishing-order.dto.js";

@ApiTags("publishing-orders")
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller("publishing/orders")
export class PublishingOrderController {
  constructor(
    @Inject(PublishingOrderService)
    private readonly orders: PublishingOrderService,
  ) {}
  @Post()
  @HttpCode(200)
  @ApiBody({ type: SubmitPublishingOrderRequest })
  @ApiOkResponse({ type: PublishingOrderResponse })
  submit(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown,
  ) {
    return this.orders.submit(principal.accountId, body);
  }
  @Get()
  @ApiQuery({ name: "brandId", required: false, type: String, format: "uuid" })
  @ApiQuery({ name: "beforeNumber", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiOkResponse({ type: PublishingOrderPageResponse })
  list(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query() query: unknown,
  ) {
    return this.orders.list(principal.accountId, query);
  }
  @Get(":orderId")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiOkResponse({ type: PublishingOrderResponse })
  detail(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) orderId: string,
  ) {
    return this.orders.detail(principal.accountId, orderId);
  }
}
