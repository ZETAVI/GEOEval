import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { AuthenticatedPrincipal } from "../domain/identity.types.js";
import type { IdentityHttpRequest } from "./identity-http.js";

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    return context.switchToHttp().getRequest<IdentityHttpRequest>()
      .geoevalPrincipal!;
  },
);

// Brand creation preserves the accepted default-contact behavior without
// exposing the Identity-owned Account projection to business controllers.
export const CurrentAccountMobile = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    return context.switchToHttp().getRequest<IdentityHttpRequest>()
      .geoevalAccount!.mobile;
  },
);
