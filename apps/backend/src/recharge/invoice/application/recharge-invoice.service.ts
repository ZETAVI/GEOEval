import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { AuthenticatedPrincipal } from "../../../identity/domain/identity.types.js";
import { PostgresOperationsIdentityReader } from "../../../identity/infrastructure/postgres-operations-identity-reader.js";
import {
  Prisma,
  type RechargeInvoiceAuditAction,
} from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../infrastructure/prisma.service.js";
import {
  customerInvoiceListQuery,
  customerInvoiceOrderSummariesQuery,
  internalInvoiceListQuery,
  invoiceApplicationInput,
  invoiceCommandInput,
  invoiceRequestDigest,
  invoiceResubmissionInput,
  publicCorrectionReason,
  type InvoiceSubmissionInput,
} from "../domain/recharge-invoice.js";
import { RechargeInvoiceOrderAccess } from "../infrastructure/recharge-invoice-order-access.js";

const requestInclude = {
  submissions: { orderBy: { revision: "desc" }, take: 1 },
  customer: { select: { mobile: true } },
  assignee: { select: { id: true, mobile: true, role: true } },
} satisfies Prisma.RechargeInvoiceRequestInclude;
const detailInclude = {
  ...requestInclude,
  audits: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      action: true,
      actorAccountId: true,
      reason: true,
      createdAt: true,
    },
  },
} satisfies Prisma.RechargeInvoiceRequestInclude;
type InvoiceRow = Prisma.RechargeInvoiceRequestGetPayload<{
  include: typeof requestInclude;
}>;
type InvoiceDetailRow = Prisma.RechargeInvoiceRequestGetPayload<{
  include: typeof detailInclude;
}>;

