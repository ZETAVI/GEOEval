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

  it("exposes activated commerce and administrator order-return entry points", () => {
    const cards = supportingRoleConfig("ADMINISTRATOR").cards;
    expect(cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "发布套餐",
          status: "AVAILABLE",
          href: "/admin/publishing",
        }),
        expect.objectContaining({
          title: "客户积分",
          status: "AVAILABLE",
          href: "/admin/points",
        }),
        expect.objectContaining({
          title: "履约订单",
          status: "AVAILABLE",
          href: "/admin/delivery",
        }),
      ]),
    );
    expect(
      cards.find((card) => card.title === "履约订单")?.description,
    ).toContain("待退点");
    expect(
      cards.find((card) => card.title === "履约订单")?.description,
    ).not.toContain("尚未接入");
  });

  it("exposes operations negotiation while retaining administrator-only positive credit", () => {
    const pending = supportingRoleConfig("OPERATIONS").cards.find(
      (card) => card.title === "待领取订单",
    );
    expect(pending).toMatchObject({
      status: "AVAILABLE",
      href: "/operations/orders",
    });
    expect(pending?.description).toContain("领取");
    const resolution = supportingRoleConfig("OPERATIONS").cards.find(
      (card) => card.title === "协商异常与退点",
    );
    expect(resolution).toMatchObject({
      status: "AVAILABLE",
      href: "/operations/orders",
    });
    expect(resolution?.description).toContain("零额终止直接关闭");
    expect(resolution?.description).toContain("正额退点由管理员执行");
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
