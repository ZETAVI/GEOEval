import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type {
  Prisma,
  PublicationDelivery,
} from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { PostgresOperationsIdentityReader } from "../../identity/infrastructure/postgres-operations-identity-reader.js";
import { assignmentInputSchema } from "../domain/delivery-assignment.js";
import {
  NegotiatedResolutionError,
  negotiatedResolutionInputSchema,
  resolveNegotiatedAgreement,
  type ResolutionOrder,
} from "../domain/negotiated-resolution.js";

const exceptionInputSchema = assignmentInputSchema.extend({
  reason: z
    .string()
    .transform((value) => value.normalize("NFKC").trim())
    .pipe(z.string().min(1).max(320))
    .nullable(),
});

export function resolutionOrder(
  row: PublicationDelivery,
  quantity: number,
): ResolutionOrder {
  if (
    row.resolutionMode !== null &&
    row.resolutionMode !== "CONTINUE" &&
    row.resolutionMode !== "TERMINATE"
  )
    throw new Error("Delivery has an invalid negotiated resolution mode");
  return {
    revision: row.revision,
    status: row.status,
    assigneeAccountId: row.assigneeAccountId,
    quantity,
    publishedQuantity: row.publishedQuantity,
    stopped: row.stoppedAt !== null,
    agreement:
      row.resolutionMode === null
        ? null
        : {
            revision: row.agreementRevision,
            mode: row.resolutionMode,
            points: row.agreedReturnPoints,
            reason: row.resolutionReason!,
          },
    returnRecorded: row.settledLedgerId !== null,
  };
}

function resolutionState(row: PublicationDelivery) {
  return {
    status: row.status,
    exceptionReason: row.exceptionReason,
    agreementRevision: row.agreementRevision,
    resolutionMode: row.resolutionMode,
    agreedReturnPoints: row.agreedReturnPoints,
    resolutionReason: row.resolutionReason,
    stoppedAt: row.stoppedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    settledLedgerId: row.settledLedgerId,
  };
}

function decision<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (!(error instanceof NegotiatedResolutionError)) throw error;
    if (error.code === "FORBIDDEN") throw new ForbiddenException(error.message);
    if (error.code === "INVALID_RESOLUTION")
      throw new BadRequestException(error.message);
    throw new ConflictException(error.message);
  }
}

