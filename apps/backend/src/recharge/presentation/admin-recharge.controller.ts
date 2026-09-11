import {
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import {
  ApiHeader,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { AdminRechargeService } from "../application/admin-recharge.service.js";
import {
  AdminRechargeDetailResponse,
  AdminRechargePageResponse,
} from "./admin-recharge.dto.js";
@ApiTags("admin-recharges")
@ApiHeader({
  name: "x-geoeval-account",
  required: true,
  description: "Expected administrator identity; never the target customer",
})
@RequireAccountRoles("ADMINISTRATOR")
@Controller("admin/recharges")
export class AdminRechargeController {
  constructor(
    @Inject(AdminRechargeService)
    private readonly service: AdminRechargeService,
  ) {}
  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: AdminRechargePageResponse })
  @ApiQuery({
    name: "accountId",
    required: false,
    type: String,
    format: "uuid",
  })
  @ApiQuery({ name: "orderId", required: false, type: String, format: "uuid" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["PENDING_PAYMENT", "CONFIRMING", "SUCCESSFUL", "CLOSED"],
  })
  @ApiQuery({
    name: "createdFrom",
    required: false,
    type: String,
    format: "date-time",
  })
  @ApiQuery({
    name: "createdBefore",
    required: false,
    type: String,
    format: "date-time",
  })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  list(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query() raw: unknown,
  ) {
    this.service.assertActor(p.accountId, expected);
    return this.service.list(p.accountId, raw);
  }
  @Get(":id")
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: AdminRechargeDetailResponse })
  @ApiParam({ name: "id", format: "uuid" })
  detail(
    @CurrentPrincipal() p: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    this.service.assertActor(p.accountId, expected);
    return this.service.detail(id);
  }
}
