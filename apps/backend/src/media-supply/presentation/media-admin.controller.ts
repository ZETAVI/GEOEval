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
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";

import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
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
@RequireAccountRoles("ADMINISTRATOR")
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
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: MediaPlatformCreateRequest,
  ): Promise<MediaPlatformAdminResponse> {
    return this.media.createPlatform(principal.accountId, input);
  }

  @Patch("platforms/:platformId")
  @ApiBody({ type: MediaPlatformUpdateRequest })
  @ApiOkResponse({ type: MediaPlatformAdminResponse })
  updatePlatform(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("platformId") platformId: string,
    @Body() input: MediaPlatformUpdateRequest,
  ): Promise<MediaPlatformAdminResponse> {
    return this.media.updatePlatform(principal.accountId, platformId, input);
  }

  @Delete("platforms/:platformId")
  @ApiBody({ type: MediaDeleteOwnerRequest })
  @HttpCode(204)
  async deletePlatform(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("platformId") platformId: string,
    @Body() input: MediaDeleteOwnerRequest,
  ): Promise<void> {
    await this.media.deletePlatform(principal.accountId, platformId, input);
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
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: MediaSupplierCreateRequest,
  ): Promise<MediaSupplierResponse> {
    return this.media.createSupplier(principal.accountId, input);
  }

  @Patch("suppliers/:supplierId")
  @ApiBody({ type: MediaSupplierUpdateRequest })
  @ApiOkResponse({ type: MediaSupplierResponse })
  updateSupplier(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("supplierId") supplierId: string,
    @Body() input: MediaSupplierUpdateRequest,
  ): Promise<MediaSupplierResponse> {
    return this.media.updateSupplier(principal.accountId, supplierId, input);
  }

  @Delete("suppliers/:supplierId")
  @ApiBody({ type: MediaDeleteOwnerRequest })
  @HttpCode(204)
  async deleteSupplier(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("supplierId") supplierId: string,
    @Body() input: MediaDeleteOwnerRequest,
  ): Promise<void> {
    await this.media.deleteSupplier(principal.accountId, supplierId, input);
  }

  @Patch("resources/status")
  @ApiBody({ type: MediaResourceBatchStatusRequest })
  @ApiOkResponse({ type: [MediaResourceAdminResponse] })
  batchUpdateResourceStatus(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: MediaResourceBatchStatusRequest,
  ): Promise<MediaResourceAdminResponse[]> {
    return this.media.batchUpdateResourceStatus(principal.accountId, input);
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
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: MediaResourceCreateRequest,
  ): Promise<MediaResourceAdminResponse> {
    return this.media.createResource(principal.accountId, input);
  }

  @Patch("resources/:resourceId")
  @ApiBody({ type: MediaResourceUpdateRequest })
  @ApiOkResponse({ type: MediaResourceAdminResponse })
  updateResource(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("resourceId") resourceId: string,
    @Body() input: MediaResourceUpdateRequest,
  ): Promise<MediaResourceAdminResponse> {
    return this.media.updateResource(principal.accountId, resourceId, input);
  }

  @Delete("resources/:resourceId")
  @ApiBody({ type: MediaResourceDeleteRequest })
  @ApiOkResponse({ type: MediaResourceDeleteResponse })
  deleteResource(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("resourceId") resourceId: string,
    @Body() input: MediaResourceDeleteRequest,
  ): Promise<MediaResourceDeleteResponse> {
    return this.media.deleteResource(principal.accountId, resourceId, input);
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
