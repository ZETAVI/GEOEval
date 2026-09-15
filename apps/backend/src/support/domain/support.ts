import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { z } from "zod";
const uuid = z
  .string()
  .uuid()
  .transform((v) => v.toLowerCase());
const message = z.string().trim().min(1).max(4000);
export const supportCreateSchema = z
  .object({
    subject: z.string().trim().min(1).max(100),
    message,
    rechargeOrderId: uuid.optional(),
    requestId: uuid,
  })
  .strict();
export const supportCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("CLAIM"),
      expectedRevision: z.number().int().min(1).max(2147483646),
      requestId: uuid,
    })
    .strict(),
  z
    .object({
      action: z.enum(["REPLY", "RESOLVE", "RELEASE"]),
      message,
      expectedRevision: z.number().int().min(1).max(2147483646),
      requestId: uuid,
    })
    .strict(),
]);
export const supportListSchema = z
  .object({
    scope: z.enum(["mine", "pool", "all"]).default("mine"),
    status: z.enum(["PROCESSING", "RESOLVED"]).optional(),
    before: z.coerce.number().int().min(1).max(2147483647).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export const supportMessagesSchema = z
  .object({ after: z.coerce.number().int().min(0).max(2147483647).default(0) })
  .strict();
export function parseSupport<T>(schema: z.ZodType<T>, raw: unknown): T {
  const p = schema.safeParse(raw);
  if (!p.success)
    throw new BadRequestException("请核对问题说明、编号与当前版本");
  return p.data;
}
export type SupportCreate = z.infer<typeof supportCreateSchema>;
export type SupportCommand = z.infer<typeof supportCommandSchema>;
export type SupportList = z.infer<typeof supportListSchema>;
export type SupportActor = { id: string; role: string; status: string };
export type SupportState = {
  customerAccountId: string;
  assigneeAccountId: string | null;
  status: string;
  revision: number;
};
export function canReadSupport(ticket: SupportState, actor: SupportActor) {
  return (
    actor.status === "ACTIVE" &&
    (actor.role === "ADMINISTRATOR" ||
      (actor.role === "TERMINAL_CUSTOMER" &&
        ticket.customerAccountId === actor.id) ||
      (actor.role === "OPERATIONS" && ticket.assigneeAccountId === actor.id))
  );
}
/** Adapter supplies current identity and ticket under locks; exact replay precedes revision checks. */
export function decideSupportCommand(
  ticket: SupportState,
  actor: SupportActor,
  command: SupportCommand,
) {
  const operator = actor.role === "OPERATIONS" && actor.status === "ACTIVE";
  const customer =
    actor.role === "TERMINAL_CUSTOMER" &&
    actor.status === "ACTIVE" &&
    ticket.customerAccountId === actor.id;
  const owner = operator && ticket.assigneeAccountId === actor.id;
  const permitted =
    command.action === "CLAIM"
      ? operator && ticket.assigneeAccountId === null
      : command.action === "RELEASE"
        ? actor.role === "ADMINISTRATOR" &&
          actor.status === "ACTIVE" &&
          ticket.assigneeAccountId !== null
        : command.action === "RESOLVE"
          ? owner
          : owner || customer;
  if (!permitted) throw new ForbiddenException("当前账号不能执行这项工单操作");
  if (ticket.revision !== command.expectedRevision)
    throw new ConflictException("工单已变化，请刷新后核对");
  if (ticket.status !== "PROCESSING")
    throw new ConflictException("工单已处理，请查看处理结果");
  return {
    status: command.action === "RESOLVE" ? "RESOLVED" : "PROCESSING",
    assigneeAccountId:
      command.action === "CLAIM"
        ? actor.id
        : command.action === "RELEASE"
          ? null
          : ticket.assigneeAccountId,
    revision: ticket.revision + 1,
  };
}
