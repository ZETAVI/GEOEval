import {
  bootstrapSecretDigest,
  digestsMatch,
} from "../domain/identity.crypto.js";
import { IdentityBootstrapError } from "../domain/identity.errors.js";
import type { IdentityRepository } from "../domain/identity.repository.js";
import type { IdentityBootstrapResult } from "../domain/identity.types.js";
import { InvalidMobileError, normalizeMobile } from "../domain/mobile.js";

export class BootstrapService {
  constructor(private readonly repository: IdentityRepository) {}

  bootstrap(input: {
    mobile: string;
    keyId: string;
    providedSecret: string;
    expectedSecretDigest: string;
    now?: Date;
  }): Promise<IdentityBootstrapResult> {
    if (input.providedSecret.length < 32) {
      throw new IdentityBootstrapError(
        "BOOTSTRAP_SECRET_TOO_SHORT",
        "Bootstrap secret must contain at least 32 characters",
      );
    }
    if (!/^[A-Za-z0-9._:/-]{1,120}$/.test(input.keyId)) {
      throw new IdentityBootstrapError(
        "BOOTSTRAP_KEY_ID_INVALID",
        "Bootstrap key identifier is invalid",
      );
    }
    const providedDigest = bootstrapSecretDigest(input.providedSecret);
    if (!digestsMatch(input.expectedSecretDigest, providedDigest)) {
      throw new IdentityBootstrapError(
        "BOOTSTRAP_SECRET_INVALID",
        "Bootstrap authorization failed",
      );
    }
    let mobile: string;
    try {
      mobile = normalizeMobile(input.mobile);
    } catch (error) {
      if (error instanceof InvalidMobileError) {
        throw new IdentityBootstrapError(
          "BOOTSTRAP_MOBILE_INVALID",
          "Bootstrap mobile is invalid",
        );
      }
      throw error;
    }
    return this.repository.bootstrapAdministrator({
      mobile,
      keyId: input.keyId,
      secretDigest: providedDigest,
      now: input.now ?? new Date(),
    });
  }
}
