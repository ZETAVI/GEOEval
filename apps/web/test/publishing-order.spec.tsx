import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ApiRequestError,
  type PublishingWorkspace,
  type PublishingOrder,
} from "@geoeval/api-client";
import {
  decodePurchase,
  purchaseIntent,
  purchaseRejected,
  purchaseStorageKey,
} from "../app/publishing/pending-purchase.js";
import { PurchaseConfirmation } from "../app/publishing/purchase-confirmation.js";
import { OrderDetail } from "../app/orders/workspace.js";
import {
  selectionForm,
  selectionInput,
} from "../app/publishing/selection-form.js";
const id = "40000000-0000-4000-8000-000000000065";
const state: PublishingWorkspace = {
  brand: { id, companyName: "验收品牌" },
  article: {
    id,
    title: "已确认的文章",
    revision: 2,
    confirmedRevision: 2,
    status: "CONFIRMED",
  },
  selectionRevision: 3,
  selection: {
    brandId: id,
    articleId: id,
    articleRevision: 2,
    revision: 3,
    intent: { mode: "RANDOM", packageId: id },
  },
  balance: 1000,
  quote: {
    mode: "RANDOM",
    articleId: id,
    articleRevision: 2,
    selectionRevision: 3,
    packageName: "品牌套餐",
    scope: [{ platformId: id, displayName: "媒体甲" }],
    lines: [],
    quantity: 3,
    totalPoints: 800,
    shortfall: 0,
    suggestedRechargeYuan: 0,
    problems: [],
  },
};
describe("purchase review, recovery and frozen order presentation", () => {
  it("binds only the reviewed commercial terms and exact source revisions, retaining the same intent across reload", () => {
    const intent = purchaseIntent(state, id, id);
    expect(intent.request).not.toHaveProperty("accountId");
    expect(intent.request.acceptedTerms).not.toHaveProperty("balance");
    expect(intent.request.acceptedTerms).not.toHaveProperty("problems");
    expect(decodePurchase(JSON.stringify(intent), id)).toEqual(intent);
    expect(decodePurchase(null, id)).toBeNull();
    expect(purchaseStorageKey(id)).not.toBe(purchaseStorageKey("other"));
    expect(() => decodePurchase(JSON.stringify(intent), "other")).toThrow();
    expect(() =>
      decodePurchase(
        JSON.stringify({
          ...intent,
          request: { ...intent.request, acceptedTerms: null },
        }),
        id,
      ),
    ).toThrow();
    expect(() => decodePurchase("{}", id)).toThrow();
    for (const quote of [
      { ...state.quote!, problems: ["ARTICLE_CHANGED" as const] },
      { ...state.quote!, shortfall: 1 },
      { ...state.quote!, articleRevision: 1 },
    ])
      expect(() => purchaseIntent({ ...state, quote }, id, id)).toThrow();
    // Consuming a choice does not reset its next-save expected revision to zero.
    expect(
      selectionInput(
        { ...selectionForm(null), packageId: id },
        { ...state, selection: null, quote: null, selectionRevision: 4 },
      ).expectedRevision,
    ).toBe(4);
  });
  it("never treats uncertain network, server or idempotency responses as permission for a new purchase", () => {
    for (const error of [
      new Error("network"),
      new ApiRequestError("server", 500),
      new ApiRequestError("conflict", 409, "IDEMPOTENCY_CONFLICT"),
      new ApiRequestError("auth", 401),
    ])
      expect(purchaseRejected(error)).toBe(false);
    for (const code of [
      "QUOTE_CHANGED",
      "ARTICLE_CHANGED",
      "INSUFFICIENT_POINTS",
      "SELECTION_CHANGED",
    ])
      expect(
        purchaseRejected(new ApiRequestError("not purchased", 409, code)),
      ).toBe(true);
  });
  it("separates explicit final confirmation from uncertain-result recovery", () => {
    const intent = purchaseIntent(state, id, id);
    const review = renderToStaticMarkup(
      <PurchaseConfirmation
        intent={intent}
        recovering={false}
        apiBaseUrl=""
        onBack={() => {}}
      />,
    );
    expect(review).toContain("确认购买并扣除 ⚡800");
    expect(review).toContain("返回调整选择");
    expect(review).toContain("文章版本 2");
    const recovery = renderToStaticMarkup(
      <PurchaseConfirmation
        intent={intent}
        recovering
        apiBaseUrl=""
        onBack={() => {}}
      />,
    );
    expect(recovery).toContain("核对或重试同一次购买");
    expect(recovery).not.toContain("返回调整选择");
  });
  it("shows pending handling, historical terms and safe markdown without fabricated fulfilment", () => {
    const order: PublishingOrder = {
      id,
      number: "GEO-00000001",
      brandId: id,
      articleId: id,
      articleRevision: 2,
      status: "PENDING_HANDLING",
      title: "历史标题",
      bodyMarkdown: "# 历史文章\n<script>alert(1)</script>",
      agreement: purchaseIntent(state, id, id).request.acceptedTerms,
      createdAt: "2026-09-06T12:00:00Z",
    };
    const html = renderToStaticMarkup(<OrderDetail order={order} />);
    for (const copy of ["待处理", "历史标题", "历史文章", "媒体甲", "800"])
      expect(html).toContain(copy);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("发布完成");
    expect(html).not.toContain("funded");
  });
});
