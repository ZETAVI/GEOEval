import type { AgencyWithdrawal } from "@geoeval/api-client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  money,
  WithdrawalFacts,
  yuanToFen,
} from "../app/agent/withdrawals/view.js";

const withdrawal: AgencyWithdrawal = {
  id: "77000000-0000-4000-8000-000000000201",
  number: 23,
  agentId: "77000000-0000-4000-8000-000000000202",
  amountFen: "12345",
  status: "PAYING",
  revision: 2,
  payout: {
    recipientType: "INDIVIDUAL",
    accountName: "林代理",
    maskedAccountNumber: "**** **** **** 7890",
    bankName: "示例银行",
    openingBranch: "广州天河支行",
    contactMobile: "+8613900116003",
  },
  submittedAt: "2026-09-16T00:00:00.000Z",
  approvedAt: "2026-09-16T01:00:00.000Z",
  resolvedAt: null,
  resultReason: null,
  bankTransactionReference: null,
  externalPaidAt: null,
  updatedAt: "2026-09-16T01:00:00.000Z",
};

describe("agency withdrawal presentation", () => {
  it("converts money without floating point rounding", () => {
    expect(yuanToFen("1")).toBe("100");
    expect(yuanToFen("1.2")).toBe("120");
    expect(yuanToFen("1.23")).toBe("123");
    expect(money("9007199254740993")).toBe("¥90071992547409.93");
    expect(() => yuanToFen("1.234")).toThrow("最多两位小数");
    expect(() => yuanToFen("0")).toThrow("必须大于零");
  });

  it("shows only the masked snapshot and explains that an unknown payment remains reserved", () => {
    const html = renderToStaticMarkup(<WithdrawalFacts value={withdrawal} />);
    expect(html).toContain("¥123.45");
    expect(html).toContain("付款中");
    expect(html).toContain("继续保持付款中并占用金额");
    expect(html).toContain("**** **** **** 7890");
    expect(html).not.toContain("6222021234567890");
  });

  it("makes a withdrawn request terminal and directs the agent to create a new one", () => {
    const html = renderToStaticMarkup(
      <WithdrawalFacts
        value={{
          ...withdrawal,
          status: "WITHDRAWN",
          revision: 2,
          approvedAt: null,
          resolvedAt: "2026-09-16T01:00:00.000Z",
        }}
      />,
    );
    expect(html).toContain("已撤回");
    expect(html).toContain("重新创建一条申请");
    expect(html).not.toContain("重新提交");
  });
});
