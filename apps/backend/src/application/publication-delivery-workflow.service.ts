import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";
import type { AuthenticatedPrincipal } from "../identity/domain/identity.types.js";
import { AccountDirectoryService } from "../identity/application/account-directory.service.js";
import { PublishingOrderService } from "../publishing-commerce/application/publishing-order.service.js";
import { PostgresDeliveryAssignmentRepository } from "../publication-delivery/infrastructure/postgres-delivery-assignment.repository.js";
import {
  assignmentInputSchema,
  reasonInputSchema,
  reassignInputSchema,
  type AssignmentCommand,
} from "../publication-delivery/domain/delivery-assignment.js";

const querySchema = z
  .object({
    scope: z.enum(["POOL", "MINE", "ALL"]).default("POOL"),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    beforeSequence: z.coerce
      .number()
      .int()
      .positive()
      .max(2_147_483_647)
      .optional(),
  })
  .strict();

/** API composition: owners keep their private persistence and no reverse call. */
@Injectable()
export class PublicationDeliveryWorkflowService {
  constructor(
    @Inject(PublishingOrderService)
    private readonly orders: PublishingOrderService,
    @Inject(PostgresDeliveryAssignmentRepository)
    private readonly deliveries: PostgresDeliveryAssignmentRepository,
    @Inject(AccountDirectoryService)
    private readonly identities: AccountDirectoryService,
  ) {}
  async list(actor: AuthenticatedPrincipal, raw: unknown) {
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException("订单列表参数不正确");
    const rows = await this.deliveries.list(actor, {
      scope: parsed.data.scope,
      limit: parsed.data.limit,
      ...(parsed.data.beforeSequence
        ? { beforeSequence: parsed.data.beforeSequence }
        : {}),
    });
    const selected = rows.slice(0, parsed.data.limit);
    const orders = await this.orders.forDelivery(
      selected.map((row) => row.orderId),
    );
    return {
      items: selected.map((delivery) => {
        const order = orders.find((o) => o.id === delivery.orderId);
        if (!order) throw new Error("Delivery references a missing purchase");
        const { bodyMarkdown: _body, ...summary } = order;
        return { ...summary, status: delivery.status, delivery };
      }),
      nextBeforeSequence:
        rows.length > parsed.data.limit ? selected.at(-1)!.sequence : null,
    };
  }
  async detail(actor: AuthenticatedPrincipal, id: string) {
    const delivery = await this.deliveries.detail(actor, id);
    const [order] = await this.orders.forDelivery([id]);
    if (!order) throw new NotFoundException("未找到已购订单");
    const assignee = delivery.assigneeAccountId
      ? await this.identities.internalAccount(delivery.assigneeAccountId)
      : undefined;
    return {
      ...order,
      status: delivery.status,
      delivery: { ...delivery, assignee: assignee ?? null },
    };
  }
  act(
    actor: AuthenticatedPrincipal,
    id: string,
    action: AssignmentCommand["action"],
    raw: unknown,
  ) {
    const schema =
      action === "REASSIGN"
        ? reassignInputSchema
        : action === "RETURN"
          ? reasonInputSchema
          : assignmentInputSchema;
    const input = schema.safeParse(raw);
    if (!input.success)
      throw new BadRequestException(
        "请核对订单版本、操作标识和所需原因；不能覆盖账号身份",
      );
    return this.deliveries.act(actor, id, {
      ...input.data,
      action,
    } as AssignmentCommand);
  }
}
