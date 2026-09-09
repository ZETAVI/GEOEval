import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { PublicationDeliveryWorkflowService } from "../../application/publication-delivery-workflow.service.js";
import {
  BeginPublicationRequest,
  PreparePublicationRequest,
  SavePublicationDraftRequest,
  RecordPublicationResultRequest,
  CorrectPublicationResultRequest,
  ReplacePublicationTargetRequest,
  PublicationWorkPageResponse,
  PublicationWorkReceiptResponse,
  CustomerPublicationPageResponse,
  PublicationWorkAuditResponse,
} from "./publication-work.dto.js";

const requests = [
  BeginPublicationRequest,
  PreparePublicationRequest,
  SavePublicationDraftRequest,
  RecordPublicationResultRequest,
  CorrectPublicationResultRequest,
  ReplacePublicationTargetRequest,
];
@ApiTags("publication-delivery")
@ApiExtraModels(...requests)
@RequireAccountRoles("OPERATIONS", "ADMINISTRATOR")
@Controller("delivery/orders/:orderId/work")
export class PublicationWorkController {
  constructor(
    @Inject(PublicationDeliveryWorkflowService)
    private readonly workflow: PublicationDeliveryWorkflowService,
  ) {}
  @Get()
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiQuery({ name: "afterSlot", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiOkResponse({ type: PublicationWorkPageResponse })
  list(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Query() raw: unknown,
  ) {
    return this.workflow.work(actor, id, raw);
  }
  @Get(":slot/history")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiParam({ name: "slot", type: Number })
  @ApiOkResponse({ type: [PublicationWorkAuditResponse] })
  history(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Param("slot", ParseIntPipe) slot: number,
  ) {
    return this.workflow.workHistory(actor, id, slot);
  }
  @Post(":slot")
  @HttpCode(200)
  @RequireAccountRoles("OPERATIONS")
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiParam({ name: "slot", type: Number })
  @ApiBody({
    schema: { oneOf: requests.map((type) => ({ $ref: getSchemaPath(type) })) },
  })
  @ApiOkResponse({ type: PublicationWorkReceiptResponse })
  act(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Param("slot", ParseIntPipe) slot: number,
    @Body() raw: unknown,
  ) {
    return this.workflow.actWork(actor, id, slot, raw);
  }
}

@ApiTags("publishing-orders")
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller("publishing/orders/:orderId/results")
export class CustomerPublicationResultsController {
  constructor(
    @Inject(PublicationDeliveryWorkflowService)
    private readonly workflow: PublicationDeliveryWorkflowService,
  ) {}
  @Get()
  @ApiParam({ name: "orderId", format: "uuid" })
  @ApiQuery({ name: "afterSlot", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiOkResponse({ type: CustomerPublicationPageResponse })
  list(
    @CurrentPrincipal() actor: AuthenticatedPrincipal,
    @Param("orderId", ParseUUIDPipe) id: string,
    @Query() raw: unknown,
  ) {
    return this.workflow.customerResults(actor.accountId, id, raw);
  }
}
