import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
const inputSchema = z
  .object({
    enabled: z.boolean(),
    rateBps: z.number().int().min(0).max(10000).nullable(),
    expectedRevision: z.number().int().min(0).max(2147483646),
    reason: z.string().trim().min(1).max(320),
    requestId: z.uuid(),
  })
  .strict()
  .refine((x) => !x.enabled || x.rateBps !== null);
export type CommissionTermsInput = z.infer<typeof inputSchema>;
export function parseCommissionTerms(input: unknown): CommissionTermsInput {
  const result = inputSchema.safeParse(input);
  if (!result.success)
    throw new BadRequestException("请填写佣金开关、有效费率和修改原因");
  return result.data;
}
export type CommissionTermsView = {
  agentAccountId: string;
  enabled: boolean;
  rateBps: number | null;
  revision: number;
  updatedAt: string | null;
};
/** Internal retry signal; caller must roll back the whole transaction. */
export class AgencyPurchaseChanged extends Error {}
