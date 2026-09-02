import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";

import {
  IDENTITY_CONFIG,
  IdentityService,
} from "../application/identity.service.js";
import type { ApiConfig } from "../../config/runtime-config.js";
import {
  AccountResponse,
  ChallengeResponse,
  CompleteSessionRequest,
  RequestChallengeRequest,
} from "./identity.dto.js";
import {
  clearedSessionCookie,
  readSessionToken,
  sessionCookie,
  type AuthenticatedRequest,
  type HeaderWriter,
} from "./session-http.js";
import { SessionGuard } from "./session.guard.js";
import { AccountSessionGuard } from "./account-session.guard.js";

@ApiTags("identity")
@Controller("identity")
export class IdentityController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(IDENTITY_CONFIG) private readonly config: ApiConfig,
  ) {}

  @Post("challenges")
  @ApiBody({ type: RequestChallengeRequest })
  @ApiCreatedResponse({ type: ChallengeResponse })
  requestChallenge(
    @Body() input: RequestChallengeRequest,
  ): Promise<ChallengeResponse> {
    return this.identity.requestChallenge(input.mobile);
  }

  @Post("sessions")
  @ApiBody({ type: CompleteSessionRequest })
  @ApiCreatedResponse({ type: AccountResponse })
  async createSession(
    @Body() input: CompleteSessionRequest,
    @Res({ passthrough: true }) response: HeaderWriter,
  ): Promise<AccountResponse> {
    const completed = await this.identity.completeChallenge(input);
    response.setHeader(
      "Set-Cookie",
      sessionCookie(
        completed.token,
        completed.expiresAt,
        this.config.authCookieSecure,
      ),
    );
    return completed.account;
  }

  @Get("me")
  @UseGuards(AccountSessionGuard)
  @ApiOkResponse({ type: AccountResponse })
  me(@Req() request: AuthenticatedRequest): AccountResponse {
    return request.geoevalAccount!;
  }

  @Delete("session")
  @HttpCode(204)
  async deleteSession(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: HeaderWriter,
  ): Promise<void> {
    await this.identity.logout(readSessionToken(request));
    response.setHeader(
      "Set-Cookie",
      clearedSessionCookie(this.config.authCookieSecure),
    );
  }
}
