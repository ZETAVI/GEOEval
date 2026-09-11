import type { RechargeStatus } from "./customer-recharge.js";
export const ADMIN_RECHARGE_QUERIES = Symbol("ADMIN_RECHARGE_QUERIES");
export type AdminRechargeFilter = {
  accountId?: string | undefined;
  orderId?: string | undefined;
  status?: RechargeStatus | undefined;
  createdFrom?: string | undefined;
  createdBefore?: string | undefined;
};
export type AdminRechargeSummary = {
  id: string;
  accountId: string;
  accountMobile: string;
  amountYuan: number;
  points: number;
  method: "WECHAT_NATIVE";
  status: RechargeStatus;
  createdAt: string;
  paymentExpiresAt: string;
  paidAt: string | null;
  closedAt: string | null;
};
export type AdminRechargeDetail = AdminRechargeSummary & {
  merchantOrderNo: string;
  providerTransactionId: string | null;
  ledgerId: string | null;
  creditedPoints: number | null;
  creditedAt: string | null;
  lastQueriedAt: string | null;
  diagnostic: string | null;
  notificationState: "PENDING" | "DELIVERED" | null;
  notificationDeliveredAt: string | null;
};
export type AdminRechargePosition = { id: string; createdAt: string };
export interface AdminRechargeQueries {
  list(
    filter: AdminRechargeFilter,
    limit: number,
    before?: AdminRechargePosition,
  ): Promise<{
    items: AdminRechargeSummary[];
    next: AdminRechargePosition | null;
  }>;
  detail(id: string): Promise<AdminRechargeDetail | null>;
}