@Injectable()
export class RechargeInvoiceService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(PostgresOperationsIdentityReader)
    private readonly identities: PostgresOperationsIdentityReader,
    @Inject(RechargeInvoiceOrderAccess)
    private readonly orders: RechargeInvoiceOrderAccess,
  ) {}

  async listCustomer(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    raw: unknown,
  ) {
    this.assertFence(actor, expected);
    const query = parse(
      customerInvoiceListQuery,
      raw,
      "发票记录查询参数不正确",
    );
    return this.db.$transaction(
      async (tx) => {
        await this.assertActor(tx, actor, ["TERMINAL_CUSTOMER"]);
        const rows = await tx.rechargeInvoiceRequest.findMany({
          where: {
            accountId: actor.accountId,
            ...(query.cursor ? { number: { lt: query.cursor } } : {}),
          },
          orderBy: { number: "desc" },
          take: query.limit + 1,
          include: requestInclude,
        });
        return page(rows, query.limit, presentCustomer);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async customerDetail(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    requestId: string,
  ) {
    this.assertFence(actor, expected);
    return this.db.$transaction(async (tx) => {
      await this.assertActor(tx, actor, ["TERMINAL_CUSTOMER"]);
      const row = await tx.rechargeInvoiceRequest.findFirst({
        where: { id: requestId, accountId: actor.accountId },
        include: requestInclude,
      });
      if (!row) throw new NotFoundException("未找到这份开票申请");
      return presentCustomer(row);
    });
  }

  async orderSummaries(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    raw: unknown,
  ) {
    this.assertFence(actor, expected);
    const query = parse(
      customerInvoiceOrderSummariesQuery,
      raw,
      "订单范围不正确",
    );
    return this.db.$transaction(
      async (tx) => {
        await this.assertActor(tx, actor, ["TERMINAL_CUSTOMER"]);
        const rows = await tx.rechargeInvoiceRequest.findMany({
          where: {
            accountId: actor.accountId,
            rechargeOrderId: { in: query.orderIds },
          },
          orderBy: { number: "desc" },
          include: requestInclude,
        });
        return { items: rows.map(presentCustomer) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async defaultSubmission(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
  ) {
    this.assertFence(actor, expected);
    return this.db.$transaction(async (tx) => {
      await this.assertActor(tx, actor, ["TERMINAL_CUSTOMER"]);
      const submission = await tx.rechargeInvoiceSubmission.findFirst({
        where: { request: { accountId: actor.accountId } },
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      });
      return { submission: submission ? presentSubmission(submission) : null };
    });
  }

  async apply(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    orderId: string,
    raw: unknown,
  ) {
    this.assertFence(actor, expected);
    const input = parse(
      invoiceApplicationInput,
      raw,
      "请核对开票抬头、税号和接收邮箱",
    );
    const digest = invoiceRequestDigest("APPLICATION_SUBMITTED", {
      orderId,
      ...input,
    });
    return this.db.$transaction(async (tx) => {
      await this.assertActor(tx, actor, ["TERMINAL_CUSTOMER"]);
      const order = await this.orders.readInvoiceable(
        tx,
        actor.accountId,
        orderId,
      );
      if (order.kind === "NOT_FOUND")
        throw new NotFoundException("未找到这笔可开票充值");
      const replay = await this.replay(
        tx,
        actor.accountId,
        input.requestId,
        digest,
      );
      if (replay) return presentCustomer(replay);
      if (order.kind === "INELIGIBLE")
        throw new ConflictException(ineligibleMessage(order.reason));
      if (
        await tx.rechargeInvoiceRequest.findUnique({
          where: { rechargeOrderId: orderId },
          select: { id: true },
        })
      )
        throw new ConflictException("这笔充值已经提交过开票申请");
      const id = randomUUID();
      await tx.rechargeInvoiceRequest.create({
        data: {
          id,
          rechargeOrderId: order.order.orderId,
          accountId: actor.accountId,
          amountFen: order.order.invoiceableAmountFen,
          currency: order.order.currency,
          submissions: {
            create: submissionData(input, 1),
          },
        },
      });
      const row = await this.readRow(tx, id);
      await this.audit(tx, {
        row,
        actorId: actor.accountId,
        idempotencyKey: input.requestId,
        digest,
        action: "APPLICATION_SUBMITTED",
        before: null,
        reason: null,
      });
      return presentCustomer(row);
    });
  }

  async resubmit(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    requestId: string,
    raw: unknown,
  ) {
    this.assertFence(actor, expected);
    const input = parse(
      invoiceResubmissionInput,
      raw,
      "请核对修改后的开票资料",
    );
    const digest = invoiceRequestDigest("CORRECTION_RESUBMITTED", input);
    return this.db.$transaction(async (tx) => {
      await this.assertActor(tx, actor, ["TERMINAL_CUSTOMER"]);
      await lockRequest(tx, requestId);
      const current = await tx.rechargeInvoiceRequest.findFirst({
        where: { id: requestId, accountId: actor.accountId },
        include: requestInclude,
      });
      if (!current) throw new NotFoundException("未找到这份开票申请");
      const replay = await this.replay(
        tx,
        actor.accountId,
        input.requestId,
        digest,
      );
      if (replay) return presentCustomer(replay);
      if (current.revision !== input.expectedRevision)
        throw new ConflictException("开票申请已变化，请刷新后重试");
      if (current.status !== "NEEDS_CORRECTION")
        throw new ConflictException("当前开票申请不需要修改资料");
      const before = state(current);
      const nextSubmissionRevision = current.currentSubmissionRevision + 1;
      await tx.rechargeInvoiceSubmission.create({
        data: {
          requestId: current.id,
          ...submissionData(input, nextSubmissionRevision),
        },
      });
      await tx.rechargeInvoiceRequest.update({
        where: { id: current.id },
        data: {
          status: "PROCESSING",
          correctionReasonCode: null,
          correctionNote: null,
          currentSubmissionRevision: nextSubmissionRevision,
          revision: { increment: 1 },
        },
      });
      const row = await this.readRow(tx, current.id);
      await this.audit(tx, {
        row,
        actorId: actor.accountId,
        idempotencyKey: input.requestId,
        digest,
        action: "CORRECTION_RESUBMITTED",
        before,
        reason: null,
      });
      return presentCustomer(row);
    });
  }

  async listInternal(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    raw: unknown,
  ) {
    this.assertFence(actor, expected);
    const query = parse(
      internalInvoiceListQuery,
      raw,
      "开票任务查询参数不正确",
    );
    const operations = actor.role === "OPERATIONS";
    if (operations && (query.accountId || query.assigneeAccountId))
      throw new ForbiddenException("运营不能按其他账号查看开票任务");
    const scope = query.scope ?? (operations ? "UNASSIGNED" : undefined);
    return this.db.$transaction(
      async (tx) => {
        await this.assertActor(tx, actor, [
          operations ? "OPERATIONS" : "ADMINISTRATOR",
        ]);
        const conditions: Prisma.RechargeInvoiceRequestWhereInput[] = [];
        if (query.status) conditions.push({ status: query.status });
        if (scope === "UNASSIGNED")
          conditions.push({
            assigneeAccountId: null,
            status: { not: "ISSUED" },
          });
        if (scope === "MINE")
          conditions.push({ assigneeAccountId: actor.accountId });
        if (operations)
          conditions.push({
            OR: [
              { assigneeAccountId: null },
              { assigneeAccountId: actor.accountId },
            ],
          });
        const rows = await tx.rechargeInvoiceRequest.findMany({
          where: {
            ...(query.cursor ? { number: { lt: query.cursor } } : {}),
            ...(query.accountId ? { accountId: query.accountId } : {}),
            ...(query.assigneeAccountId
              ? { assigneeAccountId: query.assigneeAccountId }
              : {}),
            AND: conditions,
          },
          orderBy: { number: "desc" },
          take: query.limit + 1,
          include: requestInclude,
        });
        return page(rows, query.limit, presentInternal);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async internalDetail(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    requestId: string,
  ) {
    this.assertFence(actor, expected);
    return this.db.$transaction(async (tx) => {
      const operations = actor.role === "OPERATIONS";
      await this.assertActor(tx, actor, [
        operations ? "OPERATIONS" : "ADMINISTRATOR",
      ]);
      const row = await tx.rechargeInvoiceRequest.findFirst({
        where: {
          id: requestId,
          ...(operations
            ? {
                OR: [
                  { assigneeAccountId: null },
                  { assigneeAccountId: actor.accountId },
                ],
              }
            : {}),
        },
        include: detailInclude,
      });
      if (!row) throw new NotFoundException("未找到这份开票申请");
      return presentInternal(row);
    });
  }

  async command(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    requestId: string,
    raw: unknown,
  ) {
    this.assertFence(actor, expected);
    const input = parse(invoiceCommandInput, raw, "开票处理指令不正确");
    const allowed =
      actor.role === "OPERATIONS"
        ? ["CLAIM", "REQUEST_CORRECTION", "COMPLETE"]
        : [
            "ASSIGN",
            "RETURN_TO_POOL",
            "TAKE_OVER",
            "REQUEST_CORRECTION",
            "COMPLETE",
          ];
    if (!allowed.includes(input.action))
      throw new ForbiddenException("当前角色不能执行这项开票操作");
    const digest = invoiceRequestDigest(input.action, input);
    return this.db.$transaction(async (tx) => {
      const identityIds = [
        actor.accountId,
        ...(input.action === "ASSIGN" ? [input.assigneeAccountId] : []),
      ];
      const identities = await this.identities.lockAccounts(tx, identityIds);
      const currentActor = identities.find(
        (item) => item.id === actor.accountId,
      );
      const expectedRole =
        actor.role === "OPERATIONS" ? "OPERATIONS" : "ADMINISTRATOR";
      if (
        !currentActor ||
        currentActor.role !== expectedRole ||
        currentActor.status !== "ACTIVE"
      )
        throw new ForbiddenException("当前账号不能处理开票任务");
      if (input.action === "ASSIGN") {
        const target = identities.find(
          (item) => item.id === input.assigneeAccountId,
        );
        if (
          !target ||
          target.role !== "OPERATIONS" ||
          target.status !== "ACTIVE"
        )
          throw new BadRequestException("只能分配给当前有效的运营账号");
      }
      await lockRequest(tx, requestId);
      const current = await tx.rechargeInvoiceRequest.findUnique({
        where: { id: requestId },
        include: requestInclude,
      });
      if (!current) throw new NotFoundException("未找到这份开票申请");
      const replay = await this.replay(
        tx,
        actor.accountId,
        input.requestId,
        digest,
      );
      if (replay) return presentInternal(replay);
      if (current.revision !== input.expectedRevision)
        throw new ConflictException("开票申请已变化，请刷新后重试");
      if (current.status === "ISSUED")
        throw new ConflictException("已开票申请不能再次处理");
      const before = state(current);
      let action: RechargeInvoiceAuditAction;
      let reason: string | null = null;
      let data: Prisma.RechargeInvoiceRequestUpdateInput;
      switch (input.action) {
        case "CLAIM":
          if (current.assigneeAccountId)
            throw new ConflictException("该任务已被领取");
          data = {
            assignee: { connect: { id: actor.accountId } },
            revision: { increment: 1 },
          };
          action = "REQUEST_CLAIMED";
          break;
        case "REQUEST_CORRECTION":
          this.assertAssignee(current, actor.accountId);
          if (current.status !== "PROCESSING")
            throw new ConflictException("客户尚未重新提交资料");
          data = {
            status: "NEEDS_CORRECTION",
            correctionReasonCode: input.reasonCode,
            correctionNote: input.note ?? null,
            revision: { increment: 1 },
          };
          reason = publicCorrectionReason(
            input.reasonCode,
            input.note ?? null,
          ).summary;
          action = "CORRECTION_REQUESTED";
          break;
        case "COMPLETE":
          this.assertAssignee(current, actor.accountId);
          if (current.status !== "PROCESSING")
            throw new ConflictException("客户尚未重新提交资料");
          data = {
            status: "ISSUED",
            invoiceNumber: input.invoiceNumber,
            issuedOn: new Date(`${input.issuedOn}T00:00:00.000Z`),
            sentAt: new Date(),
            completedBy: { connect: { id: actor.accountId } },
            revision: { increment: 1 },
          };
          action = "REQUEST_ISSUED";
          break;
        case "ASSIGN":
          data = {
            assignee: { connect: { id: input.assigneeAccountId } },
            revision: { increment: 1 },
          };
          action = current.assigneeAccountId
            ? "REQUEST_REASSIGNED"
            : "REQUEST_ASSIGNED";
          break;
        case "RETURN_TO_POOL":
          if (!current.assigneeAccountId)
            throw new ConflictException("该任务已经在待领取池中");
          data = {
            assignee: { disconnect: true },
            revision: { increment: 1 },
          };
          action = "REQUEST_RETURNED";
          break;
        case "TAKE_OVER":
          data = {
            assignee: { connect: { id: actor.accountId } },
            revision: { increment: 1 },
          };
          action = "REQUEST_TAKEN_OVER";
          break;
      }
      await tx.rechargeInvoiceRequest.update({
        where: { id: current.id },
        data,
      });
      const row = await this.readRow(tx, current.id);
      await this.audit(tx, {
        row,
        actorId: actor.accountId,
        idempotencyKey: input.requestId,
        digest,
        action,
        before,
        reason,
      });
      if (input.action === "REQUEST_CORRECTION") {
        await tx.productOutboxEvent.create({
          data: {
            businessKey: `recharge-invoice:${row.id}:correction:${row.revision}`,
            aggregateType: "RechargeInvoiceRequest",
            aggregateId: row.id,
            eventType: "recharge.invoice.needs_correction",
            payload: {
              recipientAccountId: row.accountId,
              invoiceRequestId: row.id,
              rechargeOrderId: row.rechargeOrderId,
              number: row.number,
              reason,
            },
            correlationId: input.requestId,
          },
        });
      }
      if (input.action === "COMPLETE") {
        await tx.productOutboxEvent.create({
          data: {
            businessKey: `recharge-invoice:${row.id}:issued`,
            aggregateType: "RechargeInvoiceRequest",
            aggregateId: row.id,
            eventType: "recharge.invoice.issued",
            payload: {
              recipientAccountId: row.accountId,
              invoiceRequestId: row.id,
              rechargeOrderId: row.rechargeOrderId,
              number: row.number,
            },
            correlationId: input.requestId,
          },
        });
      }
      return presentInternal(row);
    });
  }

  private assertFence(actor: AuthenticatedPrincipal, expected?: string) {
    if (!expected || expected.toLowerCase() !== actor.accountId)
      throw new ConflictException({
        code: "ACCOUNT_CHANGED",
        message: "登录账号已变化，请重新进入开票页面。",
      });
  }

  private async assertActor(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedPrincipal,
    roles: AuthenticatedPrincipal["role"][],
  ) {
    const [current] = await this.identities.lockAccounts(tx, [actor.accountId]);
    if (
      !current ||
      !roles.includes(current.role) ||
      current.role !== actor.role ||
      current.status !== "ACTIVE"
    )
      throw new ForbiddenException("当前账号不能访问开票功能");
  }

  private assertAssignee(row: InvoiceRow, actorId: string) {
    if (row.assigneeAccountId !== actorId)
      throw new ForbiddenException("请先领取或接管这份开票申请");
  }

  private async replay(
    tx: Prisma.TransactionClient,
    actorId: string,
    idempotencyKey: string,
    digest: string,
  ) {
    const prior = await tx.rechargeInvoiceAudit.findUnique({
      where: {
        actorAccountId_idempotencyKey: {
          actorAccountId: actorId,
          idempotencyKey,
        },
      },
      select: { requestId: true, requestDigest: true },
    });
    if (!prior) return null;
    if (prior.requestDigest !== digest)
      throw new ConflictException("同一请求标识已用于不同的开票操作");
    return this.readRow(tx, prior.requestId);
  }

  private readRow(tx: Prisma.TransactionClient, id: string) {
    return tx.rechargeInvoiceRequest.findUniqueOrThrow({
      where: { id },
      include: requestInclude,
    });
  }

  private audit(
    tx: Prisma.TransactionClient,
    input: {
      row: InvoiceRow;
      actorId: string;
      idempotencyKey: string;
      digest: string;
      action: RechargeInvoiceAuditAction;
      before: Prisma.InputJsonValue | null;
      reason: string | null;
    },
  ) {
    return tx.rechargeInvoiceAudit.create({
      data: {
        requestId: input.row.id,
        accountId: input.row.accountId,
        actorAccountId: input.actorId,
        idempotencyKey: input.idempotencyKey,
        requestDigest: input.digest,
        action: input.action,
        beforeState: input.before ?? Prisma.JsonNull,
        afterState: state(input.row),
        reason: input.reason,
      },
    });
  }
}

async function lockRequest(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM recharge_invoice_requests WHERE id=CAST(${id} AS UUID) FOR UPDATE`;
}

function submissionData(input: InvoiceSubmissionInput, revision: number) {
  return {
    revision,
    buyerType: input.buyerType,
    title: input.title,
    taxNumber: input.buyerType === "ENTERPRISE" ? input.taxNumber : null,
    email: input.email,
  };
}

function presentSubmission(input: {
  buyerType: "INDIVIDUAL" | "ENTERPRISE";
  title: string;
  taxNumber: string | null;
  email: string;
  revision: number;
  submittedAt: Date;
}) {
  return {
    buyerType: input.buyerType,
    title: input.title,
    taxNumber: input.taxNumber,
    email: input.email,
    revision: input.revision,
    submittedAt: input.submittedAt.toISOString(),
  };
}

function presentCustomer(row: InvoiceRow) {
  const submission = row.submissions[0];
  if (!submission) throw new Error("RECHARGE_INVOICE_SUBMISSION_MISSING");
  return {
    id: row.id,
    number: row.number,
    rechargeOrderId: row.rechargeOrderId,
    amountFen: row.amountFen.toString(),
    currency: row.currency as "CNY",
    status: row.status,
    revision: row.revision,
    submission: presentSubmission(submission),
    correction:
      row.status === "NEEDS_CORRECTION" && row.correctionReasonCode
        ? publicCorrectionReason(row.correctionReasonCode, row.correctionNote)
        : null,
    issued:
      row.status === "ISSUED" && row.invoiceNumber && row.issuedOn && row.sentAt
        ? {
            invoiceNumber: row.invoiceNumber,
            issuedOn: row.issuedOn.toISOString().slice(0, 10),
            confirmedSentAt: row.sentAt.toISOString(),
            maskedEmail: maskEmail(submission.email),
          }
        : null,
    submittedAt: row.submittedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function presentInternal(row: InvoiceRow | InvoiceDetailRow) {
  return {
    ...presentCustomer(row),
    accountId: row.accountId,
    customerMobile: row.customer.mobile,
    assignee: row.assignee
      ? {
          accountId: row.assignee.id,
          mobile: row.assignee.mobile,
          role: row.assignee.role as "OPERATIONS" | "ADMINISTRATOR",
        }
      : null,
    ...("audits" in row
      ? {
          audit: row.audits.map((audit) => ({
            ...audit,
            createdAt: audit.createdAt.toISOString(),
          })),
        }
      : {}),
  };
}

function state(row: InvoiceRow): Prisma.InputJsonObject {
  return {
    status: row.status,
    revision: row.revision,
    currentSubmissionRevision: row.currentSubmissionRevision,
    assigneeAccountId: row.assigneeAccountId,
    correctionReasonCode: row.correctionReasonCode,
    invoiceNumber: row.invoiceNumber,
    issuedOn: row.issuedOn?.toISOString().slice(0, 10) ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    completedByAccountId: row.completedByAccountId,
  };
}

function page<T extends { number: number }, R>(
  rows: T[],
  limit: number,
  present: (row: T) => R,
) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: items.map(present),
    nextCursor: hasMore ? items.at(-1)!.number : null,
  };
}

function parse<T>(
  schema: {
    safeParse(value: unknown): { success: true; data: T } | { success: false };
  },
  raw: unknown,
  message: string,
): T {
  const value = schema.safeParse(raw);
  if (!value.success) throw new BadRequestException(message);
  return value.data;
}

function ineligibleMessage(reason: string) {
  if (reason === "AMOUNT_REVIEW_REQUIRED")
    return "这笔充值的可开票金额需要人工核定，请联系客服";
  return "只有已成功到账的人民币充值可以申请发票";
}

function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!name || !domain) return "***";
  const shown = name.slice(0, Math.min(2, name.length));
  return `${shown}${"*".repeat(Math.max(2, name.length - shown.length))}@${domain}`;
}
