export const CHALLENGE_DELIVERY = Symbol("CHALLENGE_DELIVERY");

export type ChallengeDeliveryResult = {
  developmentCode?: string;
};

export interface ChallengeDeliveryPort {
  deliver(input: {
    challengeId: string;
    mobile: string;
    code: string;
    expiresAt: Date;
  }): Promise<ChallengeDeliveryResult>;
}
