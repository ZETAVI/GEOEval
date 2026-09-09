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
import { PublicationDeliveryWorkflowService } from "../../application/publication-delivery-workflow.service.js";
import {
  AssignmentRequest,
  AssignmentResult,
  OperationalOrderPage,
  OperationalOrderResponse,
  ReassignRequest,
  ReturnAssignmentRequest,
} from "./delivery-assignment.dto.js";

@ApiTags("publication-delivery")
@RequireAccountRoles("OPERATIONS", "ADMINISTRATOR")
@Controller("delivery/orders")
export class DeliveryAssignmentController {
  constructor(
    @Inject(PublicationDeliveryWorkflowService)
    private readonly workflow: PublicationDeliveryWorkflowService,
  ) {}
  @Get()
  @ApiQuery({ name: "scope", required: false, enum: ["POOL", "MINE", "ALL"] })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({
    name: "state",
    required: false,
    enum: ["ACTIVE", "COMPLETED", "CLOSED", "PENDING_RETURN"],
  })
  @ApiQuery({ name: "cursorCreatedAt", required: false, type: String })
  @ApiQuery({ name: "cursorSequence", required: false, type: Number })
  @ApiOkResponse({ type: OperationalOrderPage })
  list(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Query() query: unknown,
  ) {
    return this.workflow.list(actor, query);
  }
  @Get(":orderId")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiOkResponse({ type: OperationalOrderResponse })
  detail(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
  ) {
    return this.workflow.detail(actor, id);
  }
  @Post(":orderId/claim")
  @HttpCode(200)
  @RequireAccountRoles("OPERATIONS")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiBody({ type: AssignmentRequest })
  @ApiOkResponse({ type: AssignmentResult })
  claim(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ) {
    return this.workflow.act(actor, id, "CLAIM", raw);
  }
  @Post(":orderId/start")
  @HttpCode(200)
  @RequireAccountRoles("OPERATIONS")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiBody({ type: AssignmentRequest })
  @ApiOkResponse({ type: AssignmentResult })
  start(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ) {
    return this.workflow.act(actor, id, "START", raw);
  }
  @Post(":orderId/return")
  @HttpCode(200)
  @RequireAccountRoles("OPERATIONS")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiBody({ type: ReturnAssignmentRequest })
  @ApiOkResponse({ type: AssignmentResult })
  returnToPool(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ) {
    return this.workflow.act(actor, id, "RETURN", raw);
  }
  @Post(":orderId/reassign")
  @HttpCode(200)
  @RequireAccountRoles("ADMINISTRATOR")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiBody({ type: ReassignRequest })
  @ApiOkResponse({ type: AssignmentResult })
  reassign(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ) {
    return this.workflow.act(actor, id, "REASSIGN", raw);
  }
}
