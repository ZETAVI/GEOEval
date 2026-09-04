export type IdentityGovernanceErrorCode =
  | "ACTOR_FORBIDDEN"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_ALREADY_EXISTS"
  | "STALE_REVISION"
  | "NO_CHANGE"
  | "CONCURRENT_GOVERNANCE_CONFLICT"
  | "SELF_GOVERNANCE_FORBIDDEN"
  | "ROLE_FAMILY_CONVERSION_FORBIDDEN"
  | "LAST_ADMINISTRATOR_FORBIDDEN";

export class IdentityGovernanceError extends Error {
  constructor(
    readonly code: IdentityGovernanceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "IdentityGovernanceError";
  }
}
