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
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { PublicationResolutionWorkflowService } from "../../application/publication-resolution-workflow.service.js";
import { PublicationDeliveryWorkflowService } from "../../application/publication-delivery-workflow.service.js";
import { AssignmentResult } from "./delivery-assignment.dto.js";
import {
  SaveDeliveryResolutionRequest,
  DeliveryExceptionRequest,
  SettleDeliveryReturnRequest,
  DeliveryReturnReceipt,
  DeliveryReplacementTargetsResponse,
} from "./delivery-resolution.dto.js";

@ApiTags("publication-delivery")
@RequireAccountRoles("OPERATIONS", "ADMINISTRATOR")
@Controller("delivery/orders")
export class DeliveryResolutionController {
  constructor(
    @Inject(PublicationResolutionWorkflowService)
    private readonly workflow: PublicationResolutionWorkflowService,
    @Inject(PublicationDeliveryWorkflowService)
    private readonly deliveries: PublicationDeliveryWorkflowService,
  ) {}
  @Post(":orderId/resolution")
  @HttpCode(200)
  @RequireAccountRoles("OPERATIONS")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiBody({ type: SaveDeliveryResolutionRequest })
  @ApiOkResponse({ type: AssignmentResult })
  save(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ) {
    return this.workflow.save(actor, id, raw);
  }
  @Post(":orderId/exception")
  @HttpCode(200)
  @RequireAccountRoles("OPERATIONS")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiBody({ type: DeliveryExceptionRequest })
  @ApiOkResponse({ type: AssignmentResult })
  exception(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ) {
    return this.workflow.exception(actor, id, raw);
  }
  @Post(":orderId/settlement")
  @HttpCode(200)
  @RequireAccountRoles("ADMINISTRATOR")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiBody({ type: SettleDeliveryReturnRequest })
  @ApiOkResponse({ type: DeliveryReturnReceipt })
  settle(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ) {
    return this.workflow.settle(actor, id, raw);
  }
  @Get(":orderId/replacement-targets")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiOkResponse({ type: DeliveryReplacementTargetsResponse })
  targets(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Query() query: unknown,
  ) {
    return this.deliveries.replacementTargets(actor, id, query);
  }
}
