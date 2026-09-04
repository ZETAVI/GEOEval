import type {
  AccountListPage,
  AccountRole,
  AccountStatus,
  AccountView,
  AuthenticatedSession,
  IdentityGovernanceAuditView,
  InternalAccountRole,
  MobileChallengeView,
  SessionRevocationReason,
} from "./identity.types.js";

export const IDENTITY_REPOSITORY = Symbol("IDENTITY_REPOSITORY");

export interface IdentityRepository {
  createChallenge(input: {
    id: string;
    mobile: string;
    codeDigest: string;
    expiresAt: Date;
  }): Promise<void>;
  findChallenge(id: string): Promise<MobileChallengeView | undefined>;
  incrementFailedAttempts(id: string): Promise<void>;
  completeChallenge(input: {
    challengeId: string;
    mobile: string;
    sessionDigest: string;
    customerAbsoluteMs: number;
    customerIdleMs: number;
    internalAbsoluteMs: number;
    internalIdleMs: number;
    now: Date;
  }): Promise<
    { account: AccountView; expiresAt: Date; idleExpiresAt: Date } | undefined
  >;
  findSession(
    tokenDigest: string,
    now: Date,
  ): Promise<AuthenticatedSession | undefined>;
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
