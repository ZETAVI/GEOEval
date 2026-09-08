import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeliveryWorkspace } from "../app/operations/orders/workspace.js";
import { OrderDetail } from "../app/orders/workspace.js";
import type { PublishingOrder } from "@geoeval/api-client";

describe("delivery entry and customer status", () => {
  it.each([false, true])(
    "protects the role-specific workspace before loading data (%s)",
    (admin) => {
      const html = renderToStaticMarkup(<DeliveryWorkspace admin={admin} />);
      expect(html).toContain("确认角色");
      expect(html).not.toContain("认领订单");
      expect(html).not.toContain("确认改派");
    },
  );
  it("shows actual publishing status without exposing internal responsibility or inventing results", () => {
    const order: PublishingOrder = {
      id: "00000000-0000-4000-8000-000000000001",
      number: "GEO-00000001",
      brandId: "00000000-0000-4000-8000-000000000002",
      articleId: "00000000-0000-4000-8000-000000000003",
      articleRevision: 1,
      status: "PUBLISHING",
      title: "冻结标题",
      bodyMarkdown: "冻结正文",
      createdAt: "2026-09-08T00:00:00Z",
      agreement: {
        mode: "RANDOM",
        packageName: "测试套餐",
        scope: [
          {
            platformId: "00000000-0000-4000-8000-000000000004",
            displayName: "测试媒体",
          },
        ],
        lines: [],
        quantity: 3,
        totalPoints: 300,
      },
    };
    const html = renderToStaticMarkup(<OrderDetail order={order} />);
    expect(html).toContain("发布中");
    expect(html).toContain("运营已接手处理本订单");
    expect(html).toContain("冻结正文");
    expect(html).not.toContain("assignee");
    expect(html).not.toContain("已发布 3/3");
  });
});
