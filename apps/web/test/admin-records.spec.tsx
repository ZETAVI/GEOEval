import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BusinessRecordsNavigation } from "../app/admin/records/navigation.js";
import {
  OrderSettlementDetails,
  settlementExplanation,
} from "../app/admin/records/order-settlement.js";
import type { AdminOrderSettlement } from "@geoeval/api-client";
const value: AdminOrderSettlement = {
  orderId: "order",
  accountId: "customer",
  consumptionLedgerId: "consume",
  returnLedgerId: null,
  agreedPoints: 150,
  returnedPoints: null,
  endedAt: "2026-09-01T00:00:00Z",
  appealUntil: "2026-09-04T00:00:00Z",
  settledAt: null,
  hasOpenIssue: true,
  windowElapsed: true,
};
describe("business record navigation and factual settlement context", () => {
  it("links every factual business-record view", () => {
    const html = renderToStaticMarkup(
      <BusinessRecordsNavigation active="points" withdrawalEnabled />,
    );
    for (const path of [
      "/admin/records",
      "/admin/recharges",
      "/admin/delivery",
      "/admin/support",
      "/admin/commissions",
      "/admin/withdrawals",
    ])
      expect(html).toContain(path);
    expect(html).toContain('aria-current="page"');
    expect(
      renderToStaticMarkup(<BusinessRecordsNavigation active="points" />),
    ).not.toContain("/admin/withdrawals");
  });
  it("distinguishes an open issue, a missing receipt and a completed zero settlement", () => {
    expect(settlementExplanation(value)).toContain("工单");
    expect(settlementExplanation({ ...value, hasOpenIssue: false })).toContain(
      "尚无结算记录",
    );
    expect(
      settlementExplanation({
        ...value,
        hasOpenIssue: false,
        settledAt: "2026-09-04T00:00:01Z",
        agreedPoints: 0,
      }),
    ).toBe("结算已完成");
    const html = renderToStaticMarkup(<OrderSettlementDetails value={value} />);
    expect(html).toContain("referenceId=order");
    expect(html).toContain("orderId=order");
    expect(html).not.toContain("强制退点");
    expect(html).not.toContain("支付失败");
  });
});
