import { Inject, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AccountRole } from "../domain/identity.types.js";
import { REQUIRED_ACCOUNT_ROLES } from "./require-role.js";
import type { AuthenticatedRequest } from "./session-http.js";

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AccountRole[]>(
      REQUIRED_ACCOUNT_ROLES,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return Boolean(
      request.geoevalAccount && required.includes(request.geoevalAccount.role),
    );
  }
}
