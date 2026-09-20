export const CHALLENGE_DELIVERY = Symbol("CHALLENGE_DELIVERY");

export type ChallengeDeliveryResult = {
  outcome: "accepted" | "unknown";
  developmentCode?: string;
  providerRequestId?: string;
  providerReceiptId?: string;
};

export type ChallengeDeliveryRejection =
  | "CREDENTIAL"
  | "PERMISSION"
  | "QUALIFICATION"
  | "SIGNATURE"
  | "TEMPLATE"
  | "BALANCE"
  | "RATE_LIMIT"
  | "PROVIDER_REJECTED";

export class ChallengeDeliveryRejectedError extends Error {
  constructor(
    readonly reason: ChallengeDeliveryRejection,
    readonly providerRequestId?: string,
  ) {
    super("Authentication challenge delivery was rejected");
    this.name = "ChallengeDeliveryRejectedError";
  }
}

export interface ChallengeDeliveryPort {
  deliver(input: {
    challengeId: string;
    mobile: string;
    code: string;
    expiresAt: Date;
  }): Promise<ChallengeDeliveryResult>;
}
