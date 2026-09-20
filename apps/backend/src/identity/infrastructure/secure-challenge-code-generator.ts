import { Injectable } from "@nestjs/common";
import { randomInt } from "node:crypto";

import type { ChallengeCodeGenerator } from "../domain/challenge-code-generator.port.js";

@Injectable()
export class SecureChallengeCodeGenerator implements ChallengeCodeGenerator {
  generate(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }
}
