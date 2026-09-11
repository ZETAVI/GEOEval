import { describe, expect, it } from "vitest";
import {
  canDispatchNative,
  nativeFailure,
  nativeQrDeadline,
  planNativeQuery,
} from "../src/recharge/domain/native-recovery.js";

describe("Native recovery boundaries", () => {
  const now = new Date("2026-09-09T12:00:00Z");
  it("requires the explicit safe dispatch window and never reopens cancellation", () => {
    const context = {
      cancelled: false,
      now,
      minimumRemainingMs: 70_000,
      paymentExpiresAt: new Date(now.getTime() + 70_000),
    };
    expect(canDispatchNative(context)).toBe(true);
    expect(
      canDispatchNative({ ...context, now: new Date(now.getTime() + 1) }),
    ).toBe(false);
    expect(canDispatchNative({ ...context, cancelled: true })).toBe(false);
    expect(canDispatchNative({ ...context, minimumRemainingMs: 59_999 })).toBe(
      false,
    );
  });
  it("settles authenticated success even after cancellation or deadline", () => {
    expect(
      planNativeQuery("SUCCESS", {
        stopPayment: true,
        mayInitiate: false,
        usableQr: false,
      }),
    ).toBe("SETTLE");
  });
  it("an authenticated NOTPAY with stop intent permits close, not local closure", () => {
    expect(
      planNativeQuery("NOTPAY", {
        stopPayment: true,
        mayInitiate: false,
        usableQr: false,
      }),
    ).toBe("CLOSE");
  });
  it("only reobtains a missing QR while an ordinary unpaid order may initiate", () => {
    const context = { stopPayment: false, mayInitiate: true, usableQr: false };
    expect(planNativeQuery("NOTPAY", context)).toBe("INITIATE");
    expect(planNativeQuery("NOTPAY", { ...context, usableQr: true })).toBe(
      "QUERY",
    );
    expect(planNativeQuery("NOTPAY", { ...context, mayInitiate: false })).toBe(
      "QUERY",
    );
    expect(planNativeQuery("CLOSED", context)).toBe("CONFIRM_CLOSED");
  });
  it.each(["REFUND", "REVOKED", "USERPAYING", "PAYERROR"] as const)(
    "%s cannot become Native closure or credit",
    (state) => {
      expect(
        planNativeQuery(state, {
          stopPayment: true,
          mayInitiate: true,
          usableQr: false,
        }),
      ).toBe("REVIEW");
    },
  );
  it("uses the earlier order/QR bound without renewing a repeated URI", () => {
    const value = {
      url: "weixin://wxpay/bizpayurl/up?pr=LOCAL",
      requestStartedAt: now,
      paymentExpiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      previous: null,
    };
    const first = nativeQrDeadline(value);
    expect(first.getTime() - now.getTime()).toBe(2 * 60 * 60 * 1000);
    expect(
      nativeQrDeadline({
        ...value,
        requestStartedAt: new Date(now.getTime() + 10_000),
        previous: { url: value.url, expiresAt: first },
      }),
    ).toEqual(first);
    expect(
      nativeQrDeadline({
        ...value,
        paymentExpiresAt: new Date(now.getTime() + 60_000),
      }).getTime() - now.getTime(),
    ).toBe(60_000);
  });
});

describe("Native failure evidence classification", () => {
  it.each([429, 500, 502, 503, 599])(
    "HTTP %s can schedule recovery but is no payment fact",
    (httpStatus) => {
      expect(
        nativeFailure("INITIATE", {
          kind: "UNRESOLVED",
          code: "HTTP_ERROR",
          httpStatus,
        }),
      ).toEqual({ failureClass: "TEMPORARY", errorHttpStatus: httpStatus });
    },
  );
  it.each([401, 403])("HTTP %s remains restricted", (httpStatus) => {
    expect(
      nativeFailure("INITIATE", {
        kind: "UNRESOLVED",
        code: "HTTP_ERROR",
        httpStatus,
      }).failureClass,
    ).toBe("REJECTED");
  });
  it.each([400, 404, 409, 499, undefined, 600, NaN])(
    "ambiguous HTTP %s cannot enter automatic recovery",
    (httpStatus) => {
      expect(
        nativeFailure("INITIATE", {
          kind: "UNRESOLVED",
          code: "HTTP_ERROR",
          httpStatus,
        }).failureClass,
      ).toBe("UNKNOWN");
    },
  );
  it.each(["TRANSPORT", "TIMEOUT", "RESPONSE_INTERRUPTED"] as const)(
    "%s keeps retryable uncertainty",
    (code) => {
      expect(nativeFailure("INITIATE", { kind: "UNRESOLVED", code })).toEqual({
        failureClass: "TEMPORARY",
        errorHttpStatus: null,
      });
      expect(
        nativeFailure("INITIATE", { kind: "UNRESOLVED", code, httpStatus: 503 })
          .failureClass,
      ).toBe("UNKNOWN");
    },
  );
  it.each([
    "AUTH_SIGNATURE",
    "AUTH_KEY",
    "IDENTITY_MISMATCH",
    "AMOUNT_MISMATCH",
    "INVALID_RESPONSE",
    "REDIRECT",
    "CONTENT_ENCODING",
  ] as const)("%s cannot be retried past verification", (code) => {
    expect(
      nativeFailure("INITIATE", { kind: "UNRESOLVED", code }).failureClass,
    ).toBe("REJECTED");
  });
  it("an inconclusive query can be retried while other 404 operations remain unknown", () => {
    const error = {
      kind: "UNRESOLVED",
      code: "HTTP_ERROR",
      httpStatus: 404,
    } as const;
    expect(nativeFailure("QUERY", error).failureClass).toBe("TEMPORARY");
    expect(nativeFailure("CLOSE", error).failureClass).toBe("UNKNOWN");
  });
  it("does not reinterpret an invalid invocation as a temporary server error", () => {
    expect(
      nativeFailure("INITIATE", {
        kind: "INVALID_REQUEST",
        code: "HTTP_ERROR",
        httpStatus: 503,
      }).failureClass,
    ).toBe("REJECTED");
  });
});
