import {
  ApiRequestError,
  logoutAllSessions,
  type Account,
} from "@geoeval/api-client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadRoleSession,
  sessionFailureState,
  WorkspaceAccessPanel,
  type RoleSessionState,
} from "../app/session-access.js";
import { SessionExitActions } from "../app/session-exit-actions.js";

const operationsAccount: Account = {
  id: "operations-account",
  mobile: "+8613800138000",
  role: "OPERATIONS",
  status: "ACTIVE",
  revision: 1,
};

describe("shared role-session states", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads only the current principal before denying a wrong-role shell", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(operationsAccount, { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      loadRoleSession("http://127.0.0.1:3300", "ADMINISTRATOR"),
    ).resolves.toEqual({ kind: "denied", account: operationsAccount });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3300/identity/me",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("preserves a machine-readable expiry from the current-principal response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { code: "SESSION_EXPIRED", message: "登录状态已过期" },
          { status: 401 },
        ),
      ),
    );

    await expect(
      loadRoleSession("http://127.0.0.1:3300", "OPERATIONS"),
    ).resolves.toEqual({ kind: "expired" });
  });

  it.each([
    ["ACCOUNT_INACTIVE", "inactive"],
    ["SESSION_REVOKED", "revoked"],
    ["SESSION_EXPIRED", "expired"],
    ["AUTHENTICATION_REQUIRED", "unauthenticated"],
    [undefined, "unauthenticated"],
  ] as const)("maps %s to the %s state", (code, kind) => {
    expect(
      sessionFailureState(new ApiRequestError("身份失败", 401, code)),
    ).toEqual({ kind });
  });

  it("does not treat temporary or authorization failures as session loss", () => {
    expect(
      sessionFailureState(new ApiRequestError("暂时不可用", 503)),
    ).toBeUndefined();
    expect(
      sessionFailureState(new ApiRequestError("角色不允许", 403)),
    ).toBeUndefined();
  });

  it.each([
    [{ kind: "unauthenticated" }, "当前浏览器还没有有效登录"],
    [{ kind: "inactive" }, "当前账号已停用"],
    [{ kind: "revoked" }, "这次登录已经结束"],
    [{ kind: "expired" }, "为了账号安全，请重新登录"],
  ] satisfies Array<[Exclude<RoleSessionState, { kind: "ready" }>, string]>)(
    "renders an actionable %s interruption",
    (state, title) => {
      const markup = renderAccessState(state);
      expect(markup).toContain(title);
      expect(markup).toContain('href="/enter"');
      expect(markup).not.toContain("重新加载");
    },
  );

  it("keeps wrong-role recovery on the server-owned role home", () => {
    const markup = renderAccessState({
      kind: "denied",
      account: operationsAccount,
    });
    expect(markup).toContain("该账号不能进入媒体库管理");
    expect(markup).toContain("运营人员");
    expect(markup).toContain('href="/operations"');
    expect(markup).toContain("退出并更换账号");
  });

  it("reserves retry for temporary failures", () => {
    const markup = renderAccessState({
      kind: "error",
      message: "服务暂时不可用",
    });
    expect(markup).toContain("媒体库管理没有加载完成");
    expect(markup).toContain("服务暂时不可用");
    expect(markup).toContain("重新加载");
  });

  it("exposes and sends an explicit logout-all command", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const markup = renderToStaticMarkup(
      <SessionExitActions apiBaseUrl="http://api.test" />,
    );
    expect(markup).toContain("退出全部设备");

    await logoutAllSessions("http://api.test");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/identity/sessions",
      expect.objectContaining({
        method: "DELETE",
        credentials: "include",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-geoeval-request": "1",
        }),
      }),
    );
  });
});

function renderAccessState(
  state: Exclude<RoleSessionState, { kind: "ready" }>,
): string {
  return renderToStaticMarkup(
    <WorkspaceAccessPanel
      state={state}
      expectedRole="ADMINISTRATOR"
      workspaceName="媒体库管理"
      loadingDetail="通过后再加载受保护资料"
      apiBaseUrl="http://127.0.0.1:3300"
      onRetry={() => undefined}
    />,
  );
}
