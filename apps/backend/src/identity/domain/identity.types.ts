export type AccountRole =
  "TERMINAL_CUSTOMER" | "OPERATIONS" | "ADMINISTRATOR" | "AGENT";

export type InternalAccountRole = Exclude<AccountRole, "TERMINAL_CUSTOMER">;

export type AccountStatus = "ACTIVE" | "INACTIVE";

export type AccountView = {
  id: string;
  mobile: string;
  role: AccountRole;
  status: AccountStatus;
  revision: number;
  createdAt?: Date;
  updatedAt?: Date;
  lastAuthenticatedAt?: Date | null;
};

export type AuthenticatedPrincipal = {
  accountId: string;
  role: AccountRole;
  sessionId: string;
};

export type SessionAuthenticationFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "ACCOUNT_INACTIVE"
  | "SESSION_REVOKED"
  | "SESSION_EXPIRED";

export type MobileChallengeView = {
  id: string;
  mobile: string;
  codeDigest: string;
  failedAttempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  supersededAt: Date | null;
};

export type IdentityLifecycleCleanupResult = {
  deletedAcquisitionVisits: number;
  deletedSessions: number;
  deletedChallenges: number;
  deletedChallengeRateLimits: number;
};

export type IdentityBootstrapResult = {
  status: "CREATED" | "UNCHANGED";
  account: AccountView;
  completedAt: Date;
  keyId: string;
};

export type SessionAuthenticationRecord = {
  id: string;
  expiresAt: Date;
  idleExpiresAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
  account: AccountView;
};

export type SessionRevocationReason =
  | "USER_LOGOUT"
  | "USER_LOGOUT_ALL"
  | "ADMIN_REVOKE_ALL"
  | "ACCOUNT_DEACTIVATED"
  | "ROLE_CHANGED";

export type IdentityGovernanceAction =
  | "BOOTSTRAP_ADMINISTRATOR"
  | "CREATE_INTERNAL_ACCOUNT"
  | "ACTIVATE_ACCOUNT"
  | "DEACTIVATE_ACCOUNT"
  | "CHANGE_INTERNAL_ROLE"
  | "REVOKE_ACCOUNT_SESSIONS";

export type IdentityGovernanceAuditView = {
  id: string;
  actorKind: "ACCOUNT" | "BOOTSTRAP";
  actorAccountId: string | null;
  actorKeyId: string | null;
  targetAccountId: string;
  action: IdentityGovernanceAction;
  reason: string;
  beforeState: unknown;
  afterState: unknown;
  createdAt: Date;
};

export type AccountListPage = {
  items: Array<
    AccountView & {
      activeSessionCount: number;
    }
  >;
  nextCursor: string | null;
};
