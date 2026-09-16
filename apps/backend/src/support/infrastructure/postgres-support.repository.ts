import { DeliverySupportAccess } from "../../publication-delivery/infrastructure/delivery-support-access.js";
import { OrderSupportReader } from "../../publishing-commerce/infrastructure/order-support-reader.js";
import {
  orderSupportWindow,
  requireOrderSupportAdmission,
} from "../../publication-delivery/domain/order-support.js";
import {
  Injectable,
  Inject,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  Prisma,
  type SupportTicket,
  type SupportEvent,
} from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { PostgresOperationsIdentityReader } from "../../identity/infrastructure/postgres-operations-identity-reader.js";
import { RechargeSupportReader } from "../../recharge/infrastructure/recharge-support-reader.js";
import {
  canReadSupport,
  decideSupportCommand,
  type SupportActor,
  type SupportCreate,
  type SupportCommand,
  type SupportList,
} from "../domain/support.js";
const absent = () => new NotFoundException("工单不存在或当前不可访问");
function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function receipt(event: SupportEvent) {
  return {
    ticketId: event.ticketId,
    eventId: event.id,
    revision: event.ticketRevision,
  };
}
function replay(event: SupportEvent, hash: string) {
  if (event.requestDigest !== hash)
    throw new ConflictException("该请求标识已用于不同操作，请核对原记录");
  return receipt(event);
}
function summary(row: SupportTicket, actor: SupportActor) {
  return {
    id: row.id,
    sequence: row.sequence,
    subject: row.subject,
    kind: row.publishingOrderId
      ? "ORDER"
      : row.rechargeOrderId
        ? "RECHARGE"
        : "GENERAL",
    publishingOrderId: row.publishingOrderId,
    status: row.status,
    revision: row.revision,
    assigned: row.assigneeAccountId !== null,
    mine: row.assigneeAccountId === actor.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
@Injectable()
export class PostgresSupportRepository {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(PostgresOperationsIdentityReader)
    private readonly identities: PostgresOperationsIdentityReader,
    @Inject(RechargeSupportReader)
    private readonly recharges: RechargeSupportReader,
    @Inject(DeliverySupportAccess)
    private readonly deliveries: DeliverySupportAccess,
    @Inject(OrderSupportReader) private readonly orders: OrderSupportReader,
  ) {}
  private async actor(tx: Prisma.TransactionClient, id: string) {
    const actor = (await this.identities.lockAccounts(tx, [id]))[0];
    if (
      !actor ||
      actor.status !== "ACTIVE" ||
      !["TERMINAL_CUSTOMER", "OPERATIONS", "ADMINISTRATOR"].includes(actor.role)
    )
      throw new ForbiddenException("当前账号不能访问客服工单");
    return actor;
  }
  private async orderContext(
    tx: Prisma.TransactionClient,
    actor: SupportActor,
    id: string,
  ) {
    const order = await this.orders.read(tx, id);
    if (actor.role === "TERMINAL_CUSTOMER" && order.accountId !== actor.id)
      throw absent();
    const { delivery, now } = await this.deliveries.lock(tx, id);
    if (actor.role === "OPERATIONS" && delivery.assigneeAccountId !== actor.id)
      throw absent();
    return { order, delivery, now };
  }
  private async locked(
    tx: Prisma.TransactionClient,
    actor: SupportActor,
    id: string,
  ) {
    // Immutable reference discovery before taking Delivery -> Support locks.
    const reference = await tx.supportTicket.findUnique({
      where: { id },
      select: { publishingOrderId: true },
    });
    if (!reference) throw absent();
    const context = reference.publishingOrderId
      ? await this.orderContext(tx, actor, reference.publishingOrderId)
      : null;
    await tx.$queryRaw`SELECT id FROM support_tickets WHERE id=${id}::uuid FOR NO KEY UPDATE`;
    const ticket = await tx.supportTicket.findUniqueOrThrow({ where: { id } });
    return {
      ticket,
      effective: context
        ? { ...ticket, assigneeAccountId: context.delivery.assigneeAccountId }
        : ticket,
    };
  }
  private async duplicate(
    tx: Prisma.TransactionClient,
    actorAccountId: string,
    requestId: string,
  ) {
    return tx.supportEvent.findUnique({
      where: { actorAccountId_requestId: { actorAccountId, requestId } },
    });
  }
  async create(actorId: string, input: SupportCreate) {
    const hash = digest({ action: "CREATE", ...input });
    const run = () =>
      this.db.$transaction(async (tx) => {
        const actor = await this.actor(tx, actorId);
        if (
          actor.role !== "TERMINAL_CUSTOMER" &&
          !(actor.role === "OPERATIONS" && input.publishingOrderId)
        )
          throw new ForbiddenException(
            "客户提交问题，运营只能发起自己负责订单的沟通",
          );
        const context = input.publishingOrderId
          ? await this.orderContext(tx, actor, input.publishingOrderId)
          : null;
        const prior = await this.duplicate(tx, actorId, input.requestId);
        if (prior) return replay(prior, hash);
        if (context) {
          const open = await tx.supportTicket.findFirst({
            where: {
              publishingOrderId: context.order.id,
              status: "PROCESSING",
            },
          });
          if (open) {
            if (open.revision >= 2147483647)
              throw new ConflictException("工单版本已达上限，请核查");
            const next = await tx.supportTicket.update({
              where: { id: open.id },
              data: { revision: { increment: 1 } },
            });
            return receipt(
              await tx.supportEvent.create({
                data: {
                  ticketId: open.id,
                  actorAccountId: actor.id,
                  actorRole: actor.role,
                  requestId: input.requestId,
                  requestDigest: hash,
                  action: "REPLY",
                  message: input.message,
                  ticketRevision: next.revision,
                },
              }),
            );
          }
        }
        const appealUsed = context
          ? Boolean(
              await tx.supportTicket.findFirst({
                where: {
                  publishingOrderId: context.order.id,
                  postEndAppeal: true,
                },
                select: { id: true },
              }),
            )
          : false;
        const postEndAppeal = context
          ? requireOrderSupportAdmission(
              context.delivery,
              context.now,
              actor.role === "TERMINAL_CUSTOMER",
              appealUsed,
            )
          : false;
        const rechargeOrderId = input.rechargeOrderId
          ? await this.recharges.requireOwned(
              tx,
              actor.id,
              input.rechargeOrderId,
            )
          : null;
        const ticket = await tx.supportTicket.create({
          data: {
            subject: input.subject,
            customerAccountId: context?.order.accountId ?? actor.id,
            rechargeOrderId,
            publishingOrderId: context?.order.id ?? null,
            postEndAppeal,
          },
        });
        return receipt(
          await tx.supportEvent.create({
            data: {
              ticketId: ticket.id,
              actorAccountId: actor.id,
              actorRole: actor.role,
              requestId: input.requestId,
              requestDigest: hash,
              action: "CREATE",
              message: input.message,
              ticketRevision: 1,
            },
          }),
        );
      });
    try {
      return await run();
    } catch (error) {
      // Concurrent identical creates roll back the losing ticket and recover the committed receipt.
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      )
        throw error;
      return this.db.$transaction(async (tx) => {
        const actor = await this.actor(tx, actorId);
        if (input.publishingOrderId)
          await this.orderContext(tx, actor, input.publishingOrderId);
        const prior = await this.duplicate(tx, actorId, input.requestId);
        if (!prior) throw error;
        return replay(prior, hash);
      });
    }
  }
  async command(actorId: string, id: string, input: SupportCommand) {
    const hash = digest({ ticketId: id, ...input });
    return this.db
      .$transaction(async (tx) => {
        const actor = await this.actor(tx, actorId);
        const { ticket, effective } = await this.locked(tx, actor, id);
        const prior = await this.duplicate(tx, actorId, input.requestId);
        // Replays also recheck current ownership: a former operator cannot use an old receipt as access.
        if (prior) {
          if (!canReadSupport(effective, actor)) throw absent();
          return replay(prior, hash);
        }
        if (input.action !== "CLAIM" && !canReadSupport(effective, actor))
          throw absent();
        if (
          ticket.publishingOrderId &&
          (input.action === "CLAIM" || input.action === "RELEASE")
        )
          throw new ForbiddenException("订单工单随订单责任安排，请从订单操作");
        const next = decideSupportCommand(effective, actor, input);
        await tx.supportTicket.update({
          where: { id },
          data: ticket.publishingOrderId
            ? { status: next.status, revision: next.revision }
            : next,
        });
        return receipt(
          await tx.supportEvent.create({
            data: {
              ticketId: id,
              actorAccountId: actor.id,
              actorRole: actor.role,
              requestId: input.requestId,
              requestDigest: hash,
              action: input.action,
              message: "message" in input ? input.message : null,
              ticketRevision: next.revision,
            },
          }),
        );
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
          throw new ConflictException("该请求标识已用于其他操作，请核对原记录");
        throw error;
      });
  }
  async list(actorId: string, input: SupportList) {
    return this.db.$transaction(async (tx) => {
      const actor = await this.actor(tx, actorId);
      const context = input.publishingOrderId
        ? await this.orderContext(tx, actor, input.publishingOrderId)
        : null;
      let scope: Prisma.Sql;
      if (actor.role === "TERMINAL_CUSTOMER") {
        if (input.scope !== "mine")
          throw new ForbiddenException("只能查看本人的工单");
        scope = Prisma.sql`t.customer_account_id=${actor.id}::uuid`;
      } else if (actor.role === "OPERATIONS") {
        if (input.scope === "all")
          throw new ForbiddenException("请选择工单池或我的工单");
        scope =
          input.scope === "pool"
            ? Prisma.sql`t.publishing_order_id IS NULL AND t.assignee_account_id IS NULL AND t.status='PROCESSING'`
            : Prisma.sql`COALESCE(d.assignee_account_id,t.assignee_account_id)=${actor.id}::uuid`;
      } else
        scope =
          input.scope === "pool"
            ? Prisma.sql`t.publishing_order_id IS NULL AND t.assignee_account_id IS NULL AND t.status='PROCESSING'`
            : Prisma.sql`TRUE`;
      const filters = [scope];
      if (input.status) filters.push(Prisma.sql`t.status=${input.status}`);
      if (input.before) filters.push(Prisma.sql`t.sequence<${input.before}`);
      if (input.publishingOrderId)
        filters.push(
          Prisma.sql`t.publishing_order_id=${input.publishingOrderId}::uuid`,
        );
      // One read snapshot over Support plus Delivery's narrow public responsibility projection.
      const rows = await tx.$queryRaw<SupportTicket[]>(Prisma.sql`
        SELECT t.id,t.sequence,t.subject,t.status,t.revision,
          t.customer_account_id AS "customerAccountId",t.recharge_order_id AS "rechargeOrderId",
          t.publishing_order_id AS "publishingOrderId",t.post_end_appeal AS "postEndAppeal",
          COALESCE(d.assignee_account_id,t.assignee_account_id) AS "assigneeAccountId",
          t.created_at AS "createdAt",t.updated_at AS "updatedAt"
        FROM support_tickets t LEFT JOIN (${this.deliveries.projection()}) d ON d.order_id=t.publishing_order_id
        WHERE ${Prisma.join(filters, " AND ")} ORDER BY t.sequence DESC LIMIT ${input.limit + 1}`);
      const items = rows.slice(0, input.limit);
      let order = null;
      if (context) {
        const open = await tx.supportTicket.findFirst({
          where: { publishingOrderId: context.order.id, status: "PROCESSING" },
          select: { id: true },
        });
        const used = Boolean(
          await tx.supportTicket.findFirst({
            where: { publishingOrderId: context.order.id, postEndAppeal: true },
            select: { id: true },
          }),
        );
        let reason: string | null = null;
        if (!open && actor.role !== "ADMINISTRATOR")
          try {
            requireOrderSupportAdmission(
              context.delivery,
              context.now,
              actor.role === "TERMINAL_CUSTOMER",
              used,
            );
          } catch (e) {
            if (!(e instanceof ConflictException)) throw e;
            reason = e.message;
          }
        const window = orderSupportWindow(context.delivery);
        order = {
          id: context.order.id,
          title: context.order.title,
          number: context.order.number,
          endedAt: window.endedAt?.toISOString() ?? null,
          appealUntil: window.deadline?.toISOString() ?? null,
          openTicketId: open?.id ?? null,
          canCreate: actor.role !== "ADMINISTRATOR" && !open && !reason,
          reason,
        };
      }
      return {
        items: items.map((row) => summary(row, actor)),
        nextBefore: rows.length > input.limit ? items.at(-1)!.sequence : null,
        order,
      };
    });
  }
  async detail(actorId: string, id: string, after: number) {
    return this.db.$transaction(async (tx) => {
      const actor = await this.actor(tx, actorId);
      const { ticket, effective } = await this.locked(tx, actor, id);
      if (!canReadSupport(effective, actor)) throw absent();
      const events = await tx.supportEvent.findMany({
        where: { ticketId: id, ticketRevision: { gt: after } },
        orderBy: { ticketRevision: "asc" },
        take: 101,
      });
      const page = events.slice(0, 100);
      return {
        ...summary(effective, actor),
        rechargeOrderId: ticket.rechargeOrderId,
        events: page.map((e) => ({
          id: e.id,
          action: e.action,
          author: e.actorRole,
          message: e.message,
          revision: e.ticketRevision,
          createdAt: e.createdAt.toISOString(),
        })),
        nextAfter: events.length > 100 ? page.at(-1)!.ticketRevision : null,
      };
    });
  }
}
