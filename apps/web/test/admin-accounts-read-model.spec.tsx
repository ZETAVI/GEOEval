import {
  listAdminAccounts,
  listIdentityGovernanceAudits,
  type IdentityGovernanceAudit,
} from "@geoeval/api-client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  accountTimestamp,
  auditActorLabel,
  governanceActionLabel,
  shortAccountId,
} from "../app/admin/accounts/account-ui.js";
import { AdminAccountsWorkspace } from "../app/admin/accounts/workspace.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("administrator account read model", () => {
  it("starts with identity verification before protected account data", () => {
    const markup = renderToStaticMarkup(<AdminAccountsWorkspace />);

    expect(markup).toContain("正在核验管理员身份");
    expect(markup).not.toContain("创建内部账号");
    expect(markup).not.toContain("停用账号");
  });

  it("encodes account filters and audit ownership in administrator reads", async () => {
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      requestedUrls.push(String(input));
      return new Response(JSON.stringify({ items: [], nextCursor: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await listAdminAccounts("http://api.test", {
      search: "+8613900",
      role: "OPERATIONS",
      status: "ACTIVE",
      cursor: "account-cursor",
      limit: 20,
    });
    await listIdentityGovernanceAudits("http://api.test", {
      targetAccountId: "account-id",
      cursor: "audit-cursor",
      limit: 20,
    });

    expect(requestedUrls[0]).toBe(
      "http://api.test/admin/accounts?search=%2B8613900&role=OPERATIONS&status=ACTIVE&cursor=account-cursor&limit=20",
    );
    expect(requestedUrls[1]).toBe(
      "http://api.test/admin/accounts/audits?targetAccountId=account-id&cursor=audit-cursor&limit=20",
    );
  });

  it("presents bounded account and governance facts", () => {
    const audit = {
      actorKind: "BOOTSTRAP",
      actorKeyId: "initial-admin-2026",
    } as IdentityGovernanceAudit;

    expect(shortAccountId("50000000-0000-4000-8000-000000000001")).toBe(
      "50000000…0001",
    );
    expect(governanceActionLabel("CHANGE_INTERNAL_ROLE")).toBe("变更内部角色");
    expect(governanceActionLabel("FUTURE_ACTION")).toBe("FUTURE_ACTION");
    expect(auditActorLabel(audit)).toBe("Bootstrap · initial-admin-2026");
    expect(accountTimestamp(undefined)).toBe("—");
    expect(accountTimestamp(null, "从未登录")).toBe("从未登录");
  });
});
