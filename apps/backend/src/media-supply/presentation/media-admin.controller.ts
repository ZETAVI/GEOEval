import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AccountSessionGuard } from "../../identity/presentation/account-session.guard.js";
import { RequireRole } from "../../identity/presentation/require-role.js";
import { RoleGuard } from "../../identity/presentation/role.guard.js";
import type { AuthenticatedRequest } from "../../identity/presentation/session-http.js";
import { MediaSupplyService } from "../application/media-supply.service.js";
import {
  MediaCatalogAuditResponse,
  MediaPlatformAdminResponse,
  MediaPlatformCreateRequest,
  MediaPlatformUpdateRequest,
  MediaReasonRequest,
  MediaResourceAdminResponse,
  MediaResourceCreateRequest,
  MediaResourceUpdateRequest,
  MediaSupplySourceCreateRequest,
  MediaSupplySourceResponse,
  MediaSupplySourceUpdateRequest,
} from "./media-supply.dto.js";

@ApiTags("admin-media")
@RequireRole("ADMINISTRATOR")
@UseGuards(AccountSessionGuard, RoleGuard)
@Controller("admin/media")
export class MediaAdminController {
  constructor(
    @Inject(MediaSupplyService) private readonly media: MediaSupplyService,
  ) {}

  @Get("platforms")
  @ApiOkResponse({ type: [MediaPlatformAdminResponse] })
  platforms(): Promise<MediaPlatformAdminResponse[]> {
    return this.media.listAdminPlatforms();
  }

  @Get("platforms/:platformId")
  @ApiOkResponse({ type: MediaPlatformAdminResponse })
  platform(
    @Param("platformId") platformId: string,
  ): Promise<MediaPlatformAdminResponse> {
    return this.media.adminPlatform(platformId);
  }

  @Post("platforms")
  @ApiBody({ type: MediaPlatformCreateRequest })
  @ApiCreatedResponse({ type: MediaPlatformAdminResponse })
  createPlatform(
    @Req() request: AuthenticatedRequest,
    @Body() input: MediaPlatformCreateRequest,
  ): Promise<MediaPlatformAdminResponse> {
    return this.media.createPlatform(request.geoevalAccount!.id, input);
  }

  @Patch("platforms/:platformId")
  @ApiBody({ type: MediaPlatformUpdateRequest })
  @ApiOkResponse({ type: MediaPlatformAdminResponse })
  updatePlatform(
    @Req() request: AuthenticatedRequest,
    @Param("platformId") platformId: string,
    @Body() input: MediaPlatformUpdateRequest,
  ): Promise<MediaPlatformAdminResponse> {
    return this.media.updatePlatform(
      request.geoevalAccount!.id,
      platformId,
      input,
    );
  }

  @Delete("platforms/:platformId")
  @ApiBody({ type: MediaReasonRequest })
  @HttpCode(204)
  @ApiNoContentResponse()
  async deletePlatform(
    @Req() request: AuthenticatedRequest,
    @Param("platformId") platformId: string,
    @Body() input: MediaReasonRequest,
  ): Promise<void> {
    await this.media.deletePlatform(
      request.geoevalAccount!.id,
      platformId,
      input,
    );
  }

  @Get("sources")
  @ApiOkResponse({ type: [MediaSupplySourceResponse] })
  sources(): Promise<MediaSupplySourceResponse[]> {
    return this.media.listSources();
  }

  @Post("sources")
  @ApiBody({ type: MediaSupplySourceCreateRequest })
  @ApiCreatedResponse({ type: MediaSupplySourceResponse })
  createSource(
    @Req() request: AuthenticatedRequest,
    @Body() input: MediaSupplySourceCreateRequest,
  ): Promise<MediaSupplySourceResponse> {
    return this.media.createSource(request.geoevalAccount!.id, input);
  }

  @Patch("sources/:sourceId")
  @ApiBody({ type: MediaSupplySourceUpdateRequest })
  @ApiOkResponse({ type: MediaSupplySourceResponse })
  updateSource(
    @Req() request: AuthenticatedRequest,
    @Param("sourceId") sourceId: string,
    @Body() input: MediaSupplySourceUpdateRequest,
  ): Promise<MediaSupplySourceResponse> {
    return this.media.updateSource(request.geoevalAccount!.id, sourceId, input);
  }

  @Delete("sources/:sourceId")
  @ApiBody({ type: MediaReasonRequest })
  @HttpCode(204)
  @ApiNoContentResponse()
  async deleteSource(
    @Req() request: AuthenticatedRequest,
    @Param("sourceId") sourceId: string,
    @Body() input: MediaReasonRequest,
  ): Promise<void> {
    await this.media.deleteSource(request.geoevalAccount!.id, sourceId, input);
  }

  @Get("platforms/:platformId/resources")
  @ApiOkResponse({ type: [MediaResourceAdminResponse] })
  resources(
    @Param("platformId") platformId: string,
  ): Promise<MediaResourceAdminResponse[]> {
    return this.media.listResources(platformId);
  }

  @Post("resources")
  @ApiBody({ type: MediaResourceCreateRequest })
  @ApiCreatedResponse({ type: MediaResourceAdminResponse })
  createResource(
    @Req() request: AuthenticatedRequest,
    @Body() input: MediaResourceCreateRequest,
  ): Promise<MediaResourceAdminResponse> {
    return this.media.createResource(request.geoevalAccount!.id, input);
  }

  @Patch("resources/:resourceId")
  @ApiBody({ type: MediaResourceUpdateRequest })
  @ApiOkResponse({ type: MediaResourceAdminResponse })
  updateResource(
    @Req() request: AuthenticatedRequest,
    @Param("resourceId") resourceId: string,
    @Body() input: MediaResourceUpdateRequest,
  ): Promise<MediaResourceAdminResponse> {
    return this.media.updateResource(
      request.geoevalAccount!.id,
      resourceId,
      input,
    );
  }

  @Delete("resources/:resourceId")
  @ApiBody({ type: MediaReasonRequest })
  @HttpCode(204)
  @ApiNoContentResponse()
  async deleteResource(
    @Req() request: AuthenticatedRequest,
    @Param("resourceId") resourceId: string,
    @Body() input: MediaReasonRequest,
  ): Promise<void> {
    await this.media.deleteResource(
      request.geoevalAccount!.id,
      resourceId,
      input,
    );
  }

  @Get("audits")
  @ApiOkResponse({ type: [MediaCatalogAuditResponse] })
  audits(
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("limit") limit?: string,
  ): Promise<MediaCatalogAuditResponse[]> {
    return this.media.listAudits({
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(limit ? { limit } : {}),
    });
  }
}
