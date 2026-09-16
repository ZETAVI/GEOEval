import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  type CustomerPublicationPage,
  type OperationalOrder,
} from "@geoeval/api-client";
import {
  DeliveryResolutionPanel,
  DeliveryResolutionSummary,
  resolutionForm,
  resolutionRequest,
} from "../app/operations/orders/delivery-resolution.js";
import {
  canAddPublicationWork,
  canReplacePublicationTarget,
} from "../app/operations/orders/publication-work.js";
import { DeliveryScheduleView } from "../app/operations/orders/workspace.js";
import {
  PublicationProgressView,
  PublicationResultsView,
} from "../app/orders/publication-results.js";

const actor = "00000000-0000-4000-8000-000000000001";
const orderId = "00000000-0000-4000-8000-000000000002";
const key = "00000000-0000-4000-8000-000000000003";
const baseResolution: OperationalOrder["resolution"] = {
  mode: null,
  points: 0,
  agreementRevision: 0,
  reason: null,
  exceptionReason: null,
  stopped: false,
  returnedPoints: null,
  eligible: false,
  finalized: false,
};
function order(
  resolution: Partial<OperationalOrder["resolution"]> = {},
  status: OperationalOrder["status"] = "PUBLISHING",
): OperationalOrder {
  return {
    id: orderId,
    number: "GEO-1",
    brandId: "brand",
    articleId: "article",
    articleRevision: 1,
    title: "原文章",
    bodyMarkdown: "原正文",
    status,
    createdAt: "2026-09-08T00:00:00Z",
    agreement: {
      mode: "PRECISE",
      packageName: null,
      scope: [],
      lines: [],
      quantity: 3,
      totalPoints: 300,
    },
    schedule: {
      urgency: "NORMAL",
      expectedCompletionAt: "2026-09-15T00:00:00Z",
    },
    delivery: {
      orderId,
      sequence: 1,
      status,
      assigneeAccountId: actor,
      assignee: null,
      history: [],
      revision: 4,
      publishedQuantity: 1,
      startedAt: "2026-09-08T00:00:00Z",
      createdAt: "2026-09-08T00:00:00Z",
    },
    resolution: { ...baseResolution, ...resolution },
  };
}
const positive = () =>
  order(
    {
      mode: "CONTINUE",
      points: 90,
      reason: "已协商补偿",
      agreementRevision: 2,
      eligible: true,
    },
    "COMPLETED",
  );
function customerPage(
  overrides: Partial<CustomerPublicationPage> = {},
): CustomerPublicationPage {
  return {
    status: "PUBLISHING",
    quantity: 3,
    publishedQuantity: 1,
    expectedCompletionAt: "2026-09-15T00:00:00Z",
    delayed: false,
    nextAfterSlot: null,
    items: [],
    resolution: {
      mode: null,
      agreedPoints: 0,
      returnedPoints: null,
      stopped: false,
    },
    ...overrides,
  };
}

