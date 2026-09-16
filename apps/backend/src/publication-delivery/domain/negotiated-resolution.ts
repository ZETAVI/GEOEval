import { z } from "zod";
import { assignmentInputSchema } from "./delivery-assignment.js";

const MAX = 2_147_483_647;

// Explicit amount on save: zero is a NEW-form default, never a missing-field
// replacement for the positive amount of an existing agreement.
export const negotiatedResolutionInputSchema = assignmentInputSchema.extend({
  ticketId: z.string().uuid().optional(),
  expectedTicketRevision: z.number().int().min(1).max(MAX).optional(),
  resolveTicket: z.boolean().default(false),
  mode: z.enum(["CONTINUE", "TERMINATE"]),
  points: z.number().int().min(0).max(MAX),
  reason: z
    .string()
    .transform((value) => value.normalize("NFKC").trim())
    .pipe(z.string().min(1).max(320)),
});

export type NegotiatedResolutionInput = z.infer<
  typeof negotiatedResolutionInputSchema
>;
export type NegotiatedAgreement = {
  revision: number;
  mode: "CONTINUE" | "TERMINATE";
  points: number;
  reason: string;
};
export type ResolutionOrder = {
  revision: number;
  status:
    | "PENDING_HANDLING"
    | "PUBLISHING"
    | "EXCEPTION_HANDLING"
    | "COMPLETED"
    | "CLOSED";
  assigneeAccountId: string | null;
  quantity: number;
  publishedQuantity: number;
  stopped: boolean;
  agreement: NegotiatedAgreement | null;
  returnRecorded: boolean;
};

/** The transaction adapter supplies current, locked Identity/Delivery facts. */
export type ResolutionActor = {
  accountId: string;
  role: string;
  status: string;
};

export class NegotiatedResolutionError extends Error {
  constructor(
    readonly code:
      | "FORBIDDEN"
      | "STALE_REVISION"
      | "INVALID_RESOLUTION"
      | "RESOLUTION_ENDED"
      | "RETURN_NOT_ELIGIBLE",
    message: string,
  ) {
    super(message);
  }
}

function assertProgress(order: ResolutionOrder) {
  if (
    !Number.isSafeInteger(order.quantity) ||
    order.quantity < 1 ||
    order.quantity > MAX ||
    !Number.isSafeInteger(order.publishedQuantity) ||
    order.publishedQuantity < 0 ||
    order.publishedQuantity > order.quantity
  )
    throw new NegotiatedResolutionError(
      "INVALID_RESOLUTION",
      "原购买数量或发布进度不完整，请保留订单后核查",
    );
}

/** Pure decision only; persistence, exact-request replay and audit are atomic in its caller. */
export function resolveNegotiatedAgreement(
  order: ResolutionOrder,
  actor: ResolutionActor,
  raw: unknown,
  originalConsumedPoints: number,
) {
  if (
    actor.status !== "ACTIVE" ||
    actor.role !== "OPERATIONS" ||
    order.assigneeAccountId !== actor.accountId
  )
    throw new NegotiatedResolutionError(
      "FORBIDDEN",
      "仅当前有效运营责任人可保存协商处理",
    );
  const parsed = negotiatedResolutionInputSchema.safeParse(raw);
  if (!parsed.success)
    throw new NegotiatedResolutionError(
      "INVALID_RESOLUTION",
      "请明确填写处理方式、整数退点金额、原因与准确版本",
    );
  const command = parsed.data;
  if (order.revision !== command.expectedRevision)
    throw new NegotiatedResolutionError(
      "STALE_REVISION",
      "订单已变化，请刷新核对",
    );
  if (order.returnRecorded)
    throw new NegotiatedResolutionError(
      "RESOLUTION_ENDED",
      "订单已结算，不能再修改约定金额",
    );
  assertProgress(order);
  if (
    !Number.isSafeInteger(originalConsumedPoints) ||
    originalConsumedPoints < 1 ||
    originalConsumedPoints > MAX ||
    command.points > originalConsumedPoints ||
    (order.agreement?.revision ?? 0) >= MAX
  )
    throw new NegotiatedResolutionError(
      "INVALID_RESOLUTION",
      "退点不能超过原消费且协商版本必须在支持范围内",
    );
  if (
    command.mode === "TERMINATE" &&
    (order.status === "COMPLETED" || order.publishedQuantity === order.quantity)
  )
    throw new NegotiatedResolutionError(
      "RESOLUTION_ENDED",
      "发布已全部完成，没有可终止的剩余工作",
    );
  if (command.mode === "CONTINUE" && order.stopped)
    throw new NegotiatedResolutionError(
      "RESOLUTION_ENDED",
      "剩余工作已停止，不能通过修改协商重新开启",
    );
  const terminate = command.mode === "TERMINATE";
  const status: ResolutionOrder["status"] = terminate
    ? "CLOSED"
    : order.publishedQuantity === order.quantity
      ? "COMPLETED"
      : "PUBLISHING";
  return {
    status,
    stopped: terminate,
    agreement: {
      revision: (order.agreement?.revision ?? 0) + 1,
      mode: command.mode,
      points: command.points,
      reason: command.reason,
    } satisfies NegotiatedAgreement,
  };
}
