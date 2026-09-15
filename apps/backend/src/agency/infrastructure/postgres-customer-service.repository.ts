import { Prisma } from "../../generated/prisma/client.js";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { AgencyCustomerAttribution } from "../../generated/prisma/client.js";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { lockAgencyChangeActors } from "../../identity/infrastructure/agency-customer-identity-access.js";
import { lockAgencyActors } from "../../identity/infrastructure/agent-identity-access.js";
import {
  customerUnavailable,
  type CustomerTransfer,
} from "../domain/customer-service.js";

function relation(accountId: string, row: AgencyCustomerAttribution | null) {
  return {
    customerId: accountId,
    agentAccountId: row?.agentAccountId ?? null,
    revision: row?.revision ?? 0,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}
@Injectable()
export class PostgresCustomerServiceRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async adminState(actor: string, customer: string) {
    return this.db.$transaction(async (tx) => {
      const actors = await lockAgencyActors(tx, [actor, customer]);
      if (
        !actors.some(
          (x) =>
            x.id === actor &&
            x.role === "ADMINISTRATOR" &&
            x.status === "ACTIVE",
        )
      )
        throw new ForbiddenException("仅管理员可管理客户归属");
      if (
        !actors.some((x) => x.id === customer && x.role === "TERMINAL_CUSTOMER")
      )
        customerUnavailable();
      const row = await tx.agencyCustomerAttribution.findUnique({
        where: { accountId: customer },
      });
      const events = await tx.agencyAudit.findMany({
        where: { targetAccountId: customer, action: "REASSIGN" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
        select: {
          id: true,
          actorAccountId: true,
          beforeAgentAccountId: true,
          agentAccountId: true,
          reason: true,
          resultRevision: true,
          createdAt: true,
        },
      });
      return { ...relation(customer, row), events };
    });
  }
  async transfer(actor: string, customer: string, input: CustomerTransfer) {
    return this.db
      .$transaction(async (tx) => {
        const actors = await lockAgencyChangeActors(
          tx,
          [
            actor,
            customer,
            ...(input.agentAccountId ? [input.agentAccountId] : []),
          ],
          customer,
        );
        if (
          !actors.some(
            (x) =>
              x.id === actor &&
              x.role === "ADMINISTRATOR" &&
              x.status === "ACTIVE",
          )
        )
          throw new ForbiddenException("仅管理员可迁移客户");
        if (
          !actors.some(
            (x) => x.id === customer && x.role === "TERMINAL_CUSTOMER",
          )
        )
          customerUnavailable();
        const intent = { customerId: customer, ...input };
        const prior = await tx.agencyAudit.findUnique({
          where: {
            actorAccountId_requestId: {
              actorAccountId: actor,
              requestId: input.requestId,
            },
          },
        });
        if (prior) {
          const saved = prior.requestIntent as Record<string, unknown>;
          if (Object.entries(intent).some(([k, v]) => saved[k] !== v))
            throw new ConflictException("该请求标识已用于不同的迁移操作");
          return {
            outcome: "REPLAYED" as const,
            customerId: customer,
            agentAccountId: prior.agentAccountId,
            revision: prior.resultRevision!,
            updatedAt: prior.createdAt.toISOString(),
          };
        }
        if (
          input.agentAccountId &&
          !actors.some(
            (x) =>
              x.id === input.agentAccountId &&
              x.role === "AGENT" &&
              x.status === "ACTIVE",
          )
        )
          throw new ConflictException("目标代理商当前不可用");
        const current = await tx.agencyCustomerAttribution.findUnique({
          where: { accountId: customer },
        });
        if ((current?.revision ?? 0) !== input.expectedRevision)
          throw new ConflictException("客户归属已变化，请刷新后重新确认");
        if ((current?.agentAccountId ?? null) === input.agentAccountId)
          return {
            outcome: "UNCHANGED" as const,
            ...relation(customer, current),
          };
        const now = new Date();
        const next = await tx.agencyCustomerAttribution.upsert({
          where: { accountId: customer },
          create: {
            accountId: customer,
            agentAccountId: input.agentAccountId,
            entryKey: null,
            revision: 1,
            updatedAt: now,
          },
          update: {
            agentAccountId: input.agentAccountId,
            revision: { increment: 1 },
            updatedAt: now,
          },
        });
        await tx.agencyAudit.create({
          data: {
            action: "REASSIGN",
            actorAccountId: actor,
            targetAccountId: customer,
            beforeAgentAccountId: current?.agentAccountId ?? null,
            agentAccountId: input.agentAccountId,
            entryKey: current?.entryKey ?? null,
            reason: input.reason,
            requestId: input.requestId,
            requestIntent: intent,
            resultRevision: next.revision,
            createdAt: now,
          },
        });
        return { outcome: "CHANGED" as const, ...relation(customer, next) };
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
  async grant(agent: string, customer: string) {
    const rows = await this.recheck(agent, [{ accountId: customer }]);
    if (!rows[0]) customerUnavailable();
    return rows[0];
  }
  async candidates(agent: string, cursor?: string) {
    return this.db.agencyCustomerAttribution.findMany({
      where: {
        agentAccountId: agent,
        ...(cursor ? { accountId: { gt: cursor } } : {}),
      },
      orderBy: { accountId: "asc" },
      take: 21,
      select: { accountId: true, revision: true },
    });
  }
  async recheck(
    agent: string,
    grants: Array<{ accountId: string; revision?: number }>,
  ) {
    return this.db.$transaction(async (tx) => {
      const actors = await lockAgencyActors(tx, [
        agent,
        ...grants.map((g) => g.accountId),
      ]);
      if (
        !actors.some(
          (a) => a.id === agent && a.role === "AGENT" && a.status === "ACTIVE",
        )
      )
        customerUnavailable();
      const eligible = new Set(
        actors
          .filter(
            (a) => a.role === "TERMINAL_CUSTOMER" && a.status === "ACTIVE",
          )
          .map((a) => a.id),
      );
      return tx.agencyCustomerAttribution.findMany({
        where: {
          agentAccountId: agent,
          OR: grants
            .filter((g) => eligible.has(g.accountId))
            .map((g) => ({
              accountId: g.accountId,
              ...(g.revision === undefined ? {} : { revision: g.revision }),
            })),
        },
        select: { accountId: true, revision: true },
      });
    });
  }
}
