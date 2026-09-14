import { BadRequestException, NotFoundException } from "@nestjs/common";
import { z } from "zod";
export const transferSchema = z
  .object({
    agentAccountId: z.string().uuid().nullable(),
    expectedRevision: z.number().int().min(0),
    reason: z.string().trim().min(1).max(300),
    requestId: z.string().uuid(),
  })
  .strict();
export type CustomerTransfer = z.infer<typeof transferSchema>;
export function parseTransfer(input: unknown): CustomerTransfer {
  const result = transferSchema.safeParse(input);
  if (!result.success)
    throw new BadRequestException("请填写目标归属、当前版本和迁移原因");
  return result.data;
}
export function customerUnavailable(): never {
  throw new NotFoundException("该客户或资料当前不可访问");
}
export function customerId(input: string): string {
  if (!z.string().uuid().safeParse(input).success) customerUnavailable();
  return input;
}
export function pageCursor(input?: string) {
  return input === undefined ? undefined : customerId(input);
}
