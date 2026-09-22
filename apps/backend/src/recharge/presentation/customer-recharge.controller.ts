import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiExcludeEndpoint,
  ApiHeader,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { CustomerRechargeService } from "../application/customer-recharge.service.js";
import {
  RechargeAcceptedResponse,
  RechargeCashierGrantResponse,
  RechargeCommandRequest,
  RechargeCreateRequest,
  RechargeOptionsResponse,
  RechargePageResponse,
  RechargeReadResponse,
} from "./customer-recharge.dto.js";

@ApiTags("recharges")
@ApiHeader({
  name: "x-geoeval-account",
  required: true,
  description:
    "Expected signed-in account; never overrides the authenticated owner",
})
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller("recharges")
export class CustomerRechargeController {
  constructor(
    @Inject(CustomerRechargeService)
    private readonly service: CustomerRechargeService,
  ) {}
  @Get("options")
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: RechargeOptionsResponse })
  options(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
  ) {
    this.service.assertAccount(p.accountId, expected);
    return this.service.options();
  }
  @Post()
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiBody({ type: RechargeCreateRequest })
  @ApiOkResponse({ type: RechargeReadResponse })
  create(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Body() raw: unknown,
  ) {
    this.service.assertAccount(p.accountId, expected);
    return this.service.create(p.accountId, raw);
  }
  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: RechargePageResponse })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["PENDING_PAYMENT", "CONFIRMING", "SUCCESSFUL", "CLOSED"],
  })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  list(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query() query: unknown,
  ) {
    this.service.assertAccount(p.accountId, expected);
    return this.service.list(p.accountId, query);
  }
  @Get(":id")
  @Header("Cache-Control", "no-store")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: RechargeReadResponse })
  detail(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    this.service.assertAccount(p.accountId, expected);
    return this.service.detail(p.accountId, id);
  }
  @Post(":id/verify")
  @HttpCode(202)
  @Header("Cache-Control", "no-store")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ type: RechargeCommandRequest })
  @ApiAcceptedResponse({ type: RechargeAcceptedResponse })
  verify(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ) {
    this.service.assertAccount(p.accountId, expected);
    return this.service.command(p.accountId, id, "verify", raw);
  }
  @Post(":id/cancel")
  @HttpCode(202)
  @Header("Cache-Control", "no-store")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ type: RechargeCommandRequest })
  @ApiAcceptedResponse({ type: RechargeAcceptedResponse })
  cancel(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ) {
    this.service.assertAccount(p.accountId, expected);
    return this.service.command(p.accountId, id, "cancel", raw);
  }
  @Post(":id/cashier")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ type: RechargeCommandRequest })
  @ApiOkResponse({ type: RechargeCashierGrantResponse })
  cashier(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ) {
    this.service.assertAccount(p.accountId, expected);
    return this.service.grantCashier(p.accountId, id, raw);
  }
  @Get(":id/cashier-page")
  @ApiExcludeEndpoint()
  @Header("Cache-Control", "no-store")
  @Header("Referrer-Policy", "no-referrer")
  @Header("X-Content-Type-Options", "nosniff")
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header(
    "Content-Security-Policy",
    "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action https://*.alipay.com https://*.alipaydev.com; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
  )
  @ApiParam({ name: "id", format: "uuid" })
  cashierPage(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.cashierPage(p.accountId, id);
  }
}
