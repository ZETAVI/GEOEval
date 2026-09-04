import { SetMetadata } from "@nestjs/common";

import type { AccountRole } from "../domain/identity.types.js";

export const PUBLIC_ACCESS = "geoeval.public-access";
export const REQUIRED_ACCOUNT_ROLES = "geoeval.required-account-roles";
export const CSRF_EXEMPT = "geoeval.csrf-exempt";

export const PublicAccess = () => SetMetadata(PUBLIC_ACCESS, true);
export const RequireAccountRoles = (...roles: AccountRole[]) =>
  SetMetadata(REQUIRED_ACCOUNT_ROLES, roles);
export const CsrfExempt = () => SetMetadata(CSRF_EXEMPT, true);
