import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { PublishingPackageService } from "../application/publishing-package.service.js";
import {
  PublishingPackageAdminResponse,
  PublishingPackageAuditResponse,
  PublishingPackageCreateRequest,
  PublishingPackageCustomerResponse,
  PublishingPackageUpdateRequest,
} from "./publishing-package.dto.js";

@ApiTags("admin-publishing")
@RequireAccountRoles("ADMINISTRATOR")
@Controller("admin/publishing/packages")
export class PublishingPackageAdminController {
  constructor(
    @Inject(PublishingPackageService)
    private readonly packages: PublishingPackageService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [PublishingPackageAdminResponse] })
  list() {
    return this.packages.listAdmin();
  }

  @Post()
  @ApiBody({ type: PublishingPackageCreateRequest })
  @ApiCreatedResponse({ type: PublishingPackageAdminResponse })
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: unknown,
  ) {
    return this.packages.create(principal.accountId, input);
  }

  @Patch(":packageId")
  @ApiParam({ name: "packageId", format: "uuid" })
  @ApiBody({ type: PublishingPackageUpdateRequest })
  @ApiOkResponse({ type: PublishingPackageAdminResponse })
  update(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("packageId", ParseUUIDPipe) id: string,
    @Body() input: unknown,
  ) {
    return this.packages.update(principal.accountId, id, input);
  }

  @Get(":packageId/audits")
  @ApiParam({ name: "packageId", format: "uuid" })
  @ApiOkResponse({ type: [PublishingPackageAuditResponse] })
  audits(@Param("packageId", ParseUUIDPipe) id: string) {
    return this.packages.audits(id);
  }
}

@ApiTags("publishing")
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller("publishing/packages")
export class PublishingPackageCustomerController {
  constructor(
    @Inject(PublishingPackageService)
    private readonly packages: PublishingPackageService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [PublishingPackageCustomerResponse] })
  list() {
    return this.packages.listCustomer();
  }
}
