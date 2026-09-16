import {
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Query,
} from "@nestjs/common";
import { ApiHeader, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { AdminPointRecordsService } from "../application/admin-point-records.service.js";
import { AdminPointRecordsResponse } from "./point-account.dto.js";
@ApiTags("admin-points")
@ApiHeader({ name: "x-geoeval-account", required: true })
@RequireAccountRoles("ADMINISTRATOR")
@Controller("admin/points/records")
export class AdminPointRecordsController {
  constructor(
    @Inject(AdminPointRecordsService)
    private readonly records: AdminPointRecordsService,
  ) {}
  @Get()
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: AdminPointRecordsResponse })
  @ApiQuery({ name: "accountId", required: false, type: String })
  @ApiQuery({ name: "mobile", required: false, type: String })
  @ApiQuery({ name: "referenceId", required: false, type: String })
  @ApiQuery({
    name: "kind",
    required: false,
    enum: ["ADMIN_ADJUSTMENT", "PUBLISHING_ORDER", "RECHARGE", "ORDER_RETURN"],
  })
  @ApiQuery({ name: "createdFrom", required: false, type: String })
  @ApiQuery({ name: "createdBefore", required: false, type: String })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  list(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query() raw: unknown,
  ) {
    return this.records.list(actor.accountId, expected, raw);
  }
}
