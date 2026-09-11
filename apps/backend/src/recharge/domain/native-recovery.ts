import type {
  GatewayResult,
  TradeObservation,
} from "../application/payment-gateway.js";

export type NativeOperationKind = "INITIATE" | "QUERY" | "CLOSE";

/** Operation recovery decisions, not a second order/payment state machine. */
export type NativeQueryDecision =
  "SETTLE" | "CONFIRM_CLOSED" | "CLOSE" | "INITIATE" | "QUERY" | "REVIEW";

export function canDispatchNative(input: {
  cancelled: boolean;
  paymentExpiresAt: Date;
  now: Date;
  minimumRemainingMs: number;
}): boolean {
  return (
    !input.cancelled &&
    Number.isFinite(input.paymentExpiresAt.getTime()) &&
    Number.isFinite(input.now.getTime()) &&
    Number.isSafeInteger(input.minimumRemainingMs) &&
    input.minimumRemainingMs >= 60_000 &&
    input.paymentExpiresAt.getTime() - input.now.getTime() >=
      input.minimumRemainingMs
  );
}

export function planNativeQuery(
  state: TradeObservation["state"],
  input: { stopPayment: boolean; mayInitiate: boolean; usableQr: boolean },
): NativeQueryDecision {
  if (state === "SUCCESS") return "SETTLE";
  if (state === "CLOSED") return "CONFIRM_CLOSED";
  // The other states belong to refunds or micropay, not an ordinary Native close.
  if (state !== "NOTPAY") return "REVIEW";
  if (input.stopPayment) return "CLOSE";
  return input.mayInitiate && !input.usableQr ? "INITIATE" : "QUERY";
}

/** Same URI is not proof of a renewed QR lifetime. Keep the conservative bound. */
export function nativeQrDeadline(input: {
  url: string;
  requestStartedAt: Date;
  paymentExpiresAt: Date;
  previous: { url: string; expiresAt: Date } | null;
}): Date {
  const deadline = Math.min(
    input.requestStartedAt.getTime() + 2 * 60 * 60 * 1000,
    input.paymentExpiresAt.getTime(),
    input.previous?.url === input.url
      ? input.previous.expiresAt.getTime()
      : Infinity,
  );
  if (!Number.isFinite(deadline)) throw new Error("NATIVE_QR_TIME_INVALID");
  return new Date(deadline);
}

export type NativeFailureClass = "TEMPORARY" | "REJECTED" | "UNKNOWN";

/** Diagnostics control retry only; an HTTP error never proves payment or closure. */
export function nativeFailure(
  operation: NativeOperationKind,
  error: Extract<GatewayResult<never>, { ok: false }>["error"],
): {
  failureClass: NativeFailureClass;
  errorHttpStatus: number | null;
} {
  const status =
    Number.isInteger(error.httpStatus) &&
    error.httpStatus! >= 100 &&
    error.httpStatus! <= 599
      ? error.httpStatus!
      : null;
  let failureClass: NativeFailureClass = "UNKNOWN";
  if (error.kind !== "UNRESOLVED") failureClass = "REJECTED";
  else if (error.code === "HTTP_ERROR") {
    if (
      status === 429 ||
      (status !== null && status >= 500) ||
      (operation === "QUERY" && status === 404)
    )
      failureClass = "TEMPORARY";
    else if (status === 401 || status === 403) failureClass = "REJECTED";
  } else if (error.httpStatus === undefined) {
    if (["TIMEOUT", "TRANSPORT", "RESPONSE_INTERRUPTED"].includes(error.code))
      failureClass = "TEMPORARY";
    else if (
      [
        "INVALID_INPUT",
        "AUTH_HEADERS",
        "AUTH_TIMESTAMP",
        "AUTH_KEY",
        "AUTH_SIGNATURE",
        "DECRYPTION",
        "INVALID_RESPONSE",
        "INCOMPLETE_PAYMENT",
        "IDENTITY_MISMATCH",
        "AMOUNT_MISMATCH",
        "UNSUPPORTED_TRADE_TYPE",
        "REDIRECT",
        "RESPONSE_SIZE",
        "CONTENT_ENCODING",
      ].includes(error.code)
    )
      failureClass = "REJECTED";
  }
  return { failureClass, errorHttpStatus: status };
}
