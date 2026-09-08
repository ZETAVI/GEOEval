import { z } from "zod";

export type DeliveryStatus = "PENDING_HANDLING" | "PUBLISHING" | "COMPLETED";
export type DeliveryAssignment = {
  orderId: string;
  sequence: number;
  status: DeliveryStatus;
  assigneeAccountId: string | null;
  revision: number;
  startedAt: Date | null;
  createdAt: Date;
};
const uuid = z
  .string()
  .uuid()
  .transform((v) => v.toLowerCase());
const text = z
  .string()
  .transform((v) => v.normalize("NFKC").trim())
  .pipe(z.string().min(1).max(320));
export const assignmentInputSchema = z
  .object({
    expectedRevision: z.number().int().min(1).max(2_147_483_646),
    idempotencyKey: uuid,
  })
  .strict();
export const reasonInputSchema = assignmentInputSchema.extend({ reason: text });
export const reassignInputSchema = reasonInputSchema.extend({
  assigneeAccountId: uuid,
});
export type AssignmentCommand = z.infer<typeof assignmentInputSchema> &
  (
    | { action: "CLAIM" | "START" }
    | { action: "RETURN"; reason: string }
    | { action: "REASSIGN"; reason: string; assigneeAccountId: string }
  );
