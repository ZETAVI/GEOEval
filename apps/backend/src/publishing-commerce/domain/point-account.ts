import { z } from "zod";

export const MAX_POINTS = 2_147_483_647;
const text = (max: number) =>
  z
    .string()
    .transform((v) => v.normalize("NFKC").trim())
    .pipe(z.string().min(1).max(max));
const optionalText = (max: number) =>
  z
    .union([text(max), z.literal(""), z.null()])
    .optional()
    .transform((v) => v || null);
export const adjustmentSchema = z
  .object({
    idempotencyKey: z
      .string()
      .uuid()
      .transform((v) => v.toLowerCase()),
    amount: z
      .number()
      .int()
      .min(-MAX_POINTS)
      .max(MAX_POINTS)
      .refine((n) => n !== 0),
    reason: text(160),
    internalNote: optionalText(320),
    businessReference: optionalText(160),
  })
  .strict();
export type PointAdjustment = z.infer<typeof adjustmentSchema>;
export type PointBalance = {
  grantedBalance: number;
  fundedBalance: number;
  revision: number;
};
export type PointChangeRecord = {
  id: string;
  accountId: string;
  sequence: number;
  kind: "ADMIN_ADJUSTMENT" | "PUBLISHING_ORDER";
  publishingOrderId: string | null;
  grantedDelta: number;
  fundedDelta: number;
  balanceAfter: number;
  actorAccountId: string;
  idempotencyKey: string;
  reason: string;
  internalNote: string | null;
  businessReference: string | null;
  createdAt: Date;
};
export class PointAccountError extends Error {
  constructor(
    readonly code:
      | "INSUFFICIENT_GRANTED_POINTS"
      | "POINT_LIMIT_EXCEEDED"
      | "IDEMPOTENCY_CONFLICT"
      | "TARGET_INACTIVE",
    message: string,
  ) {
    super(message);
  }
}
export function adjustGranted(
  balance: PointBalance,
  amount: number,
): PointBalance {
  if (!Number.isInteger(amount) || !amount || Math.abs(amount) > MAX_POINTS)
    throw new PointAccountError(
      "POINT_LIMIT_EXCEEDED",
      "调整积分必须是范围内的非零整数",
    );
  const grantedBalance = balance.grantedBalance + amount;
  if (grantedBalance < 0)
    throw new PointAccountError(
      "INSUFFICIENT_GRANTED_POINTS",
      "赠送积分不足，不能扣减充值积分或形成负余额",
    );
  if (
    grantedBalance + balance.fundedBalance > MAX_POINTS ||
    balance.revision >= MAX_POINTS
  )
    throw new PointAccountError(
      "POINT_LIMIT_EXCEEDED",
      "积分余额或账务序号超出支持范围",
    );
  return {
    grantedBalance,
    fundedBalance: balance.fundedBalance,
    revision: balance.revision + 1,
  };
}
export const POINT_ACCOUNT_REPOSITORY = Symbol("POINT_ACCOUNT_REPOSITORY");
export interface PointAccountRepository {
  balance(accountId: string): Promise<PointBalance>;
  changes(
    accountId: string,
    limit: number,
    beforeSequence?: number,
  ): Promise<PointChangeRecord[]>;
  adjust(
    accountId: string,
    actorAccountId: string,
    input: PointAdjustment,
    targetActive: boolean,
  ): Promise<PointChangeRecord>;
}
