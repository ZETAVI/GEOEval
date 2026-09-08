import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { isDeepStrictEqual } from "node:util";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { PostgresOperationsIdentityReader } from "../../identity/infrastructure/postgres-operations-identity-reader.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import type { AssignmentCommand } from "../domain/delivery-assignment.js";

@Injectable()
export class PostgresDeliveryAssignmentRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PostgresOperationsIdentityReader)
    private readonly identities: PostgresOperationsIdentityReader,
  ) {}

  list(
    actor: AuthenticatedPrincipal,
    query: {
      scope: "POOL" | "MINE" | "ALL";
      limit: number;
      beforeSequence?: number;
    },
  ) {
    if (actor.role !== "OPERATIONS" && actor.role !== "ADMINISTRATOR")
      throw new ForbiddenException();
    if (query.scope === "ALL" && actor.role !== "ADMINISTRATOR")
      throw new ForbiddenException();
    return this.prisma.publicationDelivery.findMany({
      where: {
        ...(query.scope === "POOL" ? { assigneeAccountId: null } : {}),
        ...(query.scope === "MINE"
          ? { assigneeAccountId: actor.accountId }
          : {}),
        ...(query.beforeSequence
          ? { sequence: { lt: query.beforeSequence } }
          : {}),
      },
      orderBy: { sequence: "desc" },
      take: query.limit + 1,
    });
  }

  async detail(actor: AuthenticatedPrincipal, orderId: string) {
    if (actor.role !== "OPERATIONS" && actor.role !== "ADMINISTRATOR")
      throw new ForbiddenException();
    const row = await this.prisma.publicationDelivery.findUnique({
      where: { orderId },
    });
    if (
      !row ||
      (actor.role !== "ADMINISTRATOR" &&
        row.assigneeAccountId !== null &&
        row.assigneeAccountId !== actor.accountId)
    )
      throw new NotFoundException("未找到可处理的订单");
    const history = await this.prisma.publicationDeliveryAudit.findMany({
      where: { orderId },
      orderBy: { revision: "desc" },
      take: 50,
      select: {
        revision: true,
        actorAccountId: true,
        request: true,
        previousAssigneeId: true,
        nextAssigneeId: true,
        createdAt: true,
      },
    });
    return { ...row, history };
  }

  async act(
    actor: AuthenticatedPrincipal,
    orderId: string,
    command: AssignmentCommand,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Identity locks precede Delivery locks. Target governance must not race
      // an assignment into an inactive/non-operations identity.
      const accounts = await this.identities.lockAccounts(tx, [
        actor.accountId,
        ...(command.action === "REASSIGN" ? [command.assigneeAccountId] : []),
      ]);
      const currentActor = accounts.find((a) => a.id === actor.accountId);
      const role =
        command.action === "REASSIGN" ? "ADMINISTRATOR" : "OPERATIONS";
      if (currentActor?.status !== "ACTIVE" || currentActor.role !== role)
        throw new ForbiddenException("当前账号无权执行此操作");
      await tx.$queryRaw`SELECT order_id FROM publication_deliveries WHERE order_id=CAST(${orderId} AS UUID) FOR UPDATE`;
      const row = await tx.publicationDelivery.findUnique({
        where: { orderId },
      });
      if (!row) throw new NotFoundException("未找到可处理的订单");
      const prior = await tx.publicationDeliveryAudit.findUnique({
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
          !isDeepStrictEqual(prior.request, command)
        )
          throw new ConflictException("该操作标识已对应其他请求");
        return { orderId, revision: prior.revision };
      }
      if (row.revision !== command.expectedRevision)
        throw new ConflictException("订单已被更新，请刷新后再操作");
      if (row.status === "COMPLETED" && command.action !== "REASSIGN")
        throw new ConflictException("订单已完成，不能重新认领、开始或退回");
      let assigneeAccountId = row.assigneeAccountId;
      let startedAt = row.startedAt;
      if (command.action === "CLAIM") {
        if (assigneeAccountId !== null)
          throw new ConflictException("订单已被认领");
        assigneeAccountId = actor.accountId;
      } else if (command.action === "REASSIGN") {
        const target = accounts.find((a) => a.id === command.assigneeAccountId);
        if (target?.role !== "OPERATIONS" || target.status !== "ACTIVE")
          throw new ConflictException("只能改派给可用的运营账号");
        if (!assigneeAccountId || assigneeAccountId === target.id)
          throw new ConflictException(
            "请选择不同的运营责任人；未认领订单应由运营领取",
          );
        assigneeAccountId = target.id;
      } else {
        if (assigneeAccountId !== actor.accountId)
          throw new ForbiddenException("你不是当前订单责任人");
        if (command.action === "RETURN") {
          if (startedAt)
            throw new ConflictException("订单已开始处理，请联系管理员改派");
          assigneeAccountId = null;
        } else {
          if (startedAt) throw new ConflictException("订单已经开始处理");
          startedAt = new Date();
        }
      }
      const next = await tx.publicationDelivery.update({
        where: { orderId },
        data: {
          assigneeAccountId,
          startedAt,
          status:
            row.status === "COMPLETED"
              ? "COMPLETED"
              : assigneeAccountId
                ? "PUBLISHING"
                : "PENDING_HANDLING",
          revision: { increment: 1 },
        },
      });
      await tx.publicationDeliveryAudit.create({
        data: {
          orderId,
          revision: next.revision,
          actorAccountId: actor.accountId,
          idempotencyKey: command.idempotencyKey,
          request: command,
          previousAssigneeId: row.assigneeAccountId,
          nextAssigneeId: next.assigneeAccountId,
        },
      });
      return { orderId, revision: next.revision };
    });
  }
}
