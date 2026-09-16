import {
  ConflictException,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiHeader,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { FinalOrderSettlementService } from "../../application/final-order-settlement.service.js";
export class AdminOrderSettlementResponse {
  @ApiProperty({ type: String }) orderId!: string;
  @ApiProperty({ type: String }) accountId!: string;
  @ApiProperty({ type: String, nullable: true }) consumptionLedgerId!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) returnLedgerId!: string | null;
  @ApiProperty({ type: Number, nullable: true }) returnedPoints!: number | null;
  @ApiProperty({ type: Number }) agreedPoints!: number;
  @ApiProperty({ type: String, format: "date-time", nullable: true }) endedAt!:
    string | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  appealUntil!: string | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  settledAt!: string | null;
  @ApiProperty({ type: Boolean }) windowElapsed!: boolean;
  @ApiProperty({ type: Boolean }) hasOpenIssue!: boolean;
}
@ApiTags("admin-orders")
@ApiHeader({ name: "x-geoeval-account", required: true })
@RequireAccountRoles("ADMINISTRATOR")
@Controller("admin/orders")
export class AdminOrderSettlementController {
  constructor(
    @Inject(FinalOrderSettlementService)
    private readonly settlement: FinalOrderSettlementService,
  ) {}
  @Get(":id/settlement")
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: AdminOrderSettlementResponse })
  inspect(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    if (!expected || expected.toLowerCase() !== actor.accountId)
      throw new ConflictException("登录账号已变化，请重新查询");
    return this.settlement.inspect(id);
  }
}
