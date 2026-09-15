import { Prisma } from "../../generated/prisma/client.js";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { isDeepStrictEqual } from "node:util";
import { PrismaService } from "../../infrastructure/prisma.service.js";
import { lockAgencyActors } from "../../identity/infrastructure/agent-identity-access.js";
import { lockAgencyChangeActors } from "../../identity/infrastructure/agency-customer-identity-access.js";
import type { AgencyCommissionTerms } from "../../generated/prisma/client.js";
import type {
  CommissionTermsInput,
  CommissionTermsView,
} from "../domain/commission-terms.js";
function present(
  id: string,
  row: AgencyCommissionTerms | null,
): CommissionTermsView {
  return {
    agentAccountId: id,
    enabled: row?.enabled ?? false,
    rateBps: row?.rateBps ?? null,
    revision: row?.revision ?? 0,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}
function authorize(
  rows: Array<{ id: string; role: string; status: string }>,
  actor: string,
  agent: string,
) {
  if (
    !rows.some(
      (x) =>
        x.id === actor && x.role === "ADMINISTRATOR" && x.status === "ACTIVE",
    )
  )
    throw new ForbiddenException("仅管理员可维护佣金设置");
  if (!rows.some((x) => x.id === agent && x.role === "AGENT"))
    throw new ConflictException("目标账号不是代理商，请刷新后核对");
}
@Injectable()
export class PostgresCommissionTermsRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  read(actor: string, agent: string) {
    return this.db.$transaction(async (tx) => {
      authorize(await lockAgencyActors(tx, [actor, agent]), actor, agent);
      const settings = present(
        agent,
        await tx.agencyCommissionTerms.findUnique({
          where: { agentAccountId: agent },
        }),
      );
      const audits = await tx.agencyCommissionAudit.findMany({
        where: { agentAccountId: agent },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
      });
      return {
        ...settings,
        audits: audits.map((x) => ({
          id: x.id,
          actorAccountId: x.actorAccountId,
          reason: x.reason,
          createdAt: x.createdAt.toISOString(),
          before: x.beforeState as CommissionTermsView,
          after: x.afterState as CommissionTermsView,
        })),
      };
    });
  }
  update(actor: string, agent: string, input: CommissionTermsInput) {
    return this.db
      .$transaction(async (tx) => {
        // Account locking also protects an absent settings row.
        authorize(
          await lockAgencyChangeActors(tx, [actor, agent], agent),
          actor,
          agent,
        );
        const request = { agentAccountId: agent, ...input };
        const prior = await tx.agencyCommissionAudit.findUnique({
          where: {
            actorAccountId_requestId: {
              actorAccountId: actor,
              requestId: input.requestId,
            },
          },
        });
        if (prior) {
          if (!isDeepStrictEqual(prior.request, request))
            throw new ConflictException("该请求标识已用于其他修改");
          return prior.afterState as CommissionTermsView;
        }
        const current = await tx.agencyCommissionTerms.findUnique({
          where: { agentAccountId: agent },
        });
        const before = present(agent, current);
        if (before.revision !== input.expectedRevision)
          throw new ConflictException("佣金设置已变化，请刷新后重新确认");
        const rateBps = input.enabled ? input.rateBps : before.rateBps;
        const row = await tx.agencyCommissionTerms.upsert({
          where: { agentAccountId: agent },
          create: { agentAccountId: agent, enabled: input.enabled, rateBps },
          update: {
            enabled: input.enabled,
            rateBps,
            revision: { increment: 1 },
          },
        });
        const after = present(agent, row);
        await tx.agencyCommissionAudit.create({
          data: {
            agentAccountId: agent,
            actorAccountId: actor,
            requestId: input.requestId,
            request,
            beforeState: before,
            afterState: after,
            reason: input.reason,
          },
        });
        return after;
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
}
