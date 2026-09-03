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
  MediaDeleteOwnerRequest,
  MediaResourceAdminResponse,
  MediaResourceBatchStatusRequest,
  MediaResourceCreateRequest,
  MediaResourceDeleteRequest,
  MediaResourceDeleteResponse,
  MediaResourceUpdateRequest,
  MediaSupplierCreateRequest,
  MediaSupplierDetailResponse,
  MediaSupplierResponse,
  MediaSupplierUpdateRequest,
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
  @ApiBody({ type: MediaDeleteOwnerRequest })
  @HttpCode(204)
  async deletePlatform(
    @Req() request: AuthenticatedRequest,
    @Param("platformId") platformId: string,
    @Body() input: MediaDeleteOwnerRequest,
  ): Promise<void> {
    await this.media.deletePlatform(
      request.geoevalAccount!.id,
      platformId,
      input,
    );
  }

  @Get("suppliers")
  @ApiOkResponse({ type: [MediaSupplierResponse] })
  suppliers(): Promise<MediaSupplierResponse[]> {
    return this.media.listSuppliers();
  }

  @Get("suppliers/:supplierId")
  @ApiOkResponse({ type: MediaSupplierDetailResponse })
  supplier(
    @Param("supplierId") supplierId: string,
  ): Promise<MediaSupplierDetailResponse> {
    return this.media.supplier(supplierId);
  }

  @Post("suppliers")
  @ApiBody({ type: MediaSupplierCreateRequest })
  @ApiCreatedResponse({ type: MediaSupplierResponse })
  createSupplier(
    @Req() request: AuthenticatedRequest,
    @Body() input: MediaSupplierCreateRequest,
  ): Promise<MediaSupplierResponse> {
    return this.media.createSupplier(request.geoevalAccount!.id, input);
  }

  @Patch("suppliers/:supplierId")
  @ApiBody({ type: MediaSupplierUpdateRequest })
  @ApiOkResponse({ type: MediaSupplierResponse })
  updateSupplier(
    @Req() request: AuthenticatedRequest,
    @Param("supplierId") supplierId: string,
    @Body() input: MediaSupplierUpdateRequest,
  ): Promise<MediaSupplierResponse> {
    return this.media.updateSupplier(
      request.geoevalAccount!.id,
      supplierId,
      input,
    );
  }

  @Delete("suppliers/:supplierId")
  @ApiBody({ type: MediaDeleteOwnerRequest })
  @HttpCode(204)
  async deleteSupplier(
    @Req() request: AuthenticatedRequest,
    @Param("supplierId") supplierId: string,
    @Body() input: MediaDeleteOwnerRequest,
  ): Promise<void> {
    await this.media.deleteSupplier(
      request.geoevalAccount!.id,
      supplierId,
      input,
    );
  }

  @Patch("resources/status")
  @ApiBody({ type: MediaResourceBatchStatusRequest })
  @ApiOkResponse({ type: [MediaResourceAdminResponse] })
  batchUpdateResourceStatus(
    @Req() request: AuthenticatedRequest,
    @Body() input: MediaResourceBatchStatusRequest,
  ): Promise<MediaResourceAdminResponse[]> {
    return this.media.batchUpdateResourceStatus(
      request.geoevalAccount!.id,
      input,
    );
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
  @ApiBody({ type: MediaResourceDeleteRequest })
  @ApiOkResponse({ type: MediaResourceDeleteResponse })
  deleteResource(
    @Req() request: AuthenticatedRequest,
    @Param("resourceId") resourceId: string,
    @Body() input: MediaResourceDeleteRequest,
  ): Promise<MediaResourceDeleteResponse> {
    return this.media.deleteResource(
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
