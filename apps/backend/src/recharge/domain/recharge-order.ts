import { z } from "zod";
import { MAX_POINTS } from "../../publishing-commerce/domain/point-account.js";
import type { NotificationIdentity } from "../application/notification-inbox.js";
import type {
  PaymentFacts,
  PaymentProof,
} from "../application/payment-gateway.js";

export const POINTS_PER_YUAN = 10;
export const createRechargeSchema = z
  .object({
    idempotencyKey: z
      .string()
      .uuid()
      .transform((value) => value.toLowerCase()),
    amountYuan: z
      .number()
      .int()
      .min(1)
      .max(Math.floor(MAX_POINTS / POINTS_PER_YUAN)),
    method: z.literal("WECHAT_NATIVE"),
  })
  .strict();
export type CreateRecharge = z.infer<typeof createRechargeSchema>;

/** Explicit test/live policy, never a merchant activation default. */
export const rechargeConfigSchema = z
  .object({
    merchantId: z.string().regex(/^\d{1,32}$/),
    appId: z.string().regex(/^[A-Za-z0-9_-]{1,32}$/),
    minAmountYuan: z.number().int().positive(),
    maxAmountYuan: z
      .number()
      .int()
      .max(Math.floor(MAX_POINTS / POINTS_PER_YUAN)),
    maxActiveOrders: z.number().int().min(1).max(100),
    paymentWindowSeconds: z.number().int().min(60).max(86400),
  })
  .strict()
  .refine((c) => c.minAmountYuan <= c.maxAmountYuan);
export type RechargeConfig = Readonly<z.infer<typeof rechargeConfigSchema>>;

export type RechargeOrder = Readonly<{
  id: string;
  accountId: string;
  idempotencyKey: string;
  amountYuan: number;
  amountFen: number;
  fundedPoints: number;
  provider: "WECHAT";
  merchantId: string;
  appId: string;
  merchantOrderNo: string;
  method: "WECHAT_NATIVE";
  status: "PENDING_PAYMENT" | "CONFIRMING" | "SUCCESSFUL" | "CLOSED";
  dispatchState: "UNSENT" | "MAY_EXIST";
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  closedAt: string | null;
  ledgerId: string | null;
  reviewReason: RechargeReviewReason | null;
}>;

export type RechargeReviewReason =
  | "UNKNOWN_ORDER"
  | "FACT_MISMATCH"
  | "RECEIPT_CONFLICT"
  | "CLOSED_ORDER"
  | "TRANSACTION_REUSED"
  | "PAYMENT_CONFLICT";
export type SettlementResult =
  | { kind: "APPLIED" | "ALREADY_APPLIED"; order: RechargeOrder }
  | { kind: "REVIEW_REQUIRED"; reason: RechargeReviewReason }
  | { kind: "NOT_FOUND" };

export class RechargeError extends Error {
  constructor(
    readonly code:
      | "CREATION_DISABLED"
      | "INVALID_INPUT"
      | "AMOUNT_NOT_ALLOWED"
      | "ACCOUNT_NOT_ACTIVE"
      | "ACTIVE_ORDER_LIMIT"
      | "IDEMPOTENCY_CONFLICT"
      | "NOT_FOUND"
      | "CANCELLATION_REQUIRES_VERIFICATION",
    message: string = code,
  ) {
    super(message);
  }
}

/** Business port. No network, HTTP principal, cryptographic keys, or transaction client. */
export interface RechargeRepository {
  create(
    accountId: string,
    input: CreateRecharge,
    config: RechargeConfig,
  ): Promise<RechargeOrder>;
  findOwned(accountId: string, orderId: string): Promise<RechargeOrder | null>;
  cancelUnsent(accountId: string, orderId: string): Promise<RechargeOrder>;
  applyNotification(identity: NotificationIdentity): Promise<SettlementResult>;
  /** Only internal orchestration supplies an A0-authenticated SUCCESS observation. */
  applyAuthenticatedQuery(
    orderId: string,
    facts: PaymentFacts,
    proof: PaymentProof,
  ): Promise<SettlementResult>;
}
