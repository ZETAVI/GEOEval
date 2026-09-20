import { Inject, Injectable } from "@nestjs/common";

import type { ApiConfig } from "../../config/runtime-config.js";
import type { HumanVerificationResult } from "../domain/human-verification.port.js";
import { IDENTITY_CONFIG } from "./identity.config.js";

export type HumanVerificationDecision =
  | { outcome: "allow"; degraded: boolean }
  | {
      outcome: "deny";
      reason: "REJECTED" | "UNAVAILABLE" | "CONFIGURATION";
    };

@Injectable()
export class HumanVerificationPolicy {
  private consecutiveUnavailable = 0;

  constructor(@Inject(IDENTITY_CONFIG) private readonly config: ApiConfig) {}

  decide(result: HumanVerificationResult): HumanVerificationDecision {
    if (result.outcome === "verified") {
      this.consecutiveUnavailable = 0;
      return { outcome: "allow", degraded: false };
    }
    if (result.outcome === "rejected") {
      this.consecutiveUnavailable = 0;
      return { outcome: "deny", reason: "REJECTED" };
    }
    if (result.outcome === "configuration_error") {
      this.consecutiveUnavailable = 0;
      return { outcome: "deny", reason: "CONFIGURATION" };
    }

    this.consecutiveUnavailable += 1;
    if (
      this.config.authHumanVerificationPolicy.unavailableMode === "limited" &&
      this.consecutiveUnavailable <=
        this.config.authHumanVerificationPolicy.maximumConsecutiveUnavailable
    ) {
      return { outcome: "allow", degraded: true };
    }
    return { outcome: "deny", reason: "UNAVAILABLE" };
  }
}
