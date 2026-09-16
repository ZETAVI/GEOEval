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
  ApiProperty,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { AgencyCommissionService } from "../../application/agency-commission.service.js";
export class CommissionResponse {
  @ApiProperty({ type: String }) orderId!: string;
  @ApiProperty({ type: Number }) number!: number;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) agentId!: string;
  @ApiProperty({ type: String }) customerId!: string;
  @ApiProperty({ type: String }) brandId!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: string;
  @ApiProperty({ type: String }) status!: string;
  @ApiProperty({ type: Number }) rateBps!: number;
  @ApiProperty({ type: Number }) originalFundedPoints!: number;
  @ApiProperty({ type: Number }) originalGrantedPoints!: number;
  @ApiProperty({ type: Number }) returnFundedPoints!: number;
  @ApiProperty({ type: Number }) returnGrantedPoints!: number;
  @ApiProperty({ type: Number }) eligibleFundedPoints!: number;
  @ApiProperty({ type: Boolean }) returnConfirmed!: boolean;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  settledAt!: string | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  bookedAt!: string | null;
  @ApiProperty({ enum: ["PENDING", "BOOKED"] }) state!: "PENDING" | "BOOKED";
  @ApiProperty({
    type: String,
    description: "Integer renminbi fen, never a floating-point point balance",
  })
  amountFen!: string;
}
export class CommissionSummaryResponse {
  @ApiProperty({ type: String }) pendingFen!: string;
  @ApiProperty({ type: String }) bookedFen!: string;
  @ApiProperty({ type: Number }) pendingCount!: number;
  @ApiProperty({ type: Number }) bookedCount!: number;
}
export class CommissionPageResponse {
  @ApiProperty({ type: [CommissionResponse] }) items!: CommissionResponse[];
  @ApiProperty({ type: CommissionSummaryResponse })
  summary!: CommissionSummaryResponse;
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
@ApiTags("agency-commission")
@ApiHeader({ name: "x-geoeval-account", required: true })
@RequireAccountRoles("AGENT", "ADMINISTRATOR")
@Controller("agency/commissions")
export class CommissionController {
  constructor(
    @Inject(AgencyCommissionService)
    private readonly service: AgencyCommissionService,
  ) {}
  @Get()
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: CommissionPageResponse })
  @ApiQuery({ name: "agentId", required: false, type: String })
  @ApiQuery({ name: "orderId", required: false, type: String })
  @ApiQuery({ name: "state", required: false, enum: ["PENDING", "BOOKED"] })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  list(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Query() raw: unknown,
  ) {
    return this.service.list(actor, expected, raw);
  }
  @Get(":orderId")
  @Header("Cache-Control", "private, no-store")
  @ApiOkResponse({ type: CommissionResponse })
  detail(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Headers("x-geoeval-account") expected: string | undefined,
    @Param("orderId", ParseUUIDPipe) id: string,
  ) {
    return this.service.detail(actor, expected, id);
  }
}
