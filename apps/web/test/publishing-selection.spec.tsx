import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublishingWorkspace, PublishingQuote } from "@geoeval/api-client";
import {
  estimatedPoints,
  selectionForm,
  selectionInput,
} from "../app/publishing/selection-form.js";
import { QuoteSummary } from "../app/publishing/quote-summary.js";
const workspace: PublishingWorkspace = {
  brand: { id: "b", companyName: "测试品牌" },
  article: {
    id: "a",
    title: "核心文章",
    status: "CONFIRMED",
    revision: 2,
    confirmedRevision: 2,
  },
  balance: 200,
  selection: null,
  selectionRevision: 0,
  quote: null,
};
describe("publishing choice and quote UI contract", () => {
  it("builds explicit saved intent against the exact current article without client money or identity authority", () => {
    const form = { ...selectionForm(null), packageId: "p" };
    expect(selectionInput(form, workspace)).toEqual({
      expectedRevision: 0,
      articleId: "a",
      articleRevision: 2,
      intent: { mode: "RANDOM", packageId: "p" },
    });
    expect(() =>
      selectionInput(form, {
        ...workspace,
        article: { ...workspace.article!, status: "DRAFT" },
      }),
    ).toThrow();
  });
  it("restores selected media quantities and rejects invalid numeric input without rounding", () => {
    const selection = {
      brandId: "b",
      articleId: "a",
      articleRevision: 2,
      revision: 3,
      intent: {
        mode: "PRECISE" as const,
        lines: [{ platformId: "m", quantity: 2 }],
      },
    };
    expect(
      selectionInput(selectionForm(selection), {
        ...workspace,
        selection,
        selectionRevision: 3,
      }).expectedRevision,
    ).toBe(3);
    for (const quantity of ["0", "-1", "1.5", "1e3", "2147483648"])
      expect(() =>
        selectionInput(
          {
            mode: "PRECISE",
            packageId: "",
            lines: [{ platformId: "m", quantity }],
          },
          workspace,
        ),
      ).toThrow();
    expect(
      estimatedPoints(selectionForm(selection), [], new Map([["m", 150]])),
    ).toBe(300);
    expect(estimatedPoints(selectionForm(selection), [], new Map())).toBeNull();
  });
  it("keeps changed or unsaved publishing choices disabled while explaining explicit confirmation after recharge", () => {
    const quote: PublishingQuote = {
      selectionRevision: 1,
      articleId: "a",
      articleRevision: 1,
      mode: "PRECISE",
      packageName: null,
      scope: [],
      lines: [
        {
          platformId: "m",
          displayName: "媒体甲",
          quantity: 2,
          unitPoints: 150,
          totalPoints: 300,
          available: true,
        },
      ],
      quantity: 2,
      totalPoints: 300,
      shortfall: 100,
      suggestedRechargeYuan: 10,
      problems: ["ARTICLE_CHANGED"],
    };
    const html = renderToStaticMarkup(
      <QuoteSummary quote={quote} balance={200} dirty onRecharge={() => {}} />,
    );
    for (const copy of [
      "媒体甲",
      "积分差额",
      "还差",
      "100",
      "文章已更新",
      "未保存修改",
      "报价不保留价格",
      "充值后仍需核对最新方案并确认购买",
      "前往充值并保留已保存方案",
      "disabled",
    ])
      expect(html).toContain(copy);
    expect(html).not.toContain("购买成功");
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
