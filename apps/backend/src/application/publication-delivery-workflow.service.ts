import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";
import type { AuthenticatedPrincipal } from "../identity/domain/identity.types.js";
import { AccountDirectoryService } from "../identity/application/account-directory.service.js";
import { MediaSupplyService } from "../media-supply/application/media-supply.service.js";
import { PostgresOrderReturnAccess } from "../publishing-commerce/infrastructure/postgres-order-return-access.js";
import type { PublicationDelivery } from "../generated/prisma/client.js";
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
  deliveryListQuerySchema,
  deliverySchedule,
} from "../publication-delivery/domain/delivery-workbench.js";
import {
  assignmentInputSchema,
  reasonInputSchema,
  reassignInputSchema,
  type AssignmentCommand,
} from "../publication-delivery/domain/delivery-assignment.js";

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
    @Inject(MediaSupplyService) private readonly media: MediaSupplyService,
    @Inject(PostgresOrderReturnAccess)
    private readonly returns: PostgresOrderReturnAccess,
  ) {}
  private async returnedPoints(row: PublicationDelivery) {
    // Only compose the immutable ledger named by this captured Delivery view.
    if (!row.settledLedgerId) return null;
    const result = await this.returns.returned(row.orderId);
    if (!result || result.ledgerId !== row.settledLedgerId)
      throw new Error("Delivery settlement ledger missing");
    return result.points;
  }
  private async resolution(row: PublicationDelivery) {
    const final = await this.returns.finalized(row.orderId);
    return {
      finalized: Boolean(
        final && final.agreementRevision === row.agreementRevision,
      ),
      mode: row.resolutionMode,
      points: row.agreedReturnPoints,
      agreementRevision: row.agreementRevision,
      reason: row.resolutionReason,
      exceptionReason: row.exceptionReason,
      stopped: row.stoppedAt !== null,
      returnedPoints: await this.returnedPoints(row),
    };
  }
  async replacementTargets(
    actor: AuthenticatedPrincipal,
    id: string,
    raw: unknown,
  ) {
    await this.deliveries.detail(actor, id);
    const query = z
      .object({ cursor: z.string().uuid().optional() })
      .strict()
      .safeParse(raw);
    if (!query.success) throw new BadRequestException("替换媒体分页参数不正确");
    const page = await this.media.listCustomerPlatforms({
      limit: 50,
      ...(query.data.cursor ? { cursor: query.data.cursor } : {}),
    });
    return {
      items: page.items.map((p) => ({
        platformId: p.id,
        displayName: p.displayName,
      })),
      nextCursor: page.nextCursor ?? null,
    };
  }
  async work(actor: AuthenticatedPrincipal, id: string, raw: unknown) {
    const query = workQuery(raw);
    const snapshot = await this.workItems.read(
      actor,
      id,
      query.afterSlot,
      query.limit,
    );
    const [order] = await this.orders.forDelivery([id]);
    if (!order) throw new NotFoundException("未找到已购订单");
    const logical = publicationWorkPage(
      commitment(order.agreement),
      query.afterSlot,
      query.limit,
    );
    return {
      orderRevision: snapshot.delivery.revision,
      status: snapshot.delivery.status,
      quantity: order.agreement.quantity,
      publishedQuantity: snapshot.delivery.publishedQuantity,
      preparationMode: this.preparer.mode,
      stopped: snapshot.delivery.stoppedAt !== null,
      targets: [
        ...new Map(
          [
            ...targets(order.agreement),
            ...snapshot.items.flatMap((item) =>
              item.replacementTarget ? [item.replacementTarget] : [],
            ),
          ].map((target) => [target.platformId, target]),
        ).values(),
      ],
      items: logical.items.map((slot) => ({
        ...slot,
        revision: 0,
        platformId: slot.purchasedPlatformId,
        state: "PENDING" as const,
        preparation: null,
        result: null,
        replacementTarget: null,
        ...snapshot.items.find((item) => item.slot === slot.slot),
      })),
      nextAfterSlot: logical.nextAfterSlot,
    };
  }
  async workHistory(actor: AuthenticatedPrincipal, id: string, slot: number) {
    if (!Number.isSafeInteger(slot) || slot < 1 || slot > 2_147_483_647)
      throw new BadRequestException("发布条目不正确");
    return this.workItems.history(actor, id, slot);
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
    const replay = await this.workItems.recover(actor, id, slot, command);
    if (replay) return replay;
    const snapshot = await this.workItems.read(actor, id, slot - 1, 1);
    const item = snapshot.items.find((value) => value.slot === slot);
    const [order] = await this.orders.forDelivery([id]);
    if (!order) throw new NotFoundException("未找到已购订单");
    const logical = publicationWorkPage(
      commitment(order.agreement),
      slot - 1,
      1,
    ).items[0];
    const replacement = command.action === "REPLACE_TARGET";
    const effective = item?.replacementTarget;
    const platform = replacement
      ? await this.media.customerPlatform(command.platformId)
      : null;
    const target = platform
      ? { platformId: platform.id, displayName: platform.displayName }
      : command.action === "CORRECT_RESULT" && item?.result
        ? {
            platformId: item.result.platformId,
            displayName: item.result.displayName,
          }
        : effective?.platformId === command.platformId
          ? effective
          : targets(order.agreement).find(
              (value) => value.platformId === command.platformId,
            );
    if (
      !logical ||
      !target ||
      target.platformId !== command.platformId ||
      (replacement && !logical.purchasedPlatformId) ||
      (!replacement &&
        logical.purchasedPlatformId &&
        (effective?.platformId ?? logical.purchasedPlatformId) !==
          target.platformId)
    )
      throw new BadRequestException(
        "该媒体不符合原购买范围；精确替换须通过协商异常处理",
      );
    const source = {
      title: order.title,
      bodyMarkdown: order.bodyMarkdown,
      quantity: order.agreement.quantity,
      target,
      ...(logical.purchasedPlatformId
        ? { purchasedPlatformId: logical.purchasedPlatformId }
        : {}),
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
      null,
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
    const schedule = deliverySchedule(
      order.createdAt,
      snapshot.delivery.status,
    );
    return {
      status: snapshot.delivery.status,
      quantity: order.agreement.quantity,
      publishedQuantity: snapshot.delivery.publishedQuantity,
      expectedCompletionAt: schedule.expectedCompletionAt,
      delayed: schedule.urgency === "DELAYED",
      resolution: {
        mode: snapshot.delivery.resolutionMode,
        agreedPoints: snapshot.delivery.agreedReturnPoints,
        returnedPoints: await this.returnedPoints(snapshot.delivery),
        stopped: snapshot.delivery.stoppedAt !== null,
      },
      items: slots.map(({ slot }) => {
        const result = snapshot.items.find(
          (item) => item.slot === slot,
        )?.result;
        const promised = logical.items.find(
          (item) => item.slot === slot,
        )?.purchasedPlatformId;
        return {
          slot,
          state: result
            ? ("PUBLISHED" as const)
            : snapshot.delivery.stoppedAt
              ? ("STOPPED" as const)
              : ("IN_HANDLING" as const),
          purchasedTargetName:
            targets(order.agreement).find((t) => t.platformId === promised)
              ?.displayName ?? null,
          targetName:
            result?.displayName ??
            snapshot.items.find((item) => item.slot === slot)?.replacementTarget
              ?.displayName ??
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
    const parsed = deliveryListQuerySchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException("订单列表参数不正确");
    const rows = await this.deliveries.list(actor, parsed.data);
    const selected = rows.slice(0, parsed.data.limit);
    const orders = await this.orders.forDelivery(
      selected.map((row) => row.orderId),
    );
    const now = Date.now();
    return {
      items: await Promise.all(
        selected.map(async (delivery) => {
          const order = orders.find((o) => o.id === delivery.orderId);
          if (!order) throw new Error("Delivery references a missing purchase");
          const { bodyMarkdown: _body, ...summary } = order;
          return {
            ...summary,
            status: delivery.status,
            delivery,
            resolution: await this.resolution(delivery),
            schedule: deliverySchedule(order.createdAt, delivery.status, now),
          };
        }),
      ),
      nextCursor:
        rows.length > parsed.data.limit
          ? {
              createdAt: selected.at(-1)!.createdAt,
              sequence: selected.at(-1)!.sequence,
            }
          : null,
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
      schedule: deliverySchedule(order.createdAt, delivery.status),
      delivery: { ...delivery, assignee: assignee ?? null },
      resolution: await this.resolution(delivery),
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
