import { describe, expect, it } from "vitest";
import {
  negotiatedResolutionInputSchema,
  resolveNegotiatedAgreement,
  requireReturnSettlement,
  type ResolutionOrder,
} from "../src/publication-delivery/domain/negotiated-resolution.js";

const operator = {
  accountId: "operator",
  role: "OPERATIONS",
  status: "ACTIVE",
};
const admin = { accountId: "admin", role: "ADMINISTRATOR", status: "ACTIVE" };
const key = "1dfae3c9-e2a8-4000-a000-000000000073";
const order = (changes: Partial<ResolutionOrder> = {}): ResolutionOrder => ({
  revision: 8,
  status: "PUBLISHING",
  assigneeAccountId: operator.accountId,
  quantity: 3,
  publishedQuantity: 2,
  stopped: false,
  agreement: null,
  returnRecorded: false,
  ...changes,
});
const input = (points = 0, mode: "CONTINUE" | "TERMINATE" = "TERMINATE") => ({
  expectedRevision: 8,
  idempotencyKey: key,
  mode,
  points,
  reason: "双方协商停止剩余发布",
});
const agreement = (
  points = 100,
  mode: "CONTINUE" | "TERMINATE" = "TERMINATE",
) => ({
  revision: 1,
  mode,
  points,
  reason: "已记录的协商",
});

describe("negotiated fulfilment and settlement decisions (no persistence)", () => {
  it("closes 2/3 at zero directly by operations without a payment decision", () => {
    const current = order();
    expect(resolveNegotiatedAgreement(current, operator, input(), 300)).toEqual(
      {
        status: "CLOSED",
        stopped: true,
        agreement: {
          revision: 1,
          mode: "TERMINATE",
          points: 0,
          reason: input().reason,
        },
      },
    );
    expect(current).toEqual(order());
  });
  it("requires an explicit amount on save instead of silently defaulting an existing positive agreement", () => {
    const { points: _points, ...omitted } = input();
    expect(negotiatedResolutionInputSchema.safeParse(omitted).success).toBe(
      false,
    );
    const current = order({
      agreement: agreement(),
      stopped: true,
      status: "EXCEPTION_HANDLING",
    });
    expect(
      resolveNegotiatedAgreement(current, operator, input(), 300),
    ).toMatchObject({
      status: "CLOSED",
      agreement: { revision: 2, points: 0 },
    });
    expect(current.agreement?.points).toBe(100);
  });
  it.each([
    { ...operator, accountId: "former-owner" },
    { ...operator, status: "INACTIVE" },
    { ...operator, role: "TERMINAL_CUSTOMER" },
    admin,
  ])(
    "does not grant zero closure to a different or invalid actor: %o",
    (actor) => {
      expect(() =>
        resolveNegotiatedAgreement(order(), actor, input(), 300),
      ).toThrow(/当前有效运营/);
    },
  );
  it.each([-1, 0.5, 301, 2_147_483_648, NaN])(
    "rejects invalid agreed amount %s",
    (points) => {
      expect(() =>
        resolveNegotiatedAgreement(order(), operator, input(points), 300),
      ).toThrow();
    },
  );
  it("rejects stale form and extra identity overrides", () => {
    expect(() =>
      resolveNegotiatedAgreement(
        order({ revision: 9 }),
        operator,
        input(),
        300,
      ),
    ).toThrow(/刷新/);
    expect(() =>
      resolveNegotiatedAgreement(
        order(),
        operator,
        { ...input(), actorAccountId: "admin" },
        300,
      ),
    ).toThrow();
  });
  it("normalizes a required reason and records a positive stop without closing", () => {
    expect(
      resolveNegotiatedAgreement(
        order(),
        operator,
        { ...input(100), reason: "  协商结果  " },
        300,
      ),
    ).toMatchObject({
      status: "EXCEPTION_HANDLING",
      stopped: true,
      agreement: { reason: "协商结果", points: 100 },
    });
    expect(() =>
      resolveNegotiatedAgreement(
        order(),
        operator,
        { ...input(), reason: "  " },
        300,
      ),
    ).toThrow();
  });
  it("keeps compensation independent of continued and completed publication", () => {
    expect(
      resolveNegotiatedAgreement(
        order(),
        operator,
        input(100, "CONTINUE"),
        300,
      ),
    ).toMatchObject({ status: "PUBLISHING", stopped: false });
    expect(
      resolveNegotiatedAgreement(
        order({ status: "COMPLETED", publishedQuantity: 3 }),
        operator,
        input(100, "CONTINUE"),
        300,
      ),
    ).toMatchObject({ status: "COMPLETED" });
  });
  it.each([
    order({ status: "COMPLETED", publishedQuantity: 3 }),
    order({ status: "CLOSED", stopped: true }),
    order({ returnRecorded: true }),
  ])("cannot terminate or renegotiate an ended order: %o", (current) => {
    expect(() =>
      resolveNegotiatedAgreement(current, operator, input(), 300),
    ).toThrow();
  });
  it("does not reopen a stopped order through continue", () => {
    expect(() =>
      resolveNegotiatedAgreement(
        order({ stopped: true }),
        operator,
        input(100, "CONTINUE"),
        300,
      ),
    ).toThrow(/重新开启/);
  });
  it("uses one aggregate stop for maximum purchased quantity", () => {
    expect(
      resolveNegotiatedAgreement(
        order({ quantity: 2_147_483_647 }),
        operator,
        input(),
        300,
      ),
    ).toMatchObject({ stopped: true, status: "CLOSED" });
  });
  it("permits only an exact eligible positive administrator settlement", () => {
    const stopped = order({
      stopped: true,
      status: "EXCEPTION_HANDLING",
      agreement: agreement(),
    });
    expect(requireReturnSettlement(stopped, admin, 1)).toEqual({
      agreementRevision: 1,
      points: 100,
      status: "CLOSED",
    });
    expect(() => requireReturnSettlement(stopped, admin, 2)).toThrow(
      /协商已变化/,
    );
    expect(() => requireReturnSettlement(stopped, operator, 1)).toThrow(
      /管理员/,
    );
    expect(() =>
      requireReturnSettlement(stopped, { ...admin, status: "INACTIVE" }, 1),
    ).toThrow(/管理员/);
  });
  it("completed compensation settles without turning Completed into Closed", () => {
    const current = order({
      status: "COMPLETED",
      publishedQuantity: 3,
      agreement: agreement(100, "CONTINUE"),
    });
    expect(requireReturnSettlement(current, admin, 1).status).toBe("COMPLETED");
  });
  it.each([
    order({ agreement: agreement(0), stopped: true }),
    order({ agreement: agreement(), stopped: false }),
    order({ agreement: agreement(100, "CONTINUE") }),
    order({ agreement: agreement(), stopped: true, returnRecorded: true }),
    order({ agreement: agreement(), stopped: true, status: "CLOSED" }),
  ])(
    "does not authorize money for zero, unfinished, or already ended settlement: %o",
    (current) => {
      expect(() => requireReturnSettlement(current, admin, 1)).toThrow();
    },
  );
});
