import type { TradeObservation } from "../application/payment-gateway.js";

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
