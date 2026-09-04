import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  SupportingRoleWorkspace,
  supportingRoleConfig,
} from "../app/supporting-role-workspace.js";

describe("supporting role homes", () => {
  it("keeps each fixed role on a distinct capability-owned navigation", () => {
    expect(supportingRoleConfig("ADMINISTRATOR").cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: "/admin/accounts",
          title: "账号与访问",
        }),
        expect.objectContaining({
          href: "/admin/media",
          title: "媒体库管理",
        }),
      ]),
    );
    expect(supportingRoleConfig("OPERATIONS").navigation?.[0]).toMatchObject({
      href: "/operations",
      label: "履约工作台",
    });
    expect(supportingRoleConfig("AGENT").navigation?.[0]).toMatchObject({
      href: "/agent",
      label: "代理商总览",
    });
  });

  it.each(["ADMINISTRATOR", "OPERATIONS", "AGENT"] as const)(
    "renders a bounded loading state for %s before reading protected data",
    (role) => {
      const markup = renderToStaticMarkup(
        <SupportingRoleWorkspace role={role} />,
      );
      expect(markup).toContain(
        `正在核验${
          role === "ADMINISTRATOR"
            ? "系统管理员"
            : role === "OPERATIONS"
              ? "运营人员"
              : "代理商"
        }身份`,
      );
      expect(markup).not.toContain("模拟订单");
      expect(markup).not.toContain("¥");
    },
  );
});
