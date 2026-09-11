import type { RechargeCreate, RechargeOptions } from "@geoeval/api-client";
export const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export type RechargeIntent = RechargeCreate & {
  accountId: string;
  returnBrandId: string | null;
};
export const rechargeIntentKey = (accountId: string) =>
  `geoeval.recharge.create.${accountId}`;
export function parseRechargeAmount(
  raw: string,
  policy: Pick<RechargeOptions, "minAmountYuan" | "maxAmountYuan">,
): { amount: number; problem: null } | { amount: null; problem: string } {
  if (!/^\d+$/.test(raw))
    return {
      amount: null,
      problem: "请输入整数元金额，不支持小数或其他字符。",
    };
  const amount = Number(raw);
  if (
    !Number.isSafeInteger(amount) ||
    policy.minAmountYuan === null ||
    policy.maxAmountYuan === null ||
    amount < policy.minAmountYuan ||
    amount > policy.maxAmountYuan
  )
    return {
      amount: null,
      problem: `请输入 ${policy.minAmountYuan ?? "允许范围内的"} 至 ${policy.maxAmountYuan ?? "允许范围内的"} 元。`,
    };
  return { amount, problem: null };
}
export function decodeRechargeIntent(
  raw: string | null,
  accountId: string,
): RechargeIntent | null {
  if (raw === null) return null;
  const value = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).sort().join(",") !==
      "accountId,amountYuan,idempotencyKey,method,returnBrandId" ||
    value.accountId !== accountId ||
    !uuid(value.accountId) ||
    !uuid(value.idempotencyKey) ||
    value.method !== "WECHAT_NATIVE" ||
    !Number.isSafeInteger(value.amountYuan) ||
    value.amountYuan < 1 ||
    value.amountYuan > 214748364 ||
    !(value.returnBrandId === null || uuid(value.returnBrandId))
  )
    throw new Error("无法恢复上次充值，请先从充值记录中核对，勿重复发起。");
  return value;
}
export const rechargeEntryKey = (accountId: string) =>
  `geoeval.recharge.entry.${accountId}`;
export const rechargeReturnKey = (accountId: string, orderId: string) =>
  `geoeval.recharge.return.${accountId}.${orderId}`;
export function readReturnBrand(raw: string | null): string | null {
  return uuid(raw) ? raw : null;
}
