import { Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";

import { SessionGuard } from "../../identity/presentation/session.guard.js";
import type { AuthenticatedRequest } from "../../identity/presentation/session-http.js";
import { StoreLocationVerificationService } from "../application/store-location-verification.service.js";
import {
  StoreLocationVerificationRequest,
  StoreLocationVerificationResponse,
} from "./brand.dto.js";

@ApiTags("brands")
@UseGuards(SessionGuard)
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
    @Req() request: AuthenticatedRequest,
    @Body() input: StoreLocationVerificationRequest,
  ): Promise<StoreLocationVerificationResponse> {
    return this.verifications.verify(request.geoevalAccount!.id, input);
  }
}
