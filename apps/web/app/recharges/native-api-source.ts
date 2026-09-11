import {
  ApiRequestError,
  cancelRecharge,
  getRecharge,
  requestRechargeVerification,
  type RechargeRead,
} from "@geoeval/api-client";
import type { NativeCheckoutSource } from "./native-checkout-controller.js";
export const rechargeApiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3300";
function failure(e: unknown) {
  return e instanceof ApiRequestError &&
    ([401, 403, 404].includes(e.status) || e.code === "ACCOUNT_CHANGED")
    ? ("access-denied" as const)
    : ("unavailable" as const);
}
export function nativeApiSource(
  base: string,
  accountId: string,
  onRead?: (read: RechargeRead) => void,
): NativeCheckoutSource {
  return {
    async read(id, signal) {
      try {
        const value = await getRecharge(base, accountId, id, signal);
        if (!signal.aborted) onRead?.(value);
        return { kind: "ok", order: value.order, serverTime: value.serverTime };
      } catch (e) {
        return { kind: failure(e) };
      }
    },
    async verify(id, signal) {
      try {
        await requestRechargeVerification(base, accountId, id, signal);
        return "accepted";
      } catch (e) {
        return failure(e);
      }
    },
    async cancel(id, signal) {
      try {
        await cancelRecharge(base, accountId, id, signal);
        return "accepted";
      } catch (e) {
        return failure(e);
      }
    },
  };
}
