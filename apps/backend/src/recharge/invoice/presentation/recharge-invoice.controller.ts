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
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentPrincipal } from "../../../identity/access/current-principal.js";
import { RequireAccountRoles } from "../../../identity/access/access.metadata.js";
import type { AuthenticatedPrincipal } from "../../../identity/domain/identity.types.js";
import { RechargeInvoiceService } from "../application/recharge-invoice.service.js";
import {
  InternalRechargeInvoicePageResponse,
  InternalRechargeInvoiceResponse,
  RechargeInvoiceApplicationRequest,
  RechargeInvoiceCommandRequest,
  RechargeInvoiceDefaultResponse,
  RechargeInvoicePageResponse,
  RechargeInvoiceOrderSummariesResponse,
  RechargeInvoiceResponse,
  RechargeInvoiceResubmissionRequest,
} from "./recharge-invoice.dto.js";

@ApiTags("recharge-invoices")
@ApiHeader({ name: "x-geoeval-account", required: true })
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller("recharges")
export class RechargeInvoiceApplicationController {
  constructor(
    @Inject(RechargeInvoiceService)
    private readonly service: RechargeInvoiceService,
  ) {}

  @Post(":orderId/invoice")
  @HttpCode(200)
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiBody({ type: RechargeInvoiceApplicationRequest })
  @ApiOkResponse({ type: RechargeInvoiceResponse })
  apply(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() body: RechargeInvoiceApplicationRequest,
  ) {
    return this.service.apply(actor, expected, orderId, body);
  }
}

@ApiTags("recharge-invoices")
@ApiHeader({ name: "x-geoeval-account", required: true })
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller("recharge-invoices")
export class CustomerRechargeInvoiceController {
  constructor(
    @Inject(RechargeInvoiceService)
    private readonly service: RechargeInvoiceService,
  ) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  @ApiQuery({ name: "cursor", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiOkResponse({ type: RechargeInvoicePageResponse })
  list(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query() query: unknown,
  ) {
    return this.service.listCustomer(actor, expected, query);
  }

  @Get("default-submission")
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: RechargeInvoiceDefaultResponse })
  defaults(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
  ) {
    return this.service.defaultSubmission(actor, expected);
  }

  @Get("order-summaries")
  @Header("Cache-Control", "private, no-store")
  @ApiQuery({ name: "orderIds", type: String })
  @ApiOkResponse({ type: RechargeInvoiceOrderSummariesResponse })
  orderSummaries(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query() query: unknown,
  ) {
    return this.service.orderSummaries(actor, expected, query);
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: RechargeInvoiceResponse })
  detail(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.customerDetail(actor, expected, id);
  }

  @Post(":id/resubmit")
  @HttpCode(200)
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ type: RechargeInvoiceResubmissionRequest })
  @ApiOkResponse({ type: RechargeInvoiceResponse })
  resubmit(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: RechargeInvoiceResubmissionRequest,
  ) {
    return this.service.resubmit(actor, expected, id, body);
  }
}

@ApiTags("operations-recharge-invoices")
@ApiHeader({ name: "x-geoeval-account", required: true })
@RequireAccountRoles("OPERATIONS")
@Controller("operations/recharge-invoices")
export class OperationsRechargeInvoiceController {
  constructor(
    @Inject(RechargeInvoiceService)
    private readonly service: RechargeInvoiceService,
  ) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  @ApiQuery({ name: "scope", enum: ["UNASSIGNED", "MINE"], required: false })
  @ApiQuery({
    name: "status",
    enum: ["PROCESSING", "NEEDS_CORRECTION", "ISSUED"],
    required: false,
  })
  @ApiQuery({ name: "cursor", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiOkResponse({ type: InternalRechargeInvoicePageResponse })
  list(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query() query: unknown,
  ) {
    return this.service.listInternal(actor, expected, query);
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: InternalRechargeInvoiceResponse })
  detail(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.internalDetail(actor, expected, id);
  }

  @Post(":id/actions")
  @HttpCode(200)
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ type: RechargeInvoiceCommandRequest })
  @ApiOkResponse({ type: InternalRechargeInvoiceResponse })
  command(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: RechargeInvoiceCommandRequest,
  ) {
    return this.service.command(actor, expected, id, body);
  }
}

@ApiTags("admin-recharge-invoices")
@ApiHeader({ name: "x-geoeval-account", required: true })
@RequireAccountRoles("ADMINISTRATOR")
@Controller("admin/recharge-invoices")
export class AdminRechargeInvoiceController {
  constructor(
    @Inject(RechargeInvoiceService)
    private readonly service: RechargeInvoiceService,
  ) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  @ApiQuery({ name: "scope", enum: ["UNASSIGNED", "MINE"], required: false })
  @ApiQuery({
    name: "status",
    enum: ["PROCESSING", "NEEDS_CORRECTION", "ISSUED"],
    required: false,
  })
  @ApiQuery({ name: "accountId", format: "uuid", required: false })
  @ApiQuery({ name: "assigneeAccountId", format: "uuid", required: false })
  @ApiQuery({ name: "cursor", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiOkResponse({ type: InternalRechargeInvoicePageResponse })
  list(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query() query: unknown,
  ) {
    return this.service.listInternal(actor, expected, query);
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({ type: InternalRechargeInvoiceResponse })
  detail(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.internalDetail(actor, expected, id);
  }

  @Post(":id/actions")
  @HttpCode(200)
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBody({ type: RechargeInvoiceCommandRequest })
  @ApiOkResponse({ type: InternalRechargeInvoiceResponse })
  command(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: RechargeInvoiceCommandRequest,
  ) {
    return this.service.command(actor, expected, id, body);
  }
}