describe("explicit negotiated resolution", () => {
  it("defaults a new form to zero and preserves the existing agreement when editing", () => {
    expect(resolutionForm(baseResolution)).toEqual({
      mode: "CONTINUE",
      points: "0",
      reason: "",
    });
    expect(resolutionForm(positive().resolution)).toEqual({
      mode: "CONTINUE",
      points: "90",
      reason: "",
    });
    const html = renderToStaticMarkup(
      <DeliveryResolutionPanel
        order={positive()}
        actorAccountId={actor}
        admin={false}
        canWrite
        onChanged={async () => {}}
      />,
    );
    expect(html).toContain('value="90"');
    expect(html).toContain("已协商补偿");
    expect(html).toContain("保存并继续跟进");
  });
  it("keeps zero explicit, versioned and reasoned, rejecting invalid money inputs", () => {
    expect(
      resolutionRequest(
        { mode: "TERMINATE", points: "0", reason: "  客户同意停止  " },
        4,
        key,
        300,
      ),
    ).toEqual({
      mode: "TERMINATE",
      points: 0,
      reason: "客户同意停止",
      resolveTicket: false,
      expectedRevision: 4,
      idempotencyKey: key,
    });
    for (const points of ["", "-1", "1.5", "301", "1e2"])
      expect(() =>
        resolutionRequest(
          { mode: "CONTINUE", points, reason: "原因" },
          4,
          key,
          300,
        ),
      ).toThrow();
  });
  it("describes zero termination without a financial receipt or an admin task", () => {
    const closed = order(
      {
        mode: "TERMINATE",
        stopped: true,
        agreementRevision: 2,
        reason: "客户同意停止",
      },
      "CLOSED",
    );
    const html = renderToStaticMarkup(
      <DeliveryResolutionPanel
        order={closed}
        actorAccountId={actor}
        admin
        canWrite={false}
        onChanged={async () => {}}
      />,
    );
    expect(html).toContain("无需退还积分");
    expect(html).toContain("剩余发布已停止");
    expect(html).not.toContain("确认退还");
    expect(html).not.toContain("保存协商处理");
    expect(html).not.toContain("已退还 0");
  });
  it("shows pending positive obligations while work is incomplete and after completion", () => {
    const waiting = { ...positive().resolution, eligible: false };
    expect(
      renderToStaticMarkup(<DeliveryResolutionSummary resolution={waiting} />),
    ).toContain("已约定退回 90 积分，待订单结束结算");
    const html = renderToStaticMarkup(
      <DeliveryResolutionSummary resolution={positive().resolution} />,
    );
    expect(html).toContain("已约定退回 90 积分，待订单结束结算");
    expect(html).not.toContain("可由管理员执行");
  });
});

describe("stopped publication and customer meaning", () => {
  it("allows precise unpublished replacement during exception handling but blocks ordinary work and stopped replacement", () => {
    const page = { status: "EXCEPTION_HANDLING" as const, stopped: false };
    const item = { purchasedPlatformId: "original", result: null };
    expect(canAddPublicationWork(page)).toBe(false);
    expect(canReplacePublicationTarget(page, item)).toBe(true);
    expect(canReplacePublicationTarget({ ...page, stopped: true }, item)).toBe(
      false,
    );
    expect(
      canReplacePublicationTarget(page, { ...item, purchasedPlatformId: null }),
    ).toBe(false);
    expect(
      canAddPublicationWork({ status: "PUBLISHING", stopped: false }),
    ).toBe(true);
  });
  it("shows Closed at the original quantity without ongoing urgency or a zero-credit claim", () => {
    const page = customerPage({
      status: "CLOSED",
      delayed: true,
      resolution: {
        mode: "TERMINATE",
        agreedPoints: 0,
        returnedPoints: null,
        stopped: true,
      },
      items: [
        {
          slot: 2,
          state: "STOPPED",
          purchasedTargetName: "原媒体",
          targetName: "替换媒体",
          result: null,
        },
      ],
    });
    const html = renderToStaticMarkup(
      <>
        <PublicationProgressView page={page} fallbackStatus="PUBLISHING" />
        <PublicationResultsView page={page} />
        <DeliveryScheduleView
          schedule={{
            urgency: "CLOSED",
            expectedCompletionAt: page.expectedCompletionAt,
          }}
        />
      </>,
    );
    expect(html).toContain("已发布 1 / 3 篇");
    expect(html).toContain("已停止");
    expect(html).toContain("原购买媒体：原媒体");
    expect(html).toContain("当前履约媒体：替换媒体");
    expect(html).toContain("无需退还积分");
    expect(html).not.toContain("处理中");
    expect(html).not.toContain("已延期");
    expect(html).not.toContain("已退还 0");
  });
  it("keeps completed publication separate from compensation awaiting payment", () => {
    const page = customerPage({
      status: "COMPLETED",
      publishedQuantity: 3,
      resolution: {
        mode: "CONTINUE",
        agreedPoints: 90,
        returnedPoints: null,
        stopped: false,
      },
    });
    const html = renderToStaticMarkup(
      <PublicationProgressView page={page} fallbackStatus="PUBLISHING" />,
    );
    expect(html).toContain("已购发布已全部完成");
    expect(html).toContain("已约定退回 90 积分，待订单结束结算");
    expect(html).not.toContain("已关闭");
  });
});
