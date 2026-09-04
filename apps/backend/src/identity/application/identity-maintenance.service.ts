import { Inject, Injectable } from "@nestjs/common";

import type { IdentityCleanupPolicy } from "../../config/runtime-config.js";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "../domain/identity.repository.js";
import type { IdentityLifecycleCleanupResult } from "../domain/identity.types.js";
import { IDENTITY_MAINTENANCE_CONFIG } from "./identity.config.js";

@Injectable()
export class IdentityMaintenanceService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(IDENTITY_MAINTENANCE_CONFIG)
    private readonly policy: IdentityCleanupPolicy,
  ) {}

  cleanup(now = new Date()): Promise<IdentityLifecycleCleanupResult> {
    return this.repository.cleanupIdentityLifecycle({
      now,
      ...this.policy,
    });
  }
}
