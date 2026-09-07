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

  it("exposes activated commerce entry points without implying fulfilment or real payment support", () => {
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
          title: "订单与结算",
          status: "FUTURE_CAPABILITY",
        }),
      ]),
    );
    expect(
      cards.find((card) => card.title === "订单与结算")?.href,
    ).toBeUndefined();
  });

  it("distinguishes customer purchase support from future operations claiming", () => {
    const pending = supportingRoleConfig("OPERATIONS").cards.find(
      (card) => card.title === "待领取订单",
    );
    expect(pending).toMatchObject({
      description: "客户已可购买并查看待处理订单；运营认领与履约尚未接入。",
      status: "FUTURE_CAPABILITY",
    });
    expect(pending?.href).toBeUndefined();
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
