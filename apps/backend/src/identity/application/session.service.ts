import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import type { ApiConfig } from "../../config/runtime-config.js";
import { sessionDigest } from "../domain/identity.crypto.js";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "../domain/identity.repository.js";
import type {
  AccountView,
  AuthenticatedPrincipal,
  SessionAuthenticationFailureCode,
} from "../domain/identity.types.js";
import { IDENTITY_CONFIG } from "./identity.config.js";

export type AuthenticatedContext = {
  account: AccountView;
  principal: AuthenticatedPrincipal;
};

@Injectable()
export class SessionService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(IDENTITY_CONFIG) private readonly config: ApiConfig,
  ) {}

  async authenticate(token: string | undefined): Promise<AuthenticatedContext> {
    if (!token) {
      rejectAuthentication("AUTHENTICATION_REQUIRED", "请先登录");
    }
    const now = new Date();
    const session = await this.repository.findSession(sessionDigest(token));
    if (!session) {
      rejectAuthentication("AUTHENTICATION_REQUIRED", "请先登录");
    }
    if (session.account.status !== "ACTIVE") {
      rejectAuthentication("ACCOUNT_INACTIVE", "账号当前不可用，请联系管理员");
    }
    if (session.revokedAt) {
      rejectAuthentication("SESSION_REVOKED", "此登录会话已结束，请重新登录");
    }
    if (session.expiresAt <= now || session.idleExpiresAt <= now) {
      rejectAuthentication("SESSION_EXPIRED", "登录状态已过期，请重新登录");
    }

    if (
      now.getTime() - session.lastSeenAt.getTime() >=
      this.config.authSessionPolicy.touchIntervalMs
    ) {
      const idleMs =
        session.account.role === "TERMINAL_CUSTOMER"
          ? this.config.authSessionPolicy.customerIdleMs
          : this.config.authSessionPolicy.internalIdleMs;
      await this.repository.touchSession({
        sessionId: session.id,
        lastSeenAt: now,
        idleExpiresAt: new Date(
          Math.min(session.expiresAt.getTime(), now.getTime() + idleMs),
        ),
      });
    }

    return {
      account: session.account,
      principal: {
        accountId: session.account.id,
        role: session.account.role,
        sessionId: session.id,
      },
    };
  }

  async logoutCurrent(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.repository.revokeSession({
      tokenDigest: sessionDigest(token),
      now: new Date(),
      reason: "USER_LOGOUT",
    });
  }

  async logoutAll(accountId: string): Promise<number> {
    return this.repository.revokeAccountSessions({
      accountId,
      now: new Date(),
      reason: "USER_LOGOUT_ALL",
    });
  }
}

function rejectAuthentication(
  code: SessionAuthenticationFailureCode,
  message: string,
): never {
  throw new UnauthorizedException({ code, message });
}
