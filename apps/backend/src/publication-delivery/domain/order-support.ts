import { ConflictException } from "@nestjs/common";
import type { DeliveryStatus } from "./delivery-assignment.js";
type OrderSupportEnd = {
  status: DeliveryStatus;
  completedAt: Date | null;
  closedAt: Date | null;
};
export const ORDER_APPEAL_WINDOW_MS = 72 * 60 * 60 * 1000;
export function orderSupportWindow(row: OrderSupportEnd) {
  const ended = row.status === "COMPLETED" || row.status === "CLOSED";
  const times = [row.completedAt, row.closedAt].filter(
    (d): d is Date => d !== null,
  );
  const endedAt =
    ended && times.length
      ? new Date(Math.min(...times.map((d) => d.getTime())))
      : null;
  return {
    ended,
    endedAt,
    deadline: endedAt
      ? new Date(endedAt.getTime() + ORDER_APPEAL_WINDOW_MS)
      : null,
  };
}
/** Caller already holds Delivery. now is the database clock read after the lock, not transaction start. */
export function requireOrderSupportAdmission(
  row: OrderSupportEnd,
  now: Date,
  customer: boolean,
  appealUsed: boolean,
) {
  const window = orderSupportWindow(row);
  if (!window.ended) return false;
  if (!window.deadline)
    throw new ConflictException("该订单结束时间待核对，请通过普通客服提交问题");
  if (now >= window.deadline)
    throw new ConflictException("已超过订单结束后 72 小时，已有工单可继续处理");
  if (customer && appealUsed)
    throw new ConflictException(
      "本订单已使用一次售后机会，请查看原工单处理结果",
    );
  return customer;
}
