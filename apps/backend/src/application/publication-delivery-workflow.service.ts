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
import type { CommercialTerms } from "../publishing-commerce/domain/publishing-order.js";
import { PostgresPublicationWorkRepository } from "../publication-delivery/infrastructure/postgres-publication-work.repository.js";
import { publicationWorkPage } from "../publication-delivery/domain/publication-work.js";
import {
  VARIANT_PREPARER,
  publicationCommandSchema,
  customerPublicationResult,
  type VariantPreparer,
} from "../publication-delivery/domain/publication-item.js";
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
const workQuerySchema = z
  .object({
    afterSlot: z.coerce.number().int().min(0).max(2_147_483_647).default(0),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
const commitment = (terms: CommercialTerms) =>
  terms.mode === "RANDOM"
    ? { mode: "RANDOM" as const, quantity: terms.quantity }
    : {
        mode: "PRECISE" as const,
        quantity: terms.quantity,
        lines: terms.lines,
      };
const targets = (terms: CommercialTerms) =>
  (terms.mode === "RANDOM" ? terms.scope : terms.lines).map(
    ({ platformId, displayName }) => ({ platformId, displayName }),
  );
function workQuery(raw: unknown) {
  const parsed = workQuerySchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestException("发布条目分页参数不正确");
  return parsed.data;
}

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
    @Inject(PostgresPublicationWorkRepository)
    private readonly workItems: PostgresPublicationWorkRepository,
    @Inject(VARIANT_PREPARER) private readonly preparer: VariantPreparer,
  ) {}
  async work(actor: AuthenticatedPrincipal, id: string, raw: unknown) {
    await this.deliveries.detail(actor, id);
    const [order] = await this.orders.forDelivery([id]);
    if (!order) throw new NotFoundException("未找到已购订单");
    const query = workQuery(raw);
    const logical = publicationWorkPage(
      commitment(order.agreement),
      query.afterSlot,
      query.limit,
    );
    const snapshot = await this.workItems.read(
      id,
      query.afterSlot,
      query.limit,
    );
    return {
      orderRevision: snapshot.delivery.revision,
      status: snapshot.delivery.status,
      quantity: order.agreement.quantity,
      publishedQuantity: snapshot.delivery.publishedQuantity,
      preparationMode: this.preparer.mode,
      targets: targets(order.agreement),
      items: logical.items.map((slot) => ({
        ...slot,
        revision: 0,
        platformId: slot.purchasedPlatformId,
        state: "PENDING" as const,
        preparation: null,
        result: null,
        ...snapshot.items.find((item) => item.slot === slot.slot),
      })),
      nextAfterSlot: logical.nextAfterSlot,
    };
  }
  async workHistory(actor: AuthenticatedPrincipal, id: string, slot: number) {
    if (!Number.isSafeInteger(slot) || slot < 1 || slot > 2_147_483_647)
      throw new BadRequestException("发布条目不正确");
    await this.deliveries.detail(actor, id);
    return this.workItems.history(id, slot);
  }
  async actWork(
    actor: AuthenticatedPrincipal,
    id: string,
    slot: number,
    raw: unknown,
  ) {
    const parsed = publicationCommandSchema.safeParse(raw);
    if (
      !parsed.success ||
      !Number.isSafeInteger(slot) ||
      slot < 1 ||
      slot > 2_147_483_647
    )
      throw new BadRequestException(
        "请核对发布条目、准确版本、目标媒体与所需内容",
      );
    const command = parsed.data;
    const [order] = await this.orders.forDelivery([id]);
    if (!order) throw new NotFoundException("未找到已购订单");
    const logical = publicationWorkPage(
      commitment(order.agreement),
      slot - 1,
      1,
    ).items[0];
    const target = targets(order.agreement).find(
      (value) => value.platformId === command.platformId,
    );
    if (
      !logical ||
      !target ||
      (logical.purchasedPlatformId &&
        logical.purchasedPlatformId !== target.platformId)
    )
      throw new BadRequestException(
        "该媒体不符合原购买范围；精确替换须通过协商异常处理",
      );
    const source = {
      title: order.title,
      bodyMarkdown: order.bodyMarkdown,
      quantity: order.agreement.quantity,
      target,
    };
    if (command.action === "PREPARE_MOCK") {
      const replay = await this.workItems.preflight(actor, id, slot, command);
      if (replay) return replay;
      const prepared = await this.preparer.prepare({ ...source, slot });
      return this.workItems.write(actor, id, slot, command, source, prepared);
    }
    return this.workItems.write(actor, id, slot, command, source);
  }
  async customerResults(accountId: string, id: string, raw: unknown) {
    const order = await this.orders.detail(accountId, id);
    const query = workQuery(raw);
    const random = order.agreement.mode === "RANDOM";
    const snapshot = await this.workItems.read(
      id,
      query.afterSlot,
      query.limit,
      random,
    );
    const logical = publicationWorkPage(
      commitment(order.agreement),
      query.afterSlot,
      query.limit,
    );
    const slots = random ? snapshot.items.slice(0, query.limit) : logical.items;
    const expectedCompletionAt = new Date(
      order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    return {
      status: snapshot.delivery.status,
      quantity: order.agreement.quantity,
      publishedQuantity: snapshot.delivery.publishedQuantity,
      expectedCompletionAt,
      delayed:
        snapshot.delivery.status !== "COMPLETED" &&
        Date.now() > expectedCompletionAt.getTime(),
      items: slots.map(({ slot }) => {
        const result = snapshot.items.find(
          (item) => item.slot === slot,
        )?.result;
        const promised = logical.items.find(
          (item) => item.slot === slot,
        )?.purchasedPlatformId;
        return {
          slot,
          state: result ? ("PUBLISHED" as const) : ("IN_HANDLING" as const),
          targetName:
            result?.displayName ??
            targets(order.agreement).find((t) => t.platformId === promised)
              ?.displayName ??
            null,
          result: result ? customerPublicationResult(result) : null,
        };
      }),
      nextAfterSlot: random
        ? snapshot.items.length > query.limit
          ? slots.at(-1)!.slot
          : null
        : logical.nextAfterSlot,
    };
  }
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
