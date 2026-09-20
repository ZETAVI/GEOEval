import { Injectable } from "@nestjs/common";

import type {
  HumanVerificationPort,
  HumanVerificationResult,
} from "../domain/human-verification.port.js";

@Injectable()
export class DisabledHumanVerification implements HumanVerificationPort {
  async verify(): Promise<HumanVerificationResult> {
    return { outcome: "verified" };
  }
}
