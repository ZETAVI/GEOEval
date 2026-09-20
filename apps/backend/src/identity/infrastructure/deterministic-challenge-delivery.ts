import { Injectable } from "@nestjs/common";

import type {
  ChallengeDeliveryPort,
  ChallengeDeliveryResult,
} from "../domain/challenge-delivery.port.js";

@Injectable()
export class DeterministicChallengeDelivery implements ChallengeDeliveryPort {
  async deliver(input: {
    challengeId: string;
    mobile: string;
    code: string;
    expiresAt: Date;
  }): Promise<ChallengeDeliveryResult> {
    return { outcome: "accepted", developmentCode: input.code };
  }
}
