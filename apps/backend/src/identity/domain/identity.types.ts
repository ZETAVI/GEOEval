export type AccountRole =
  "TERMINAL_CUSTOMER" | "OPERATIONS" | "ADMINISTRATOR" | "AGENT";

export type AccountView = {
  id: string;
  mobile: string;
  role: AccountRole;
};

export type MobileChallengeView = {
  id: string;
  mobile: string;
  codeDigest: string;
  failedAttempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
};

export type AuthenticatedSession = {
  id: string;
  expiresAt: Date;
  account: AccountView;
};
