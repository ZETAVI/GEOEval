import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { isDeepStrictEqual } from "node:util";
import {
  Prisma,
  type PublicationWorkItem,
} from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { PostgresOperationsIdentityReader } from "../../identity/infrastructure/postgres-operations-identity-reader.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { PostgresMediaPurchaseReaderFactory } from "../../media-supply/infrastructure/postgres-media-purchase-reader.js";
import {
  preparedVariantSchema,
  publicationResultSchema,
  replacementTargetSchema,
  type PublicationCommand,
  type PublicationSource,
  type PreparedVariant,
} from "../domain/publication-item.js";

function itemState(item: PublicationWorkItem) {
  return {
    slot: item.slot,
    revision: item.revision,
    platformId: item.platformId,
    replacementTarget:
      item.replacementTarget === null
        ? null
        : replacementTargetSchema.parse(item.replacementTarget),
    state:
      item.result !== null
        ? ("PUBLISHED" as const)
        : item.startedAt
          ? ("PUBLISHING" as const)
          : ("PENDING" as const),
    preparation:
      item.preparation === null
        ? null
        : preparedVariantSchema.parse(item.preparation),
    result:
      item.result === null ? null : publicationResultSchema.parse(item.result),
  };
}

@Injectable()
export class PostgresPublicationWorkRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PostgresOperationsIdentityReader)
    private readonly identities: PostgresOperationsIdentityReader,
    @Inject(PostgresMediaPurchaseReaderFactory)
    private readonly media: PostgresMediaPurchaseReaderFactory,
  ) {}

  private async readAccess(
    tx: Prisma.TransactionClient,
    orderId: string,
    actor: AuthenticatedPrincipal | null,
  ) {
    let administrator = false;
    if (actor) {
      const [current] = await this.identities.lockAccounts(tx, [
        actor.accountId,
      ]);
      if (
        current?.status !== "ACTIVE" ||
        !["OPERATIONS", "ADMINISTRATOR"].includes(current.role)
      )
        throw new ForbiddenException("当前账号无权读取发布工作");
      administrator = current.role === "ADMINISTRATOR";
    }
    const delivery = await tx.publicationDelivery.findUnique({
      where: { orderId },
    });
    if (
      !delivery ||
      (actor &&
        !administrator &&
        delivery.assigneeAccountId !== null &&
        delivery.assigneeAccountId !== actor.accountId)
    )
      throw new NotFoundException("未找到可处理的履约订单");
    return delivery;
  }

  /** Null is the public composition whose immutable customer ownership was checked by Commerce. */
  read(
    actor: AuthenticatedPrincipal | null,
    orderId: string,
    afterSlot: number,
    limit: number,
    publishedOnly = false,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const delivery = await this.readAccess(tx, orderId, actor);
        const rows = await tx.publicationWorkItem.findMany({
          where: {
            orderId,
            slot: {
              gt: afterSlot,
              ...(!publishedOnly
                ? { lte: Math.min(2_147_483_647, afterSlot + limit) }
                : {}),
            },
            ...(publishedOnly ? { result: { not: Prisma.DbNull } } : {}),
          },
          orderBy: { slot: "asc" },
          take: limit + 1,
        });
        return { delivery, items: rows.map(itemState) };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  async history(actor: AuthenticatedPrincipal, orderId: string, slot: number) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.readAccess(tx, orderId, actor);
        return tx.publicationWorkAudit.findMany({
          where: { orderId, slot },
          orderBy: { revision: "desc" },
          take: 20,
          select: {
            revision: true,
            actorAccountId: true,
            request: true,
            beforeState: true,
            afterState: true,
            createdAt: true,
          },
        });
      },
      { isolationLevel: "RepeatableRead" },
    );
  }

  private async guard(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedPrincipal,
    orderId: string,
    slot: number,
    command: PublicationCommand,
  ) {
    const [currentActor] = await this.identities.lockAccounts(tx, [
      actor.accountId,
    ]);
    if (currentActor?.status !== "ACTIVE" || currentActor.role !== "OPERATIONS")
      throw new ForbiddenException("当前账号无权处理发布结果");
    await tx.$queryRaw`SELECT order_id FROM publication_deliveries WHERE order_id=CAST(${orderId} AS UUID) FOR UPDATE`;
    const delivery = await tx.publicationDelivery.findUnique({
      where: { orderId },
    });
    if (!delivery) throw new NotFoundException("未找到履约订单");
    const prior = await tx.publicationWorkAudit.findUnique({
      where: {
        orderId_idempotencyKey: {
          orderId,
          idempotencyKey: command.idempotencyKey,
        },
      },
    });
    if (prior) {
      if (
        prior.actorAccountId !== actor.accountId ||
        prior.slot !== slot ||
        !isDeepStrictEqual(prior.request, command)
      )
        throw new ConflictException("该操作标识已用于其他发布操作");
      return {
        delivery,
        item: null,
        replay: {
          orderId,
          slot,
          revision: prior.revision,
          orderRevision: prior.orderRevision,
        },
      };
    }
    if (delivery.assigneeAccountId !== actor.accountId)
      throw new ForbiddenException("你不是当前订单责任人");
    if (delivery.revision !== command.expectedRevision)
      throw new ConflictException("订单已更新，请刷新后操作");
    if (
      command.action !== "CORRECT_RESULT" &&
      (delivery.stoppedAt !== null ||
        (delivery.status !== "PUBLISHING" &&
          !(
            delivery.status === "EXCEPTION_HANDLING" &&
            command.action === "REPLACE_TARGET"
          )))
    )
      throw new ConflictException("当前订单不允许新增发布工作");
    const item = await tx.publicationWorkItem.findUnique({
      where: { orderId_slot: { orderId, slot } },
    });
    if ((item?.revision ?? 0) !== command.expectedItemRevision)
      throw new ConflictException("该条发布工作已更新，请重新核对");
    return { delivery, item, replay: null };
  }

  /** Recover the actor-bound receipt before composition consults changed targets/assignees. */
  recover(
    actor: AuthenticatedPrincipal,
    orderId: string,
    slot: number,
    command: PublicationCommand,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const [current] = await this.identities.lockAccounts(tx, [
        actor.accountId,
      ]);
      if (current?.status !== "ACTIVE" || current.role !== "OPERATIONS")
        throw new ForbiddenException("当前账号无权处理发布结果");
      const prior = await tx.publicationWorkAudit.findUnique({
        where: {
          orderId_idempotencyKey: {
            orderId,
            idempotencyKey: command.idempotencyKey,
          },
        },
      });
      if (!prior) {
        const delivery = await tx.publicationDelivery.findUnique({
          where: { orderId },
        });
        if (!delivery) throw new NotFoundException("未找到履约订单");
        if (delivery.assigneeAccountId !== actor.accountId)
          throw new ForbiddenException("你不是当前订单责任人");
        return null;
      }
      if (
        prior.actorAccountId !== actor.accountId ||
        prior.slot !== slot ||
        !isDeepStrictEqual(prior.request, command)
      )
        throw new ConflictException("该操作标识已用于其他发布操作");
      return {
        orderId,
        slot,
        revision: prior.revision,
        orderRevision: prior.orderRevision,
      };
    });
  }

  /** Short preflight only. No transaction remains open during the preparer. */
  preflight(
    actor: AuthenticatedPrincipal,
    orderId: string,
    slot: number,
    command: PublicationCommand,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const checked = await this.guard(tx, actor, orderId, slot, command);
      if (
        !checked.replay &&
        checked.item?.result !== null &&
        checked.item?.result !== undefined
      )
        throw new ConflictException("已有发布结果，不能用新草稿覆盖");
      return checked.replay;
    });
  }

  async write(
    actor: AuthenticatedPrincipal,
    orderId: string,
    slot: number,
    command: PublicationCommand,
    source: PublicationSource,
    prepared?: PreparedVariant,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Recheck Identity here even after an async preflight: role/status can
        // change without changing the item, assignee or aggregate revision.
        const { delivery, item, replay } = await this.guard(
          tx,
          actor,
          orderId,
          slot,
          command,
        );
        if (replay) return replay;
        if (slot < 1 || slot > source.quantity)
          throw new BadRequestException("发布条目不符合原购买范围");
        const previous = item ? itemState(item) : null;
        if (previous?.result && command.action !== "CORRECT_RESULT")
          throw new ConflictException("已有发布结果；请使用填写原因的纠正操作");
        if (command.action === "CORRECT_RESULT" && !previous?.result)
          throw new ConflictException("没有可纠正的发布结果");
        if (previous?.result && previous.platformId !== command.platformId)
          throw new ConflictException("更换已发布媒体不属于普通录入纠正");
        let replacementTarget = previous?.replacementTarget ?? null;
        let target = source.target;
        if (command.action === "REPLACE_TARGET") {
          if (!source.purchasedPlatformId)
            throw new BadRequestException(
              "只有精确购买的未发布条目可以记录协商替换",
            );
          const effectiveId =
            replacementTarget?.platformId ?? source.purchasedPlatformId;
          if (effectiveId === command.platformId)
            throw new ConflictException("请选择不同于当前安排的媒体");
          const [platform] = await this.media
            .bind(tx)
            .platforms([command.platformId]);
          if (!platform?.buyable)
            throw new BadRequestException("请选择当前可用的替换媒体");
          replacementTarget = {
            platformId: platform.platformId,
            displayName: platform.displayName,
          };
          target = replacementTarget;
        } else if (previous?.result) {
          // Recorded publication facts survive later target availability/name changes.
          target = {
            platformId: previous.result.platformId,
            displayName: previous.result.displayName,
          };
        } else {
          const effectiveId =
            replacementTarget?.platformId ?? source.purchasedPlatformId;
          if (
            (effectiveId && effectiveId !== command.platformId) ||
            source.target.platformId !== command.platformId
          )
            throw new ConflictException("当前媒体安排已变化，请刷新核对后操作");
          target = replacementTarget ?? source.target;
        }
        let preparation =
          item?.platformId === command.platformId
            ? (previous?.preparation ?? null)
            : null;
        let result = previous?.result ?? null;
        if (command.action === "SAVE_DRAFT")
          preparation = {
            mode: "MANUAL",
            title: command.title,
            bodyMarkdown: command.bodyMarkdown,
          };
        if (command.action === "PREPARE_MOCK")
          preparation = preparedVariantSchema.parse(prepared);
        if (
          command.action === "RECORD_RESULT" ||
          command.action === "CORRECT_RESULT"
        ) {
          if (new Date(command.result.publishedAt).getTime() > Date.now())
            throw new BadRequestException("发布时间不能晚于当前时间");
          result = { ...command.result, ...target };
        }
        const addedResult = result !== null && !previous?.result;
        const publishedQuantity =
          delivery.publishedQuantity + (addedResult ? 1 : 0);
        if (publishedQuantity > source.quantity)
          throw new ConflictException("发布数量不能超过购买数量");
        const startedAt =
          item?.startedAt ??
          (command.action === "BEGIN" || result ? new Date() : null);
        const data = {
          revision: (item?.revision ?? 0) + 1,
          platformId: command.platformId,
          startedAt,
          replacementTarget: replacementTarget ?? Prisma.DbNull,
          preparation: preparation ?? Prisma.DbNull,
          result: result ?? Prisma.DbNull,
        };
        const saved = await tx.publicationWorkItem.upsert({
          where: { orderId_slot: { orderId, slot } },
          create: { orderId, slot, ...data },
          update: data,
        });
        const next = await tx.publicationDelivery.update({
          where: { orderId },
          data: {
            revision: { increment: 1 },
            startedAt: delivery.startedAt ?? new Date(),
            publishedQuantity,
            status:
              delivery.stoppedAt !== null ||
              delivery.status === "CLOSED" ||
              delivery.status === "COMPLETED" ||
              delivery.status === "EXCEPTION_HANDLING"
                ? delivery.status
                : publishedQuantity === source.quantity
                  ? "COMPLETED"
                  : "PUBLISHING",
          },
        });
        await tx.publicationWorkAudit.create({
          data: {
            orderId,
            slot,
            revision: saved.revision,
            orderRevision: next.revision,
            actorAccountId: actor.accountId,
            idempotencyKey: command.idempotencyKey,
            request: command,
            beforeState:
              previous ??
              (command.action === "REPLACE_TARGET"
                ? {
                    slot,
                    revision: 0,
                    platformId: source.purchasedPlatformId!,
                    replacementTarget: null,
                    state: "PENDING",
                    preparation: null,
                    result: null,
                  }
                : Prisma.DbNull),
            afterState: itemState(saved),
          },
        });
        return {
          orderId,
          slot,
          revision: saved.revision,
          orderRevision: next.revision,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "该链接已属于本订单的另一条有效发布结果，请核对后重试",
        );
      throw error;
    }
  }
}