@Injectable()
export class PostgresDeliveryResolutionRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PostgresOperationsIdentityReader)
    private readonly identities: PostgresOperationsIdentityReader,
  ) {}

  private async lockDelivery(tx: Prisma.TransactionClient, orderId: string) {
    await tx.$queryRaw`SELECT order_id FROM publication_deliveries WHERE order_id=CAST(${orderId} AS UUID) FOR UPDATE`;
    const row = await tx.publicationDelivery.findUnique({ where: { orderId } });
    if (!row) throw new NotFoundException("未找到履约订单");
    return row;
  }

  private async replay(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedPrincipal,
    orderId: string,
    request: Prisma.InputJsonObject & { idempotencyKey: string },
  ) {
    const prior = await tx.publicationDeliveryAudit.findUnique({
      where: {
        orderId_idempotencyKey: {
          orderId,
          idempotencyKey: request.idempotencyKey,
        },
      },
    });
    if (!prior) return null;
    if (
      prior.actorAccountId !== actor.accountId ||
      !isDeepStrictEqual(prior.request, request)
    )
      throw new ConflictException("该操作标识已对应其他请求");
    return { orderId, revision: prior.revision };
  }

  private async audit(
    tx: Prisma.TransactionClient,
    actor: Pick<AuthenticatedPrincipal, "accountId">,
    before: PublicationDelivery,
    after: PublicationDelivery,
    request: Prisma.InputJsonObject & { idempotencyKey: string },
  ) {
    await tx.publicationDeliveryAudit.create({
      data: {
        orderId: before.orderId,
        revision: after.revision,
        actorAccountId: actor.accountId,
        idempotencyKey: request.idempotencyKey,
        request,
        previousAssigneeId: before.assigneeAccountId,
        nextAssigneeId: after.assigneeAccountId,
        beforeResolution: resolutionState(before),
        afterResolution: resolutionState(after),
      },
    });
  }

  async save(
    actor: AuthenticatedPrincipal,
    orderId: string,
    raw: unknown,
    facts: { quantity: number; originalConsumedPoints: number },
    compose: {
      finalized: (tx: Prisma.TransactionClient, id: string) => Promise<boolean>;
      record: (
        tx: Prisma.TransactionClient,
        row: PublicationDelivery,
        now: Date,
        input: ReturnType<typeof negotiatedResolutionInputSchema.parse>,
      ) => Promise<string>;
      replay: (
        tx: Prisma.TransactionClient,
        key: string,
      ) => Promise<string | undefined>;
    },
  ) {
    const parsed = negotiatedResolutionInputSchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException("请核对协商方式、明确退点金额、原因与版本");
    const request = { ...parsed.data, action: "SAVE_RESOLUTION" };
    return this.prisma.$transaction(async (tx) => {
      const [current] = await this.identities.lockAccounts(tx, [
        actor.accountId,
      ]);
      if (current?.role !== "OPERATIONS" || current.status !== "ACTIVE")
        throw new ForbiddenException("仅当前有效运营责任人可保存协商处理");
      const row = await this.lockDelivery(tx, orderId);
      const prior = await this.replay(tx, actor, orderId, request);
      if (row.assigneeAccountId !== current.id)
        throw new ForbiddenException("你不是当前订单责任人");
      if (prior)
        return {
          ...prior,
          ticketId: await compose.replay(tx, parsed.data.idempotencyKey),
        };
      if (await compose.finalized(tx, orderId))
        throw new ConflictException("订单已最终结算，不能修改约定");
      const nextState = decision(() =>
        resolveNegotiatedAgreement(
          resolutionOrder(row, facts.quantity),
          { accountId: current.id, role: current.role, status: current.status },
          parsed.data,
          facts.originalConsumedPoints,
        ),
      );
      const [clock] = await tx.$queryRaw<
        Array<{ now: Date }>
      >`SELECT clock_timestamp() AS now`;
      const now = clock!.now;
      const next = await tx.publicationDelivery.update({
        where: { orderId },
        data: {
          revision: { increment: 1 },
          status: nextState.status,
          startedAt: row.startedAt ?? now,
          exceptionReason: null,
          agreementRevision: nextState.agreement.revision,
          resolutionMode: nextState.agreement.mode,
          agreedReturnPoints: nextState.agreement.points,
          resolutionReason: nextState.agreement.reason,
          stoppedAt: nextState.stopped ? (row.stoppedAt ?? now) : null,
          closedAt:
            nextState.status === "CLOSED" ? (row.closedAt ?? now) : null,
        },
      });
      const ticketId = await compose.record(tx, next, now, parsed.data);
      await this.audit(tx, actor, row, next, request);
      return { orderId, revision: next.revision, ticketId };
    });
  }

  async exception(
    actor: AuthenticatedPrincipal,
    orderId: string,
    raw: unknown,
  ) {
    const parsed = exceptionInputSchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException("请核对异常原因与准确版本");
    const request = {
      ...parsed.data,
      action:
        parsed.data.reason === null ? "CLEAR_EXCEPTION" : "REPORT_EXCEPTION",
    };
    return this.prisma.$transaction(async (tx) => {
      const [current] = await this.identities.lockAccounts(tx, [
        actor.accountId,
      ]);
      if (current?.role !== "OPERATIONS" || current.status !== "ACTIVE")
        throw new ForbiddenException("仅当前有效运营责任人可处理异常");
      const row = await this.lockDelivery(tx, orderId);
      const prior = await this.replay(tx, actor, orderId, request);
      if (prior) return prior;
      if (row.assigneeAccountId !== current.id)
        throw new ForbiddenException("你不是当前订单责任人");
      if (row.revision !== parsed.data.expectedRevision)
        throw new ConflictException("订单已变化，请刷新核对");
      if (
        row.stoppedAt ||
        row.status === "CLOSED" ||
        row.status === "COMPLETED" ||
        row.settledLedgerId
      )
        throw new ConflictException("订单已停止或完成，不能重新处理异常");
      if (request.reason === null && row.exceptionReason === null)
        throw new ConflictException("当前订单没有可解除的异常");
      const next = await tx.publicationDelivery.update({
        where: { orderId },
        data: {
          revision: { increment: 1 },
          status: request.reason === null ? "PUBLISHING" : "EXCEPTION_HANDLING",
          exceptionReason: request.reason,
        },
      });
      await this.audit(tx, actor, row, next, request);
      return { orderId, revision: next.revision };
    });
  }
}
