import {
  ForbiddenException,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { ApiConfig } from "../../config/runtime-config.js";
import { SessionService } from "../application/session.service.js";
import { IDENTITY_CONFIG } from "../application/identity.config.js";
import type { AccountRole } from "../domain/identity.types.js";
import { PUBLIC_ACCESS, REQUIRED_ACCOUNT_ROLES } from "./access.metadata.js";
import type { IdentityHttpRequest } from "./identity-http.js";
import { readSessionToken } from "./session-cookie.js";

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(IDENTITY_CONFIG) private readonly config: ApiConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ACCESS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<IdentityHttpRequest>();
    const authenticated = await this.sessions.authenticate(
      readSessionToken(request, this.config.authCookieSecure),
    );
    request.geoevalAccount = authenticated.account;
    request.geoevalPrincipal = authenticated.principal;

    const roles = this.reflector.getAllAndOverride<AccountRole[]>(
      REQUIRED_ACCOUNT_ROLES,
      [context.getHandler(), context.getClass()],
    );
    if (roles?.length && !roles.includes(authenticated.principal.role)) {
      throw new ForbiddenException({
        code: "ACCOUNT_ROLE_FORBIDDEN",
        message: "当前账号角色无权访问该资源",
      });
    }
    return true;
  }
}
