import type {
  AccountListPage,
  AccountRole,
  AccountStatus,
  AccountView,
  SessionAuthenticationRecord,
  IdentityGovernanceAuditView,
  IdentityBootstrapResult,
  IdentityLifecycleCleanupResult,
  InternalAccountRole,
  MobileChallengeView,
  SessionRevocationReason,
} from "./identity.types.js";

export const IDENTITY_REPOSITORY = Symbol("IDENTITY_REPOSITORY");

export type ChallengeBudgetUsage = {
  dayKey: string;
  dayCount: number;
  monthKey: string;
  monthCount: number;
};

export interface IdentityRepository {
  findAccount(accountId: string): Promise<AccountView | undefined>;
  readChallengeBudget(input: {
    now: Date;
    dailyMaximumRequests: number;
    monthlyMaximumRequests: number;
  }): Promise<
    ChallengeBudgetUsage & {
      available: boolean;
      exhaustedPeriod?: "DAY" | "MONTH";
    }
  >;
  issueChallenge(input: {
    acquisitionVisitToken?: string;
    existingAccountOnly?: boolean;
    id: string;
    mobile: string;
    codeDigest: string;
    expiresAt: Date;
    now: Date;
    resendIntervalMs: number;
    windowMs: number;
    maximumRequestsPerWindow: number;
    dailyMaximumRequests: number;
    monthlyMaximumRequests: number;
  }): Promise<ChallengeBudgetUsage>;
  bootstrapAdministrator(input: {
    mobile: string;
    keyId: string;
    secretDigest: string;
    now: Date;
  }): Promise<IdentityBootstrapResult>;
  findChallenge(id: string): Promise<MobileChallengeView | undefined>;
  incrementFailedAttempts(input: {
    id: string;
    maximumFailedAttempts: number;
  }): Promise<void>;
  cleanupIdentityLifecycle(input: {
    now: Date;
    sessionRetentionMs: number;
    challengeRetentionMs: number;
    batchSize: number;
  }): Promise<IdentityLifecycleCleanupResult>;
  completeChallenge(input: {
    challengeId: string;
    mobile: string;
    sessionDigest: string;
    customerAbsoluteMs: number;
    customerIdleMs: number;
    internalAbsoluteMs: number;
    internalIdleMs: number;
    maximumFailedAttempts: number;
    now: Date;
  }): Promise<
    { account: AccountView; expiresAt: Date; idleExpiresAt: Date } | undefined
  >;
  findSession(
    tokenDigest: string,
  ): Promise<SessionAuthenticationRecord | undefined>;
  touchSession(input: {
    sessionId: string;
    lastSeenAt: Date;
    idleExpiresAt: Date;
  }): Promise<void>;
  revokeSession(input: {
    tokenDigest: string;
    now: Date;
    reason: SessionRevocationReason;
  }): Promise<void>;
  revokeAccountSessions(input: {
    accountId: string;
    now: Date;
    reason: SessionRevocationReason;
  }): Promise<number>;
  listAccounts(input: {
    search?: string;
    role?: AccountRole;
    status?: AccountStatus;
    cursor?: string;
    limit: number;
    now: Date;
  }): Promise<AccountListPage>;
  listGovernanceAudits(input: {
    targetAccountId?: string;
    cursor?: string;
    limit: number;
  }): Promise<{
    items: IdentityGovernanceAuditView[];
    nextCursor: string | null;
  }>;
  createInternalAccount(input: {
    actorAccountId: string;
    mobile: string;
    role: InternalAccountRole;
    reason: string;
    now: Date;
  }): Promise<AccountView>;
  changeGovernedAccount(input: {
    actorAccountId: string;
    targetAccountId: string;
    expectedRevision: number;
    reason: string;
    now: Date;
    mutation:
      | { kind: "STATUS"; status: AccountStatus }
      | { kind: "ROLE"; role: InternalAccountRole }
      | { kind: "REVOKE_SESSIONS" };
  }): Promise<AccountView>;
}
