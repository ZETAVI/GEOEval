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
import { PointAccountService } from "../application/point-account.service.js";
import {
  PointAdjustmentRequest,
  PointAdminBalanceResponse,
  PointAdminChangeResponse,
  PointAdminHistoryResponse,
  PointBalanceResponse,
  PointHistoryResponse,
} from "./point-account.dto.js";

@ApiTags("points")
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller("points")
export class PointCustomerController {
  constructor(
    @Inject(PointAccountService) private readonly points: PointAccountService,
  ) {}
  @Get()
  @ApiOkResponse({ type: PointBalanceResponse })
  balance(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.points.customerBalance(principal.accountId);
  }
  @Get("changes")
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "beforeSequence", required: false, type: Number })
  @ApiOkResponse({ type: PointHistoryResponse })
  history(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query() query: unknown,
  ) {
    return this.points.history(principal.accountId, query);
  }
}

@ApiTags("admin-points")
@RequireAccountRoles("ADMINISTRATOR")
@Controller("admin/points/accounts")
export class PointAdminController {
  constructor(
    @Inject(PointAccountService) private readonly points: PointAccountService,
  ) {}
  @Get(":accountId")
  @ApiParam({ name: "accountId", format: "uuid" })
  @ApiOkResponse({ type: PointAdminBalanceResponse })
  balance(@Param("accountId", ParseUUIDPipe) accountId: string) {
    return this.points.adminBalance(accountId);
  }
  @Get(":accountId/changes")
  @ApiParam({ name: "accountId", format: "uuid" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "beforeSequence", required: false, type: Number })
  @ApiOkResponse({ type: PointAdminHistoryResponse })
  history(
    @Param("accountId", ParseUUIDPipe) accountId: string,
    @Query() query: unknown,
  ) {
    return this.points.adminHistory(accountId, query);
  }
  @Post(":accountId/adjustments")
  @HttpCode(200)
  @ApiParam({ name: "accountId", format: "uuid" })
  @ApiBody({ type: PointAdjustmentRequest })
  @ApiOkResponse({ type: PointAdminChangeResponse })
  adjust(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("accountId", ParseUUIDPipe) accountId: string,
    @Body() input: unknown,
  ) {
    return this.points.adjust(accountId, principal.accountId, input);
  }
}
