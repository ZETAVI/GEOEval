import { Inject, Injectable } from "@nestjs/common";

import {
  Prisma,
  type Account,
  type IdentityGovernanceAudit,
} from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import {
  ChallengeRateLimitError,
  IdentityBootstrapError,
  IdentityGovernanceError,
} from "../domain/identity.errors.js";
import type { IdentityRepository } from "../domain/identity.repository.js";
import type {
  AccountListPage,
  AccountRole,
  AccountStatus,
  AccountView,
  AuthenticatedSession,
  IdentityGovernanceAction,
  IdentityGovernanceAuditView,
  IdentityBootstrapResult,
  IdentityLifecycleCleanupResult,
  InternalAccountRole,
  MobileChallengeView,
  SessionRevocationReason,
} from "../domain/identity.types.js";

type GovernanceTransaction = Prisma.TransactionClient;

@Injectable()
export class PostgresIdentityRepository implements IdentityRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async bootstrapAdministrator(input: {
    mobile: string;
    keyId: string;
    secretDigest: string;
    now: Date;
  }): Promise<IdentityBootstrapResult> {
    return this.prisma.$transaction(async (transaction) => {
      const controls = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM identity_governance_controls
          WHERE id = 'GLOBAL'
          FOR UPDATE
        `;
      if (controls.length !== 1) {
        throw new IdentityBootstrapError(
          "BOOTSTRAP_CONTROL_UNAVAILABLE",
          "Bootstrap control state is unavailable",
        );
      }
      const control =
        await transaction.identityGovernanceControl.findUniqueOrThrow({
          where: { id: "GLOBAL" },
        });
      if (control.bootstrapCompletedAt) {
        const account = control.bootstrapAccountId
          ? await transaction.account.findUnique({
              where: { id: control.bootstrapAccountId },
            })
          : null;
        if (
          account &&
          account.mobile === input.mobile &&
          account.role === "ADMINISTRATOR" &&
          account.status === "ACTIVE" &&
          control.bootstrapKeyId === input.keyId &&
          control.bootstrapSecretDigest === input.secretDigest
        ) {
          return {
            status: "UNCHANGED",
            account: presentAccount(account),
            completedAt: control.bootstrapCompletedAt,
            keyId: input.keyId,
          };
        }
        throw new IdentityBootstrapError(
          "BOOTSTRAP_ALREADY_COMPLETED_CONFLICT",
          "Bootstrap has already completed with different state",
        );
      }

      if (
        (await transaction.account.count({
          where: { role: "ADMINISTRATOR", status: "ACTIVE" },
        })) > 0
      ) {
        throw new IdentityBootstrapError(
          "BOOTSTRAP_ACTIVE_ADMINISTRATOR_EXISTS",
          "An active administrator already exists",
        );
      }
      if (
        await transaction.account.findUnique({
          where: { mobile: input.mobile },
        })
      ) {
        throw new IdentityBootstrapError(
          "BOOTSTRAP_MOBILE_ALREADY_EXISTS",
          "Bootstrap mobile already belongs to an account",
        );
      }

      const account = await transaction.account.create({
        data: {
          mobile: input.mobile,
          role: "ADMINISTRATOR",
          status: "ACTIVE",
        },
      });
      await transaction.identityGovernanceControl.update({
        where: { id: "GLOBAL" },
        data: {
          bootstrapAccountId: account.id,
          bootstrapSecretDigest: input.secretDigest,
          bootstrapKeyId: input.keyId,
          bootstrapCompletedAt: input.now,
          revision: { increment: 1 },
        },
      });
      await transaction.identityGovernanceAudit.create({
        data: {
          actorKind: "BOOTSTRAP",
          actorKeyId: input.keyId,
          targetAccountId: account.id,
          action: "BOOTSTRAP_ADMINISTRATOR",
          reason: "首次管理员 Bootstrap",
          beforeState: Prisma.JsonNull,
          afterState: auditState(account),
          createdAt: input.now,
        },
      });
      return {
        status: "CREATED",
        account: presentAccount(account),
        completedAt: input.now,
        keyId: input.keyId,
      };
    });
  }

  async issueChallenge(input: {
    id: string;
    mobile: string;
    codeDigest: string;
    expiresAt: Date;
    now: Date;
    resendIntervalMs: number;
    windowMs: number;
    maximumRequestsPerWindow: number;
  }): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
          INSERT INTO mobile_challenge_rate_limits (
            mobile,
            window_started_at,
            request_count,
            last_issued_at,
            updated_at
          ) VALUES (
            ${input.mobile},
            ${input.now},
            0,
            ${new Date(0)},
            ${input.now}
          )
          ON CONFLICT (mobile) DO NOTHING
        `;
      const [rate] = await transaction.$queryRaw<
        Array<{
          window_started_at: Date;
          request_count: number;
          last_issued_at: Date;
        }>
      >`
          SELECT window_started_at, request_count, last_issued_at
          FROM mobile_challenge_rate_limits
          WHERE mobile = ${input.mobile}
          FOR UPDATE
        `;
      if (!rate) throw new Error("Challenge rate state is unavailable");

      const windowExpired =
        input.now.getTime() - rate.window_started_at.getTime() >=
        input.windowMs;
      const windowStartedAt = windowExpired
        ? input.now
        : rate.window_started_at;
      const requestCount = windowExpired ? 0 : rate.request_count;
      if (requestCount >= input.maximumRequestsPerWindow) {
        throw new ChallengeRateLimitError(
          retryAfterSeconds(
            windowStartedAt.getTime() + input.windowMs - input.now.getTime(),
          ),
        );
      }
      const sinceLastIssueMs =
        input.now.getTime() - rate.last_issued_at.getTime();
      if (sinceLastIssueMs < input.resendIntervalMs) {
        throw new ChallengeRateLimitError(
          retryAfterSeconds(input.resendIntervalMs - sinceLastIssueMs),
        );
      }

      await transaction.mobileChallenge.updateMany({
        where: {
          mobile: input.mobile,
          consumedAt: null,
          supersededAt: null,
          expiresAt: { gt: input.now },
        },
        data: { supersededAt: input.now },
      });
      await transaction.mobileChallenge.create({
        data: {
          id: input.id,
          mobile: input.mobile,
          codeDigest: input.codeDigest,
          expiresAt: input.expiresAt,
          createdAt: input.now,
        },
      });
      await transaction.mobileChallengeRateLimit.update({
        where: { mobile: input.mobile },
        data: {
          windowStartedAt,
          requestCount: requestCount + 1,
          lastIssuedAt: input.now,
        },
      });
    });
  }

  async findChallenge(id: string): Promise<MobileChallengeView | undefined> {
    return (
      (await this.prisma.mobileChallenge.findUnique({ where: { id } })) ??
      undefined
    );
  }

  async incrementFailedAttempts(input: {
    id: string;
    maximumFailedAttempts: number;
  }): Promise<void> {
    await this.prisma.mobileChallenge.updateMany({
      where: {
        id: input.id,
        consumedAt: null,
        supersededAt: null,
        failedAttempts: { lt: input.maximumFailedAttempts },
      },
      data: { failedAttempts: { increment: 1 } },
    });
  }

  async cleanupIdentityLifecycle(input: {
    now: Date;
    sessionRetentionMs: number;
    challengeRetentionMs: number;
    batchSize: number;
  }): Promise<IdentityLifecycleCleanupResult> {
    const sessionCutoff = new Date(
      input.now.getTime() - input.sessionRetentionMs,
    );
    const challengeCutoff = new Date(
      input.now.getTime() - input.challengeRetentionMs,
    );
    return this.prisma.$transaction(async (transaction) => {
      const sessionWhere = inactiveSessionWhere(sessionCutoff);
      const sessionIds = await transaction.accountSession.findMany({
        where: sessionWhere,
        select: { id: true },
        orderBy: { id: "asc" },
        take: input.batchSize,
      });
      const challengeWhere = inactiveChallengeWhere(challengeCutoff);
      const challengeIds = await transaction.mobileChallenge.findMany({
        where: challengeWhere,
        select: { id: true },
        orderBy: { id: "asc" },
        take: input.batchSize,
      });
      const rateLimits = await transaction.mobileChallengeRateLimit.findMany({
        where: { lastIssuedAt: { lte: challengeCutoff } },
        select: { mobile: true },
        orderBy: { mobile: "asc" },
        take: input.batchSize,
      });

      const sessions = sessionIds.length
        ? await transaction.accountSession.deleteMany({
            where: {
              id: { in: sessionIds.map(({ id }) => id) },
              ...sessionWhere,
            },
          })
        : { count: 0 };
      const challenges = challengeIds.length
        ? await transaction.mobileChallenge.deleteMany({
            where: {
              id: { in: challengeIds.map(({ id }) => id) },
              ...challengeWhere,
            },
          })
        : { count: 0 };
      const deletedRateLimits = rateLimits.length
        ? await transaction.mobileChallengeRateLimit.deleteMany({
            where: {
              mobile: { in: rateLimits.map(({ mobile }) => mobile) },
              lastIssuedAt: { lte: challengeCutoff },
            },
          })
        : { count: 0 };

      return {
        deletedSessions: sessions.count,
        deletedChallenges: challenges.count,
        deletedChallengeRateLimits: deletedRateLimits.count,
      };
    });
  }

  async completeChallenge(input: {
    challengeId: string;
    mobile: string;
    sessionDigest: string;
    customerAbsoluteMs: number;
    customerIdleMs: number;
    internalAbsoluteMs: number;
    internalIdleMs: number;
    maximumFailedAttempts: number;
    now: Date;
  }): Promise<
    { account: AccountView; expiresAt: Date; idleExpiresAt: Date } | undefined
  > {
    return this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.mobileChallenge.updateMany({
        where: {
          id: input.challengeId,
          mobile: input.mobile,
          consumedAt: null,
          supersededAt: null,
          expiresAt: { gt: input.now },
          failedAttempts: { lt: input.maximumFailedAttempts },
        },
        data: { consumedAt: input.now },
      });
      if (consumed.count !== 1) return undefined;

      const account = await transaction.account.upsert({
        where: { mobile: input.mobile },
        create: { mobile: input.mobile, lastAuthenticatedAt: input.now },
        update: {},
      });
      if (account.status !== "ACTIVE") return undefined;

      const isCustomer = account.role === "TERMINAL_CUSTOMER";
      const expiresAt = new Date(
        input.now.getTime() +
          (isCustomer ? input.customerAbsoluteMs : input.internalAbsoluteMs),
      );
      const idleExpiresAt = new Date(
        Math.min(
          expiresAt.getTime(),
          input.now.getTime() +
            (isCustomer ? input.customerIdleMs : input.internalIdleMs),
        ),
      );

      const authenticatedAccount = await transaction.account.update({
        where: { id: account.id },
        data: { lastAuthenticatedAt: input.now },
      });
      await transaction.accountSession.create({
        data: {
          accountId: account.id,
          tokenDigest: input.sessionDigest,
          expiresAt,
          idleExpiresAt,
          lastSeenAt: input.now,
        },
      });
      return {
        account: presentAccount(authenticatedAccount),
        expiresAt,
        idleExpiresAt,
      };
    });
  }

  async findSession(
    tokenDigest: string,
    now: Date,
  ): Promise<AuthenticatedSession | undefined> {
    const session = await this.prisma.accountSession.findFirst({
      where: {
        tokenDigest,
        revokedAt: null,
        expiresAt: { gt: now },
        idleExpiresAt: { gt: now },
        account: { status: "ACTIVE" },
      },
      include: { account: true },
    });
    if (!session) return undefined;
    return {
      id: session.id,
      expiresAt: session.expiresAt,
      idleExpiresAt: session.idleExpiresAt,
      lastSeenAt: session.lastSeenAt,
      account: presentAccount(session.account),
    };
  }

  async touchSession(input: {
    sessionId: string;
    lastSeenAt: Date;
    idleExpiresAt: Date;
  }): Promise<void> {
    await this.prisma.accountSession.updateMany({
      where: {
        id: input.sessionId,
        revokedAt: null,
        expiresAt: { gt: input.lastSeenAt },
        idleExpiresAt: { gt: input.lastSeenAt },
      },
      data: {
        lastSeenAt: input.lastSeenAt,
        idleExpiresAt: input.idleExpiresAt,
      },
    });
  }

  async revokeSession(input: {
    tokenDigest: string;
    now: Date;
    reason: SessionRevocationReason;
  }): Promise<void> {
    await this.prisma.accountSession.updateMany({
      where: { tokenDigest: input.tokenDigest, revokedAt: null },
      data: { revokedAt: input.now, revokedReason: input.reason },
    });
  }

  async revokeAccountSessions(input: {
    accountId: string;
    now: Date;
    reason: SessionRevocationReason;
  }): Promise<number> {
    const result = await this.prisma.accountSession.updateMany({
      where: { accountId: input.accountId, revokedAt: null },
      data: { revokedAt: input.now, revokedReason: input.reason },
    });
    return result.count;
  }

  async listAccounts(input: {
    search?: string;
    role?: AccountRole;
    status?: AccountStatus;
    cursor?: string;
    limit: number;
    now: Date;
  }): Promise<AccountListPage> {
    const accounts = await this.prisma.account.findMany({
      where: {
        ...(input.search
          ? { mobile: { contains: input.search, mode: "insensitive" as const } }
          : {}),
        ...(input.role ? { role: input.role } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      include: {
        _count: {
          select: {
            sessions: {
              where: {
                revokedAt: null,
                expiresAt: { gt: input.now },
                idleExpiresAt: { gt: input.now },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      take: input.limit + 1,
    });
    const hasMore = accounts.length > input.limit;
    const page = hasMore ? accounts.slice(0, input.limit) : accounts;
    return {
      items: page.map((account) => ({
        ...presentAccount(account),
        activeSessionCount: account._count.sessions,
      })),
      nextCursor: hasMore ? page.at(-1)!.id : null,
    };
  }

  async listGovernanceAudits(input: {
    targetAccountId?: string;
    cursor?: string;
    limit: number;
  }): Promise<{
    items: IdentityGovernanceAuditView[];
    nextCursor: string | null;
  }> {
    const audits = await this.prisma.identityGovernanceAudit.findMany({
      ...(input.targetAccountId
        ? { where: { targetAccountId: input.targetAccountId } }
        : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      take: input.limit + 1,
    });
    const hasMore = audits.length > input.limit;
    const page = hasMore ? audits.slice(0, input.limit) : audits;
    return {
      items: page.map(presentAudit),
      nextCursor: hasMore ? page.at(-1)!.id : null,
    };
  }

  async createInternalAccount(input: {
    actorAccountId: string;
    mobile: string;
    role: InternalAccountRole;
    reason: string;
    now: Date;
  }): Promise<AccountView> {
    return this.prisma.$transaction(
      async (transaction) => {
        await lockGovernance(transaction);
        await requireActiveAdministrator(transaction, input.actorAccountId);
        if (
          await transaction.account.findUnique({
            where: { mobile: input.mobile },
          })
        ) {
          throw new IdentityGovernanceError(
            "ACCOUNT_ALREADY_EXISTS",
            "该手机号已存在账号",
          );
        }
        const account = await transaction.account.create({
          data: { mobile: input.mobile, role: input.role },
        });
        await appendAudit(transaction, {
          actorAccountId: input.actorAccountId,
          targetAccountId: account.id,
          action: "CREATE_INTERNAL_ACCOUNT",
          reason: input.reason,
          beforeState: null,
          afterState: auditState(account),
          now: input.now,
        });
        return presentAccount(account);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async changeGovernedAccount(input: {
    actorAccountId: string;
    targetAccountId: string;
    expectedRevision: number;
    reason: string;
    now: Date;
    mutation:
      | { kind: "STATUS"; status: AccountStatus }
      | { kind: "ROLE"; role: InternalAccountRole }
      | { kind: "REVOKE_SESSIONS" };
  }): Promise<AccountView> {
    return this.prisma.$transaction(
      async (transaction) => {
        await lockGovernance(transaction);
        await requireActiveAdministrator(transaction, input.actorAccountId);
        const target = await transaction.account.findUnique({
          where: { id: input.targetAccountId },
        });
        if (!target) {
          throw new IdentityGovernanceError(
            "ACCOUNT_NOT_FOUND",
            "目标账号不存在",
          );
        }
        if (target.id === input.actorAccountId) {
          throw new IdentityGovernanceError(
            "SELF_GOVERNANCE_FORBIDDEN",
            "管理员不能对自身执行管理性操作",
          );
        }
        if (target.revision !== input.expectedRevision) {
          throw new IdentityGovernanceError(
            "STALE_REVISION",
            "账号已发生变化，请刷新后重试",
          );
        }

        const beforeState = auditState(target);
        let after = target;
        let action: IdentityGovernanceAction;

        if (input.mutation.kind === "REVOKE_SESSIONS") {
          action = "REVOKE_ACCOUNT_SESSIONS";
          await revokeSessions(
            transaction,
            target.id,
            input.now,
            "ADMIN_REVOKE_ALL",
          );
        } else if (input.mutation.kind === "ROLE") {
          if (target.role === "TERMINAL_CUSTOMER") {
            throw new IdentityGovernanceError(
              "ROLE_FAMILY_CONVERSION_FORBIDDEN",
              "客户账号与内部账号之间不能转换角色",
            );
          }
          if (target.role === input.mutation.role) {
            throw new IdentityGovernanceError(
              "NO_CHANGE",
              "目标账号已经是该角色",
            );
          }
          if (
            target.role === "ADMINISTRATOR" &&
            target.status === "ACTIVE" &&
            input.mutation.role !== "ADMINISTRATOR"
          ) {
            await requireAnotherActiveAdministrator(transaction, target.id);
          }
          after = await transaction.account.update({
            where: { id: target.id },
            data: { role: input.mutation.role, revision: { increment: 1 } },
          });
          await revokeSessions(
            transaction,
            target.id,
            input.now,
            "ROLE_CHANGED",
          );
          action = "CHANGE_INTERNAL_ROLE";
        } else {
          if (target.status === input.mutation.status) {
            throw new IdentityGovernanceError(
              "NO_CHANGE",
              "目标账号已经是该状态",
            );
          }
          if (
            target.role === "ADMINISTRATOR" &&
            target.status === "ACTIVE" &&
            input.mutation.status === "INACTIVE"
          ) {
            await requireAnotherActiveAdministrator(transaction, target.id);
          }
          after = await transaction.account.update({
            where: { id: target.id },
            data: {
              status: input.mutation.status,
              revision: { increment: 1 },
            },
          });
          if (input.mutation.status === "INACTIVE") {
            await revokeSessions(
              transaction,
              target.id,
              input.now,
              "ACCOUNT_DEACTIVATED",
            );
          }
          action =
            input.mutation.status === "ACTIVE"
              ? "ACTIVATE_ACCOUNT"
              : "DEACTIVATE_ACCOUNT";
        }

        await appendAudit(transaction, {
          actorAccountId: input.actorAccountId,
          targetAccountId: target.id,
          action,
          reason: input.reason,
          beforeState,
          afterState: auditState(after),
          now: input.now,
        });
        return presentAccount(after);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function retryAfterSeconds(milliseconds: number): number {
  return Math.max(1, Math.ceil(milliseconds / 1000));
}

function inactiveSessionWhere(cutoff: Date): Prisma.AccountSessionWhereInput {
  return {
    OR: [
      { revokedAt: { lte: cutoff } },
      { expiresAt: { lte: cutoff } },
      { idleExpiresAt: { lte: cutoff } },
    ],
  };
}

function inactiveChallengeWhere(
  cutoff: Date,
): Prisma.MobileChallengeWhereInput {
  return {
    OR: [
      { consumedAt: { lte: cutoff } },
      { supersededAt: { lte: cutoff } },
      { expiresAt: { lte: cutoff } },
    ],
  };
}

function presentAccount(account: Account): AccountView {
  return {
    id: account.id,
    mobile: account.mobile,
    role: account.role,
    status: account.status,
    revision: account.revision,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    lastAuthenticatedAt: account.lastAuthenticatedAt,
  };
}

function presentAudit(
  audit: IdentityGovernanceAudit,
): IdentityGovernanceAuditView {
  return {
    id: audit.id,
    actorKind: audit.actorKind,
    actorAccountId: audit.actorAccountId,
    actorKeyId: audit.actorKeyId,
    targetAccountId: audit.targetAccountId,
    action: audit.action,
    reason: audit.reason,
    beforeState: audit.beforeState,
    afterState: audit.afterState,
    createdAt: audit.createdAt,
  };
}

function auditState(account: Account): Prisma.InputJsonObject {
  return {
    role: account.role,
    status: account.status,
    revision: account.revision,
  };
}

async function lockGovernance(
  transaction: GovernanceTransaction,
): Promise<void> {
  await transaction.$queryRaw`
    SELECT id
    FROM identity_governance_controls
    WHERE id = 'GLOBAL'
    FOR UPDATE
  `;
}

async function requireActiveAdministrator(
  transaction: GovernanceTransaction,
  accountId: string,
): Promise<Account> {
  const actor = await transaction.account.findUnique({
    where: { id: accountId },
  });
  if (!actor || actor.status !== "ACTIVE" || actor.role !== "ADMINISTRATOR") {
    throw new IdentityGovernanceError(
      "ACTOR_FORBIDDEN",
      "当前账号没有管理员治理权限",
    );
  }
  return actor;
}

async function requireAnotherActiveAdministrator(
  transaction: GovernanceTransaction,
  targetAccountId: string,
): Promise<void> {
  const count = await transaction.account.count({
    where: {
      id: { not: targetAccountId },
      role: "ADMINISTRATOR",
      status: "ACTIVE",
    },
  });
  if (count < 1) {
    throw new IdentityGovernanceError(
      "LAST_ADMINISTRATOR_FORBIDDEN",
      "必须先建立另一名有效管理员",
    );
  }
}

async function revokeSessions(
  transaction: GovernanceTransaction,
  accountId: string,
  now: Date,
  reason: SessionRevocationReason,
): Promise<void> {
  await transaction.accountSession.updateMany({
    where: { accountId, revokedAt: null },
    data: { revokedAt: now, revokedReason: reason },
  });
}

async function appendAudit(
  transaction: GovernanceTransaction,
  input: {
    actorAccountId: string;
    targetAccountId: string;
    action: IdentityGovernanceAction;
    reason: string;
    beforeState: Prisma.InputJsonObject | null;
    afterState: Prisma.InputJsonObject;
    now: Date;
  },
): Promise<void> {
  await transaction.identityGovernanceAudit.create({
    data: {
      actorKind: "ACCOUNT",
      actorAccountId: input.actorAccountId,
      targetAccountId: input.targetAccountId,
      action: input.action,
      reason: input.reason,
      beforeState: input.beforeState ?? Prisma.JsonNull,
      afterState: input.afterState,
      createdAt: input.now,
    },
  });
}
