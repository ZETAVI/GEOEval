import type { IdentityCleanupPolicy } from "../../config/runtime-config.js";
import type { IdentityRepository } from "../domain/identity.repository.js";
import type { IdentityLifecycleCleanupResult } from "../domain/identity.types.js";

export class IdentityMaintenanceService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly policy: IdentityCleanupPolicy,
  ) {}

  cleanup(now = new Date()): Promise<IdentityLifecycleCleanupResult> {
    return this.repository.cleanupIdentityLifecycle({
      now,
      ...this.policy,
    });
  }
}
