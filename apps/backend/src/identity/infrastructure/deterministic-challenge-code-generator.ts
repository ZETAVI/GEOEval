import { Inject, Injectable } from "@nestjs/common";

import type { ApiConfig } from "../../config/runtime-config.js";
import { IDENTITY_CONFIG } from "../application/identity.config.js";
import type { ChallengeCodeGenerator } from "../domain/challenge-code-generator.port.js";

@Injectable()
export class DeterministicChallengeCodeGenerator implements ChallengeCodeGenerator {
  constructor(@Inject(IDENTITY_CONFIG) private readonly config: ApiConfig) {}

  generate(): string {
    return this.config.authDeterministicCode;
  }
}
