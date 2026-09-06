import { renderToStaticMarkup } from "react-dom/server";
import { ApiRequestError, type PointAdminChange } from "@geoeval/api-client";
import { describe, expect, it } from "vitest";
import {
  adjustmentRequest,
  adjustmentForm,
  decodePending,
  emptyAdjustmentForm,
  isDefinitiveRejection,
  pendingStorageKey,
} from "../app/admin/points/pending-adjustment.js";
import { PointHistoryList } from "../app/points/point-history.js";

const key = "10000000-0000-4000-8000-000000000001",
  accountId = "10000000-0000-4000-8000-000000000002";
describe("point adjustment intent and projections", () => {
  it("preserves the exact actor-bound pending key and request across reload", () => {
    const request = adjustmentRequest(
      { ...emptyAdjustmentForm, amount: "500", reason: "活动赠送" },
      key,
    );
    const raw = JSON.stringify({ actorAccountId: "admin", accountId, request });
    expect(decodePending(raw, "admin")).toEqual({
      actorAccountId: "admin",
      accountId,
      request,
    });
    expect(
      adjustmentRequest(adjustmentForm(request), request.idempotencyKey),
    ).toEqual(request);
    expect(() => decodePending(raw, "another-admin")).toThrow();
    expect(pendingStorageKey("admin")).not.toBe(
      pendingStorageKey("another-admin"),
    );
    expect(decodePending(null, "admin")).toBeNull();
  });
  it("uses signed integer deltas, not balances or funded credits", () => {
    const form = {
      ...emptyAdjustmentForm,
      amount: "200",
      reason: "赠送纠正",
      direction: "DEDUCT" as const,
    };
    expect(adjustmentRequest(form, key)).toMatchObject({ amount: -200 });
    for (const amount of ["0", "1.2", "-3", "NaN", "2147483648", "1e3"])
      expect(() => adjustmentRequest({ ...form, amount }, key)).toThrow();
    expect(adjustmentRequest(form, key)).not.toHaveProperty("fundedDelta");
  });
  it("retains uncertain transport/server and mismatched-key results but permits known correction", () => {
    for (const error of [
      new Error("network"),
      new ApiRequestError("unknown", 500),
      new ApiRequestError("collision", 409, "IDEMPOTENCY_CONFLICT"),
    ])
      expect(isDefinitiveRejection(error)).toBe(false);
    expect(
      isDefinitiveRejection(
        new ApiRequestError("insufficient", 409, "INSUFFICIENT_GRANTED_POINTS"),
      ),
    ).toBe(true);
  });
  it("keeps internal notes and origin composition out of the customer history view", () => {
    const item: PointAdminChange = {
      id: key,
      accountId,
      actorAccountId: "internal-actor",
      sequence: 1,
      kind: "ADMIN_ADJUSTMENT",
      publishingOrderId: null,
      amount: 500,
      grantedDelta: 500,
      fundedDelta: 0,
      balanceAfter: 500,
      idempotencyKey: key,
      reason: "活动赠送",
      internalNote: "内部专用说明",
      businessReference: "内部工单",
      createdAt: "2026-09-06T10:00:00Z",
    };
    const publicHtml = renderToStaticMarkup(
      <PointHistoryList items={[item]} />,
    );
    expect(publicHtml).toContain("活动赠送");
    expect(publicHtml).not.toContain("内部专用说明");
    expect(publicHtml).not.toContain("internal-actor");
    expect(
      renderToStaticMarkup(<PointHistoryList items={[item]} showInternal />),
    ).toContain("内部专用说明");
  });
});
