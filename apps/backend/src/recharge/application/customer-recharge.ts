import type {
  CreateRecharge,
  RechargeOrder,
} from "../domain/recharge-order.js";
import type { NativeCheckoutSnapshot } from "./native-recovery.js";

export const RECHARGE_CUSTOMER_QUERIES = Symbol("RECHARGE_CUSTOMER_QUERIES");
export const RECHARGE_CUSTOMER_RUNTIME = Symbol("RECHARGE_CUSTOMER_RUNTIME");
export const RECHARGE_CUSTOMER_OPTIONS = Symbol("RECHARGE_CUSTOMER_OPTIONS");
export type RechargeStatus = RechargeOrder["status"];
export type RechargePagePosition = { createdAt: Date; id: string };
export interface RechargeCustomerQueries {
  readOwned(
    accountId: string,
    orderId: string,
    now: Date,
  ): Promise<NativeCheckoutSnapshot | null>;
  findRequest(
    accountId: string,
    input: CreateRecharge,
  ): Promise<RechargeOrder | null>;
  listOwned(
    accountId: string,
    input: {
      limit: number;
      status?: RechargeStatus;
      before?: RechargePagePosition;
    },
  ): Promise<{ items: RechargeOrder[]; next: RechargePagePosition | null }>;
}
export type RechargeCustomerOptions = Readonly<{
  available: boolean;
  controlled: boolean;
  minAmountYuan: number | null;
  maxAmountYuan: number | null;
  shortcutAmounts: readonly number[];
  methods: readonly ("WECHAT_NATIVE" | "ALIPAY_PC")[];
  pointsPerYuan: number;
  supportMessage: string | null;
}>;
