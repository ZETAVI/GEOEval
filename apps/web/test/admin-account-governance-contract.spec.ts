import {
  changeAdminAccountRole,
  changeAdminAccountStatus,
  createAdminInternalAccount,
  revokeAdminAccountSessions,
} from "@geoeval/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("administrator account governance client", () => {
  it("uses one typed endpoint and expected revision for each governance command", async () => {
    const requests: Array<{
      input: string;
      init: RequestInit | undefined;
    }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ input: String(input), init });
        return new Response(
          JSON.stringify({
            id: "account-id",
            mobile: "+8613900000001",
            role: "OPERATIONS",
            status: "ACTIVE",
            revision: 2,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    await createAdminInternalAccount("http://api.test", {
      mobile: "13900000001",
      role: "OPERATIONS",
      reason: "新建运营账号",
    });
    await changeAdminAccountStatus("http://api.test", "target/id", {
      expectedRevision: 4,
      status: "INACTIVE",
      reason: "账号已经停用",
    });
    await changeAdminAccountRole("http://api.test", "target/id", {
      expectedRevision: 5,
      role: "AGENT",
      reason: "调整为代理商",
    });
    await revokeAdminAccountSessions("http://api.test", "target/id", {
      expectedRevision: 6,
      reason: "处理账号异常登录",
    });

    expect(
      requests.map(({ input, init }) => ({
        input,
        method: init?.method,
        body: init?.body,
        headers: init?.headers,
      })),
    ).toEqual([
      {
        input: "http://api.test/admin/accounts",
        method: "POST",
        body: JSON.stringify({
          mobile: "13900000001",
          role: "OPERATIONS",
          reason: "新建运营账号",
        }),
        headers: {
          "content-type": "application/json",
          "x-geoeval-request": "1",
        },
      },
      {
        input: "http://api.test/admin/accounts/target%2Fid/status",
        method: "PATCH",
        body: JSON.stringify({
          expectedRevision: 4,
          status: "INACTIVE",
          reason: "账号已经停用",
        }),
        headers: {
          "content-type": "application/json",
          "x-geoeval-request": "1",
        },
      },
      {
        input: "http://api.test/admin/accounts/target%2Fid/role",
        method: "PATCH",
        body: JSON.stringify({
          expectedRevision: 5,
          role: "AGENT",
          reason: "调整为代理商",
        }),
        headers: {
          "content-type": "application/json",
          "x-geoeval-request": "1",
        },
      },
      {
        input: "http://api.test/admin/accounts/target%2Fid/sessions",
        method: "DELETE",
        body: JSON.stringify({
          expectedRevision: 6,
          reason: "处理账号异常登录",
        }),
        headers: {
          "content-type": "application/json",
          "x-geoeval-request": "1",
        },
      },
    ]);
  });

  it("preserves machine-readable governance errors for explicit UI states", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              code: "LAST_ADMINISTRATOR_FORBIDDEN",
              message: "必须至少保留一名有效管理员",
            }),
            { status: 403, headers: { "content-type": "application/json" } },
          ),
        ),
      ),
    );

    await expect(
      changeAdminAccountStatus("http://api.test", "admin-id", {
        expectedRevision: 1,
        status: "INACTIVE",
        reason: "管理员已经离职",
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: "LAST_ADMINISTRATOR_FORBIDDEN",
      message: "必须至少保留一名有效管理员",
    });
  });
});
