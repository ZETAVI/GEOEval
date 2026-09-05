import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import type { ApiConfig } from "../src/config/runtime-config.js";
import { AccessGuard } from "../src/identity/access/access.guard.js";
import {
  PUBLIC_ACCESS,
  REQUIRED_ACCOUNT_ROLES,
} from "../src/identity/access/access.metadata.js";
import type { SessionService } from "../src/identity/application/session.service.js";

describe("fail-closed access contract", () => {
  it("rejects an authenticated account outside the declared fixed roles", async () => {
    const request = { method: "GET", headers: { cookie: "geoeval_session=x" } };
    const reflector = {
      getAllAndOverride: vi.fn((key: string) => {
        if (key === PUBLIC_ACCESS) return false;
        if (key === REQUIRED_ACCOUNT_ROLES) return ["ADMINISTRATOR"];
        return undefined;
      }),
    } as unknown as Reflector;
    const sessions = {
      authenticate: vi.fn(async () => ({
        account: {
          id: "account-id",
          mobile: "+8613800138000",
          role: "TERMINAL_CUSTOMER",
          status: "ACTIVE",
          revision: 1,
        },
        principal: {
          accountId: "account-id",
          role: "TERMINAL_CUSTOMER",
          sessionId: "session-id",
        },
      })),
    } as unknown as SessionService;
    const guard = new AccessGuard(reflector, sessions, {
      authCookieSecure: false,
    } as ApiConfig);
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(request).toMatchObject({
      geoevalPrincipal: { accountId: "account-id", sessionId: "session-id" },
    });
  });
});
