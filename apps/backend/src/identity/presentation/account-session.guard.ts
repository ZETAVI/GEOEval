import { Inject, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";

import { IdentityService } from "../application/identity.service.js";
import { readSessionToken, type AuthenticatedRequest } from "./session-http.js";

@Injectable()
export class AccountSessionGuard implements CanActivate {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.geoevalAccount = await this.identity.authenticateAccount(
      readSessionToken(request),
    );
    return true;
  }
}
