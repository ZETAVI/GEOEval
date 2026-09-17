import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AuthenticatedPrincipal } from "../../identity/domain/identity.types.js";
import { PostgresOperationsIdentityReader } from "../../identity/infrastructure/postgres-operations-identity-reader.js";
import {
  Prisma,
  type AgencyWithdrawalStatus,
} from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import type { SensitiveDataCipher } from "../../security/sensitive-data-cipher.js";
import { CommissionEarningsAccess } from "../../agency/infrastructure/commission-earnings-access.js";
import {
  maskedAccount,
  parseMoney,
  payoutProfileInput,
  payoutRevealInput,
  requestDigest,
  withdrawalCommandInput,
  withdrawalPolicyInput,
  withdrawalSubmitInput,
} from "../domain/agency-withdrawal.js";

export const WITHDRAWAL_ENABLED = Symbol("WITHDRAWAL_ENABLED");
export const SENSITIVE_DATA_CIPHER = Symbol("SENSITIVE_DATA_CIPHER");

const listQuery = z
  .object({
    agentId: z.uuid().optional(),
    status: z
      .enum([
        "PENDING_REVIEW",
        "PAYING",
        "COMPLETED",
        "REJECTED",
        "PAYMENT_FAILED",
        "WITHDRAWN",
      ])
      .optional(),
    cursor: z.coerce.number().int().positive().max(2147483647).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

@Injectable()
export class AgencyWithdrawalService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(PostgresOperationsIdentityReader)
    private readonly identities: PostgresOperationsIdentityReader,
    @Inject(CommissionEarningsAccess)
    private readonly earnings: CommissionEarningsAccess,
    @Inject(SENSITIVE_DATA_CIPHER)
    private readonly cipher: SensitiveDataCipher,
    @Inject(WITHDRAWAL_ENABLED) private readonly enabled: boolean,
  ) {}

  async profile(actor: AuthenticatedPrincipal, expected?: string) {
    this.assertFence(actor, expected);
    return this.db.$transaction(async (tx) => {
      await this.assertCurrent(tx, actor, "AGENT", false);
      const row = await tx.agencyPayoutProfile.findUnique({
        where: { agentAccountId: actor.accountId },
      });
      return row ? presentProfile(row) : null;
    });
  }

  async saveProfile(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    raw: unknown,
  ) {
    this.assertWritable();
    this.assertFence(actor, expected);
    const input = parse(payoutProfileInput, raw, "收款资料不完整");
    const digest = requestDigest("PROFILE_UPDATED", input);
    return this.db.$transaction(async (tx) => {
      await this.assertCurrent(tx, actor, "AGENT", true);
      const replay = await this.replay(
        tx,
        actor.accountId,
        input.requestId,
        digest,
      );
      if (replay) return replay;
      const before = await tx.agencyPayoutProfile.findUnique({
        where: { agentAccountId: actor.accountId },
      });
      if ((before?.revision ?? 0) !== input.expectedRevision)
        throw new ConflictException("收款资料已变化，请刷新后重试");
      const now = new Date();
      const data = {
        recipientType: input.recipientType,
        accountName: input.accountName,
        accountNumberCiphertext: this.cipher.seal(
          input.accountNumber,
          profileContext(actor.accountId),
        ),
        accountNumberLast4: input.accountNumber.slice(-4),
        bankName: input.bankName,
        openingBranch: input.openingBranch,
        contactMobile: input.contactMobile,
        consentVersion: input.consentVersion,
        consentedAt: now,
      };
      const row = before
        ? await tx.agencyPayoutProfile.update({
            where: { agentAccountId: actor.accountId },
            data: { ...data, revision: { increment: 1 } },
          })
        : await tx.agencyPayoutProfile.create({
            data: { agentAccountId: actor.accountId, ...data },
          });
      const result = presentProfile(row);
      await this.audit(tx, {
        agentId: actor.accountId,
        actorId: actor.accountId,
        requestId: input.requestId,
        digest,
        target: "PROFILE",
        action: "PROFILE_UPDATED",
        before: before ? presentProfile(before) : null,
        after: result,
      });
      return result;
    });
  }

  async policy(actor: AuthenticatedPrincipal, expected?: string) {
    this.assertFence(actor, expected);
    return this.db.$transaction(async (tx) => {
      await this.assertCurrent(tx, actor, "ADMINISTRATOR", false);
      return presentPolicy(
        await tx.agencyWithdrawalPolicy.findUnique({ where: { id: "global" } }),
      );
    });
  }

  async savePolicy(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    raw: unknown,
  ) {
    this.assertWritable();
    this.assertFence(actor, expected);
    const input = parse(withdrawalPolicyInput, raw, "最低提现规则不正确");
    const digest = requestDigest("POLICY_UPDATED", input);
    return this.db.$transaction(async (tx) => {
      await this.assertCurrent(tx, actor, "ADMINISTRATOR", true);
      await tx.$queryRaw`
        SELECT 1 AS locked
        FROM pg_advisory_xact_lock(hashtext('agency-withdrawal-policy'))
      `;
      const replay = await this.replay(
        tx,
        actor.accountId,
        input.requestId,
        digest,
      );
      if (replay) return replay;
      const before = await tx.agencyWithdrawalPolicy.findUnique({
        where: { id: "global" },
      });
      if ((before?.revision ?? 0) !== input.expectedRevision)
        throw new ConflictException("最低提现规则已变化，请刷新后重试");
      const minimumFen = parseMoney(input.minimumFen);
      const row = before
        ? await tx.agencyWithdrawalPolicy.update({
            where: { id: "global" },
            data: {
              minimumFen,
              updatedByAccountId: actor.accountId,
              revision: { increment: 1 },
            },
          })
        : await tx.agencyWithdrawalPolicy.create({
            data: {
              id: "global",
              minimumFen,
              updatedByAccountId: actor.accountId,
            },
          });
      const result = presentPolicy(row)!;
      await this.audit(tx, {
        actorId: actor.accountId,
        requestId: input.requestId,
        digest,
        target: "POLICY",
        action: "POLICY_UPDATED",
        before: presentPolicy(before),
        after: result,
        reason: input.reason,
      });
      return result;
    });
  }

  async summary(actor: AuthenticatedPrincipal, expected?: string) {
    this.assertFence(actor, expected);
    return this.db.$transaction(
      async (tx) => {
        await this.assertCurrent(tx, actor, "AGENT", false);
        const bookedFen = await this.earnings.bookedFen(tx, actor.accountId);
        const obligations = await this.obligations(tx, actor.accountId);
        const policy = await tx.agencyWithdrawalPolicy.findUnique({
          where: { id: "global" },
        });
        const profile = await tx.agencyPayoutProfile.findUnique({
          where: { agentAccountId: actor.accountId },
          select: { agentAccountId: true },
        });
        return summary(
          bookedFen,
          obligations,
          policy?.minimumFen ?? null,
          Boolean(profile),
          this.enabled,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async submit(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    raw: unknown,
  ) {
    this.assertWritable();
    this.assertFence(actor, expected);
    const input = parse(withdrawalSubmitInput, raw, "提现金额不正确");
    const digest = requestDigest("REQUEST_SUBMITTED", input);
    return this.db.$transaction(async (tx) => {
      await this.assertCurrent(tx, actor, "AGENT", true);
      const replay = await this.replay(
        tx,
        actor.accountId,
        input.requestId,
        digest,
      );
      if (replay) return replay;
      const policy = await tx.agencyWithdrawalPolicy.findUnique({
        where: { id: "global" },
      });
      const profile = await tx.agencyPayoutProfile.findUnique({
        where: { agentAccountId: actor.accountId },
      });
      const bookedFen = await this.earnings.bookedFen(tx, actor.accountId);
      const obligations = await this.obligations(tx, actor.accountId);
      if (!policy) throw new ConflictException("管理员尚未设置最低提现金额");
      if (!profile) throw new ConflictException("请先完善收款资料");
      const amountFen = parseMoney(input.amountFen);
      const availableFen =
        bookedFen - obligations.processingFen - obligations.completedFen;
      if (availableFen < 0n)
        throw new ConflictException("提现占用超过正式佣金，请管理员核查");
      if (amountFen < policy.minimumFen)
        throw new BadRequestException("提现金额低于最低金额");
      if (amountFen > availableFen)
        throw new BadRequestException("提现金额超过可提现金额");
      const id = randomUUID();
      const accountNumber = this.cipher.open(
        profile.accountNumberCiphertext,
        profileContext(actor.accountId),
      );
      const row = await tx.agencyWithdrawalRequest.create({
        data: {
          id,
          agentAccountId: actor.accountId,
          amountFen,
          payoutRecipientType: profile.recipientType,
          payoutAccountName: profile.accountName,
          payoutAccountNumberCiphertext: this.cipher.seal(
            accountNumber,
            requestContext(id),
          ),
          payoutAccountNumberLast4: profile.accountNumberLast4,
          payoutBankName: profile.bankName,
          payoutOpeningBranch: profile.openingBranch,
          payoutContactMobile: profile.contactMobile,
          payoutConsentVersion: profile.consentVersion,
        },
      });
      const result = presentWithdrawal(row);
      await this.audit(tx, {
        agentId: actor.accountId,
        actorId: actor.accountId,
        requestId: input.requestId,
        digest,
        target: "REQUEST",
        action: "REQUEST_SUBMITTED",
        withdrawalId: id,
        before: null,
        after: result,
      });
      return result;
    });
  }

  async command(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    withdrawalId: string,
    raw: unknown,
  ) {
    this.assertWritable();
    this.assertFence(actor, expected);
    const input = parse(withdrawalCommandInput, raw, "提现处理指令不正确");
    const adminAction = input.action !== "WITHDRAW";
    if (adminAction && actor.role !== "ADMINISTRATOR")
      throw new ForbiddenException("只有管理员可以处理提现");
    if (!adminAction && actor.role !== "AGENT")
      throw new ForbiddenException("只有代理商可以撤回申请");
    const digest = requestDigest(input.action, input);
    return this.db.$transaction(async (tx) => {
      const preliminary = await tx.agencyWithdrawalRequest.findUnique({
        where: { id: withdrawalId },
        select: { agentAccountId: true },
      });
      if (!preliminary) throw new NotFoundException("未找到提现申请");
      await this.assertCurrent(
        tx,
        actor,
        adminAction ? "ADMINISTRATOR" : "AGENT",
        true,
        preliminary.agentAccountId,
      );
      const replay = await this.replay(
        tx,
        actor.accountId,
        input.requestId,
        digest,
      );
      if (replay) return replay;
      await tx.$queryRaw`SELECT id FROM agency_withdrawal_requests WHERE id=${withdrawalId}::uuid FOR UPDATE`;
      const before = await tx.agencyWithdrawalRequest.findUniqueOrThrow({
        where: { id: withdrawalId },
      });
      if (!adminAction && before.agentAccountId !== actor.accountId)
        throw new NotFoundException("未找到提现申请");
      if (before.revision !== input.expectedRevision)
        throw new ConflictException("提现申请已变化，请刷新后重试");
      assertTransition(before.status, input.action);
      const now = new Date();
      const data = transitionData(input, actor.accountId, now);
      const row = await tx.agencyWithdrawalRequest.update({
        where: { id: withdrawalId },
        data,
      });
      const result = presentWithdrawal(row, adminAction);
      await this.audit(tx, {
        agentId: row.agentAccountId,
        actorId: actor.accountId,
        requestId: input.requestId,
        digest,
        target: "REQUEST",
        action: actionName(input.action),
        withdrawalId,
        before: presentWithdrawal(before, true),
        after: result,
        ...("reason" in input
          ? { reason: input.reason }
          : "note" in input && input.note
            ? { reason: input.note }
            : {}),
      });
      if (["COMPLETED", "REJECTED", "PAYMENT_FAILED"].includes(row.status))
        await this.appendResultEvent(tx, row, input.requestId);
      return result;
    });
  }

  async reveal(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    withdrawalId: string,
    raw: unknown,
  ) {
    this.assertWritable();
    this.assertFence(actor, expected);
    const input = parse(payoutRevealInput, raw, "查看原因不正确");
    const digest = requestDigest("PAYOUT_REVEALED", input);
    return this.db.$transaction(async (tx) => {
      const row = await tx.agencyWithdrawalRequest.findUnique({
        where: { id: withdrawalId },
      });
      if (!row) throw new NotFoundException("未找到提现申请");
      await this.assertCurrent(
        tx,
        actor,
        "ADMINISTRATOR",
        true,
        row.agentAccountId,
      );
      const prior = await tx.agencyWithdrawalAudit.findUnique({
        where: {
          actorAccountId_requestId: {
            actorAccountId: actor.accountId,
            requestId: input.requestId,
          },
        },
      });
      if (prior && prior.requestDigest !== digest)
        throw new ConflictException("请求编号已用于其他操作");
      if (!prior)
        await this.audit(tx, {
          agentId: row.agentAccountId,
          actorId: actor.accountId,
          requestId: input.requestId,
          digest,
          target: "PAYOUT_REVEAL",
          action: "PAYOUT_REVEALED",
          withdrawalId,
          before: null,
          after: { withdrawalId, revealed: true },
          reason: input.reason,
        });
      return {
        withdrawalId,
        accountName: row.payoutAccountName,
        accountNumber: this.cipher.open(
          row.payoutAccountNumberCiphertext,
          requestContext(row.id),
        ),
        bankName: row.payoutBankName,
        openingBranch: row.payoutOpeningBranch,
      };
    });
  }

  async list(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    raw: unknown,
  ) {
    this.assertFence(actor, expected);
    const query = parse(listQuery, raw, "提现查询条件不正确");
    return this.db.$transaction(async (tx) => {
      await this.assertCurrent(
        tx,
        actor,
        actor.role === "ADMINISTRATOR" ? "ADMINISTRATOR" : "AGENT",
        false,
      );
      const agentId = actor.role === "AGENT" ? actor.accountId : query.agentId;
      const rows = await tx.agencyWithdrawalRequest.findMany({
        where: {
          ...(agentId ? { agentAccountId: agentId } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(query.cursor ? { number: { lt: query.cursor } } : {}),
        },
        orderBy: { number: "desc" },
        take: query.limit + 1,
      });
      const includeInternalPaymentFacts = actor.role === "ADMINISTRATOR";
      const items = rows
        .slice(0, query.limit)
        .map((row) => presentWithdrawal(row, includeInternalPaymentFacts));
      return {
        items,
        nextCursor:
          rows.length > query.limit ? (items.at(-1)?.number ?? null) : null,
      };
    });
  }

  async detail(
    actor: AuthenticatedPrincipal,
    expected: string | undefined,
    id: string,
  ) {
    this.assertFence(actor, expected);
    return this.db.$transaction(async (tx) => {
      await this.assertCurrent(
        tx,
        actor,
        actor.role === "ADMINISTRATOR" ? "ADMINISTRATOR" : "AGENT",
        false,
      );
      const row = await tx.agencyWithdrawalRequest.findUnique({
        where: { id },
      });
      if (
        !row ||
        (actor.role === "AGENT" && row.agentAccountId !== actor.accountId)
      )
        throw new NotFoundException("未找到提现申请");
      return presentWithdrawal(row, actor.role === "ADMINISTRATOR");
    });
  }

  private async obligations(tx: Prisma.TransactionClient, agentId: string) {
    const rows = await tx.agencyWithdrawalRequest.groupBy({
      by: ["status"],
      where: { agentAccountId: agentId },
      _sum: { amountFen: true },
      _count: true,
    });
    let processingFen = 0n,
      completedFen = 0n;
    for (const row of rows) {
      if (row.status === "PENDING_REVIEW" || row.status === "PAYING")
        processingFen += row._sum.amountFen ?? 0n;
      if (row.status === "COMPLETED") completedFen += row._sum.amountFen ?? 0n;
    }
    return { processingFen, completedFen };
  }

  private async assertCurrent(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedPrincipal,
    role: "AGENT" | "ADMINISTRATOR",
    exclusive: boolean,
    targetAgentId?: string,
  ) {
    const ids = targetAgentId
      ? [actor.accountId, targetAgentId]
      : [actor.accountId];
    const rows = exclusive
      ? await this.identities.lockAccountsExclusive(tx, ids)
      : await this.identities.lockAccounts(tx, ids);
    const current = rows.find((row) => row.id === actor.accountId);
    if (
      !current ||
      current.status !== "ACTIVE" ||
      current.role !== role ||
      actor.role !== role
    )
      throw new ForbiddenException("当前账号不能执行提现操作");
    return rows;
  }

  private assertWritable() {
    if (!this.enabled)
      throw new ServiceUnavailableException("提现功能尚未开放");
  }

  private assertFence(actor: AuthenticatedPrincipal, expected?: string) {
    if (!expected || expected.toLowerCase() !== actor.accountId)
      throw new ConflictException("登录账号已变化，请重新读取");
  }

  private async replay(
    tx: Prisma.TransactionClient,
    actorId: string,
    requestId: string,
    digest: string,
  ) {
    const prior = await tx.agencyWithdrawalAudit.findUnique({
      where: {
        actorAccountId_requestId: { actorAccountId: actorId, requestId },
      },
    });
    if (!prior) return null;
    if (prior.requestDigest !== digest)
      throw new ConflictException("请求编号已用于其他操作");
    return prior.afterState;
  }

  private audit(
    tx: Prisma.TransactionClient,
    input: {
      agentId?: string;
      actorId: string;
      requestId: string;
      digest: string;
      target: "POLICY" | "PROFILE" | "REQUEST" | "PAYOUT_REVEAL";
      action:
        | "POLICY_UPDATED"
        | "PROFILE_UPDATED"
        | "REQUEST_SUBMITTED"
        | "REQUEST_WITHDRAWN"
        | "REQUEST_APPROVED"
        | "REQUEST_REJECTED"
        | "REQUEST_COMPLETED"
        | "REQUEST_PAYMENT_FAILED"
        | "PAYOUT_REVEALED";
      withdrawalId?: string;
      before: unknown;
      after: unknown;
      reason?: string;
    },
  ) {
    return tx.agencyWithdrawalAudit.create({
      data: {
        ...(input.agentId ? { agentAccountId: input.agentId } : {}),
        actorAccountId: input.actorId,
        requestId: input.requestId,
        requestDigest: input.digest,
        target: input.target,
        action: input.action,
        ...(input.withdrawalId ? { withdrawalId: input.withdrawalId } : {}),
        beforeState:
          input.before === null
            ? Prisma.JsonNull
            : (input.before as Prisma.InputJsonValue),
        afterState: input.after as Prisma.InputJsonValue,
        ...(input.reason ? { reason: input.reason } : {}),
      },
    });
  }

  private appendResultEvent(
    tx: Prisma.TransactionClient,
    row: Parameters<typeof presentWithdrawal>[0],
    correlationId: string,
  ) {
    const suffix =
      row.status === "COMPLETED"
        ? "completed"
        : row.status === "REJECTED"
          ? "rejected"
          : "payment_failed";
    return tx.productOutboxEvent.create({
      data: {
        businessKey: `agency-withdrawal:${row.id}:${suffix}`,
        aggregateType: "AGENCY_WITHDRAWAL",
        aggregateId: row.id,
        eventType: `agency.withdrawal.${suffix}`,
        payload: {
          recipientAccountId: row.agentAccountId,
          withdrawalId: row.id,
          number: row.number,
          amountFen: row.amountFen.toString(),
          ...(row.resultReason ? { reason: row.resultReason } : {}),
        },
        correlationId,
      },
    });
  }
}

function parse<T>(schema: z.ZodType<T>, raw: unknown, message: string): T {
  const value = schema.safeParse(raw);
  if (!value.success) throw new BadRequestException(message);
  return value.data;
}

function profileContext(agentId: string) {
  return `agency-payout-profile:${agentId}`;
}
function requestContext(id: string) {
  return `agency-withdrawal-request:${id}`;
}

function presentProfile(row: {
  recipientType: "INDIVIDUAL" | "ENTERPRISE";
  accountName: string;
  accountNumberLast4: string;
  bankName: string;
  openingBranch: string;
  contactMobile: string;
  consentVersion: string;
  consentedAt: Date;
  revision: number;
  updatedAt: Date;
}) {
  return {
    recipientType: row.recipientType,
    accountName: row.accountName,
    maskedAccountNumber: maskedAccount(row.accountNumberLast4),
    bankName: row.bankName,
    openingBranch: row.openingBranch,
    contactMobile: row.contactMobile,
    consentVersion: row.consentVersion,
    consentedAt: row.consentedAt.toISOString(),
    revision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function presentPolicy(
  row: { minimumFen: bigint; revision: number; updatedAt: Date } | null,
) {
  return row
    ? {
        minimumFen: row.minimumFen.toString(),
        revision: row.revision,
        updatedAt: row.updatedAt.toISOString(),
      }
    : null;
}

function presentWithdrawal(
  row: {
    id: string;
    number: number;
    agentAccountId: string;
    amountFen: bigint;
    status: AgencyWithdrawalStatus;
    revision: number;
    payoutRecipientType: "INDIVIDUAL" | "ENTERPRISE";
    payoutAccountName: string;
    payoutAccountNumberLast4: string;
    payoutBankName: string;
    payoutOpeningBranch: string;
    payoutContactMobile: string;
    submittedAt: Date;
    approvedAt: Date | null;
    resolvedAt: Date | null;
    resultReason: string | null;
    bankTransactionReference: string | null;
    externalPaidAt: Date | null;
    updatedAt: Date;
  },
  includeInternalPaymentFacts = false,
) {
  return {
    id: row.id,
    number: row.number,
    agentId: row.agentAccountId,
    amountFen: row.amountFen.toString(),
    status: row.status,
    revision: row.revision,
    payout: {
      recipientType: row.payoutRecipientType,
      accountName: row.payoutAccountName,
      maskedAccountNumber: maskedAccount(row.payoutAccountNumberLast4),
      bankName: row.payoutBankName,
      openingBranch: row.payoutOpeningBranch,
      contactMobile: row.payoutContactMobile,
    },
    submittedAt: row.submittedAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resultReason: row.resultReason,
    bankTransactionReference: row.bankTransactionReference,
    externalPaidAt: includeInternalPaymentFacts
      ? (row.externalPaidAt?.toISOString() ?? null)
      : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function summary(
  bookedFen: bigint,
  obligations: { processingFen: bigint; completedFen: bigint },
  minimumFen: bigint | null,
  profileConfigured: boolean,
  enabled: boolean,
) {
  return {
    bookedFen: bookedFen.toString(),
    availableFen: (
      bookedFen -
      obligations.processingFen -
      obligations.completedFen
    ).toString(),
    processingFen: obligations.processingFen.toString(),
    withdrawnFen: obligations.completedFen.toString(),
    minimumFen: minimumFen?.toString() ?? null,
    profileConfigured,
    enabled,
  };
}

function transitionData(
  input: z.infer<typeof withdrawalCommandInput>,
  actorId: string,
  now: Date,
): Prisma.AgencyWithdrawalRequestUpdateInput {
  const base = { revision: { increment: 1 }, updatedAt: now };
  if (input.action === "WITHDRAW")
    return {
      ...base,
      status: "WITHDRAWN",
      resolvedBy: { connect: { id: actorId } },
      resolvedAt: now,
    };
  if (input.action === "APPROVE")
    return {
      ...base,
      status: "PAYING",
      approvedBy: { connect: { id: actorId } },
      approvedAt: now,
    };
  if (input.action === "REJECT")
    return {
      ...base,
      status: "REJECTED",
      resolvedBy: { connect: { id: actorId } },
      resolvedAt: now,
      resultReason: input.reason,
    };
  if (input.action === "PAYMENT_FAILED")
    return {
      ...base,
      status: "PAYMENT_FAILED",
      resolvedBy: { connect: { id: actorId } },
      resolvedAt: now,
      resultReason: input.reason,
    };
  return {
    ...base,
    status: "COMPLETED",
    resolvedBy: { connect: { id: actorId } },
    resolvedAt: now,
    bankTransactionReference: input.bankTransactionReference,
    ...(input.externalPaidAt
      ? { externalPaidAt: new Date(input.externalPaidAt) }
      : {}),
  };
}

function actionName(action: z.infer<typeof withdrawalCommandInput>["action"]) {
  return (
    {
      WITHDRAW: "REQUEST_WITHDRAWN",
      APPROVE: "REQUEST_APPROVED",
      REJECT: "REQUEST_REJECTED",
      COMPLETE: "REQUEST_COMPLETED",
      PAYMENT_FAILED: "REQUEST_PAYMENT_FAILED",
    } as const
  )[action];
}

function assertTransition(
  status: AgencyWithdrawalStatus,
  action: z.infer<typeof withdrawalCommandInput>["action"],
) {
  const accepted =
    (status === "PENDING_REVIEW" &&
      ["WITHDRAW", "APPROVE", "REJECT"].includes(action)) ||
    (status === "PAYING" && ["COMPLETE", "PAYMENT_FAILED"].includes(action));
  if (!accepted) throw new ConflictException("当前状态不能执行该提现操作");
}
