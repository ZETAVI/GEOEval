import { ApiRequestError, type AccountSummary } from "@geoeval/api-client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { governanceErrorView } from "../app/admin/accounts/account-ui.js";
import {
  confirmationToken,
  CreateInternalAccountDialog,
  GovernanceActionDialog,
} from "../app/admin/accounts/governance-dialog.js";

const target: AccountSummary = {
  id: "50000000-0000-4000-8000-000000000002",
  mobile: "+8613900000002",
  role: "OPERATIONS",
  status: "ACTIVE",
  revision: 4,
  activeSessionCount: 2,
};

describe("administrator governance UI", () => {
  it("keeps creation separate from dangerous target mutations", () => {
    const markup = renderToStaticMarkup(
      <CreateInternalAccountDialog
        busy={false}
        onClose={() => undefined}
        onRefresh={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(markup).toContain("创建固定角色账号");
    expect(markup).toContain("手机号创建后不可编辑");
    expect(markup).not.toContain("新建运营账号");
    expect(markup).toContain('type="submit" disabled=""');
  });

  it("requires target-aware confirmation and displayed revision", () => {
    const markup = renderToStaticMarkup(
      <GovernanceActionDialog
        action={{ kind: "role", target }}
        busy={false}
        onClose={() => undefined}
        onRefresh={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(confirmationToken(target.mobile)).toBe("0002");
    expect(markup).toContain("当前修订");
    expect(markup).toContain("4");
    expect(markup).toContain("请输入目标手机号后 4 位「0002」以确认");
    expect(markup).toContain("角色变更会递增账号修订");
    expect(markup).toContain('type="submit" disabled=""');
  });

  it.each([
    ["STALE_REVISION", 409, "账号已经发生变化", true],
    ["CONCURRENT_GOVERNANCE_CONFLICT", 409, "账号已经发生变化", true],
    ["SELF_GOVERNANCE_FORBIDDEN", 403, "不能管理当前管理员账号", false],
    ["LAST_ADMINISTRATOR_FORBIDDEN", 403, "必须保留一名有效管理员", false],
  ] as const)(
    "maps %s to a specific governance state",
    (code, status, title, refreshRequired) => {
      expect(
        governanceErrorView(new ApiRequestError("服务端说明", status, code)),
      ).toMatchObject({ code, title, refreshRequired });
    },
  );
});
