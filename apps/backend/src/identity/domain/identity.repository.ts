import type {
  AccountView,
  AuthenticatedSession,
  MobileChallengeView,
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
    sessionExpiresAt: Date;
    now: Date;
  }): Promise<AccountView | undefined>;
  findSession(
    tokenDigest: string,
    now: Date,
  ): Promise<AuthenticatedSession | undefined>;
  revokeSession(tokenDigest: string, now: Date): Promise<void>;
}
