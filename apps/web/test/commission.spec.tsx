import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CommissionFacts,
  commissionMoney,
} from "../app/agent/commissions/view.js";
import type { Commission } from "@geoeval/api-client";
const record: Commission = {
  orderId: "order",
  number: 21,
  title: "历史订单",
  agentId: "agent",
  customerId: "customer",
  brandId: "brand",
  createdAt: "2026-09-01T00:00:00Z",
  status: "CLOSED",
  rateBps: 2000,
  originalFundedPoints: 200,
  originalGrantedPoints: 100,
  returnFundedPoints: 67,
  returnGrantedPoints: 33,
  eligibleFundedPoints: 133,
  returnConfirmed: false,
  settledAt: null,
  bookedAt: null,
  state: "PENDING",
  amountFen: "266",
};
describe("commission presentation", () => {
  it("formats integers above safe number limits exactly", () => {
    expect(commissionMoney("900719925474099399")).toBe("¥9007199254740993.99");
    expect(commissionMoney("0")).toBe("¥0.00");
  });
  it("explains forecast sources without granting current customer access", () => {
    const html = renderToStaticMarkup(<CommissionFacts record={record} />);
    expect(html).toContain("¥2.66");
    expect(html).toContain("约定退回");
    expect(html).toContain("72 小时");
    expect(html).not.toContain("/agent/customers");
    expect(html).not.toContain("提现");
  });
  it("shows actual booked zero money and administrator-only factual links", () => {
    const html = renderToStaticMarkup(
      <CommissionFacts
        record={{
          ...record,
          state: "BOOKED",
          amountFen: "0",
          returnConfirmed: true,
          bookedAt: "2026-09-04T00:00:00Z",
        }}
        admin
      />,
    );
    expect(html).toContain("已入账");
    expect(html).toContain("实际退回");
    expect(html).toContain("/admin/delivery/order");
    expect(html).not.toContain("72 小时");
  });
});
