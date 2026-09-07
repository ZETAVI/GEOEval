import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { PublishingSelectionService } from "../application/publishing-selection.service.js";
import {
  PublishingSelectionResponse,
  PublishingWorkspaceResponse,
  SavePublishingSelectionRequest,
} from "./publishing-selection.dto.js";

@ApiTags("publishing-selection")
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller("publishing")
export class PublishingSelectionController {
  constructor(
    @Inject(PublishingSelectionService)
    private readonly selections: PublishingSelectionService,
  ) {}
  @Get("workspace")
  @ApiOkResponse({ type: PublishingWorkspaceResponse })
  workspace(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.selections.workspace(principal.accountId);
  }
  @Put("brands/:brandId/selection")
  @ApiParam({ name: "brandId", format: "uuid" })
  @ApiBody({ type: SavePublishingSelectionRequest })
  @ApiOkResponse({ type: PublishingSelectionResponse })
  save(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("brandId", ParseUUIDPipe) brandId: string,
    @Body() body: unknown,
  ) {
    return this.selections.save(principal.accountId, brandId, body);
  }
}
