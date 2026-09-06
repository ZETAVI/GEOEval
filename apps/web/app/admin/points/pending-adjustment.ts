import { ApiRequestError, type PointAdjustment } from "@geoeval/api-client";

export type PendingAdjustment = {
  actorAccountId: string;
  accountId: string;
  request: PointAdjustment;
};
export type AdjustmentForm = {
  direction: "ADD" | "DEDUCT";
  amount: string;
  reason: string;
  internalNote: string;
  businessReference: string;
};
export const emptyAdjustmentForm: AdjustmentForm = {
  direction: "ADD",
  amount: "",
  reason: "",
  internalNote: "",
  businessReference: "",
};
export function adjustmentForm(request: PointAdjustment): AdjustmentForm {
  return {
    direction: request.amount > 0 ? "ADD" : "DEDUCT",
    amount: String(Math.abs(request.amount)),
    reason: request.reason,
    internalNote: request.internalNote ?? "",
    businessReference: request.businessReference ?? "",
  };
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function adjustmentRequest(
  form: AdjustmentForm,
  key: string,
): PointAdjustment {
  if (!/^\d+$/.test(form.amount)) throw new Error("积分数量必须为正整数");
  const value = Number(form.amount);
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647)
    throw new Error("积分数量超出有效范围");
  if (!form.reason.trim()) throw new Error("请填写客户可见原因");
  return {
    idempotencyKey: key,
    amount: form.direction === "ADD" ? value : -value,
    reason: form.reason.trim(),
    internalNote: form.internalNote.trim() || null,
    businessReference: form.businessReference.trim() || null,
  };
}
export function pendingStorageKey(actor: string) {
  return `geoeval.pending-point-adjustment.${actor}`;
}
export function decodePending(
  raw: string | null,
  actor: string,
): PendingAdjustment | null {
  if (raw === null) return null;
  const parsed = JSON.parse(raw) as PendingAdjustment;
  const input = parsed?.request;
  if (
    parsed?.actorAccountId !== actor ||
    !uuid.test(parsed.accountId) ||
    !input ||
    !uuid.test(input.idempotencyKey) ||
    !Number.isSafeInteger(input.amount) ||
    !input.amount ||
    Math.abs(input.amount) > 2147483647 ||
    typeof input.reason !== "string" ||
    !input.reason.trim()
  )
    throw new Error("待核对操作无法读取，请保留记录并联系管理员核查");
  return parsed;
}
export function isDefinitiveRejection(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    ([400, 404, 422].includes(error.status) ||
      [
        "INSUFFICIENT_GRANTED_POINTS",
        "POINT_LIMIT_EXCEEDED",
        "TARGET_INACTIVE",
      ].includes(error.code ?? ""))
  );
}
