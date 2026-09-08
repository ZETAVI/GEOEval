import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { MAX_POINTS, type PointBalance } from "./point-account.js";
import type { PublishingQuote } from "./publishing-selection.js";
import type { DeliveryStatus } from "../../publication-delivery/domain/delivery-assignment.js";

const uuid = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());
const positive = z.number().int().min(1).max(MAX_POINTS);
const scopeMember = z
  .object({ platformId: uuid, displayName: z.string().min(1).max(160) })
  .strict();
const line = scopeMember
  .extend({
    quantity: positive,
    unitPoints: positive,
    totalPoints: positive,
    available: z.literal(true),
  })
  .strict();
export const commercialTermsSchema = z
  .object({
    mode: z.enum(["RANDOM", "PRECISE"]),
    packageName: z.string().min(1).max(120).nullable(),
    scope: z
      .array(scopeMember)
      .max(200)
      .refine(
        (items) =>
          new Set(items.map((item) => item.platformId)).size === items.length,
      )
      .transform((items) =>
        [...items].sort((a, b) => a.platformId.localeCompare(b.platformId)),
      ),
    lines: z
      .array(line)
      .max(200)
      .refine(
        (items) =>
          new Set(items.map((item) => item.platformId)).size === items.length,
      )
      .transform((items) =>
        [...items].sort((a, b) => a.platformId.localeCompare(b.platformId)),
      ),
    quantity: positive,
    totalPoints: positive,
  })
  .strict()
  .refine((terms) =>
    terms.mode === "RANDOM"
      ? terms.packageName !== null &&
        terms.scope.length > 0 &&
        terms.lines.length === 0
      : terms.packageName === null &&
        terms.scope.length === 0 &&
        terms.lines.length > 0,
  );
export const submitPurchaseSchema = z
  .object({
    idempotencyKey: uuid,
    brandId: uuid,
    articleId: uuid,
    articleRevision: positive,
    selectionRevision: positive.max(MAX_POINTS - 1),
    acceptedTerms: commercialTermsSchema,
  })
  .strict();
export type CommercialTerms = z.infer<typeof commercialTermsSchema>;
export type SubmitPurchase = z.infer<typeof submitPurchaseSchema>;
export type PublishingOrderView = {
  id: string;
  number: string;
  brandId: string;
  articleId: string;
  articleRevision: number;
  status: DeliveryStatus;
  title: string;
  bodyMarkdown: string;
  agreement: CommercialTerms;
  createdAt: Date;
};
export type PublishingOrderSummary = Omit<
  PublishingOrderView,
  "bodyMarkdown" | "agreement"
> & { mode: CommercialTerms["mode"]; quantity: number; totalPoints: number };
export class PurchaseError extends Error {
  constructor(
    readonly code:
      | "SELECTION_CHANGED"
      | "ARTICLE_CHANGED"
      | "QUOTE_CHANGED"
      | "OFFER_UNAVAILABLE"
      | "INSUFFICIENT_POINTS"
      | "IDEMPOTENCY_CONFLICT"
      | "POINT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
  }
}
export function commercialTerms(quote: PublishingQuote): CommercialTerms {
  if (
    quote.problems.includes("ARTICLE_CHANGED") ||
    quote.problems.includes("ARTICLE_UNCONFIRMED")
  )
    throw new PurchaseError(
      "ARTICLE_CHANGED",
      "文章已变化或尚未确认，请重新核对文章",
    );
  if (quote.problems.includes("OFFER_UNAVAILABLE"))
    throw new PurchaseError(
      "OFFER_UNAVAILABLE",
      "所选发布服务已不可用，请调整选择",
    );
  if (quote.problems.includes("TOTAL_OUT_OF_RANGE"))
    throw new PurchaseError("POINT_LIMIT_EXCEEDED", "数量或积分超出支持范围");
  return commercialTermsSchema.parse({
    mode: quote.mode,
    packageName: quote.packageName,
    scope: quote.scope,
    lines: quote.lines,
    quantity: quote.quantity,
    totalPoints: quote.totalPoints,
  });
}
export function samePurchaseValue(left: unknown, right: unknown) {
  return isDeepStrictEqual(left, right);
}
export function spendPoints(wallet: PointBalance, totalPoints: number) {
  if (
    !Number.isInteger(totalPoints) ||
    totalPoints <= 0 ||
    totalPoints > MAX_POINTS ||
    wallet.revision >= MAX_POINTS
  )
    throw new PurchaseError(
      "POINT_LIMIT_EXCEEDED",
      "积分或账务序号超出支持范围",
    );
  if (wallet.grantedBalance + wallet.fundedBalance < totalPoints)
    throw new PurchaseError(
      "INSUFFICIENT_POINTS",
      "积分不足，本次没有扣分或创建订单",
    );
  const grantedSpent = Math.min(wallet.grantedBalance, totalPoints),
    fundedSpent = totalPoints - grantedSpent;
  return {
    grantedDelta: -grantedSpent,
    fundedDelta: -fundedSpent,
    balance: {
      grantedBalance: wallet.grantedBalance - grantedSpent,
      fundedBalance: wallet.fundedBalance - fundedSpent,
      revision: wallet.revision + 1,
    },
  };
}
export const PUBLISHING_ORDER_REPOSITORY = Symbol(
  "PUBLISHING_ORDER_REPOSITORY",
);
export interface PublishingOrderRepository {
  /** Internal immutable facts for the application-level Delivery composition. */
  readPaidOrders(
    ids: string[],
  ): Promise<Array<Omit<PublishingOrderView, "status">>>;
  runPurchase(
    accountId: string,
    input: SubmitPurchase,
  ): Promise<PublishingOrderView>;
  find(accountId: string, id: string): Promise<PublishingOrderView | null>;
  list(
    accountId: string,
    query: { brandId?: string; beforeNumber?: number; limit: number },
  ): Promise<{
    items: PublishingOrderSummary[];
    nextBeforeNumber: number | null;
  }>;
}
