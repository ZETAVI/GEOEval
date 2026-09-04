export type IdentityGovernanceErrorCode =
  | "ACTOR_FORBIDDEN"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_ALREADY_EXISTS"
  | "STALE_REVISION"
  | "NO_CHANGE"
  | "CONCURRENT_GOVERNANCE_CONFLICT"
  | "GOVERNANCE_CONTROL_UNAVAILABLE"
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

export class ChallengeRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("验证码请求过于频繁，请稍后重试");
    this.name = "ChallengeRateLimitError";
  }
}

export type IdentityBootstrapErrorCode =
  | "BOOTSTRAP_SECRET_INVALID"
  | "BOOTSTRAP_SECRET_TOO_SHORT"
  | "BOOTSTRAP_OPTIONS_INVALID"
  | "BOOTSTRAP_KEY_ID_INVALID"
  | "BOOTSTRAP_MOBILE_INVALID"
  | "BOOTSTRAP_ALREADY_COMPLETED_CONFLICT"
  | "BOOTSTRAP_ACTIVE_ADMINISTRATOR_EXISTS"
  | "BOOTSTRAP_MOBILE_ALREADY_EXISTS"
  | "BOOTSTRAP_CONTROL_UNAVAILABLE";

export class IdentityBootstrapError extends Error {
  constructor(
    readonly code: IdentityBootstrapErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "IdentityBootstrapError";
  }
}
