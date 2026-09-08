import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  appendDeliveryPage,
  DeliveryScheduleView,
  DeliveryWorkspace,
} from "../app/operations/orders/workspace.js";
import { OrderDetail } from "../app/orders/workspace.js";
import {
  PublicationResultsView,
  PublicationProgressView,
  deliveryStatusLabel,
} from "../app/orders/publication-results.js";
import {
  acceptsWorkHistory,
  needsPreparationReplacementConfirmation,
} from "../app/operations/orders/publication-work.js";
import type {
  CustomerPublicationPage,
  DeliveryOrderPage,
  PublishingOrder,
} from "@geoeval/api-client";

function deliveryPage(first: number, last: number): DeliveryOrderPage {
  return {
    items: Array.from({ length: first - last + 1 }, (_, offset) => {
      const sequence = first - offset;
      return {
        id: `order-${sequence}`,
        number: `GEO-${sequence}`,
        brandId: "brand",
        articleId: "article",
        articleRevision: 1,
        status: "PENDING_HANDLING",
        title: "订单",
        createdAt: "2026-09-08T00:00:00Z",
        schedule: {
          expectedCompletionAt: "2026-09-15T00:00:00Z",
          urgency: "NORMAL",
        },
        agreement: {
          mode: "RANDOM",
          packageName: "套餐",
          scope: [],
          lines: [],
          quantity: 1,
          totalPoints: 100,
        },
        delivery: {
          orderId: `order-${sequence}`,
          sequence,
          status: "PENDING_HANDLING",
          assigneeAccountId: null,
          revision: 1,
          publishedQuantity: 0,
          startedAt: null,
          createdAt: "2026-09-08T00:00:00Z",
        },
      };
    }),
    nextCursor: cursor(last),
  };
}

const cursor = (sequence: number) => ({
  createdAt: "2026-09-08T00:00:00Z",
  sequence,
});

describe("delivery pagination read baseline", () => {
  it("appends only the next page of the current read", () => {
    const current = deliveryPage(100, 61);
    const next = deliveryPage(60, 41);
    const result = appendDeliveryPage(
      current,
      next,
      { epoch: 1, cursor: cursor(61) },
      1,
    );
    expect(result.items.map((item) => item.id)).toEqual(
      deliveryPage(100, 41).items.map((item) => item.id),
    );
    expect(result.nextCursor).toEqual(cursor(41));
    expect(current.items).toHaveLength(40);
  });

  it.each(["refresh-first", "more-first"])(
    "does not skip orders when old pagination and refresh resolve %s",
    async (order) => {
      let current = deliveryPage(100, 61);
      const request = { epoch: 1, cursor: cursor(61) };
      let finishRefresh!: (page: DeliveryOrderPage) => void;
      let finishMore!: (page: DeliveryOrderPage) => void;
      const refresh = new Promise<DeliveryOrderPage>((resolve) => {
        finishRefresh = resolve;
      }).then((next) => {
        current = next;
      });
      const more = new Promise<DeliveryOrderPage>((resolve) => {
        finishMore = resolve;
      }).then((next) => {
        current = appendDeliveryPage(current, next, request, 2);
      });
      const refreshed = deliveryPage(100, 81);
      if (order === "refresh-first") {
        finishRefresh(refreshed);
        await refresh;
        finishMore(deliveryPage(60, 41));
      } else {
        finishMore(deliveryPage(60, 41));
        await more;
        finishRefresh(refreshed);
      }
      await Promise.all([refresh, more]);
      expect(current).toBe(refreshed);
      expect(current.nextCursor).toEqual(cursor(81));
    },
  );

  it("rejects a prior read even when its cursor matches the refreshed page", () => {
    const current = deliveryPage(100, 61);
    expect(
      appendDeliveryPage(
        current,
        deliveryPage(60, 41),
        { epoch: 1, cursor: cursor(61) },
        2,
      ),
    ).toBe(current);
  });

  it("does not advance a page whose requested cursor no longer matches", () => {
    const current = deliveryPage(100, 81);
    expect(
      appendDeliveryPage(
        current,
        deliveryPage(60, 41),
        { epoch: 2, cursor: cursor(61) },
        2,
      ),
    ).toBe(current);
  });
  it("also binds pagination to the deadline timestamp, not only its tie breaker", () => {
    const current = deliveryPage(100, 61);
    expect(
      appendDeliveryPage(
        current,
        deliveryPage(60, 41),
        {
          epoch: 1,
          cursor: { ...cursor(61), createdAt: "2026-09-01T00:00:00Z" },
        },
        1,
      ),
    ).toBe(current);
  });
});

