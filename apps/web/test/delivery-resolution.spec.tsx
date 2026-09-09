import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ApiRequestError,
  type CustomerPublicationPage,
  type OperationalOrder,
} from "@geoeval/api-client";
import {
  decodeDeliveryReturn,
  deliveryReturnStorageKey,
  DeliveryResolutionPanel,
  DeliveryResolutionSummary,
  executeDeliveryReturn,
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
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}
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
      reason: "已协商补偿",
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
    expect(html).toContain("保存协商处理");
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
    ).toContain("等待剩余发布完成或停止，暂不可执行");
    const html = renderToStaticMarkup(
      <DeliveryResolutionSummary resolution={positive().resolution} />,
    );
    expect(html).toContain("待退还 90 积分");
    expect(html).toContain("可由管理员执行");
  });
});

describe("return request recovery", () => {
  it("persists before sending and recovers the same actor/order/revision/key after an uncertain response and reload", async () => {
    const browserStorage = storage();
    let firstRequest: unknown;
    const send = vi.fn(async (id, request) => {
      const saved = decodeDeliveryReturn(
        browserStorage.getItem(deliveryReturnStorageKey(actor, id)),
        actor,
        id,
      );
      expect(saved?.request).toEqual(request);
      firstRequest = request;
      throw new TypeError("network disconnected after commit");
    });
    await expect(
      executeDeliveryReturn(browserStorage, actor, positive(), send),
    ).rejects.toThrow("network disconnected");
    const recovered = decodeDeliveryReturn(
      browserStorage.getItem(deliveryReturnStorageKey(actor, orderId)),
      actor,
      orderId,
    );
    expect(recovered?.request).toEqual(firstRequest);
    const receipt = {
      orderId,
      ledgerId: "ledger",
      agreementRevision: 2,
      points: 90,
    };
    const replay = vi.fn(async (_id, request) => {
      expect(request).toEqual(firstRequest);
      return receipt;
    });
    // The refreshed order may already be paid. The original request still recovers its receipt.
    await expect(
      executeDeliveryReturn(
        browserStorage,
        actor,
        order(
          { ...positive().resolution, returnedPoints: 90, eligible: false },
          "COMPLETED",
        ),
        replay,
      ),
    ).resolves.toEqual(receipt);
    expect(browserStorage.setItem).toHaveBeenCalledTimes(1);
    expect(
      browserStorage.getItem(deliveryReturnStorageKey(actor, orderId)),
    ).toBeNull();
  });
  it("never sends if persistence fails or the unpaid agreement is zero/ineligible", async () => {
    const send = vi.fn();
    const unavailable = storage();
    unavailable.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    await expect(
      executeDeliveryReturn(unavailable, actor, positive(), send),
    ).rejects.toThrow("quota");
    await expect(
      executeDeliveryReturn(storage(), actor, order(), send),
    ).rejects.toThrow("尚不可退点");
    await expect(
      executeDeliveryReturn(
        storage(),
        actor,
        order({ ...positive().resolution, eligible: false }),
        send,
      ),
    ).rejects.toThrow("尚不可退点");
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects corrupt, wrong-actor and wrong-order recovery records without replacing them", () => {
    const raw = JSON.stringify({
      actorAccountId: actor,
      orderId,
      points: 90,
      request: { expectedAgreementRevision: 2, idempotencyKey: key },
    });
    expect(() =>
      decodeDeliveryReturn(raw, "different-actor", orderId),
    ).toThrow();
    expect(() => decodeDeliveryReturn(raw, actor, "different-order")).toThrow();
    expect(() => decodeDeliveryReturn("{", actor, orderId)).toThrow();
  });
  it("retains the original request on permission or stale-agreement errors for explicit reconciliation", async () => {
    const browserStorage = storage();
    await expect(
      executeDeliveryReturn(browserStorage, actor, positive(), async () => {
        throw new ApiRequestError("版本变化", 409);
      }),
    ).rejects.toThrow();
    expect(
      browserStorage.getItem(deliveryReturnStorageKey(actor, orderId)),
    ).not.toBeNull();
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
    expect(html).toContain("已约定退还 90 积分，待平台处理");
    expect(html).not.toContain("已关闭");
  });
});
