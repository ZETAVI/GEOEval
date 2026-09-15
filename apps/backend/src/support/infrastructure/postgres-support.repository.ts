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
    kind: row.rechargeOrderId ? "RECHARGE" : "GENERAL",
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
  private async locked(tx: Prisma.TransactionClient, id: string) {
    // NO KEY UPDATE avoids reversing the account -> ticket order via FK checks.
    await tx.$queryRaw`SELECT id FROM support_tickets WHERE id=${id}::uuid FOR NO KEY UPDATE`;
    const row = await tx.supportTicket.findUnique({ where: { id } });
    if (!row) throw absent();
    return row;
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
        if (actor.role !== "TERMINAL_CUSTOMER")
          throw new ForbiddenException("请使用客户账号提交问题");
        const prior = await this.duplicate(tx, actorId, input.requestId);
        if (prior) return replay(prior, hash);
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
            customerAccountId: actor.id,
            rechargeOrderId,
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
        await this.actor(tx, actorId);
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
        const ticket = await this.locked(tx, id);
        const prior = await this.duplicate(tx, actorId, input.requestId);
        // Replays also recheck current ownership: a former operator cannot use an old receipt as access.
        if (prior) {
          if (!canReadSupport(ticket, actor)) throw absent();
          return replay(prior, hash);
        }
        if (input.action !== "CLAIM" && !canReadSupport(ticket, actor))
          throw absent();
        const next = decideSupportCommand(ticket, actor, input);
        await tx.supportTicket.update({ where: { id }, data: next });
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
      let where: Prisma.SupportTicketWhereInput;
      if (actor.role === "TERMINAL_CUSTOMER") {
        if (input.scope !== "mine")
          throw new ForbiddenException("只能查看本人的工单");
        where = { customerAccountId: actor.id };
      } else if (actor.role === "OPERATIONS") {
        if (input.scope === "all")
          throw new ForbiddenException("请选择工单池或我的工单");
        where =
          input.scope === "pool"
            ? { assigneeAccountId: null, status: "PROCESSING" }
            : { assigneeAccountId: actor.id };
      } else
        where =
          input.scope === "pool"
            ? { assigneeAccountId: null, status: "PROCESSING" }
            : {};
      if (input.status) where = { AND: [where, { status: input.status }] };
      const rows = await tx.supportTicket.findMany({
        where: {
          ...where,
          ...(input.before ? { sequence: { lt: input.before } } : {}),
        },
        orderBy: { sequence: "desc" },
        take: input.limit + 1,
      });
      const items = rows.slice(0, input.limit);
      return {
        items: items.map((row) => summary(row, actor)),
        nextBefore: rows.length > input.limit ? items.at(-1)!.sequence : null,
      };
    });
  }
  async detail(actorId: string, id: string, after: number) {
    return this.db.$transaction(async (tx) => {
      const actor = await this.actor(tx, actorId);
      const ticket = await this.locked(tx, id);
      if (!canReadSupport(ticket, actor)) throw absent();
      const events = await tx.supportEvent.findMany({
        where: { ticketId: id, ticketRevision: { gt: after } },
        orderBy: { ticketRevision: "asc" },
        take: 101,
      });
      const page = events.slice(0, 100);
      return {
        ...summary(ticket, actor),
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
