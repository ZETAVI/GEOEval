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
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import type { ApiConfig } from "../../config/runtime-config.js";
import { PublicAccess } from "../access/access.metadata.js";
import { CurrentPrincipal } from "../access/current-principal.js";
import type {
  HeaderWriter,
  IdentityHttpRequest,
} from "../access/identity-http.js";
import {
  clearedSessionCookie,
  readSessionToken,
  sessionCookie,
} from "../access/session-cookie.js";
import { AuthenticationService } from "../application/authentication.service.js";
import { IDENTITY_CONFIG } from "../application/identity.config.js";
import { SessionService } from "../application/session.service.js";
import type { AuthenticatedPrincipal } from "../domain/identity.types.js";
import {
  AccountResponse,
  ChallengeResponse,
  CompleteSessionRequest,
  RequestChallengeRequest,
  SessionAuthenticationErrorResponse,
} from "./identity.dto.js";

@ApiTags("identity")
@Controller("identity")
export class IdentityController {
  constructor(
    @Inject(AuthenticationService)
    private readonly authentication: AuthenticationService,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(IDENTITY_CONFIG) private readonly config: ApiConfig,
  ) {}

  @PublicAccess()
  @Post("challenges")
  @ApiBody({ type: RequestChallengeRequest })
  @ApiCreatedResponse({ type: ChallengeResponse })
  requestChallenge(
    @Body() input: RequestChallengeRequest,
  ): Promise<ChallengeResponse> {
    return this.authentication.requestChallenge(
      input.mobile,
      input.acquisitionVisitToken,
      input.existingAccountOnly ?? false,
    );
  }

  @PublicAccess()
  @Post("sessions")
  @ApiBody({ type: CompleteSessionRequest })
  @ApiCreatedResponse({ type: AccountResponse })
  async createSession(
    @Body() input: unknown,
    @Res({ passthrough: true }) response: HeaderWriter,
  ): Promise<AccountResponse> {
    const completed = await this.authentication.completeChallenge(input);
    response.setHeader(
      "Set-Cookie",
      sessionCookie({
        token: completed.token,
        expiresAt: completed.expiresAt,
        secure: this.config.authCookieSecure,
        persistent: completed.account.role === "TERMINAL_CUSTOMER",
      }),
    );
    return completed.account;
  }

  @Get("me")
  @ApiOkResponse({ type: AccountResponse })
  @ApiUnauthorizedResponse({ type: SessionAuthenticationErrorResponse })
  me(@Req() request: IdentityHttpRequest): AccountResponse {
    return request.geoevalAccount!;
  }

  @Delete("session")
  @HttpCode(204)
  @ApiNoContentResponse()
  async deleteSession(
    @Req() request: IdentityHttpRequest,
    @Res({ passthrough: true }) response: HeaderWriter,
  ): Promise<void> {
    await this.sessions.logoutCurrent(
      readSessionToken(request, this.config.authCookieSecure),
    );
    response.setHeader(
      "Set-Cookie",
      clearedSessionCookie(this.config.authCookieSecure),
    );
  }

  @Delete("sessions")
  @HttpCode(204)
  @ApiNoContentResponse()
  async deleteAllSessions(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Res({ passthrough: true }) response: HeaderWriter,
  ): Promise<void> {
    await this.sessions.logoutAll(principal.accountId);
    response.setHeader(
      "Set-Cookie",
      clearedSessionCookie(this.config.authCookieSecure),
    );
  }
}