describe("delivery entry and customer status", () => {
  it.each([
    ["NORMAL", "正常推进"],
    ["NEARING_DEADLINE", "即将到期"],
    ["DELAYED", "已延期"],
    ["COMPLETED", "发布已完成"],
  ] as const)(
    "renders the server-owned %s marker without inventing a terminal state",
    (urgency, label) => {
      const html = renderToStaticMarkup(
        <DeliveryScheduleView
          schedule={{
            urgency,
            expectedCompletionAt: "2026-09-15T00:00:00Z",
          }}
        />,
      );
      expect(html).toContain(label);
      expect(html).toContain("预计完成");
      expect(html).not.toContain("已关闭");
      expect(html).not.toContain("已退款");
    },
  );
  it("only asks to replace actual saved preparation or unsaved content edits", () => {
    const original = { title: "原文章", bodyMarkdown: "原正文" };
    expect(
      needsPreparationReplacementConfirmation(null, original, original),
    ).toBe(false);
    expect(
      needsPreparationReplacementConfirmation(original, original, original),
    ).toBe(true);
    expect(
      needsPreparationReplacementConfirmation(
        null,
        { ...original, title: "未保存标题" },
        original,
      ),
    ).toBe(true);
    expect(
      needsPreparationReplacementConfirmation(
        null,
        { ...original, bodyMarkdown: "未保存正文" },
        original,
      ),
    ).toBe(true);
  });
  it("discards delayed history after switching item, order or read revision", async () => {
    const request = { orderId: "order-a", slot: 1, epoch: 1 };
    let current = request;
    let shown: string[] | undefined;
    let finish!: (items: string[]) => void;
    const response = new Promise<string[]>((resolve) => {
      finish = resolve;
    });
    const pending = response.then((items) => {
      if (acceptsWorkHistory(request, current)) shown = items;
    });
    current = { orderId: "order-a", slot: 2, epoch: 2 };
    finish(["第一项的旧历史"]);
    await pending;
    expect(shown).toBeUndefined();
    expect(
      acceptsWorkHistory(request, { ...request, orderId: "order-b" }),
    ).toBe(false);
    expect(acceptsWorkHistory(request, { ...request, epoch: 2 })).toBe(false);
    expect(acceptsWorkHistory(request, request)).toBe(true);
  });
  it("uses refreshed completion as the only status source instead of stale order status", () => {
    const page: CustomerPublicationPage = {
      status: "COMPLETED",
      quantity: 3,
      publishedQuantity: 3,
      expectedCompletionAt: "2026-09-15T00:00:00Z",
      delayed: false,
      nextAfterSlot: null,
      items: [],
    };
    const html = renderToStaticMarkup(
      <PublicationProgressView page={page} fallbackStatus="PUBLISHING" />,
    );
    expect(html).toContain("已完成");
    expect(html).toContain("已发布 3 / 3 篇");
    expect(html).not.toContain("发布中");
    expect(html).not.toContain("运营已接手处理本订单");
  });
  it("renders accessible public results and precise pending targets without a customer acceptance action", () => {
    const page: CustomerPublicationPage = {
      status: "PUBLISHING",
      quantity: 2,
      publishedQuantity: 1,
      expectedCompletionAt: "2026-09-15T00:00:00Z",
      delayed: false,
      nextAfterSlot: null,
      items: [
        {
          slot: 1,
          state: "PUBLISHED",
          targetName: "指定媒体 A",
          result: {
            platformId: "media-a",
            displayName: "指定媒体 A",
            title: "已发布标题",
            url: "https://example.com/article",
            publishedAt: "2026-09-08T00:00:00Z",
          },
        },
        {
          slot: 2,
          state: "IN_HANDLING",
          targetName: "指定媒体 B",
          result: null,
        },
      ],
    };
    const html = renderToStaticMarkup(<PublicationResultsView page={page} />);
    expect(html).toContain("已发布标题");
    expect(html).toContain('href="https://example.com/article"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("指定媒体 B");
    expect(html).toContain("处理中");
    expect(html).not.toMatch(
      /确认验收|确认收货|preparation|internalChannel|internalNote/,
    );
    expect(deliveryStatusLabel.COMPLETED).toBe("已完成");
  });
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
    expect(html.match(/>发布中<\/span>/g)).toHaveLength(1);
    expect(html).toContain("冻结正文");
    expect(html).not.toContain("assignee");
    expect(html).not.toContain("已发布 3/3");
  });
});
