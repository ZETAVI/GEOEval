export const HUMAN_VERIFICATION = Symbol("HUMAN_VERIFICATION");

export type HumanVerificationRejection =
  "MISSING" | "INVALID" | "REPLAYED" | "SCENE_MISMATCH" | "RISK_REJECTED";

export type HumanVerificationUnavailable =
  "NETWORK" | "TIMEOUT" | "PROVIDER_SERVER";

export type HumanVerificationConfigurationError =
  "CREDENTIAL" | "PERMISSION" | "ACCOUNT" | "REQUEST";

export type HumanVerificationResult =
  | { outcome: "verified"; providerRequestId?: string }
  | {
      outcome: "rejected";
      reason: HumanVerificationRejection;
      providerRequestId?: string;
    }
  | {
      outcome: "unavailable";
      reason: HumanVerificationUnavailable;
      providerRequestId?: string;
    }
  | {
      outcome: "configuration_error";
      reason: HumanVerificationConfigurationError;
      providerRequestId?: string;
    };

export interface HumanVerificationPort {
  verify(input: {
    captchaVerifyParam?: string;
  }): Promise<HumanVerificationResult>;
}
