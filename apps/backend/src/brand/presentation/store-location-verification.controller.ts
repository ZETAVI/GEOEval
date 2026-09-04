import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ApiBody, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";

import { RequireAccountRoles } from "../../identity/access/access.metadata.js";
import { CurrentPrincipal } from "../../identity/access/current-principal.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { StoreLocationVerificationService } from "../application/store-location-verification.service.js";
import {
  StoreLocationVerificationRequest,
  StoreLocationVerificationResponse,
} from "./brand.dto.js";

@ApiTags("brands")
@RequireAccountRoles("TERMINAL_CUSTOMER")
@Controller("brand-location-verifications")
export class StoreLocationVerificationController {
  constructor(
    @Inject(StoreLocationVerificationService)
    private readonly verifications: StoreLocationVerificationService,
  ) {}

  @Post()
  @ApiBody({ type: StoreLocationVerificationRequest })
  @ApiCreatedResponse({ type: StoreLocationVerificationResponse })
  verify(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: StoreLocationVerificationRequest,
  ): Promise<StoreLocationVerificationResponse> {
    return this.verifications.verify(principal.accountId, input);
  }
}
