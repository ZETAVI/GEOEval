import { SetMetadata } from "@nestjs/common";

import type { AccountRole } from "../domain/identity.types.js";

export const REQUIRED_ACCOUNT_ROLES = "geoeval.required-account-roles";

export const RequireRole = (...roles: AccountRole[]) =>
  SetMetadata(REQUIRED_ACCOUNT_ROLES, roles);
