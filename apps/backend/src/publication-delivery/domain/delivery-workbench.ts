import { z } from "zod";
import type { DeliveryStatus } from "./delivery-assignment.js";

export const deliveryListQuerySchema = z
  .object({
    scope: z.enum(["POOL", "MINE", "ALL"]).default("POOL"),
    state: z
      .enum(["ALL", "ACTIVE", "COMPLETED", "CLOSED", "PENDING_RETURN"])
      .default("ACTIVE"),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursorCreatedAt: z.string().datetime().optional(),
    cursorSequence: z.coerce
      .number()
      .int()
      .positive()
      .max(2_147_483_647)
      .optional(),
  })
  .strict()
  .refine(
    (query) => Boolean(query.cursorCreatedAt) === Boolean(query.cursorSequence),
  );

export type DeliveryListQuery = z.infer<typeof deliveryListQuerySchema>;

/** A presentation expectation, never a failure, entitlement or automatic action. */
export function deliverySchedule(
  purchasedAt: Date,
  status: DeliveryStatus,
  now = Date.now(),
) {
  const expectedCompletionAt = new Date(
    purchasedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const remaining = expectedCompletionAt.getTime() - now;
  const urgency =
    status === "COMPLETED" || status === "CLOSED"
      ? status
      : remaining < 0
        ? ("DELAYED" as const)
        : remaining <= 24 * 60 * 60 * 1000
          ? ("NEARING_DEADLINE" as const)
          : ("NORMAL" as const);
  return { expectedCompletionAt, urgency };
}
